import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, Page } from "@/lib/supabase";
import { Loader2, Edit, Save, X, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/app/MarkdownRenderer";
import { toast } from "sonner";
import {
  readPageContentCache,
  writePageContentCache,
  writePageContentUpdatedAt,
} from "@/lib/contentCache";

interface PageViewProps {
  slugOverride?: string | null;
}

export default function PageView({ slugOverride }: PageViewProps = {}) {
  const { pageSlug, slug: legacySlug } = useParams<{ pageSlug?: string; slug?: string }>();
  const slug = slugOverride ?? pageSlug ?? legacySlug;
  const initialCachedContent = readPageContentCache(slug);
  const hasInitialCache = initialCachedContent !== null;
  const [page, setPage] = useState<Page | null>(null);
  const [content, setContent] = useState(initialCachedContent ?? "");
  const [editContent, setEditContent] = useState(initialCachedContent ?? "");
  const [contentLoading, setContentLoading] = useState(() => !hasInitialCache);
  const [contentError, setContentError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setPage(null);
    setContentError(null);
    const hadCache = primeContentFromCache(slug);

    loadMarkdownContent(slug, hadCache);
    syncMetadata(slug);
    checkAdminStatus();
  }, [slug]);

  useEffect(() => {
    if (page?.slug && page.updated_at) {
      writePageContentUpdatedAt(page.slug, page.updated_at);
    }
  }, [page?.slug, page?.updated_at]);

  const primeContentFromCache = (pageSlug: string) => {
    const cached = readPageContentCache(pageSlug);
    if (cached !== null) {
      setContent(cached);
      setEditContent(cached);
      setContentLoading(false);
      return true;
    }

    setContent("");
    setEditContent("");
    setContentLoading(true);
    return false;
  };

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const syncMetadata = async (pageSlug: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, updated_at')
        .eq('slug', pageSlug)
        .single();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error('Error syncing page metadata:', error);
    } finally {
      setSyncing(false);
    }
  };

  const loadMarkdownContent = async (pageSlug: string, hadCache = false) => {
    if (!hadCache) {
      setContentLoading(true);
    }
    try {
      const response = await fetch(`/api/content/pages/${pageSlug}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Markdown file not found");
      }
      const text = await response.text();
      setContent(text);
      setEditContent(text);
      writePageContentCache(pageSlug, text, page?.updated_at || undefined);
      setContentError(null);
    } catch (error: any) {
      setContent("");
      setEditContent("");
      const message = error.message || "Failed to load local markdown file";
      setContentError(message);
      toast.error(message);
    } finally {
      if (!hadCache) {
        setContentLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!page) {
      toast.error("Still syncing with Supabase – please wait");
      return;
    }

    setSaving(true);

    try {
      const updateResponse = await fetch(`/api/content/pages/${page.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!updateResponse.ok) {
        const message = await updateResponse.text();
        throw new Error(message || "Failed to update markdown file");
      }

      const newTimestamp = new Date().toISOString();

      const { error } = await supabase
        .from('pages')
        .update({ updated_at: newTimestamp })
        .eq('id', page.id);

      if (error) throw error;

      toast.success("Page saved!");
      setIsEditing(false);
      setContent(editContent);
      writePageContentCache(page.slug, editContent, newTimestamp);
      setPage({ ...page, updated_at: newTimestamp });
    } catch (error: any) {
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const derivedTitle = useMemo(() => {
    if (page?.title) return page.title;
    const headingMatch = content.match(/^#\s+(.+)/m);
    if (headingMatch?.[1]) return headingMatch[1];
    return slug || "Untitled";
  }, [content, page?.title, slug]);

  if (contentLoading && !content) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto p-8 pb-20">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-bold mb-2">{derivedTitle}</h1>
        </div>
        {isAdmin && page && (
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(content);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {syncing && (
        <div className="pointer-events-none fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <RefreshCcw className="h-3 w-3 animate-spin text-primary" />
          <span>Syncing with Supabase…</span>
        </div>
      )}

      {isEditing ? (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Markdown Editor</h3>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[600px] font-mono text-sm"
              placeholder="Write your markdown here..."
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Preview</h3>
            <div className="border border-border rounded-xl p-6 min-h-[600px] bg-card">
              <MarkdownRenderer content={editContent} />
            </div>
          </div>
        </div>
      ) : contentError ? (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl p-6">
          {contentError}
        </div>
      ) : (
        <div className="prose prose-lg max-w-none">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {(page?.updated_at || !page) && (
        <div className="pointer-events-none absolute bottom-0 right-0 text-right text-xs text-muted-foreground space-y-1 p-4">
          {!page && <p>Syncing metadata from Supabase…</p>}
          {page?.updated_at && (
            <p>Last synced: {new Date(page.updated_at).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
