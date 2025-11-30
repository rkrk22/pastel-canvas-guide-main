import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { VideoEmbed } from "./VideoEmbed";

interface MarkdownRendererProps {
  content: string;
  onLinkClick?: (href?: string, event?: React.MouseEvent<HTMLAnchorElement>) => boolean | void;
}

export const MarkdownRenderer = ({ content, onLinkClick }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
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
        code: ({
          inline,
          children,
          ...props
        }: {
          inline?: boolean;
          children?: ReactNode;
        } & ComponentPropsWithoutRef<"code">) =>
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
        img: ({ src, alt, title, ...rest }) => {
          const widthMatch = typeof title === 'string' ? title.match(/w=(\d+)/) : null;
          const alignMatch = typeof title === 'string' ? title.match(/align=(\w+)/i) : null;

          const width = widthMatch ? `${widthMatch[1]}px` : '100%';
          const align = alignMatch ? alignMatch[1].toLowerCase() : undefined;

          const alignmentStyles =
            align === 'center'
              ? { display: 'block', marginLeft: 'auto', marginRight: 'auto' }
              : align === 'left'
              ? { display: 'block', marginRight: 'auto' }
              : align === 'right'
              ? { display: 'block', marginLeft: 'auto' }
              : undefined;

          const computedStyle = {
            width,
            height: 'auto',
            ...alignmentStyles,
          };

          return (
            <img
              src={src}
              alt={alt}
              style={computedStyle}
              className="rounded-xl my-4"
              {...rest}
            />
          );
        },
        iframe: ({ className, height, width, ...props }) => {
          const computedHeight =
            typeof height === "number" ? height : height ? Number(height) || height : 600;

          return (
            <div className="my-6 overflow-hidden rounded-xl border border-border">
              <iframe
                {...props}
                width="100%"
                height={computedHeight}
                className={`w-full ${className ?? ""}`}
                allowFullScreen
                loading="lazy"
              />
            </div>
          );
        },
        a: (props) => <VideoEmbed onLinkClick={onLinkClick} {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
