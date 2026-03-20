import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const homeSizes = [
  { label: "1–2 Bed", hours: 3 },
  { label: "3–4 Bed", hours: 5 },
  { label: "5+ Bed", hours: 7 },
];

const frequencies = [
  { label: "Weekly", multiplier: 4 },
  { label: "Bi-Weekly", multiplier: 2 },
  { label: "Monthly", multiplier: 1 },
];

export default function TimeSavedCalculator() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [freqIdx, setFreqIdx] = useState(0);
  const { ref, isVisible } = useScrollReveal();

  const hoursSaved = homeSizes[sizeIdx].hours * frequencies[freqIdx].multiplier;

  return (
    <section className="py-24 md:py-32 bg-background">
      <div
        className={`container max-w-3xl transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
        ref={ref}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="text-center mb-12 space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Time Calculator</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground -tracking-[0.02em]">
            How Much Time Will You Save?
          </h2>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 md:p-12 space-y-8">
          {/* Home Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Home Size</label>
            <div className="flex gap-3">
              {homeSizes.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSizeIdx(i)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.97] ${
                    sizeIdx === i
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Cleaning Frequency</label>
            <div className="flex gap-3">
              {frequencies.map((f, i) => (
                <button
                  key={f.label}
                  onClick={() => setFreqIdx(i)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.97] ${
                    freqIdx === i
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">You'll save approximately</p>
            <p className="text-5xl font-bold text-accent tabular-nums">{hoursSaved}</p>
            <p className="text-lg text-foreground font-medium mt-1">hours every month</p>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              That's {Math.round(hoursSaved / 4)} weekends of family time, hobbies, or simply doing nothing at all.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
