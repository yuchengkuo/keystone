/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { getTutorialIds } from '../../lib/tutorials';
import { Markdown } from '../../components/Page';
export async function getStaticProps({ params }) {
  //   const { contentHTML, ...data } = await getPostData(params.id);
  //   const source = await renderToString(contentHTML);
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
  return <Markdown>{children}</Markdown>;
}
