import { Text } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  FieldDefaultValue,
  fieldType,
  scalarFilters,
  types,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';

export type TextFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  defaultValue?: FieldDefaultValue<string>;
  isRequired?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  ui?: {
    displayMode?: 'input' | 'textarea';
  };
};

export const text = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: TextFieldConfig<TGeneratedListTypes> = {}
): FieldType<TGeneratedListTypes> => ({
  type: Text,
  config,
  views: resolveView('text/views'),
  getAdminMeta: () => ({ displayMode: config.ui?.displayMode ?? 'input' }),
  experimental: fieldType({
    kind: 'scalar',
    scalar: 'String',
    mode: 'optional',
    isUnique: config.isUnique,
  })({
    input: {
      where: { arg: types.arg({ type: scalarFilters.String }) },
      create: { arg: types.arg({ type: types.String }) },
      update: { arg: types.arg({ type: types.String }) },
    },
    output: types.field({ type: types.String }),
  }),
});
