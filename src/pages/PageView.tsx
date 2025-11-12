import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, Page } from "@/lib/supabase";
import { Loader2, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/app/MarkdownRenderer";
import { toast } from "sonner";

export default function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPage(slug);
      checkAdminStatus();
    }
  }, [slug]);

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

  const fetchPage = async (pageSlug: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, updated_at')
        .eq('slug', pageSlug)
        .single();

      if (error) throw error;
      setPage(data);
      await loadMarkdownContent(pageSlug);
    } catch (error) {
      console.error('Error fetching page:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkdownContent = async (pageSlug: string) => {
    try {
      const response = await fetch(`/api/content/pages/${pageSlug}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Markdown file not found");
      }
      const text = await response.text();
      setContent(text);
      setEditContent(text);
    } catch (error: any) {
      setContent("");
      setEditContent("");
      toast.error(error.message || "Failed to load local markdown file");
    }
  };

  const handleSave = async () => {
    if (!page) return;

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
        .update({
          updated_at: newTimestamp,
        })
        .eq('id', page.id);

      if (error) throw error;

      toast.success("Page saved!");
      setIsEditing(false);
      setContent(editContent);
      setPage({ ...page, updated_at: newTimestamp });
    } catch (error: any) {
      toast.error(error.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </div>
        {isAdmin && (
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
      ) : (
        <div className="prose prose-lg max-w-none">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
