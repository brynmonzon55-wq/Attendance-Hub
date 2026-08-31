import type { ReactNode } from 'react';
import { Video } from 'lucide-react';

// Matches http(s) URLs. Stops at whitespace or `<` so it plays nicely when the
// surrounding text is later dropped into JSX.
const URL_PATTERN = /https?:\/\/[^\s<]+/g;

/**
 * Strips common trailing punctuation (periods, commas, closing parens, etc.)
 * off a matched URL so "check meet.google.com/abc-defg-hij." doesn't turn the
 * trailing period into part of the link. Keeps a closing paren if it balances
 * an opening paren that's actually part of the URL.
 */
function trimTrailingPunctuation(url: string): { clean: string; trailing: string } {
  const match = url.match(/[)\].,!?;:'"]+$/);
  if (!match) return { clean: url, trailing: '' };

  let trailing = match[0];
  let clean = url.slice(0, url.length - trailing.length);

  while (
    trailing.startsWith(')') &&
    (clean.split('(').length - 1) > (clean.split(')').length - 1)
  ) {
    clean += ')';
    trailing = trailing.slice(1);
  }

  return { clean, trailing };
}

export interface LinkifyOptions {
  /** Tailwind classes applied to a regular (non-Meet) link. */
  linkClassName?: string;
  /**
   * When true, regular links skip the default color classes and just inherit
   * whatever text color surrounds them (with an underline). Useful inside
   * colored chat bubbles where a hardcoded link color might not read well.
   */
  inheritColor?: boolean;
}

const DEFAULT_LINK_CLASS =
  'font-semibold text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 break-all';
const INHERIT_LINK_CLASS =
  'underline decoration-2 underline-offset-2 font-bold hover:opacity-80 break-all';

/**
 * Scans plain text for http(s) links and turns them into clickable <a> tags.
 * Google Meet links (meet.google.com/...) are rendered as a small "Join
 * Google Meet" pill so they stand out and work regardless of the theme
 * they're dropped into (dark card, light card, or colored chat bubble).
 *
 * Any other text is returned unchanged, so this is safe to wrap around
 * announcements, assignments, comments, submissions, and chat messages.
 */
export function linkifyText(text: string | undefined | null, options: LinkifyOptions = {}): ReactNode {
  if (!text) return text;

  const matches = text.match(URL_PATTERN);
  if (!matches) return text;

  const linkClassName =
    options.linkClassName ?? (options.inheritColor ? INHERIT_LINK_CLASS : DEFAULT_LINK_CLASS);

  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const rawMatch of matches) {
    const idx = remaining.indexOf(rawMatch);
    if (idx === -1) continue;

    const before = remaining.slice(0, idx);
    if (before) nodes.push(before);

    const { clean: url, trailing } = trimTrailingPunctuation(rawMatch);
    const isMeetLink = /^https?:\/\/meet\.google\.com\//i.test(url);

    if (isMeetLink) {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 mx-0.5 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-extrabold shadow-sm transition-colors align-middle"
        >
          <Video className="h-3 w-3 shrink-0" />
          Join Google Meet
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClassName}
        >
          {url}
        </a>
      );
    }

    if (trailing) nodes.push(trailing);
    remaining = remaining.slice(idx + rawMatch.length);
  }

  if (remaining) nodes.push(remaining);
  return nodes;
}
