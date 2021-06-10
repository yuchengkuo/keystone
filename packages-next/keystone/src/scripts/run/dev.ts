import path from 'path';
import express from 'express';
import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import { KeystoneConfig } from '@keystone-next/types';
import { devMigrations, pushPrismaSchemaToDatabase } from '../../lib/migrations';
import { createSystem } from '../../lib/createSystem';
import { initConfig } from '../../lib/config/initConfig';
import { requireSource } from '../../lib/config/requireSource';
import { createExpressServer } from '../../lib/server/createExpressServer';
import {
  generateCommittedArtifacts,
  generateNodeModulesArtifacts,
  getSchemaPaths,
  requirePrismaClient,
} from '../../artifacts';
import { getAdminPath, getConfigPath } from '../utils';
import { generateActualAdminUIThings } from '../../admin-ui/system/generateAdminUI';
import { serializePathForImport } from '../build/build';
import { createAdminUIServer } from '../../admin-ui/system';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const devLoadingHTMLFilepath = path.join(
  path.dirname(require.resolve('@keystone-next/keystone/package.json')),
  'static',
  'dev-loading.html'
);

export const dev = async (cwd: string, shouldDropDatabase: boolean) => {
  console.log('✨ Starting Keystone');

  const app = express();
  let expressServer: null | ReturnType<typeof express> = null;

  let disconnect: null | (() => Promise<void>) = null;
  const config: KeystoneConfig = requireSource(getConfigPath(cwd)).default;
  app.use('/__keystone_dev_status', (req, res) => {
    res.json({ ready: expressServer ? true : false });
  });
  app.use((req, res, next) => {
    if (expressServer) {
      return expressServer(req, res, next);
    }
    res.sendFile(devLoadingHTMLFilepath);
  });
  const port = config.server?.port || process.env.PORT || 3000;
  let initKeystonePromiseResolve: () => void | undefined;
  let initKeystonePromiseReject: (err: any) => void | undefined;
  let initKeystonePromise = new Promise<void>((resolve, reject) => {
    initKeystonePromiseResolve = resolve;
    initKeystonePromiseReject = reject;
  });
  let lastConfig: KeystoneConfig = config;
  const server = app.listen(port, async (err?: any) => {
    if (err) throw err;
    console.log(`⭐️ Dev Server Ready on http://localhost:${port}`);
    // Don't start initialising Keystone until the dev server is ready,
    // otherwise it slows down the first response significantly

    try {
      await fs.remove(getAdminPath(cwd));
      const p = serializePathForImport(
        path.relative(path.join(getAdminPath(cwd), 'pages', 'api'), `${cwd}/keystone`)
      );
      await fs.outputFile(
        `${getAdminPath(cwd)}/pages/api/__keystone_api_build.js`,
        `export { default as config } from ${p};
const x = Math.random();
export default function (req, res) { return res.send(x.toString()) }
`
      );

      const results = await initKeystone(config, cwd, shouldDropDatabase);
      app.use(
        await createAdminUIServer(
          config.ui,
          results.createContext,
          true,
          getAdminPath(cwd),
          config.session
        )
      );
      console.log('yes?');
      expressServer = results.expressServer;
      disconnect = results.disconnect;
      initKeystonePromiseResolve();
      while (true) {
        await wait(500);
        try {
          await fetch(`http://localhost:${port}/api/__keystone_api_build`).then(x => x.text());
          const resolved = require.resolve(
            `${getAdminPath(cwd)}/.next/server/pages/api/__keystone_api_build`
          );
          const { config } = require(resolved);
          if (config !== lastConfig) {
            console.log('different');
            lastConfig = config;
            await disconnect?.();
            ({ disconnect, expressServer } = await initKeystone(config, cwd, false));
          }
          // if (lastVersion !== text) {
          //   console.log('changed thing');
          //   lastVersion = text;
          //   await disconnect?.();
          //   const resolved = require.resolve(
          //     `${getAdminPath(cwd)}/.next/server/pages/api/__keystone_api_build`
          //   );
          //   delete require.cache[resolved];
          //   const { config } = require(resolved);
          //   console.log(config);
          //   ({ disconnect, expressServer } = await initKeystone(config, cwd, false));
          // }
        } catch (err) {
          console.log(err);
        }
      }
    } catch (err) {
      server.close(async closeErr => {
        if (closeErr) {
          console.log('There was an error while closing the server');
          console.log(closeErr);
        }
        try {
          await disconnect?.();
        } catch (err) {
          console.log('There was an error while disconnecting from the database');
          console.log(err);
        }

        initKeystonePromiseReject(err);
      });
    }
  });

  await initKeystonePromise;

  return () =>
    new Promise<void>((resolve, reject) => {
      server.close(async err => {
        try {
          await disconnect?.();
        } catch (disconnectionError) {
          if (!err) {
            err = disconnectionError;
          } else {
            console.log('There was an error while disconnecting from the database');
            console.log(disconnectionError);
          }
        }
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
};

async function initKeystone(_config: KeystoneConfig, cwd: string, shouldDropDatabase: boolean) {
  const config = initConfig(_config);
  const { graphQLSchema, adminMeta, getKeystone } = createSystem(config);

  console.log('✨ Generating GraphQL and Prisma schemas');
  const prismaSchema = (await generateCommittedArtifacts(graphQLSchema, config, cwd)).prisma;
  await generateNodeModulesArtifacts(graphQLSchema, config, cwd);

  if (config.db.useMigrations) {
    await devMigrations(
      config.db.url,
      prismaSchema,
      getSchemaPaths(cwd).prisma,
      shouldDropDatabase
    );
  } else {
    await pushPrismaSchemaToDatabase(
      config.db.url,
      prismaSchema,
      getSchemaPaths(cwd).prisma,
      shouldDropDatabase
    );
  }

  const prismaClient = requirePrismaClient(cwd);

  const keystone = getKeystone(prismaClient);

  console.log('✨ Connecting to the database');
  await keystone.connect();
  await generateActualAdminUIThings(config, graphQLSchema, adminMeta, getAdminPath(cwd));

  console.log('✨ Creating server');
  const expressServer = await createExpressServer(
    { ...config, ui: { ...config.ui, isDisabled: true } },
    graphQLSchema,
    keystone.createContext,
    false,
    getAdminPath(cwd)
  );
  console.log(`👋 Admin UI and GraphQL API ready`);
  return { disconnect: keystone.disconnect, expressServer, createContext: keystone.createContext };
}
