import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CreateChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChapterCreated: () => void;
}

export const CreateChapterDialog = ({ open, onOpenChange, onChapterCreated }: CreateChapterDialogProps) => {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a chapter title");
      return;
    }

    setLoading(true);

    try {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('index_num')
        .order('index_num', { ascending: false })
        .limit(1);

      const nextIndex = chapters && chapters.length > 0 ? chapters[0].index_num + 1 : 0;
      const slug = generateSlug(title);

      const { error } = await supabase
        .from('chapters')
        .insert({ title, slug, index_num: nextIndex });

      if (error) throw error;

      toast.success("Chapter created!");
      setTitle("");
      onOpenChange(false);
      onChapterCreated();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create chapter";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Chapter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chapter-title">Chapter Title</Label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Character Design Basics"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Chapter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
