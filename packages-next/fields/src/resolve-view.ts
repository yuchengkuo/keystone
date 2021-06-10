import path from 'path';

const pkgDir = '/Users/mitchell/projects/keystone/packages-next/fields'; // path.resolve(path.dirname(require.resolve('@keystone-next/fields/package.json')));

console.log(pkgDir, path.resolve(__dirname));

export const resolveView = (pathname: string) => path.join(pkgDir, 'types', pathname);
