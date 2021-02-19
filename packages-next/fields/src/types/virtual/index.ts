// @ts-ignore
import { Virtual } from '@keystonejs/fields';
import {
  FieldType,
  BaseGeneratedListTypes,
  KeystoneContext,
  types,
  fieldType,
  ItemRootValue,
} from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';
import * as tsgql from '@ts-gql/schema';

export type VirtualFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  resolver: (rootVal: any, args: any, context: KeystoneContext, info: any) => any;
  graphQLReturnType?: string;
  graphQLReturnFragment?: string;
  extendGraphQLTypes?: string[];
  args?: { name: string; type: string }[];
};

export const virtual = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: VirtualFieldConfig<TGeneratedListTypes>
): FieldType<TGeneratedListTypes> => ({
  type: Virtual,
  config,
  views: resolveView('virtual/views'),
  getAdminMeta: () => ({ graphQLReturnFragment: config.graphQLReturnFragment ?? '' }),
  experimental: undefined as any,
});

export type VirtualFieldExperimentalConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  // TODO: automatically generate this for non-circular types
  graphQLReturnFragment?: string;
  field: tsgql.OutputField<ItemRootValue, any, tsgql.OutputTypes, string, KeystoneContext>;
};

export const virtualExperimental = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: VirtualFieldExperimentalConfig<TGeneratedListTypes>
): FieldType<TGeneratedListTypes> => ({
  type: Virtual,
  config,
  views: resolveView('virtual/views'),
  getAdminMeta: () => ({ graphQLReturnFragment: config.graphQLReturnFragment ?? '' }),
  experimental: fieldType({
    kind: 'none',
  })({
    output: types.field({
      ...(config.field as any),
      resolve({ item }, ...args) {
        return config.field.resolve!(item as any, ...args);
      },
    }),
  }),
});
