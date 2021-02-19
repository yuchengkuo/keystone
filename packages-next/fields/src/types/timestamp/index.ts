import { DateTimeUtc } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  FieldDefaultValue,
  fieldType,
  types,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';

export type TimestampFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  defaultValue?: FieldDefaultValue<string>;
  isRequired?: boolean;
  isIndexed?: boolean;
  isUnique?: boolean;
};

export const timestamp = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: TimestampFieldConfig<TGeneratedListTypes> = {}
): FieldType<TGeneratedListTypes> => ({
  type: DateTimeUtc,
  config,
  views: resolveView('timestamp/views'),
  experimental: fieldType({
    kind: 'scalar',
    mode: 'optional',
    scalar: 'DateTime',
    isUnique: config.isUnique,
  })({
    input: {
      create: {
        arg: types.arg({ type: types.String }),
        resolve(val) {
          return val == null ? val : new Date(val);
        },
      },
      update: {
        arg: types.arg({ type: types.String }),
        resolve(val) {
          return val == null ? val : new Date(val);
        },
      },
    },
    output: types.field({
      type: types.String,
      resolve({ value }) {
        return value === null ? value : value.toString();
      },
    }),
  }),
});
