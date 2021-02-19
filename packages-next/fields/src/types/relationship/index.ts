import { Relationship } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  FieldDefaultValue,
  fieldType,
  FindManyArgsValue,
  getFindManyArgs,
  types,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';

// This is the default display mode for Relationships
type SelectDisplayConfig = {
  ui?: {
    // Sets the relationship to display as a Select field
    displayMode?: 'select';
    /**
     * The path of the field to use from the related list for item labels in the select.
     * Defaults to the labelField configured on the related list.
     */
    labelField?: string;
  };
};

type CardsDisplayConfig = {
  ui?: {
    // Sets the relationship to display as a list of Cards
    displayMode: 'cards';
    /* The set of fields to render in the default Card component **/
    cardFields: string[];
    /** Causes the default Card component to render as a link to navigate to the related item */
    linkToItem?: boolean;
    /** Determines whether removing a related item in the UI will delete or unlink it */
    removeMode?: 'disconnect' | 'none'; // | 'delete';
    /** Configures inline create mode for cards (alternative to opening the create modal) */
    inlineCreate?: { fields: string[] };
    /** Configures inline edit mode for cards */
    inlineEdit?: { fields: string[] };
    /** Configures whether a select to add existing items should be shown or not */
    inlineConnect?: boolean;
  };
};

export type RelationshipFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  many?: boolean;
  ref: string;
  ui?: {
    hideCreate?: boolean;
  };
  defaultValue?: FieldDefaultValue<Record<string, unknown>>;
  isIndexed?: boolean;
  isUnique?: boolean;
} & (SelectDisplayConfig | CardsDisplayConfig);

export const relationship = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: RelationshipFieldConfig<TGeneratedListTypes>
): FieldType<TGeneratedListTypes> => {
  const [foreignListKey, foreignField] = config.ref.split('.');
  let experimental: any;
  if (config.many) {
    experimental = fieldType({
      kind: 'relation',
      relation: { field: foreignField, model: foreignListKey },
      mode: 'many',
    })({
      input: {
        where: {
          arg: typesForLists =>
            types.arg({ type: typesForLists[foreignListKey].manyRelationFilter }),
        },
        create: {
          arg: typesForLists =>
            types.arg({
              type: types.inputObject({
                name: `${foreignListKey}_${foreignField}_CreateInput`,
                fields: {
                  create: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].create)),
                    defaultValue: [],
                  }),
                  connect: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].uniqueWhere)),
                  }),
                },
              }),
            }),
          resolve(val) {
            return val;
          },
        },
        update: {
          arg: typesForLists =>
            types.arg({
              type: types.inputObject({
                name: `${foreignListKey}_${foreignField}_UpdateInput`,
                fields: {
                  create: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].create)),
                  }),
                  connect: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].uniqueWhere)),
                  }),
                  disconnect: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].uniqueWhere)),
                  }),
                  set: types.arg({
                    type: types.list(types.nonNull(typesForLists[foreignListKey].uniqueWhere)),
                  }),
                },
              }),
            }),
          resolve(val) {
            return val;
          },
        },
      },
      output: typesForLists => {
        const findManyArgs = getFindManyArgs(typesForLists[foreignListKey]);
        return types.field({
          type: types.object<{
            findMany(args: FindManyArgsValue): Promise<{ id: string; [key: string]: unknown }[]>;
            count(args: FindManyArgsValue): Promise<number>;
          }>()({
            name: `${foreignListKey}_${foreignField}_Connection`,
            fields: {
              items: types.field({
                type: types.nonNull(
                  types.list(types.nonNull(typesForLists[foreignListKey].output))
                ),
                args: findManyArgs,
                resolve(rootVal, args) {
                  return rootVal.findMany(args);
                },
              }),
              count: types.field({
                type: types.nonNull(types.Int),
                args: findManyArgs,
                resolve(rootVal, args) {
                  return rootVal.count(args);
                },
              }),
            },
          }),
          resolve(value) {
            return value.value;
          },
        });
      },
    });
  } else {
    experimental = fieldType({
      kind: 'relation',
      relation: { field: foreignField, model: foreignListKey },
      mode: 'one',
    })({
      input: {
        where: {
          arg: typesForLists => types.arg({ type: typesForLists[foreignListKey].where }),
        },
        create: {
          arg: typesForLists => {
            return types.arg({
              type: types.inputObject({
                name: `${foreignListKey}_${foreignField}_CreateInput`,
                fields: {
                  create: types.arg({ type: typesForLists[foreignListKey].create }),
                  connect: types.arg({ type: typesForLists[foreignListKey].uniqueWhere }),
                },
              }),
            });
          },
          resolve(val) {
            return val;
          },
        },
        update: {
          arg: typesForLists => {
            return types.arg({
              type: types.inputObject({
                name: `${foreignListKey}_${foreignField}_UpdateInput`,
                fields: {
                  create: types.arg({ type: typesForLists[foreignListKey].create }),
                  connect: types.arg({ type: typesForLists[foreignListKey].where }),
                  disconnect: types.arg({ type: types.Boolean }),
                },
              }),
            });
          },
          resolve(val) {
            return val;
          },
        },
      },
      output: typesForLists =>
        types.field({
          type: typesForLists[foreignListKey].output,
          resolve(value) {
            return value.value();
          },
        }),
    });
  }
  return {
    type: Relationship,
    config,
    views: resolveView('relationship/views'),
    getAdminMeta: (
      listKey,
      path,
      adminMetaRoot
    ): Parameters<
      typeof import('@keystone-next/fields/types/relationship/views').controller
    >[0]['fieldMeta'] => {
      if (!adminMetaRoot.listsByKey[foreignListKey]) {
        throw new Error(`The ref [${config.ref}] on relationship [${listKey}.${path}] is invalid`);
      }
      return {
        refListKey: foreignListKey,
        many: config.many ?? false,
        hideCreate: config.ui?.hideCreate ?? false,
        ...(config.ui?.displayMode === 'cards'
          ? {
              displayMode: 'cards',
              cardFields: config.ui.cardFields,
              linkToItem: config.ui.linkToItem ?? false,
              removeMode: config.ui.removeMode ?? 'disconnect',
              inlineCreate: config.ui.inlineCreate ?? null,
              inlineEdit: config.ui.inlineEdit ?? null,
              inlineConnect: config.ui.inlineConnect ?? false,
            }
          : {
              displayMode: 'select',
              refLabelField: adminMetaRoot.listsByKey[foreignListKey].labelField,
            }),
      };
    },
    experimental,
  };
};
