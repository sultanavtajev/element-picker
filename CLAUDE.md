# Element Picker

React dev tool component for inspecting DOM elements — hover to highlight, click to copy component hierarchy, source path, CSS selector, and more to clipboard.

## Project structure

- `src/element-picker.tsx` — Main `<ElementPicker>` React component (portal-based overlay)
- `src/utils.ts` — Core logic: React Fiber traversal, source inference, CSS selector generation
- `src/types.ts` — TypeScript interfaces (`ElementInfo`, `ElementPickerConfig`, `ShortcutConfig`)
- `src/index.ts` — Public exports

## Tech stack

- **React 18+** (peer dependency), TypeScript, TSX with `"use client"` directive
- **tsup** for bundling (ESM + CJS + `.d.ts`)
- **Peer deps**: `react`, `react-dom`, `lucide-react` (optional), `sonner` (optional)
- Published as `@sultanavtajev/element-picker`

## Commands

- `npm run build` — Production build via tsup
- `npm run dev` — Watch mode build

## Key patterns

- React Fiber internals accessed via `__reactFiber$` keys on DOM elements
- `_debugSource` used for exact source file resolution (dev mode only)
- Heuristic source inference falls back on `data-slot` and component name kebab-case matching
- CSS selector generation: ID → data-slot → aria-label → semantic class → ancestor path
- Framework internals (Next.js router components etc.) filtered from component hierarchy
- Picker UI rendered via `createPortal` to `document.body`, self-identified with `data-element-picker` attribute
