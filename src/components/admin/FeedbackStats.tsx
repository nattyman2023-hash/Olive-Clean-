import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { Star, MessageSquare, TrendingUp } from "lucide-react";

interface FeedbackRow {
  id: string;
  job_id: string;
  client_id: string;
  rating: number;
  comments: string | null;
  created_at: string;
}

export default function FeedbackStats() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFeedback(data ?? []);
        setLoading(false);
      });
  }, []);

  const avgRating = useMemo(() => {
    if (!feedback.length) return 0;
    return +(feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1);
  }, [feedback]);

  const ratingDist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    feedback.forEach((f) => counts[f.rating - 1]++);
    return counts.map((count, i) => ({ stars: `${i + 1}★`, count }));
  }, [feedback]);

  const recentWithComments = useMemo(
    () => feedback.filter((f) => f.comments).slice(0, 5),
    [feedback]
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted" /></CardHeader>
            <CardContent><div className="h-8 w-16 rounded bg-muted" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{avgRating || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{feedback.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">5-Star Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {feedback.length ? `${Math.round((feedback.filter((f) => f.rating === 5).length / feedback.length) * 100)}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No feedback yet</div>
            ) : (
              <ChartContainer config={{ count: { label: "Reviews", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
                <BarChart data={ratingDist}>
                  <XAxis dataKey="stars" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent comments */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Recent Comments</CardTitle></CardHeader>
          <CardContent>
            {recentWithComments.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No comments yet</div>
            ) : (
              <div className="space-y-4 max-h-[260px] overflow-y-auto">
                {recentWithComments.map((f) => (
                  <div key={f.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < f.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                      ))}
                      <span className="text-[0.65rem] text-muted-foreground ml-2">
                        {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{f.comments}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
