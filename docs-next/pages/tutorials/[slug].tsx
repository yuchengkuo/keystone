/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { getTutorialIds, getTutorialData } from '../../lib/tutorials';
import unified from 'unified';
import parse from 'remark-parse';
import remark2react from 'remark-react';
import { Page, components } from '../../components/Page';

export async function getStaticProps({ params: { slug } }) {
  const { content, data } = await getTutorialData(slug);
  return { props: { content, data } };
}

export async function getStaticPaths() {
  const paths = await getTutorialIds();

  return {
    paths,
    fallback: false,
  };
}

export default function Tutorial({ content, data }) {
  // const { code, ...rest } = components;
  return (
    <Page {...data} isProse>
      {
        unified()
          .use(parse)
          .use(remark2react, { remarkReactComponents: components })
          .processSync(content).result
      }
    </Page>
  );
}
