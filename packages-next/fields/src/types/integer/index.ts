import { Integer } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  FieldDefaultValue,
  types,
  scalarFilters,
  fieldType,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';

export type IntegerFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  isRequired?: boolean;
  isIndexed?: boolean;
  isUnique?: boolean;
  defaultValue?: FieldDefaultValue<number>;
};

export const integer = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: IntegerFieldConfig<TGeneratedListTypes> = {}
): FieldType<TGeneratedListTypes> => ({
  type: Integer,
  config,
  views: resolveView('integer/views'),
  experimental: fieldType({
    kind: 'scalar',
    scalar: 'Int',
    mode: 'optional',
    isUnique: config.isUnique,
  })({
    input: {
      where: { arg: types.arg({ type: scalarFilters.Int }) },
      create: { arg: types.arg({ type: types.Int }) },
      update: { arg: types.arg({ type: types.Int }) },
    },
    output: types.field({ type: types.Int }),
  }),
});
