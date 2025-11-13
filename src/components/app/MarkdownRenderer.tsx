import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VideoEmbed } from './VideoEmbed';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mb-4 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold mb-3 mt-6 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-foreground leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-2 text-foreground">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground">{children}</li>
        ),
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
              {children}
            </code>
          ) : (
            <code className="block bg-muted p-4 rounded-xl text-sm font-mono overflow-x-auto mb-4 text-foreground" {...props}>
              {children}
            </code>
          ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
            {children}
          </blockquote>
        ),
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="rounded-xl my-4 max-w-full" />
        ),
        a: (props) => <VideoEmbed {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
