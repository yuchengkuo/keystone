import path from 'path';
import { getPackages } from '@manypkg/get-packages';
import fs from 'fs-extra';
// import renderToString from 'next-mdx-remote/render-to-string';
// import { components } from '../components/Page';
import matter from 'gray-matter';

export async function getTutorialData(slug) {
  try {
    const cache = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '.cache'), 'utf-8'));
    const { content, data } = cache[slug];
    return { content, data };
  } catch (e) {
    console.log(e);
    return null;
  }
}

function cacheToDisk(packages) {
  const cache = {};
  for (const pkg of packages) {
    const markdown = fs.readFileSync(path.resolve(pkg.dir, 'docs', 'index.mdx'), 'utf-8');
    const slug = pkg.packageJson.name.replace('@keystone-tutorials/', '');
    const { content, data } = matter(markdown);
    cache[slug] = { content, data };
  }

  const writePath = path.resolve(process.cwd(), '.cache');
  fs.writeFileSync(writePath, JSON.stringify(cache, null, 2), {
    encoding: 'utf-8',
  });
}

export async function getTutorialIds() {
  const tutorialIds = await getPackages(process.cwd()).then(({ root, packages }) => {
    const relevantPackages = packages.filter(pkg =>
      pkg.dir.includes(path.resolve(root.dir, 'tutorials'))
    );
    if (!fs.existsSync(path.resolve(process.cwd(), '.cache'))) {
      cacheToDisk(relevantPackages);
    }

    return relevantPackages.map(pkg => {
      return {
        params: {
          slug: pkg.packageJson.name.replace('@keystone-tutorials/', ''),
        },
      };
    });
  });

  return tutorialIds;
}
