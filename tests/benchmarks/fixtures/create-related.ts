import { text, relationship } from '@keystone-next/fields';
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
            posts: relationship({ ref: 'Post', many: true }),
          },
        }),
        Post: list({
          fields: {
            title: text(),
          },
        }),
      },
    }),
  }),
});

const group = new FixtureGroup(runner);

group.add({
  fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
    const query = `
    mutation {
      createUser(data: { name: "test", posts: { create: [] } }) { id }
    }`;
    const { time, success } = await timeQuery({ context, query });
    console.log({ provider, time, success, name: 'Cold create with relationship, N=1' });
  },
});

group.add({
  fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
    const query = `
    mutation {
      createUser(data: { name: "test", posts: { create: [] } }) { id }
    }`;
    const { time, success } = await timeQuery({ context, query });
    console.log({ provider, time, success, name: 'Warm create with relationship, N=1' });
  },
});

range(14).forEach(i => {
  const N = 1;
  const M = 2 ** i;
  group.add({
    fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
      const query = `
      mutation createMany($users: [UserCreateInput!]!){
        createUsers(data: $users) { id }
      }`;
      const posts = { create: populate(M, i => ({ title: `post${i}` })) };
      const variables = { users: populate(N, i => ({ name: `test${i}`, posts })) };
      const { time, success } = await timeQuery({ context, query, variables });
      console.log({
        provider,
        time,
        success,
        name: `Create-many with relationship, users=${N} posts=${M}`,
      });
    },
  });
});

const k = 14;
range(k).forEach(i => {
  const N = 2 ** i;
  const M = 2 ** (k - 1 - i);
  group.add({
    fn: async ({ context, provider }: { context: KeystoneContext; provider: ProviderName }) => {
      const query = `
      mutation createMany($users: [UserCreateInput!]!){
        createUsers(data: $users) { id }
      }`;
      const posts = { create: populate(M, i => ({ title: `post${i}` })) };
      const variables = { users: populate(N, i => ({ name: `test${i}`, posts })) };
      const { time, success } = await timeQuery({ context, query, variables });
      console.log({
        provider,
        time,
        success,
        name: `Create-many with relationship, users=${N} posts=${M}`,
      });
    },
  });
});

module.exports = [group];
