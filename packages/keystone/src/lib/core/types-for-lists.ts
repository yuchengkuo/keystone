import {
  schema,
  ItemRootValue,
  TypesForList,
  getGqlNames,
  NextFieldType,
  CacheHint,
  BaseGeneratedListTypes,
  ListInfo,
  ListHooks,
  KeystoneConfig,
  DatabaseProvider,
  FindManyArgs,
  CacheHintArgs,
} from '../../types';
import { FieldHooks } from '../../types/config/hooks';
import {
  ResolvedFieldAccessControl,
  ResolvedListAccessControl,
  parseListAccessControl,
  parseFieldAccessControl,
} from './access-control';
import { getNamesFromList } from './utils';
import { ResolvedDBField, resolveRelationships } from './resolve-relationships';
import { outputTypeField } from './queries/output-field';
import { assertFieldsValid } from './field-assertions';

export type InitialisedField = Omit<NextFieldType, 'dbField' | 'access'> & {
  dbField: ResolvedDBField;
  hooks: FieldHooks<BaseGeneratedListTypes>;
  access: ResolvedFieldAccessControl;
  graphql: {
    isEnabled: {
      read: boolean;
      create: boolean;
      update: boolean;
      filter: boolean;
      orderBy: boolean;
    };
  };
};

export type InitialisedList = {
  fields: Record<string, InitialisedField>;
  /** This will include the opposites to one-sided relationships */
  resolvedDbFields: Record<string, ResolvedDBField>;
  pluralGraphQLName: string;
  types: TypesForList;
  access: ResolvedListAccessControl;
  hooks: ListHooks<BaseGeneratedListTypes>;
  adminUILabels: { label: string; singular: string; plural: string; path: string };
  cacheHint: ((args: CacheHintArgs) => CacheHint) | undefined;
  maxResults: number;
  listKey: string;
  lists: Record<string, InitialisedList>;
  graphql: {
    isEnabled: {
      type: boolean;
      query: boolean;

      create: boolean;
      update: boolean;
      delete: boolean;
    };
  };
};

