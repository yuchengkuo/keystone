import { multiAdapterRunners } from '@keystone-next/test-utils-legacy';
import { KeystoneContext } from '@keystone-next/types';

export const timeQuery = async ({
  context,
  query,
  variables,
  repeat = 1,
}: {
  context: KeystoneContext;
  query: string;
  variables?: Record<string, any>;
  repeat?: number;
}) => {
  const t0_us = process.hrtime.bigint();
  const allErrors = [];
  for (let i = 0; i < repeat; i++) {
    try {
      await context.graphql.run({ query, variables });
    } catch (error) {
      allErrors.push(error);
    }
  }
  const t1_us = process.hrtime.bigint();
  if (allErrors.length) {
    console.log(allErrors);
  }
  return { time: Number(t1_us - t0_us) / 1e9, success: !allErrors.length };
};

const fixture = async (setupKeystone: any, fn: any) => {
  const subfixtures = multiAdapterRunners().map(({ runner, provider }) =>
    runner(setupKeystone, args => fn({ ...args, provider }))
  );
  for (let i = 0; i < subfixtures.length; i++) {
    await subfixtures[i]();
  }
};
export const range = (N: number) =>
  Array(N)
    .fill(undefined)
    .map((_, i) => i);

export const populate = <T>(N: number, f: (arg: number) => T) => range(N).map(i => f(i));

export class FixtureGroup {
  fixtures: any[];
  setupKeystone: any;
  constructor(setupKeystone: any) {
    this.setupKeystone = setupKeystone;
    this.fixtures = [];
  }

  add({ fn, skip = false, only = false }: { fn: any; skip?: boolean; only?: boolean }) {
    this.fixtures.push({ fn, skip, only });
  }

  async runFixtures() {
    let fixturesToRun;
    const onlys = this.fixtures.filter(fixture => fixture.only);
    if (onlys.length) {
      fixturesToRun = onlys;
    } else {
      fixturesToRun = this.fixtures.filter(fixture => !fixture.skip);
    }
    for (let i = 0; i < fixturesToRun.length; i++) {
      await fixture(this.runner, fixturesToRun[i].fn);
    }
    return true;
  }
}
