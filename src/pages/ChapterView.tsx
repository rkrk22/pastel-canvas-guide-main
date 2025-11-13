import { Fragment, useEffect, useState } from "react";
import type { DragEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, Chapter, Page } from "@/lib/supabase";
import { Loader2, FileText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePageDialog } from "@/components/app/CreatePageDialog";
import { toast } from "sonner";
import { reorderById } from "@/lib/reorder";

export default function ChapterView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [pageOrderSaving, setPageOrderSaving] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

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

  const handlePageDragStart = (event: DragEvent<HTMLElement>, pageId: string) => {
    if (!isAdmin || pageOrderSaving) return;
    setDraggingPageId(pageId);
    setDropIndicatorIndex(null);
    event.dataTransfer.effectAllowed = "move";
  };

  const handlePageDragEnd = () => {
    setDraggingPageId(null);
    setDropIndicatorIndex(null);
  };

  const handlePageDragOver = (
    event: DragEvent<HTMLElement>,
    targetPageId: string | null,
    targetIndex: number | null,
  ) => {
    if (!isAdmin || !draggingPageId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (targetPageId && typeof targetIndex === "number") {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const placeAfter = event.clientY > rect.top + rect.height / 2;
      setDropIndicatorIndex(placeAfter ? targetIndex + 1 : targetIndex);
    } else {
      setDropIndicatorIndex(pages.length);
    }
  };

  const persistPageOrder = async (nextOrder: Page[], previousOrder: Page[]) => {
    setPageOrderSaving(true);
    try {
      const payload = nextOrder.map(({
        id,
        chapter_id,
        content_md,
        slug,
        title,
        index_num,
        updated_at,
      }) => ({
        id,
        chapter_id,
        content_md,
        slug,
        title,
        index_num,
        updated_at,
      }));
      const { error } = await supabase
        .from('pages')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to reorder pages:", error);
      toast.error("Не удалось сохранить порядок страниц");
      setPages(previousOrder);
    } finally {
      setPageOrderSaving(false);
    }
  };

  const handlePageDrop = async (
    event: DragEvent<HTMLElement>,
    targetPageId: string | null,
  ) => {
    if (!isAdmin || !draggingPageId) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget?.getBoundingClientRect();
    const placeAfter = targetPageId && rect
      ? event.clientY > rect.top + rect.height / 2
      : true;

    const reordered = reorderById(pages, draggingPageId, targetPageId, placeAfter);

    if (!reordered) {
      setDraggingPageId(null);
      return;
    }

    const previousOrder = pages;
    setPages(reordered);
    await persistPageOrder(reordered, previousOrder);
    setDraggingPageId(null);
    setDropIndicatorIndex(null);
  };

  const handleNavigateToPage = (pageSlug: string) => {
    if (draggingPageId) return;
    navigate(`/app/pages/${pageSlug}`);
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Pages:</h2>
              {isAdmin && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {pageOrderSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{pageOrderSaving ? "Saving order…" : "Drag to reorder"}</span>
                </div>
              )}
            </div>
            {pages.map((page, index) => (
              <Fragment key={page.id}>
                {dropIndicatorIndex === index && (
                  <div className="mx-6 my-1 h-0.5 rounded-full bg-primary/80" />
                )}
                <div
                  className={`flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer ${
                    draggingPageId === page.id ? "border-primary/60 bg-card/80" : ""
                  }`}
                  onDragOver={(event) => handlePageDragOver(event, page.id, index)}
                  onDrop={(event) => handlePageDrop(event, page.id)}
                  onClick={() => handleNavigateToPage(page.slug)}
                >
                  {isAdmin && (
                    <span
                      className="text-muted-foreground cursor-grab active:cursor-grabbing"
                      draggable={isAdmin && !pageOrderSaving}
                      onDragStart={(event) => handlePageDragStart(event, page.id)}
                      onDragEnd={handlePageDragEnd}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <h3 className="font-medium">{page.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(page.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Fragment>
            ))}
            <div
              className="relative h-6"
              onDragOver={(event) => handlePageDragOver(event, null, null)}
              onDrop={(event) => handlePageDrop(event, null)}
            >
              {dropIndicatorIndex === pages.length && (
                <span className="pointer-events-none absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-primary/80" />
              )}
            </div>
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
