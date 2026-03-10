# @sultanavtajev/element-picker

React dev tool that gives AI assistants precise context about your UI — hover to highlight, click to copy component hierarchy, source path, CSS selector, and more to clipboard.

Built for AI-assisted development with Claude Code, Cursor, Copilot, and similar tools.

## Why?

AI assistants struggle when you say "fix that button" — they don't know which component, file, or selector you mean. Element Picker solves this:

1. **Activate** the picker (`Ctrl+Shift+X`)
2. **Click** any element in your app
3. **Paste** the copied output into your AI chat
4. **Done** — the AI has full context: component name, source file, CSS selector, hierarchy

No more manual searching for file paths or describing UI elements. One click, one paste.

## Features

- Hover any element to see an overlay with component info
- Click to copy a detailed markdown summary to clipboard
- Shows React component hierarchy with source file references
- Generates smart CSS selectors (ID → data-slot → aria-label → semantic class → ancestor path)
- Resolves source files via React `_debugSource` with heuristic fallback
- Filters out framework internals (Next.js router components, etc.)
- Keyboard shortcut to toggle (default `Ctrl+Shift+X`)
- Renders via portal — zero impact on your app's DOM structure
- SSR-safe — works with Next.js App Router out of the box
- Fully configurable: custom source paths, component bases, output format

## Installation

```bash
npm i @sultanavtajev/element-picker
```

Peer dependencies: `react` ≥ 18 and `react-dom` ≥ 18.

Icons (`lucide-react`) and toasts (`sonner`) are included as regular dependencies and installed automatically.

## Quick start

```bash
npm i @sultanavtajev/element-picker
```

Then ask your AI assistant to add it to your layout:

> Add `<ElementPicker />` from `@sultanavtajev/element-picker` to my root layout. Only render it in development mode.

Or add it manually:

```tsx
import { ElementPicker } from "@sultanavtajev/element-picker";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {process.env.NODE_ENV === "development" && <ElementPicker />}
    </>
  );
}
```

Press **Ctrl+Shift+X** to activate the picker, hover any element, and click to copy its info.

## Clipboard output

Clicking an element copies markdown like this:

```markdown
## Element Picker
- Page: `http://localhost:3000/dashboard`
- React Component: `UserCard`
- React Key: `user-42`
- Component Tree: `AppLayout → DashboardPage → UserCard`
- Source (exact): `src/components/user-card.tsx:14`
- data-slot: `card`
- Text: `John Doe`
- Selector: `[data-slot="card"]`
```

Fields with no value (like `id`, `aria-label`, `data-testid`) are omitted automatically.

## Configuration

All props are optional:

```tsx
<ElementPicker
  componentBases={["button", "card", "dialog"]}
  sourcePathPrefix="src/components/ui/"
  frameworkInternals={["MyInternalWrapper"]}
  shortcut={{ ctrl: true, shift: true, key: "X" }}
  formatOutput={(info) => JSON.stringify(info, null, 2)}
/>
```

### `ElementPickerConfig`

| Prop | Type | Default | Description |
|---|---|---|---|
| `componentBases` | `string[]` | `[]` | UI component base names for source file inference (e.g. `["button", "card"]`) |
| `sourcePathPrefix` | `string` | `"src/components/ui/"` | Path prefix for inferred source files |
| `frameworkInternals` | `string[]` | `[]` | Additional component names to filter from the hierarchy |
| `shortcut` | `ShortcutConfig` | `{ ctrl: true, shift: true, key: "X" }` | Keyboard shortcut to toggle the picker |
| `formatOutput` | `(info: ElementInfo) => string` | Built-in markdown | Custom formatter for clipboard output |

### `ShortcutConfig`

| Field | Type | Default |
|---|---|---|
| `ctrl` | `boolean` | `false` |
| `shift` | `boolean` | `false` |
| `alt` | `boolean` | `false` |
| `key` | `string` | — |

## API reference

### Components

#### `ElementPicker`

The main React component. Renders a portal-based overlay for element inspection. See [Configuration](#configuration) for props.

### Functions

#### `extractElementInfo(element: HTMLElement, config?: ElementPickerConfig): ElementInfo`

Extracts all info for a given DOM element — component hierarchy, source path, CSS selector, attributes, and more.

#### `formatElementInfo(info: ElementInfo): string`

Formats an `ElementInfo` object into the default markdown clipboard string.

#### `generateSelector(element: HTMLElement): string`

Generates a smart CSS selector for an element, preferring stable identifiers (ID, data-slot, aria-label) over brittle positional selectors.

#### `getComponentHierarchy(element: HTMLElement, frameworkInternals?: string[]): ComponentEntry[]`

Walks the React Fiber tree to build a component hierarchy, filtering out framework internals.

### Types

```ts
interface ElementInfo {
  pageUrl: string;
  reactComponent: string;
  reactKey: string;
  componentTree: string;
  sourcePath: string;
  sourceConfidence: string;
  tagName: string;
  id: string;
  dataSlot: string;
  dataTestId: string;
  ariaLabel: string;
  textContent: string;
  cssSelector: string;
}

interface ComponentEntry {
  name: string;
  source: string | null;
  key: string | null;
}

interface ShortcutConfig {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}
```

## License

[MIT](LICENSE)
