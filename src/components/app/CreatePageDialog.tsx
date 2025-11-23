import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  onPageCreated: () => void;
}

export const CreatePageDialog = ({ open, onOpenChange, chapterId, onPageCreated }: CreatePageDialogProps) => {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const createMarkdownFile = async (slug: string, pageTitle: string) => {
    const response = await fetch(`/api/content/pages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug,
        title: pageTitle,
        content: `# ${pageTitle}\n\nStart writing here...`,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to create markdown file");
    }
  };

  const deleteMarkdownFile = async (slug: string) => {
    await fetch(`/api/content/pages/${slug}`, { method: "DELETE" });
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a page title");
      return;
    }

    setLoading(true);

    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('index_num')
        .eq('chapter_id', chapterId)
        .order('index_num', { ascending: false })
        .limit(1);

      const nextIndex = pages && pages.length > 0 ? pages[0].index_num + 1 : 0;
      const slug = generateSlug(title);

      await createMarkdownFile(slug, title);

      const { error } = await supabase
        .from('pages')
        .insert({
          chapter_id: chapterId,
          title,
          slug,
          index_num: nextIndex,
          content_md: '',
        });

      if (error) {
        await deleteMarkdownFile(slug);
        throw error;
      }

      toast.success("Page created!");
      setTitle("");
      onOpenChange(false);
      onPageCreated();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create page";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Color Theory"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
