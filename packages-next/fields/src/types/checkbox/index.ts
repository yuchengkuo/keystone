import { Checkbox } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  FieldDefaultValue,
  fieldType,
  types,
  scalarFilters,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';

export type CheckboxFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  defaultValue?: FieldDefaultValue<boolean>;
  isRequired?: boolean;
  isUnique?: boolean;
};

export const checkbox = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: CheckboxFieldConfig<TGeneratedListTypes> = {}
): FieldType<TGeneratedListTypes> => ({
  type: Checkbox,
  config,
  views: resolveView('checkbox/views'),
  experimental: fieldType({
    kind: 'scalar',
    scalar: 'Boolean',
    mode: 'optional',
    isUnique: config.isUnique,
  })({
    input: {
      where: { arg: types.arg({ type: scalarFilters.Boolean }) },
      create: { arg: types.arg({ type: types.Boolean }) },
      update: { arg: types.arg({ type: types.Boolean }) },
    },
    output: types.field({ type: types.Boolean }),
  }),
});
