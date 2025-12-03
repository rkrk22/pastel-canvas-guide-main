import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { DIVIDER_CONTENT_MARKER, buildDividerSlug } from "@/lib/pageDividers";

interface CreateDividerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  onDividerCreated: () => void;
}

export const CreateDividerDialog = ({
  open,
  onOpenChange,
  chapterId,
  onDividerCreated,
}: CreateDividerDialogProps) => {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const selectLastPageIndex = async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('index_num')
      .eq('chapter_id', chapterId)
      .order('index_num', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0].index_num : null;
  };

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a divider title");
      return;
    }

    setLoading(true);

    try {
      const lastIndex = await selectLastPageIndex();
      const nextIndex = typeof lastIndex === "number" ? lastIndex + 1 : 0;
      const slug = buildDividerSlug(trimmedTitle);

      const insertPayload = {
        chapter_id: chapterId,
        title: trimmedTitle,
        slug,
        index_num: nextIndex,
        content_md: DIVIDER_CONTENT_MARKER,
        is_free: false,
      };

      const { error } = await supabase
        .from('pages')
        .insert(insertPayload);

      if (error) {
        const code = (error as { code?: string })?.code;
        if (code === "42703") {
          const { error: fallbackError } = await supabase
            .from('pages')
            .insert({
              chapter_id: chapterId,
              title: trimmedTitle,
              slug,
              index_num: nextIndex,
              content_md: DIVIDER_CONTENT_MARKER,
            });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      toast.success("Divider added");
      setTitle("");
      onOpenChange(false);
      onDividerCreated();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create divider";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Section Divider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="divider-title">Divider title</Label>
            <Input
              id="divider-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., New Section"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Adding..." : "Add Divider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
