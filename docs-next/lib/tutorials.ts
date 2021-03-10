import path from 'path';
import { getPackages } from '@manypkg/get-packages';
import fs from 'fs-extra';
import renderToString from 'next-mdx-remote/render-to-string';
import { components } from '../components/Page';
import matter from 'gray-matter';

const packageMap = new Map();

export async function getTutorialData(slug) {
  if (packageMap.has(slug)) {
    const { content, data } = packageMap.get(slug);
    const children = await renderToString(content, { components, scope: data });

    return { children, data };
  }
}

export async function getTutorialIds() {
  const tutorialIds = await getPackages(process.cwd()).then(({ root, packages }) => {
    return packages
      .filter(pkg => pkg.dir.includes(path.resolve(root.dir, 'tutorials')))
      .map(pkg => {
        const markdown = fs.readFileSync(path.resolve(pkg.dir, 'docs', 'index.mdx'), 'utf-8');
        const slug = pkg.packageJson.name.replace('@keystone-tutorials/', '');
        const { content, data } = matter(markdown);
        packageMap.set(slug, { content, data });
        return {
          params: {
            slug: pkg.packageJson.name.replace('@keystone-tutorials/', ''),
          },
        };
      });
  });

  return tutorialIds;
}
