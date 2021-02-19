import {
  BaseGeneratedListTypes,
  FieldDefaultValue,
  FieldType,
  fieldType,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';
import { types, scalarFilters } from '@keystone-next/types';

export type MongoIdFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  isRequired?: boolean;
  isIndexed?: boolean;
  isUnique?: boolean;
  defaultValue?: FieldDefaultValue<string>;
};

export const uuid = (): FieldType<BaseGeneratedListTypes> => {
  return {
    type: undefined,
    views: resolveView('uuid/views'),
    config: {},
    // @ts-ignore
    experimental: fieldType({
      kind: 'scalar',
      mode: 'required',
      scalar: 'String',
      isOrderable: true,
      isUnique: true,
    })({
      input: {
        where: { arg: types.arg({ type: scalarFilters.ID }) },
        uniqueWhere: { arg: types.arg({ type: types.ID }) },
      },
      output: types.field({
        type: types.nonNull(types.ID),
        resolve(rootVal) {
          return rootVal.id;
        },
      }),
    }),
  };
};
