## Problem

The published site at `oliveclean.co` loads its HTML and assets correctly, but immediately crashes with:

```
ReferenceError: Cannot access 'P' before initialization
  at /assets/charts-vendor-Dn70FGEW.js
```

This leaves `#root` empty — a fully blank page. The Lovable preview is unaffected because Vite dev mode does not apply production chunking. Republishing alone will not fix it; the bug is in the build config.

## Root cause

In `vite.config.ts`, `manualChunks` isolates `recharts` and `d3-*` into a `charts-vendor` chunk:

```ts
if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
```

`recharts` and the `d3-*` packages have circular module dependencies. When Rollup splits them away from React and from each other's natural import graph, the resulting chunk references a hoisted binding before its initializer runs (TDZ). Any page that loads this chunk crashes the whole app.

This is a known footgun with manual chunking + recharts/d3.

## Fix

Remove the `charts-vendor` split so recharts/d3 bundle naturally with their importers. Same treatment for any other split that is risky for the same reason.

Edit `vite.config.ts` `manualChunks`:

- Delete the `charts-vendor` rule (recharts + d3).
- Keep the safe splits: `react-vendor`, `radix-vendor`, `data-vendor`, `icons-vendor`, `dnd-vendor`, `map-vendor`, `markdown-vendor`, `date-vendor`.

Result: recharts will be code-split per-route by Vite's automatic chunking, which respects the import graph and avoids the TDZ.

## Verification

1. Run `npm run build` in the sandbox and confirm it succeeds.
2. Ask the user to click **Publish → Update** to redeploy.
3. Re-fetch `https://oliveclean.co` and confirm the page renders (no `ReferenceError` in console).

## Notes

- No code changes outside `vite.config.ts`.
- Bundle size impact is negligible; recharts will still be a separate async chunk wherever it's lazily imported.
