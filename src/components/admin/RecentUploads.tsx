import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Attachment {
  id: string;
  job_id: string;
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

export default function RecentUploads({ onNavigate }: { onNavigate?: (section: string, targetId?: string) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["recent-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_attachments" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as Attachment[];
    },
  });

  // Fetch job info for linking
  const jobIds = [...new Set(attachments.map((a) => a.job_id))];
  const { data: jobsData = [] } = useQuery({
    queryKey: ["upload-jobs", jobIds],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, service, clients(name)")
        .in("id", jobIds);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const jobMap = new Map(jobsData.map((j: any) => [j.id, j]));

  const handleJobClick = (jobId: string) => {
    onNavigate?.("jobs", jobId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {attachments.map((a) => {
          const url = getPublicUrl(a.bucket, a.file_path);
          const job = jobMap.get(a.job_id);
          const clientName = job?.clients?.name;
          return (
            <div key={a.id} className="relative">
              <button
                onClick={() => setLightbox(url)}
                className="relative aspect-square w-full rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all group bg-muted"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[0.5rem] px-1 py-0">
                      {a.category}
                    </Badge>
                    <Badge variant="outline" className="text-[0.5rem] px-1 py-0 bg-background/50">
                      {a.uploader_role}
                    </Badge>
                  </div>
                  <p className="text-[0.55rem] text-white/80">
                    {format(new Date(a.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </button>
              {/* Job reference link */}
              {clientName && (
                <button
                  onClick={() => handleJobClick(a.job_id)}
                  className="mt-1 flex items-center gap-1 text-[0.6rem] text-primary hover:underline truncate w-full text-left"
                >
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  {clientName}
                </button>
              )}
            </div>
          );
        })}
      </div>

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
