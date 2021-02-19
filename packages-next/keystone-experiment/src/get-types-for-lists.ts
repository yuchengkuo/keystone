import { prismaScalarsToGraphQLScalars } from './filters';
import { runInputResolvers } from './input-resolvers';
import * as tsgql from '@ts-gql/schema';
import {
  types,
  FindManyArgsValue,
  ItemRootValue,
  KeystoneContext,
  ListForExperiment,
  RelationDBField,
  TypesForList,
} from '@keystone-next/types';
import { getPrismaModelForList } from './utils';

const sortDirectionEnum = types.enum({
  name: 'SortDirection',
  values: types.enumValues(['asc', 'desc']),
});

const fromEntriesButTypedWell: <Key extends string | number | symbol, Val>(
  iterable: Iterable<readonly [Key, Val]>
) => Record<Key, Val> = Object.fromEntries;

export function getTypes(models: Record<string, ListForExperiment>): Record<string, TypesForList> {
  const typesForLists: Record<string, TypesForList> = fromEntriesButTypedWell(
    Object.entries(models).map(([listKey, { fields, pluralGraphQLName }]): [
      string,
      TypesForList
    ] => {
      let output = types.object<{ id: string; [key: string]: unknown }>()({
        name: listKey,
        fields: () => ({
          ...Object.fromEntries(
            Object.entries(fields).map(([fieldPath, field]) => {
              const output: tsgql.OutputField<
                { id: string; value: any; item: ItemRootValue },
                any,
                any,
                'value',
                KeystoneContext
              > = typeof field.output === 'function' ? field.output(typesForLists) : field.output;
              return [
                fieldPath,
                types.field<ItemRootValue, any, any, string, KeystoneContext>({
                  type: output.type,
                  deprecationReason: output.deprecationReason,
                  description: output.description,
                  args: output.args,
                  extensions: output.extensions,
                  resolve(rootVal, args, ctx, info) {
                    let getRelationVal = (
                      dbField: RelationDBField<'many' | 'one'>,
                      id: string,
                      key: string
                    ) =>
                      dbField.mode === 'many'
                        ? {
                            findMany: async ({ first, skip, sortBy, where }: FindManyArgsValue) => {
                              return getPrismaModelForList(
                                ctx.prisma,
                                dbField.relation.model
                              ).findUnique({
                                where: {
                                  AND: [
                                    {
                                      [dbField.relation.field]: { id },
                                    },
                                    await runInputResolvers(
                                      typesForLists,
                                      models,
                                      listKey,
                                      'where',
                                      where || {}
                                    ),
                                  ],
                                },
                                // TODO: needs to have input resolvers
                                orderBy: sortBy,
                                take: first,
                                skip,
                              });
                            },
                            count: async ({ first, skip, sortBy, where }: FindManyArgsValue) => {
                              return getPrismaModelForList(
                                ctx.prisma,
                                dbField.relation.model
                              ).count({
                                where: {
                                  AND: [
                                    {
                                      [dbField.relation.field]: { id },
                                    },
                                    await runInputResolvers(
                                      typesForLists,
                                      models,
                                      listKey,
                                      'where',
                                      where || {}
                                    ),
                                  ],
                                },
                                // TODO: needs to have input resolvers
                                orderBy: sortBy,
                                take: first,
                                skip,
                              });
                            },
                          }
                        : async () => {
                            return (
                              await getPrismaModelForList(ctx.prisma, listKey).findUnique({
                                where: {
                                  id,
                                },
                                select: { [key]: true },
                              })
                            )?.[key];
                          };

                    const id = (rootVal as any).id as string;

                    const value = (() => {
                      const dbField = field.dbField;
                      if (dbField.kind === 'multi') {
                        return Object.fromEntries(
                          Object.entries(dbField.fields).map(([innerDBFieldKey, dbField]) => {
                            const keyOnDbValue = `${fieldPath}__${innerDBFieldKey}`;
                            if (dbField.kind === 'relation') {
                              return [innerDBFieldKey, getRelationVal(dbField, id, keyOnDbValue)];
                            }
                            return [innerDBFieldKey, (rootVal as any)[keyOnDbValue]];
                          })
                        );
                      }
                      if (dbField.kind === 'relation') {
                        return getRelationVal(dbField, id, fieldPath);
                      }
                      return (rootVal as any)[fieldPath];
                    })();

                    if (output.resolve) {
                      return output.resolve(
                        {
                          id,
                          value,
                          item: rootVal as any,
                        },
                        args,
                        ctx,
                        info
                      );
                    }
                    return value;
                  },
                }),
              ];
            })
          ),
        }),
      });
      const uniqueWhere = types.inputObject({
        name: `${listKey}UniqueWhereInput`,
        fields: fromEntriesButTypedWell(
          Object.entries(fields)
            .map(
              ([key, field]) =>
                [
                  key,
                  field.dbField.kind === 'scalar' && field.dbField.isUnique
                    ? types.arg({
                        type:
                          // i don't like this conditional
                          // fields should define their uniqueWhere
                          key === 'id'
                            ? types.ID
                            : prismaScalarsToGraphQLScalars[field.dbField.scalar],
                      })
                    : false,
                ] as const
            )
            .filter((x): x is [string, Exclude<typeof x[1], false>] => x[1] !== false)
        ),
      });
      const where: TypesForList['where'] = types.inputObject({
        name: `${listKey}WhereInput`,
        fields: () => {
          return {
            AND: types.arg({
              type: types.list(types.nonNull(where)),
            }),
            OR: types.arg({
              type: types.list(types.nonNull(where)),
            }),
            NOT: types.arg({
              type: types.list(types.nonNull(where)),
            }),
            ...fromEntriesButTypedWell(
              Object.entries(fields)
                .map(([key, val]) => {
                  return [
                    key,
                    typeof val.input?.where?.arg === 'function'
                      ? val.input.where.arg(typesForLists)
                      : val.input?.where?.arg,
                  ] as const;
                })
                .filter(x => !!x[1])
            ),
          };
        },
      });
      const manyRelationFilter = types.inputObject({
        name: `${pluralGraphQLName}RelationFilter`,
        fields: () => ({
          every: types.arg({
            type: where,
          }),
          some: types.arg({
            type: where,
          }),
          none: types.arg({
            type: where,
          }),
        }),
      });

      const create = types.inputObject({
        name: `${listKey}CreateInput`,
        fields: () =>
          Object.fromEntries(
            Object.entries(fields)
              .map(([key, field]) => {
                const arg =
                  typeof field.input?.create?.arg === 'function'
                    ? field.input.create.arg(typesForLists)
                    : field.input?.create?.arg;

                return [key, arg] as const;
              })
              .filter((x): x is [typeof x[0], NonNullable<typeof x[1]>] => x[1] != null)
          ),
      });

      const update = types.inputObject({
        name: `${listKey}UpdateInput`,
        fields: () =>
          Object.fromEntries(
            Object.entries(fields)
              .map(([key, field]) => {
                const arg =
                  typeof field.input?.update?.arg === 'function'
                    ? field.input.update.arg(typesForLists)
                    : field.input?.update?.arg;

                return [key, arg] as const;
              })
              .filter((x): x is [typeof x[0], NonNullable<typeof x[1]>] => x[1] != null)
          ),
      });

      const sortBy = types.inputObject({
        name: `Sort${pluralGraphQLName}By`,
        fields: Object.fromEntries(
          Object.entries(fields).flatMap(([key, { dbField }]): [string, tsgql.Arg<any, any>][] => {
            // note the conditions are intentionally checking that the db field is not a db field that doesn't support ordering
            // so that there will be a TS error if a new DBField type is added that doesn't supports ordering
            // and when a new DBField type that does support ordering is added, it will just work
            if (
              dbField.kind !== 'none' &&
              dbField.kind !== 'relation' &&
              dbField.kind !== 'multi' &&
              dbField.isOrderable
            ) {
              return [[key, types.arg({ type: sortDirectionEnum })]];
            }

            // TODO: given multi db fields, maybe fields will want to customise this so the sort by type(and a resolver) should be a thing on field types?
            // (also probs useful bc of soon to be released filtering by relations in prisma)
            if (dbField.kind === 'multi') {
              let fields = Object.fromEntries(
                Object.entries(dbField.fields).flatMap(([key, dbField]) => {
                  if (
                    dbField.kind !== 'enum' &&
                    dbField.kind !== 'relation' &&
                    dbField.isOrderable
                  ) {
                    return [[key, types.arg({ type: sortDirectionEnum })]];
                  }
                  return [];
                })
              );
              if (fields.length) {
                return [
                  [
                    key,
                    types.arg({
                      type: types.inputObject({
                        name: `Sort${listKey}_${key}By`,
                        fields,
                      }),
                    }),
                  ],
                ];
              }
            }
            return [];
          })
        ),
      });

      return [
        listKey,
        {
          output,
          uniqueWhere,
          manyRelationFilter,
          where,
          create,
          sortBy,
          update,
        },
      ];
    })
  );
  return typesForLists;
}