export function initialiseLists(
  listsConfig: KeystoneConfig['lists'],
  provider: DatabaseProvider
): Record<string, InitialisedList> {
  const listInfos: Record<string, ListInfo> = {};
  const isEnabled: Record<
    string,
    { type: boolean; query: boolean; create: boolean; update: boolean; delete: boolean }
  > = {};

  for (const [listKey, listConfig] of Object.entries(listsConfig)) {
    const _isEnabled = listConfig.graphql?.isEnabled;
    if (_isEnabled === false) {
      isEnabled[listKey] = {
        type: false,
        query: false,
        create: false,
        update: false,
        delete: false,
      };
    } else if (_isEnabled === true || _isEnabled === undefined) {
      isEnabled[listKey] = { type: true, query: true, create: true, update: true, delete: true };
    } else {
      isEnabled[listKey] = {
        type: true,
        query: _isEnabled.query ?? true,
        create: _isEnabled.create ?? true,
        update: _isEnabled.update ?? true,
        delete: _isEnabled.delete ?? true,
      };
    }
  }

  for (const [listKey, listConfig] of Object.entries(listsConfig)) {
    const names = getGqlNames({
      listKey,
      pluralGraphQLName: getNamesFromList(listKey, listConfig).pluralGraphQLName,
    });

    const output = schema.object<ItemRootValue>()({
      name: names.outputTypeName,
      fields: () => {
        const { fields } = lists[listKey];
        return {
          ...Object.fromEntries(
            Object.entries(fields).flatMap(([fieldPath, field]) => {
              if (
                !field.graphql.isEnabled.read ||
                (field.dbField.kind === 'relation' && !isEnabled[field.dbField.list].query)
              ) {
                return [];
              } else {
                return [
                  [fieldPath, field.output] as const,
                  ...Object.entries(field.extraOutputFields || {}),
                ].map(([outputTypeFieldName, outputField]) => {
                  return [
                    outputTypeFieldName,
                    outputTypeField(
                      outputField,
                      field.dbField,
                      field.graphql?.cacheHint,
                      field.access.read,
                      listKey,
                      fieldPath,
                      lists
                    ),
                  ];
                });
              }
            })
          ),
        };
      },
    });

    const uniqueWhere = schema.inputObject({
      name: names.whereUniqueInputName,
      fields: () => {
        const { fields } = lists[listKey];
        return Object.fromEntries(
          Object.entries(fields).flatMap(([key, field]) => {
            if (
              !field.input?.uniqueWhere?.arg ||
              !(field.graphql?.isEnabled?.read ?? true) ||
              !(field.graphql?.isEnabled?.filter ?? true)
            ) {
              return [];
            } else {
              return [[key, field.input.uniqueWhere.arg]] as const;
            }
          })
        );
      },
    });

    const where: TypesForList['where'] = schema.inputObject({
      name: names.whereInputName,
      fields: () => {
        const { fields } = lists[listKey];
        return Object.assign(
          {
            AND: schema.arg({ type: schema.list(schema.nonNull(where)) }),
            OR: schema.arg({ type: schema.list(schema.nonNull(where)) }),
            NOT: schema.arg({ type: schema.list(schema.nonNull(where)) }),
          },
          ...Object.entries(fields).map(
            ([fieldKey, field]) =>
              field.input?.where?.arg &&
              (field.graphql?.isEnabled?.read ?? true) &&
              (field.graphql?.isEnabled?.filter ?? true) && { [fieldKey]: field.input?.where?.arg }
          )
        );
      },
    });

    const create = schema.inputObject({
      name: names.createInputName,
      fields: () => {
        const { fields } = lists[listKey];
        return Object.fromEntries(
          Object.entries(fields).flatMap(([key, field]) => {
            if (!field.input?.create?.arg || !(field.graphql?.isEnabled?.create ?? true)) return [];
            return [[key, field.input.create.arg]] as const;
          })
        );
      },
    });

    const update = schema.inputObject({
      name: names.updateInputName,
      fields: () => {
        const { fields } = lists[listKey];
        return Object.fromEntries(
          Object.entries(fields).flatMap(([key, field]) => {
            if (!field.input?.update?.arg || !(field.graphql?.isEnabled?.update ?? true)) return [];
            return [[key, field.input.update.arg]] as const;
          })
        );
      },
    });

    const orderBy = schema.inputObject({
      name: names.listOrderName,
      fields: () => {
        const { fields } = lists[listKey];
        return Object.fromEntries(
          Object.entries(fields).flatMap(([key, field]) => {
            if (
              !field.input?.orderBy?.arg ||
              !(field.graphql?.isEnabled?.read ?? true) ||
              !(field.graphql?.isEnabled?.orderBy ?? true)
            ) {
              return [];
            } else {
              return [[key, field.input.orderBy.arg]] as const;
            }
          })
        );
      },
    });

    // FIXME: What if orderBy empty?
    const findManyArgs: FindManyArgs = {
      where: schema.arg({ type: schema.nonNull(where), defaultValue: {} }),
      orderBy: schema.arg({
        type: schema.nonNull(schema.list(schema.nonNull(orderBy))),
        defaultValue: [],
      }),
      // TODO: non-nullable when max results is specified in the list with the default of max results
      take: schema.arg({ type: schema.Int }),
      skip: schema.arg({ type: schema.nonNull(schema.Int), defaultValue: 0 }),
    };

    const relateToManyForCreate = schema.inputObject({
      name: names.relateToManyForCreateInputName,
      fields: () => {
        const list = lists[listKey];
        return {
          ...(list.access.create !== false && {
            create: schema.arg({ type: schema.list(schema.nonNull(create)) }),
          }),
          connect: schema.arg({ type: schema.list(schema.nonNull(uniqueWhere)) }),
        };
      },
    });

    const relateToManyForUpdate = schema.inputObject({
      name: names.relateToManyForUpdateInputName,
      fields: () => {
        const list = lists[listKey];
        return {
          disconnect: schema.arg({ type: schema.list(schema.nonNull(uniqueWhere)) }),
          set: schema.arg({ type: schema.list(schema.nonNull(uniqueWhere)) }),
          ...(list.access.create !== false && {
            create: schema.arg({ type: schema.list(schema.nonNull(create)) }),
          }),
          connect: schema.arg({ type: schema.list(schema.nonNull(uniqueWhere)) }),
        };
      },
    });

    const relateToOneForCreate = schema.inputObject({
      name: names.relateToOneForCreateInputName,
      fields: () => {
        const list = lists[listKey];
        return {
          ...(list.access.create !== false && {
            create: schema.arg({ type: create }),
          }),
          connect: schema.arg({ type: uniqueWhere }),
        };
      },
    });

    const relateToOneForUpdate = schema.inputObject({
      name: names.relateToOneForUpdateInputName,
      fields: () => {
        const list = lists[listKey];
        return {
          ...(list.access.create !== false && {
            create: schema.arg({ type: create }),
          }),
          connect: schema.arg({ type: uniqueWhere }),
          disconnect: schema.arg({ type: schema.Boolean }),
        };
      },
    });

    listInfos[listKey] = {
      types: {
        output, // What if this was null?
        uniqueWhere,
        where,
        create,
        orderBy,
        update,
        findManyArgs,
        relateTo: {
          many: {
            where: schema.inputObject({
              name: `${listKey}ManyRelationFilter`,
              fields: {
                every: schema.arg({ type: where }),
                some: schema.arg({ type: where }),
                none: schema.arg({ type: where }),
              },
            }),
            create: relateToManyForCreate,
            update: relateToManyForUpdate,
          },
          one: { create: relateToOneForCreate, update: relateToOneForUpdate },
        },
      },
    };
  }

  const listsWithInitialisedFields = Object.fromEntries(
    Object.entries(listsConfig).map(([listKey, list]) => [
      listKey,
      {
        fields: Object.fromEntries(
          Object.entries(list.fields).map(([fieldKey, fieldFunc]) => {
            if (typeof fieldFunc !== 'function') {
              throw new Error(`The field at ${listKey}.${fieldKey} does not provide a function`);
            }
            return [fieldKey, fieldFunc({ fieldKey, listKey, lists: listInfos, provider })];
          })
        ),
        ...getNamesFromList(listKey, list),
        hooks: list.hooks,
        access: list.access,
      },
    ])
  );

  const listsWithResolvedDBFields = resolveRelationships(listsWithInitialisedFields);

  const listsWithInitialisedFieldsAndResolvedDbFields = Object.fromEntries(
    Object.entries(listsWithInitialisedFields).map(([listKey, list]) => {
      let hasAnAccessibleCreateField = false;
      let hasAnAccessibleUpdateField = false;
      const fields = Object.fromEntries(
        Object.entries(list.fields).map(([fieldKey, field]) => {
          const access = parseFieldAccessControl(field.access);
          if (access.create && field.input?.create?.arg) {
            hasAnAccessibleCreateField = true;
          }
          if (access.update && field.input?.update) {
            hasAnAccessibleUpdateField = true;
          }
          const dbField = listsWithResolvedDBFields[listKey].resolvedDbFields[fieldKey];
          return [
            fieldKey,
            {
              ...field,
              access,
              dbField,
              hooks: field.hooks ?? {},
              graphql: {
                isEnabled: {
                  read: field.graphql?.isEnabled?.read ?? true,
                  update: field.graphql?.isEnabled?.update ?? true,
                  create: field.graphql?.isEnabled?.create ?? true,
                  filter: field.graphql?.isEnabled?.filter ?? true,
                  orderBy: field.graphql?.isEnabled?.orderBy ?? true,
                },
              },
            },
          ];
        })
      );
      const access = parseListAccessControl(list.access);
      // huh? - You can't have a graphQL type with no fields, so
      // if they're all disabled, we have to disable the whole operation
      // or else tell them to disable it at the root level.
      if (!hasAnAccessibleCreateField) {
        access.create = false;
      }
      if (!hasAnAccessibleUpdateField) {
        access.update = false;
      }
      return [listKey, { ...list, access, fields }];
    })
  );

  for (const [listKey, { fields }] of Object.entries(
    listsWithInitialisedFieldsAndResolvedDbFields
  )) {
    assertFieldsValid({ listKey, fields });
  }

  const lists: Record<string, InitialisedList> = {};

  for (const [listKey, list] of Object.entries(listsWithInitialisedFieldsAndResolvedDbFields)) {
    lists[listKey] = {
      ...list,
      ...listInfos[listKey],
      ...listsWithResolvedDBFields[listKey],
      hooks: list.hooks || {},
      cacheHint: (() => {
        const cacheHint = listsConfig[listKey].graphql?.cacheHint;
        if (cacheHint === undefined) {
          return undefined;
        }
        return typeof cacheHint === 'function' ? cacheHint : () => cacheHint;
      })(),
      maxResults: listsConfig[listKey].graphql?.queryLimits?.maxResults ?? Infinity,
      listKey,
      lists,
      graphql: { isEnabled: isEnabled[listKey] },
    };
  }

  return lists;
}
