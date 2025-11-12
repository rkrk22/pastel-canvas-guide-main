import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { supabase, Chapter } from "@/lib/supabase";
import { Book, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChapterDialog } from "./CreateChapterDialog";

interface SidebarProps {
  isAdmin: boolean;
}

export const Sidebar = ({ isAdmin }: SidebarProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
              {chapters.map((chapter) => (
                <NavLink
                  key={chapter.id}
                  to={`/app/chapters/${chapter.slug}`}
                  className="block px-3 py-2 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent font-medium"
                >
                  {chapter.title}
                </NavLink>
              ))}
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
