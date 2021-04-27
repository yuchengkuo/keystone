import { group } from './create';
// const groups = [create.group, ...require('./create-related'), ...require('./query')];
const groups = [group];


(async () => {
  for (let i = 0; i < groups.length; i++) {
    await groups[i].runFixtures();
  }
})();

// export {};
