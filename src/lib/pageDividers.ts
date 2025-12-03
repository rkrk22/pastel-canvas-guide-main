export const DIVIDER_CONTENT_MARKER = "__DIVIDER__";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const buildDividerSlug = (title: string) => {
  const base = slugify(title || "divider");
  const unique = Math.random().toString(36).slice(2, 7);
  return `divider-${base || "section"}-${unique}`;
};

type PageLike = {
  slug?: string | null;
  content_md?: string | null;
};

export const isDividerPage = (page: PageLike) => {
  const slug = page.slug ?? "";
  const content = page.content_md;

  if (content === DIVIDER_CONTENT_MARKER) return true;
  if ((content === undefined || content === null) && slug.startsWith("divider-")) return true;

  return false;
};
