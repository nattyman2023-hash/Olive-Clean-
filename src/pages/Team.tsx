import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Users, Award } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getSEO } from "@/lib/seo";

export default function Team() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["public-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, photo_url, certifications, hired_at")
        .eq("status", "active")
        .order("hired_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-primary">
        <div className="container max-w-3xl text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/60">Our People</span>
          <h1 className="text-clamp-hero font-bold text-primary-foreground -tracking-[0.02em]">
            Meet the Olive Clean Team
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            Real people, real passion. Every team member is background-checked, professionally trained, and committed to making your home shine.
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-16 md:py-24">
        <div className="container max-w-5xl">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">Our team profiles are being updated. Check back soon!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {employees.map((emp) => {
                const certs = Array.isArray(emp.certifications) ? emp.certifications as string[] : [];
                return (
                  <div key={emp.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="h-16 w-16 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <h3 className="font-semibold text-foreground">{emp.name}</h3>
                      {certs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {certs.slice(0, 3).map((c: string) => (
                            <span key={c} className="inline-flex items-center gap-1 text-[0.65rem] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              <Award className="h-3 w-3" /> {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="container max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-primary-foreground">Want to Join Our Team?</h2>
          <p className="text-primary-foreground/70">We're always looking for passionate, detail-oriented people to join Olive Clean.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-10 text-base">
              <Link to="/careers">View Open Positions <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
