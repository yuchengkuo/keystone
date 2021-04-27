import { text } from '@keystone-next/fields';
import { list } from '@keystone-next/keystone/schema';
import { ProviderName, setupFromConfig, testConfig } from '@keystone-next/test-utils-legacy';
import { KeystoneContext } from '@keystone-next/types';
import { FixtureGroup, timeQuery, populate, range } from '../lib/utils';

function setupKeystone(provider: ProviderName) {
  return setupFromConfig({
    provider,
    config: testConfig({
      lists: {
        User: list({
          fields: {
            name: text(),
          },
        }),
      },
    }),
  }),
});

export const group = new FixtureGroup(setupKeystone);

group.add({
  fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
    const query = `
    mutation {
      createUser(data: { name: "test" }) { id }
    }`;
    const { time, success } = await timeQuery({ context, query });
    console.log({ provider, time, success, name: 'Cold create, N=1' });
  },
});

group.add({
  fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
    const query = `
    mutation {
      createUser(data: { name: "test" }) { id }
    }`;
    const { time, success } = await timeQuery({ context, query });
    console.log({ provider, time, success, name: 'Warm create, N=1' });
  },
});

range(15).forEach(i => {
  const N = 2 ** i;
  group.add({
    fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
      const query = `
      mutation createMany($users: [UserCreateInput!]!){
        createUsers(data: $users) { id }
      }`;
      const variables = { users: populate(N, i => ({ name: `test${i}` })) };
      const { time, success } = await timeQuery({ context, query, variables });
      console.log({ provider, time, success, name: `Create-many, N=${N}` });
    },
  });
});
