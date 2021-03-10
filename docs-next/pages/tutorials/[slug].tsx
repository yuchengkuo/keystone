/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { getTutorialIds, getTutorialData } from '../../lib/tutorials';
import { Markdown } from '../../components/Page';
export async function getStaticProps({ params }) {
  console.log(params);
  const content = await getTutorialData(params.slug);
  //   const source = await renderToString(contentHTML);
  //   remark
  //   next-remote-mdx
  return {
    props: {
      //   postData: {
      //     source,
      //     ...data,
      //   },
    },
  };
}
export async function getStaticPaths() {
  const paths = await getTutorialIds();
  console.log(paths);
  return {
    paths,
    fallback: false,
  };
}

export default function Tutorial({ children }) {
  return 'HELLO WORLD';
}
