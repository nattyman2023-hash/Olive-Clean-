import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RouteJob, Employee } from "../RoutesTab";

// Service → required certification mapping
const SERVICE_CERT_MAP: Record<string, string> = {
  "deep-clean": "Deep Clean Certified",
  "signature-deep-clean": "Debbie Sardone Method",
  "eco-friendly": "Green Clean Pro",
};

interface Props {
  jobs: RouteJob[];
  employees: Employee[];
  selectedDate: string;
}

export default function AutoAssignButton({ jobs, employees, selectedDate }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const unassigned = jobs.filter((j) => !j.assigned_to);
      if (unassigned.length === 0) throw new Error("No unassigned jobs to dispatch.");

      // Build tech workload map
      const workload: Record<string, number> = {};
      employees.forEach((e) => { workload[e.user_id] = 0; });
      jobs.forEach((j) => {
        if (j.assigned_to && workload[j.assigned_to] !== undefined) {
          workload[j.assigned_to] += (j.duration_minutes || 60);
        }
      });

      const assignments: { id: string; assigned_to: string }[] = [];

      for (const job of unassigned) {
        const jobZone = job.clients?.neighborhood || "";
        const requiredCert = SERVICE_CERT_MAP[job.service];

        // Score each tech
        let bestTech: Employee | null = null;
        let bestScore = -Infinity;

        for (const emp of employees) {
          const certs = (emp.certifications as string[]) || [];

          // Skill constraint: skip if missing required cert
          if (requiredCert && !certs.includes(requiredCert)) continue;

          // Score = zone match bonus - workload penalty
          const zoneBonus = jobs.some(
            (j) => j.assigned_to === emp.user_id && j.clients?.neighborhood === jobZone
          ) ? 50 : 0;
          const loadPenalty = (workload[emp.user_id] || 0) / 10;

          const score = 100 + zoneBonus - loadPenalty;
          if (score > bestScore) {
            bestScore = score;
            bestTech = emp;
          }
        }

        if (bestTech) {
          assignments.push({ id: job.id, assigned_to: bestTech.user_id });
          workload[bestTech.user_id] = (workload[bestTech.user_id] || 0) + (job.duration_minutes || 60);
        }
      }

      if (assignments.length === 0) throw new Error("No eligible technicians for the remaining jobs.");

      for (const a of assignments) {
        const { error } = await supabase.from("jobs").update({ assigned_to: a.assigned_to }).eq("id", a.id);
        if (error) throw error;
      }

      return assignments.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["route-jobs", selectedDate] });
      toast({ title: "Auto-assigned", description: `${count} job(s) dispatched to technicians.` });
    },
    onError: (err: Error) => toast({ title: "Dispatch failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl gap-1.5"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
      Auto-Assign
    </Button>
  );
}
