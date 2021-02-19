import { GraphQLSchema } from 'graphql';
import { getTypes } from './get-types-for-lists';
import { runInputResolvers } from './input-resolvers';
import { types } from '@keystone-next/types';

import { ListForExperiment, getFindManyArgs } from '@keystone-next/types';
import { getPrismaModelForList } from './utils';

export function getGraphQLSchema(lists: Record<string, ListForExperiment>) {
  const typesForLists = getTypes(lists);

  let query = types.object()({
    name: 'Query',
    fields: () =>
      Object.fromEntries(
        Object.entries(lists).flatMap(([listKey, model]) => {
          const typesForList = typesForLists[listKey];
          const findOne = types.field({
            type: typesForList.output,
            args: {
              where: types.arg({
                type: types.nonNull(typesForList.uniqueWhere),
              }),
            },
            async resolve(_rootVal, { where }, context) {
              return getPrismaModelForList(context.prisma, listKey).findUnique({
                where: await runInputResolvers(typesForLists, lists, listKey, 'uniqueWhere', where),
              });
            },
          });
          const findManyArgs = getFindManyArgs(typesForList);
          const findMany = types.field({
            type: types.nonNull(types.list(types.nonNull(typesForList.output))),
            args: findManyArgs,
            async resolve(_rootVal, { where, sortBy, first, skip }, context) {
              return getPrismaModelForList(context.prisma, listKey).findMany({
                where: await runInputResolvers(typesForLists, lists, listKey, 'where', where || {}),
                // TODO: needs to have input resolvers
                orderBy: sortBy,
                take: first,
                skip,
              });
            },
          });
          return [
            [listKey, findOne],
            [`all${model.pluralGraphQLName}`, findMany],
            [
              `all${model.pluralGraphQLName}Count`,
              types.field({
                type: types.nonNull(types.Int),
                args: findManyArgs,
                async resolve(_rootVal, { where, sortBy, first, skip }, context) {
                  return getPrismaModelForList(context.prisma, listKey).count({
                    where: await runInputResolvers(
                      typesForLists,
                      lists,
                      listKey,
                      'where',
                      where || {}
                    ),
                    // TODO: needs to have input resolvers
                    orderBy: sortBy,
                    take: first,
                    skip,
                  });
                },
              }),
            ],
          ];
        })
      ),
  } as any);

  let mutation = types.object()({
    name: 'Mutation',
    fields: Object.fromEntries(
      Object.keys(lists).flatMap(listKey => {
        const typesForList = typesForLists[listKey];

        const createOne = types.field({
          type: types.nonNull(typesForList.output),
          args: {
            data: types.arg({
              type: types.nonNull(typesForList.create),
              defaultValue: {},
            }),
          },
          async resolve(_rootVal, { data: rawData }, context) {
            const data = await runInputResolvers(typesForLists, lists, listKey, 'create', rawData);

            return getPrismaModelForList(context.prisma, listKey).create({
              data,
            });
          },
        });
        const updateOne = types.field({
          type: typesForList.output,
          args: {
            where: types.arg({
              type: types.nonNull(typesForList.uniqueWhere),
            }),
            data: types.arg({
              type: types.nonNull(typesForList.update),
              defaultValue: {},
            }),
          },
          async resolve(_rootVal, { where: rawUniqueWhere, data: rawData }, context) {
            const [data, where] = await Promise.all([
              runInputResolvers(typesForLists, lists, listKey, 'update', rawData),
              runInputResolvers(typesForLists, lists, listKey, 'uniqueWhere', rawUniqueWhere),
            ]);
            return getPrismaModelForList(context.prisma, listKey).update({
              where,
              data,
            });
          },
        });
        const deleteOne = types.field({
          type: typesForList.output,
          args: {
            where: types.arg({
              type: types.nonNull(typesForList.uniqueWhere),
            }),
          },
          async resolve(rootVal, { where }, context) {
            return getPrismaModelForList(context.prisma, listKey).delete({
              where: runInputResolvers(typesForLists, lists, listKey, 'uniqueWhere', where),
            });
          },
        });
        return [
          [`create${listKey}`, createOne],
          [`update${listKey}`, updateOne],
          [`delete${listKey}`, deleteOne],
        ];
      })
    ),
  });
  let graphQLSchema = new GraphQLSchema({
    query: query.graphQLType,
    mutation: mutation.graphQLType,
  });
  return graphQLSchema;
}
