import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface Attachment {
  id: string;
  file_path: string;
  bucket: string;
  category: string;
  uploader_role: string;
  created_at: string;
}

function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function JobPhotosGallery({ jobId }: { jobId: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["job-attachments", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_attachments" as any)
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Attachment[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-4">
        <ImageIcon className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  const beforePhotos = attachments.filter((a) => a.category === "before");
  const afterPhotos = attachments.filter((a) => a.category === "after");
  const otherPhotos = attachments.filter((a) => a.category !== "before" && a.category !== "after");

  const renderGroup = (title: string, items: Attachment[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
        <div className="grid grid-cols-4 gap-2">
          {items.map((a) => {
            const url = getPublicUrl(a.bucket, a.file_path);
            return (
              <button
                key={a.id}
                onClick={() => setLightbox(url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-[0.5rem] px-1 py-0">
                    {a.uploader_role}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderGroup("Before", beforePhotos)}
      {renderGroup("After", afterPhotos)}
      {renderGroup("Other", otherPhotos)}

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          {lightbox && (
            <img src={lightbox} alt="Full size" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
