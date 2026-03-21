import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RouteJob } from "../RoutesTab";

interface Props {
  jobs: RouteJob[];
  selectedDate: string;
}

export default function RecurringScheduleButton({ jobs, selectedDate }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      // Generate weekly recurring jobs for the next 6 months (26 weeks)
      const sourceJobs = jobs.filter((j) => j.assigned_to);
      if (sourceJobs.length === 0) throw new Error("No assigned jobs to recur from.");

      let created = 0;
      for (const job of sourceJobs) {
        const baseDate = new Date(job.scheduled_at);
        for (let week = 1; week <= 26; week++) {
          const newDate = new Date(baseDate);
          newDate.setDate(newDate.getDate() + week * 7);

          const { error } = await supabase.from("jobs").insert({
            client_id: job.client_id,
            service: job.service,
            scheduled_at: newDate.toISOString(),
            duration_minutes: job.duration_minutes,
            estimated_drive_minutes: job.estimated_drive_minutes,
            assigned_to: job.assigned_to, // technician continuity
            status: "scheduled",
            notes: job.notes,
          });
          if (error) throw error;
          created++;
        }
      }
      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["route-jobs"] });
      toast({ title: "Recurring schedule created", description: `${count} future jobs generated over 26 weeks.` });
    },
    onError: (err: Error) => toast({ title: "Scheduling failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl gap-1.5"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
      Generate Recurring
    </Button>
  );
}
