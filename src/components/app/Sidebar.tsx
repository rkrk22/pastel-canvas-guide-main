import { Fragment, useEffect, useState } from "react";
import type { DragEvent } from "react";
import { NavLink } from "@/components/NavLink";
import { supabase, Chapter } from "@/lib/supabase";
import { Book, Plus, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChapterDialog } from "./CreateChapterDialog";
import { toast } from "sonner";
import { reorderById } from "@/lib/reorder";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isAdmin: boolean;
}

export const Sidebar = ({ isAdmin }: SidebarProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [draggingChapterId, setDraggingChapterId] = useState<string | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title, slug, index_num, created_at')
        .order('index_num', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterDragStart = (event: DragEvent<HTMLElement>, chapterId: string) => {
    if (!isAdmin || orderSaving) return;
    setDraggingChapterId(chapterId);
    setDropIndicatorIndex(null);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleChapterDragEnd = () => {
    setDraggingChapterId(null);
    setDropIndicatorIndex(null);
  };

  const handleChapterDragOver = (
    event: DragEvent<HTMLElement>,
    targetChapterId: string | null,
    targetIndex: number | null,
  ) => {
    if (!isAdmin || !draggingChapterId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (targetChapterId && typeof targetIndex === "number") {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const placeAfter = event.clientY > rect.top + rect.height / 2;
      setDropIndicatorIndex(placeAfter ? targetIndex + 1 : targetIndex);
    } else {
      setDropIndicatorIndex(chapters.length);
    }
  };

  const persistChapterOrder = async (nextOrder: Chapter[], previousOrder: Chapter[]) => {
    setOrderSaving(true);
    try {
      const payload = nextOrder.map(({ id, title, slug, index_num, created_at }) => ({
        id,
        title,
        slug,
        index_num,
        created_at,
      }));
      const { error } = await supabase
        .from('chapters')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to reorder chapters:", error);
      toast.error("Не удалось сохранить порядок глав");
      setChapters(previousOrder);
    } finally {
      setOrderSaving(false);
    }
  };

  const handleChapterDrop = async (
    event: DragEvent<HTMLElement>,
    targetChapterId: string | null,
  ) => {
    if (!isAdmin || !draggingChapterId) return;
    event.preventDefault();
    event.stopPropagation();

    const cursorY = event.clientY;
    const rect = event.currentTarget?.getBoundingClientRect();
    const placeAfter = targetChapterId && rect
      ? cursorY > rect.top + rect.height / 2
      : true;

    const reordered = reorderById(chapters, draggingChapterId, targetChapterId, placeAfter);

    if (!reordered) {
      setDraggingChapterId(null);
      return;
    }

    const previousOrder = chapters;
    setChapters(reordered);
    await persistChapterOrder(reordered, previousOrder);
    setDraggingChapterId(null);
    setDropIndicatorIndex(null);
  };

  return (
    <>
      <aside className="w-64 border-r border-sidebar-border bg-sidebar-background flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <Book className="h-5 w-5 text-sidebar-primary" />
            <h2 className="font-semibold text-sidebar-foreground">Chapters</h2>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chapter
            </Button>
          )}
          {isAdmin && (
            <div className="mt-2 space-y-1">
              {orderSaving && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving order…</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Drag chapters to reorder
              </p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chapters.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No chapters yet.
              {isAdmin && " Create one to get started!"}
            </div>
          ) : (
            <nav className="p-2 space-y-1">
              {chapters.map((chapter, index) => (
                <Fragment key={chapter.id}>
                  {dropIndicatorIndex === index && (
                    <div className="mx-4 my-1 h-0.5 rounded-full bg-sidebar-primary/80" />
                  )}
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-1",
                      draggingChapterId === chapter.id && "border border-sidebar-primary/40 bg-sidebar-accent/40",
                    )}
                    onDragOver={(event) => handleChapterDragOver(event, chapter.id, index)}
                    onDrop={(event) => handleChapterDrop(event, chapter.id)}
                  >
                    {isAdmin && (
                      <span
                        className="text-muted-foreground cursor-grab active:cursor-grabbing"
                        draggable={isAdmin && !orderSaving}
                        onDragStart={(event) => handleChapterDragStart(event, chapter.id)}
                        onDragEnd={handleChapterDragEnd}
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    )}
                    <NavLink
                      to={`/app/chapters/${chapter.slug}`}
                      className="flex-1 block px-3 py-2 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent font-medium"
                    >
                      {chapter.title}
                    </NavLink>
                  </div>
                </Fragment>
              ))}
              <div
                className="relative h-6"
                onDragOver={(event) => handleChapterDragOver(event, null, null)}
                onDrop={(event) => handleChapterDrop(event, null)}
              >
                {dropIndicatorIndex === chapters.length && (
                  <span className="pointer-events-none absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-sidebar-primary/80" />
                )}
              </div>
            </nav>
          )}
        </ScrollArea>
      </aside>

      <CreateChapterDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChapterCreated={fetchChapters}
      />
    </>
  );
};
