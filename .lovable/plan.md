

# Fix Chatbot JSON Leak, Revert Hero, Add Scroll Counters

## 1. Fix Chatbot — Strip Raw JSON from Messages

**Problem**: The AI model sometimes outputs `{"suggested_replies": [...]}` as plain text within its response content. This raw JSON shows up in the chat bubble.

**Fix in `src/components/chat/ChatWidget.tsx`**:
- Before setting the reply as a message, strip any trailing JSON blob matching `{"suggested_replies": [...]}` from the text
- Also parse that stripped JSON to extract suggested replies as a fallback

```typescript
// Clean the reply text before displaying
let cleanReply = reply.replace(/\{["\s]*suggested_replies["\s]*:.*\}$/s, '').trim();
```

**Fix in `supabase/functions/chat-process/index.ts`**:
- Same server-side: before returning `reply`, strip any `{"suggested_replies":...}` JSON that leaked into the content string
- Parse it and merge into the `suggestedReplies` array if found

## 2. Revert Hero Section

**Problem**: User wants the hero reverted. The current parallax full-bleed background image may not be loading well or feels different from expected.

**Fix in `src/components/HeroSection.tsx`**:
- Remove the `nashville-home-hero.jpg` import and parallax background
- Return to a clean gradient-based hero with a two-column layout: text on the left, a decorative illustration/image placeholder on the right
- Keep the trust badges, CTA buttons, and quick stats
- Use a subtle CSS gradient background instead of a photo

## 3. Add Animated Scroll-Triggered Counters

**New hook**: `src/hooks/useCountUp.ts`
- Accepts a target number and duration
- Uses `useScrollReveal` to trigger counting when visible
- Animates from 0 to target using `requestAnimationFrame`

**Update `src/components/HeroSection.tsx`** (or new `StatsCounter` component):
- Replace the static stats text with animated counters
- Stats: "200+" families served, "4.9" star rating, "4-6 hrs" saved weekly
- Numbers count up when they scroll into view, then stop

**New component**: `src/components/AnimatedCounter.tsx`
- Takes `end` (number), `suffix` (e.g., "+", "★"), `label`, `duration` (ms)
- Uses IntersectionObserver to trigger, requestAnimationFrame to animate
- Displays in a clean stat card format

---

## Files Summary

| File | Change |
|---|---|
| `src/components/chat/ChatWidget.tsx` | Strip JSON blobs from reply text before display |
| `supabase/functions/chat-process/index.ts` | Strip leaked JSON from AI content server-side |
| `src/components/HeroSection.tsx` | Revert to gradient hero, no parallax image; integrate animated counters |
| `src/components/AnimatedCounter.tsx` | New: scroll-triggered counting animation component |

