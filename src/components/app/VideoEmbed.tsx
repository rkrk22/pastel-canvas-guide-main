import { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type VideoSource =
  | { type: 'youtube'; embedUrl: string; title: string }
  | { type: 'vimeo'; embedUrl: string; title: string }
  | { type: 'file'; sourceUrl: string }
  | { type: 'image'; sourceUrl: string };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm'];
const IMAGE_HOSTS = new Set(['ik.imagekit.io']);
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];

const isExternalHref = (href?: string) => {
  if (!href) {
    return false;
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : undefined;
    const url = new URL(href, base);
    if (!base) {
      return url.protocol !== 'file:';
    }
    return url.origin !== base;
  } catch {
    return /^[a-z][a-z0-9+.-]*:/.test(href);
  }
};

const getVideoSource = (href?: string): VideoSource | null => {
  if (!href) {
    return null;
  }

  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();

    if (YOUTUBE_HOSTS.has(host)) {
      const id =
        url.searchParams.get('v') ||
        (host === 'youtu.be' ? url.pathname.split('/').filter(Boolean)[0] : null) ||
        (url.pathname.startsWith('/shorts/') ? url.pathname.replace('/shorts/', '') : null);

      if (id) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}`,
          title: 'YouTube video player',
        };
      }
    }

    if (VIMEO_HOSTS.has(host)) {
      const path = url.pathname.split('/').filter(Boolean);
      const vimeoId = path[0];

      if (vimeoId && /^\d+$/.test(vimeoId)) {
        return {
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
          title: 'Vimeo video player',
        };
      }
    }

    if (DIRECT_VIDEO_EXTENSIONS.some((ext) => url.pathname.toLowerCase().endsWith(ext))) {
      return {
        type: 'file',
        sourceUrl: href,
      };
    }

    if (
      IMAGE_HOSTS.has(host) ||
      IMAGE_EXTENSIONS.some((ext) => url.pathname.toLowerCase().endsWith(ext))
    ) {
      return {
        type: 'image',
        sourceUrl: href,
      };
    }
  } catch {
    // Ignore invalid URLs so normal link rendering takes over.
  }

  return null;
};

interface VideoEmbedProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  onLinkClick?: (href?: string, event?: MouseEvent<HTMLAnchorElement>) => boolean | void;
}

export const VideoEmbed = ({ href, children, onLinkClick, ...rest }: VideoEmbedProps) => {
  const { target, rel: relProp, ...anchorProps } = rest;
  const source = getVideoSource(href);
  const isExternal = isExternalHref(href);
  const rel = isExternal ? [relProp, 'noopener', 'noreferrer'].filter(Boolean).join(' ') : relProp;

  if (!source) {
    return (
      <a
        href={href}
        className="text-primary hover:underline break-words"
        target={isExternal ? '_blank' : target}
        rel={rel}
        onClick={(event) => {
          if (onLinkClick?.(href, event)) {
            event.preventDefault();
          }
        }}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  if (source.type === 'file') {
    return (
      <video
        className="w-full rounded-xl mb-6 bg-black"
        src={source.sourceUrl}
        controls
        playsInline
      />
    );
  }

  if (source.type === 'image') {
    const altText = typeof children === 'string' ? children : 'Embedded image';
    return (
      <img
        className="rounded-xl my-4 w-full max-w-[450px] cursor-zoom-in"
        src={source.sourceUrl}
        alt={altText}
        data-markdown-img
      />
    );
  }

  return (
    <div className="relative w-full pt-[56.25%] mb-6 rounded-xl overflow-hidden bg-black">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={source.embedUrl}
        title={source.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
