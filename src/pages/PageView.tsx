import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, Page } from "@/lib/supabase";
import { Loader2, Edit, Save, X, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/app/MarkdownRenderer";
import { toast } from "sonner";

export default function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setPage(null);
    setContentError(null);
    primeContentFromCache(slug);

    loadMarkdownContent(slug);
    syncMetadata(slug);
    checkAdminStatus();
  }, [slug]);

  const getCacheKey = (pageSlug: string) => `page-content-${pageSlug}`;

  const primeContentFromCache = (pageSlug: string) => {
    const cached = localStorage.getItem(getCacheKey(pageSlug));
    if (cached) {
      setContent(cached);
      setEditContent(cached);
      setContentLoading(false);
    } else {
      setContent("");
      setEditContent("");
      setContentLoading(true);
    }
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

  const loadMarkdownContent = async (pageSlug: string) => {
    setContentLoading(true);
    try {
      const response = await fetch(`/api/content/pages/${pageSlug}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Markdown file not found");
      }
      const text = await response.text();
      setContent(text);
      setEditContent(text);
      localStorage.setItem(getCacheKey(pageSlug), text);
      setContentError(null);
    } catch (error: any) {
      setContent("");
      setEditContent("");
      const message = error.message || "Failed to load local markdown file";
      setContentError(message);
      toast.error(message);
    } finally {
      setContentLoading(false);
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
      localStorage.setItem(getCacheKey(page.slug), editContent);
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
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-bold mb-2">{derivedTitle}</h1>
          {page?.updated_at && (
            <p className="text-sm text-muted-foreground">
              Last synced: {new Date(page.updated_at).toLocaleDateString()}
            </p>
          )}
          {!page && (
            <p className="text-xs text-muted-foreground">Syncing metadata from Supabase…</p>
          )}
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <RefreshCcw className="h-3 w-3 animate-spin" />
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
    </div>
  );
}
