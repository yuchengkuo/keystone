/** @jsx jsx */
import { jsx } from '@keystone-ui/core';
import { getTutorialIds, getTutorialData } from '../../lib/tutorials';
import { Page } from '../../components/Page';
import { hydrate } from '../../components/_utils';

export async function getStaticProps({ params: { slug } }) {
  const { children, data } = await getTutorialData(slug);
  console.log('WHAT TEH FUCK', children, data);
  return { props: { children, data } };
}

export async function getStaticPaths() {
  const paths = await getTutorialIds();

  return {
    paths,
    fallback: false,
  };
}

export default function Tutorial({ children, data }) {
  const content = hydrate(children);
  return (
    <Page {...data} isProse>
      {content}
    </Page>
  );
}
