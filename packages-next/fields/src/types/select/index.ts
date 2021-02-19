import { Text } from '@keystonejs/fields';
import {
  BaseGeneratedListTypes,
  types,
  fieldType,
  getEnumFilter,
  scalarFilters,
  FieldType,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';
import * as tsgql from '@ts-gql/schema';

export type SelectFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> &
  SelectOptions & {
    ui?: {
      displayMode?: 'select' | 'segmented-control';
    };
    isRequired?: boolean;
    isIndexed?: boolean;
    isUnique?: boolean;
  };

type SelectOptions = (
  | {
      dataType?: 'string';
      options: { label: string; value: string }[];
    }
  | {
      dataType: 'enum';
      graphQLEnumName: string;
      options: { label: string; value: string }[];
    }
  | {
      dataType: 'integer';
      options: { label: string; value: number }[];
    }
) & { isUnique?: boolean };

export const select = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: SelectFieldConfig<TGeneratedListTypes>
): FieldType<TGeneratedListTypes> => {
  let experimental: any;
  if (config.dataType === 'integer') {
    experimental = fieldType({
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
    });
  } else {
    const typeForField =
      config.dataType === 'enum'
        ? types.enum({
            name: config.graphQLEnumName,
            values: types.enumValues(config.options.map(x => x.value)),
          })
        : types.String;
    experimental = fieldType(
      config.dataType === 'enum'
        ? {
            kind: 'enum',

            enum: config.options.map(x => x.value),
            mode: 'optional',
            isUnique: config.isUnique,
          }
        : {
            kind: 'scalar',
            scalar: 'String',
            mode: 'optional',
            isUnique: config.isUnique,
          }
    )({
      input: {
        where: {
          arg: types.arg({
            type:
              config.dataType === 'enum'
                ? getEnumFilter(
                    `${config.graphQLEnumName}Filter`,
                    typeForField as tsgql.EnumType<Record<string, tsgql.EnumValue<string>>>
                  )
                : scalarFilters.String,
          }),
        },
        create: {
          arg: types.arg({
            type: typeForField,
          }),
        },
        update: {
          arg: types.arg({
            type: typeForField,
          }),
        },
      },
      output: types.field({
        type: typeForField,
      }),
    });
  }
  return {
    type: Text,
    config,
    views: resolveView('select/views'),
    getAdminMeta: () => ({
      options: config.options,
      dataType: config.dataType ?? 'string',
      displayMode: config.ui?.displayMode ?? 'select',
    }),
    experimental,
  };
};
