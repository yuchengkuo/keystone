/** @jsx jsx */
import { ReactNode } from 'react';
import { jsx, css } from '@keystone-ui/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

export const Code = ({ children, className }: { children: string; className: any }) => {
  const language: string = className ? className.replace(/language-/, '') : 'typescript';
  return (
    <div
      css={css`
        background-color: transparent !important;
        pre, pre code, pre code span {
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: monospace, monospace !important;
          font-size: 14px !important;
          line-height: 24px; !important;
          color: rgb(39 39 42);
        }
      `}
    >
      <SyntaxHighlighter language={language}>{children.trim()}</SyntaxHighlighter>
    </div>
  );
};

export const InlineCode = ({ children }: { children: ReactNode }) => {
  return (
    <code
      className="bg-gray-100 py-1 px-1.5 m-0 rounded-sm"
      css={css`
        &::before {
          display: none;
        }
        &::after {
          display: none;
        }
        font-size: 85% !important;
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        color: #24292e !important;
      `}
    >
      {children}
    </code>
  );
};
