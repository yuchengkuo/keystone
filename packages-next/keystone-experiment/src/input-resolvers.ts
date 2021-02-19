import weakMemoize from '@emotion/weak-memoize';
import {
  GraphQLInputType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { ListForExperiment, TypesForList } from '@keystone-next/types';

const getGraphQLInputObjectNamesToListKeyAndKinds = weakMemoize(
  (typesForLists: Record<string, TypesForList>) => {
    return new Map<
      string,
      {
        listKey: string;
        kind: 'create' | 'update' | 'where';
      }
    >(
      Object.keys(typesForLists.create).flatMap(listKey => {
        return [
          [typesForLists[listKey].create.graphQLType.name, { listKey, kind: 'create' }],
          [typesForLists[listKey].update.graphQLType.name, { listKey, kind: 'update' }],
          [typesForLists[listKey].where.graphQLType.name, { listKey, kind: 'where' }],
        ];
      })
    );
  }
);
// TODO: collect what fields on what object types need nested resolvers to be run
// so we don't need to go down a potentially long chain for no reason
// (it probs won't make a very big difference though so not that important)
async function runNestedInputResolvers(
  typesForLists: Record<string, TypesForList>,
  models: Record<string, ListForExperiment>,
  value: unknown,
  inputType: GraphQLInputType
): Promise<any> {
  if (
    value == null ||
    inputType instanceof GraphQLScalarType ||
    inputType instanceof GraphQLEnumType
  ) {
    return value;
  }
  if (inputType instanceof GraphQLList) {
    if (!Array.isArray(value)) {
      throw new Error('unexpected non-array value for GraphQLList');
    }
    return Promise.all(
      value.map(val => runNestedInputResolvers(typesForLists, models, val, inputType.ofType))
    );
  }
  if (inputType instanceof GraphQLNonNull) {
    return runNestedInputResolvers(typesForLists, models, value, inputType.ofType);
  }
  const maybeModelAndKind = getGraphQLInputObjectNamesToListKeyAndKinds(typesForLists).get(
    inputType.name
  );
  if (maybeModelAndKind) {
    return runInputResolvers(
      typesForLists,
      models,
      maybeModelAndKind.listKey,
      maybeModelAndKind.kind,
      value as any
    );
  }
  const graphQLFields = inputType.getFields();
  return Object.fromEntries(
    await Promise.all(
      Object.entries(graphQLFields).map(async ([key, field]) => {
        const resolvedValueFromNestedResolvers = await runNestedInputResolvers(
          typesForLists,
          models,
          (value as any)[key],
          field.type
        );
        return [key, resolvedValueFromNestedResolvers];
      })
    )
  );
}

export async function runInputResolvers(
  typesForLists: Record<string, TypesForList>,
  models: Record<string, ListForExperiment>,
  listKey: string,
  kind: 'create' | 'update' | 'where' | 'uniqueWhere',
  value: Record<string, unknown>
) {
  const fields = models[listKey].fields;
  const graphQLFields = typesForLists[listKey][kind].graphQLType.getFields();
  return Object.fromEntries(
    (
      await Promise.all(
        Object.entries(graphQLFields).map(async ([fieldPath, graphQLInputField]) => {
          const resolvedValueFromNestedResolvers = await runNestedInputResolvers(
            typesForLists,
            models,
            value[fieldPath],
            graphQLInputField.type
          );
          let resolvedValue = [[fieldPath, resolvedValueFromNestedResolvers] as const];
          if (
            (fieldPath === 'AND' || fieldPath === 'OR' || fieldPath === 'NOT') &&
            kind === 'where'
          ) {
            return resolvedValue;
          }
          const keystoneField = fields[fieldPath];
          // non null assertion is used here instead of optional chaining because if of those things
          // don't exist in this case, there is a bug(even though resolve may be undefined which is not a bug)
          const resolve = fields[fieldPath].input![kind]!.resolve;
          if (resolve) {
            resolvedValue[0] = [fieldPath, await resolve(resolvedValueFromNestedResolvers)];
          }

          if (keystoneField.dbField.kind === 'multi') {
            // we're iterating over the dbFields rather than the value because we don't trust the value as much
            return Object.keys(keystoneField.dbField.fields).map(key => {
              // note that the object must always exist
              // fields which have multi db fields must always have input resolvers
              return [`${fieldPath}__${key}`, value[key]];
            });
          }

          return resolvedValue;
        })
      )
    ).flat()
  );
}
