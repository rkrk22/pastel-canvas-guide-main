import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, Chapter, Page } from "@/lib/supabase";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePageDialog } from "@/components/app/CreatePageDialog";

export default function ChapterView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchChapterAndPages();
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

  const fetchChapterAndPages = async () => {
    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('slug', slug)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('id, title, slug, index_num, chapter_id, updated_at, content_md')
        .eq('chapter_id', chapterData.id)
        .order('index_num', { ascending: true });

      if (pagesError) throw pagesError;
      setPages(pagesData || []);

      // Redirect to first page if available
      if (pagesData && pagesData.length > 0) {
        navigate(`/app/pages/${pagesData[0].slug}`, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chapter not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{chapter.title}</h1>

        {pages.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No pages in this chapter yet.</p>
            {isAdmin && (
              <Button onClick={() => setShowCreateDialog(true)}>
                Create First Page
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-4">Pages:</h2>
            {pages.map((page) => (
              <div
                key={page.id}
                className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/pages/${page.slug}`)}
              >
                <h3 className="font-medium">{page.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(page.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Add Page
              </Button>
            )}
          </div>
        )}
      </div>

      <CreatePageDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        chapterId={chapter.id}
        onPageCreated={fetchChapterAndPages}
      />
    </>
  );
}
