import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase, Chapter, Page } from "@/lib/supabase";
import { Loader2, FileText, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePageDialog } from "@/components/app/CreatePageDialog";
import { toast } from "sonner";
import { reorderById } from "@/lib/reorder";
import { readPageContentCache, shouldPrefetchPageContent, writePageContentCache } from "@/lib/contentCache";
import PageView from "./PageView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChapterView() {
  const { chapterSlug } = useParams<{ chapterSlug: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [pageOrderSaving, setPageOrderSaving] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [navigatingPageSlug, setNavigatingPageSlug] = useState<string | null>(null);
  const [pagePendingDeletion, setPagePendingDeletion] = useState<Page | null>(null);
  const [pageDeleting, setPageDeleting] = useState(false);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null);
  const fetchRequestRef = useRef(0);
  const loadingRequestRef = useRef<number | null>(null);
  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedPageSlug) ?? null,
    [pages, selectedPageSlug],
  );

  const checkAdminStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
  }, []);

  const deleteMarkdownFile = async (slug: string) => {
    const response = await fetch(`/api/content/pages/${slug}`, { method: "DELETE" });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to delete markdown file");
    }
  };

  const handleConfirmDeletePage = async () => {
    if (!pagePendingDeletion) return;
    setPageDeleting(true);
    const pageToDelete = pagePendingDeletion;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageToDelete.id);

      if (error) throw error;

      await deleteMarkdownFile(pageToDelete.slug);

      setPages((prev) => {
        const nextPages = prev.filter((pageItem) => pageItem.id !== pageToDelete.id);
        setSelectedPageSlug((current) => {
          if (current && nextPages.some((page) => page.slug === current)) {
            return current;
          }
          return nextPages[0]?.slug ?? null;
        });
        return nextPages;
      });
      toast.success("Page deleted");
    } catch (error: unknown) {
      console.error("Failed to delete page:", error);
      const message = error instanceof Error ? error.message : "Failed to delete page";
      toast.error(message);
    } finally {
      setPageDeleting(false);
      setPagePendingDeletion(null);
    }
  };

  const fetchChapterAndPages = useCallback(async ({ withLoading }: { withLoading?: boolean } = {}) => {
    if (!chapterSlug) return;
    const requestId = ++fetchRequestRef.current;

    if (withLoading) {
      loadingRequestRef.current = requestId;
      setLoading(true);
      setChapter(null);
      setPages([]);
      setSelectedPageSlug(null);
    }

    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('slug', chapterSlug)
        .single();

      if (chapterError) throw chapterError;
      if (fetchRequestRef.current !== requestId) return;
      setChapter(chapterData);

      const selectPages = async () => {
        const { data, error } = await supabase
          .from('pages')
          .select('id, title, slug, index_num, chapter_id, updated_at, content_md, is_free')
          .eq('chapter_id', chapterData.id)
          .order('index_num', { ascending: true });

        if (error) {
          const code = (error as { code?: string })?.code;
          if (code === "42703") {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('pages')
              .select('id, title, slug, index_num, chapter_id, updated_at, content_md')
              .eq('chapter_id', chapterData.id)
              .order('index_num', { ascending: true });
            if (fallbackError) throw fallbackError;
            return (fallbackData ?? []).map((page) => ({ ...page, is_free: false }));
          }
          throw error;
        }
        return data ?? [];
      };

      const pagesData = await selectPages();
      if (fetchRequestRef.current !== requestId) return;
      setPages(pagesData || []);

      if (pagesData && pagesData.length > 0) {
        // Ensure the first page content is cached before the reader opens
        await prefetchPageContents([pagesData[0]]);
        // Warm up the rest of the chapter in the background
        void prefetchPageContents(pagesData.slice(1));
        if (fetchRequestRef.current !== requestId) return;
        setSelectedPageSlug((current) => {
          if (current && pagesData.some((page) => page.slug === current)) {
            return current;
          }
          return pagesData[0]?.slug ?? null;
        });
      } else {
        setSelectedPageSlug(null);
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      if (loadingRequestRef.current === requestId) {
        setLoading(false);
        loadingRequestRef.current = null;
      }
    }
  }, [chapterSlug]);

  useEffect(() => {
    if (chapterSlug) {
      fetchChapterAndPages({ withLoading: true });
      checkAdminStatus();
    }
  }, [chapterSlug, fetchChapterAndPages, checkAdminStatus]);

  const prefetchPageContents = async (pageList: Page[]) => {
    if (typeof window === "undefined" || pageList.length === 0) return;

    await Promise.allSettled(
      pageList.map(async (page) => {
        if (!page.slug) return;

        const needsPrefetch = shouldPrefetchPageContent(page.slug, page.updated_at);
        if (!needsPrefetch) return;

        try {
          const response = await fetch(`/content/pages/${page.slug}.md`);
          if (!response.ok) return;
          const text = await response.text();
          writePageContentCache(page.slug, text, page.updated_at || undefined);
        } catch (error) {
          console.error("Failed to prefetch page content", { slug: page.slug, error });
        }
      }),
    );
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
        is_free,
        slug,
        title,
        index_num,
        updated_at,
      }) => ({
        id,
        chapter_id,
        content_md,
        is_free,
        slug,
        title,
        index_num,
        updated_at,
      }));
      const upsertPages = async () => {
        const { error } = await supabase
          .from('pages')
          .upsert(payload, { onConflict: 'id' });
        if (error) {
          const code = (error as { code?: string })?.code;
          if (code === "42703") {
            const fallbackPayload = payload.map(({ is_free, ...rest }) => rest);
            const { error: fallbackError } = await supabase
              .from('pages')
              .upsert(fallbackPayload, { onConflict: 'id' });
            if (fallbackError) throw fallbackError;
            return;
          }
          throw error;
        }
      };

      await upsertPages();
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

  const handleNavigateToPage = async (pageSlug: string) => {
    if (draggingPageId || navigatingPageSlug === pageSlug) return;
    if (!chapterSlug) return;

    setNavigatingPageSlug(pageSlug);
    try {
      const cached = readPageContentCache(pageSlug);
      if (!cached) {
        await prefetchPageContents(pages.filter((page) => page.slug === pageSlug));
      }
      setSelectedPageSlug(pageSlug);
    } finally {
      setNavigatingPageSlug(null);
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
      <div className="py-8 pr-8 pl-4 max-w-6xl w-full">
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
          <div className="grid gap-8 lg:grid-cols-[180px,1fr]">
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
                    <div className="mx-3 my-1 h-0.5 rounded-full bg-primary/80" />
                  )}
                  <div
                    className={`flex items-start gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer ${
                      draggingPageId === page.id ? "border-primary/60 bg-card/80" : ""
                    } ${navigatingPageSlug === page.slug ? "opacity-70" : ""} ${
                      selectedPageSlug === page.slug ? "border-primary" : ""
                    }`}
                    onDragOver={(event) => handlePageDragOver(event, page.id, index)}
                    onDrop={(event) => handlePageDrop(event, page.id)}
                    onClick={() => void handleNavigateToPage(page.slug)}
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
                    <div className="text-left flex-1">
                      <h3 className="font-medium leading-tight">{page.title}</h3>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!pageDeleting) {
                            setPagePendingDeletion(page);
                          }
                        }}
                        disabled={pageDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

            <div className="border border-border rounded-2xl bg-card/30 p-4 min-h-[400px]">
              {selectedPageSlug ? (
                <div className="h-full overflow-auto">
                  <PageView
                    slugOverride={selectedPageSlug}
                    initialPage={selectedPage}
                    onNavigateToSlug={(nextSlug) => {
                      // Open target page in a new tab/window using the public reader route
                      const url = `/read/${nextSlug}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                      return true;
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select a page to start reading.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreatePageDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        chapterId={chapter.id}
        onPageCreated={() => fetchChapterAndPages({ withLoading: false })}
      />

      <AlertDialog
        open={!!pagePendingDeletion}
        onOpenChange={(open) => {
          if (!open && !pageDeleting) {
            setPagePendingDeletion(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the page
              {pagePendingDeletion?.title ? ` "${pagePendingDeletion.title}"` : ""} and its markdown file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pageDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePage}
              disabled={pageDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pageDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
