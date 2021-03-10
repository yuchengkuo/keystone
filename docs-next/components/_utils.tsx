import mdxHydrate from 'next-mdx-remote/hydrate';
import { components } from './Page';

export function hydrate(children) {
  return mdxHydrate(children, { components });
}
