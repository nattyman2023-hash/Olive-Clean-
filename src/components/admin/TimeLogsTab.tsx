import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimeLogsTab() {
  const [limit, setLimit] = useState(50);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin_time_logs", limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("time_logs")
          .select(`
            *,
            employees (name),
            jobs!time_logs_job_id_fkey (service, clients (name))
          `)
          .order("clock_in", { ascending: false })
          .limit(limit);

        if (error && error.code !== 'PGRST116') throw error;
        return data || [];
      } catch (err: any) {
        // Fallback if 'jobs' relationship doesn't exist yet (migration not applied)
        console.warn("Could not fetch jobs relation, falling back to basic query", err);
        const { data, error } = await supabase
          .from("time_logs")
          .select(`
            *,
            employees (name)
          `)
          .order("clock_in", { ascending: false })
          .limit(limit);

        if (error && error.code !== 'PGRST116') throw error;
        return data || [];
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Time & TrackingLogs</h2>
        <p className="text-muted-foreground">
          Monitor employee clock in / clock out times and their geographical locations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest {logs.length} clock events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Assigned Job</TableHead>
                <TableHead>Location Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.employees?.name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    {log.clock_in ? format(new Date(log.clock_in), "MMM d, yyyy h:mm a") : "-"}
                  </TableCell>
                  <TableCell>
                    {log.clock_out ? format(new Date(log.clock_out), "MMM d, yyyy h:mm a") : (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        Active Now
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.jobs ? (
                      <div>
                        <div className="font-medium text-xs">{(log.jobs as any)?.clients?.name || "Client"}</div>
                        <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{(log.jobs as any)?.service}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.clock_in_lat && log.clock_in_lng && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${log.clock_in_lat},${log.clock_in_lng}`} target="_blank" rel="noreferrer" title="Clock In Location">
                            <MapPin className="h-3 w-3 mr-1" /> In
                          </a>
                        </Button>
                      )}
                      {log.clock_out_lat && log.clock_out_lng && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${log.clock_out_lat},${log.clock_out_lng}`} target="_blank" rel="noreferrer" title="Clock Out Location">
                            <MapPin className="h-3 w-3 mr-1" /> Out
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No time logs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
