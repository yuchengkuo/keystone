import { Password } from '@keystonejs/fields';
import { FieldType, BaseGeneratedListTypes, fieldType, types } from '@keystone-next/types';
import { resolveView } from '../../resolve-view';
import type { FieldConfig } from '../../interfaces';
import bcryptjs from 'bcryptjs';

type PasswordFieldConfig<
  TGeneratedListTypes extends BaseGeneratedListTypes
> = FieldConfig<TGeneratedListTypes> & {
  minLength?: number;
  isRequired?: boolean;
  bcrypt?: Pick<typeof import('bcryptjs'), 'compare' | 'compareSync' | 'hash' | 'hashSync'>;
};

export const password = <TGeneratedListTypes extends BaseGeneratedListTypes>(
  config: PasswordFieldConfig<TGeneratedListTypes> = {}
): FieldType<TGeneratedListTypes> => {
  function inputResolver(val: string | null | undefined) {
    if (typeof val === 'string') {
      return bcrypt.hash(val, 10);
    }
    return val;
  }
  const bcrypt = config.bcrypt || bcryptjs;
  return {
    type: Password,
    config,
    views: resolveView('password/views'),
    getAdminMeta: () => ({ minLength: config.minLength !== undefined ? config.minLength : 8 }),
    experimental: fieldType({
      kind: 'scalar',
      scalar: 'String',
      mode: 'optional',
    })({
      input: {
        create: {
          arg: types.arg({ type: types.String }),
          resolve: inputResolver,
        },
        update: {
          arg: types.arg({ type: types.String }),
          resolve: inputResolver,
        },
      },
      output: types.field({
        type: types.nonNull(passwordType),
        resolve(val) {
          return { isSet: val.value !== null };
        },
        extensions: {
          keystoneSecretField: {
            generateHash: async (secret: string) => {
              return bcrypt.hash(secret, 10);
            },
            compare: (secret: string, hash: string) => {
              return bcrypt.compare(secret, hash);
            },
          },
        },
      }),
    }),
  };
};

const passwordType = types.object<{ isSet: boolean }>()({
  name: 'PasswordState',
  fields: {
    isSet: types.field({ type: types.nonNull(types.Boolean) }),
  },
});
