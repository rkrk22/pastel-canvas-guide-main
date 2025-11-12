import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AppHome() {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToFirstChapter = async () => {
      const { data } = await supabase
        .from('chapters')
        .select('slug')
        .order('index_num', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        navigate(`/app/chapters/${data.slug}`, { replace: true });
      }
    };

    redirectToFirstChapter();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading guidebook...</p>
      </div>
    </div>
  );
}
