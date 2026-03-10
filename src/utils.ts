import type { ComponentEntry, ElementInfo } from "./types";

// --- React Fiber helpers ---

interface FiberNode {
  return: FiberNode | null;
  type: unknown;
  tag: number;
  key: string | null;
  stateNode: unknown;
  _debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
  } | null;
  _debugOwner?: FiberNode | null;
}

function getReactFiber(el: Element): FiberNode | null {
  for (const key of Object.keys(el)) {
    if (key.startsWith("__reactFiber$")) {
      return (el as unknown as Record<string, unknown>)[key] as FiberNode;
    }
  }
  return null;
}

function getComponentName(fiber: FiberNode): string | null {
  const type = fiber.type;
  if (typeof type === "string") return null;
  if (typeof type === "function" || typeof type === "object") {
    if (type && typeof type === "object" && "displayName" in type) {
      return (type as { displayName?: string }).displayName || null;
    }
    if (typeof type === "function") {
      return (
        (type as { displayName?: string; name?: string }).displayName ||
        (type as { name?: string }).name ||
        null
      );
    }
  }
  return null;
}

// Next.js / React framework internals that clutter the component tree
export const DEFAULT_FRAMEWORK_INTERNALS = [
  "ClientPageRoot",
  "SegmentViewNode",
  "LayoutRouterContext",
  "InnerLayoutRouter",
  "OuterLayoutRouter",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "HTTPAccessFallbackBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "NotFoundErrorBoundary",
  "RenderFromTemplateContext",
  "ScrollAndFocusHandler",
  "AppRouter",
  "HotReload",
  "ReactDevOverlay",
  "PathnameContextProviderAdapter",
] as const;

function normalizeSourcePath(raw: string): string {
  const srcIdx = raw.indexOf("src/");
  return srcIdx !== -1 ? raw.slice(srcIdx) : raw;
}

export function getComponentHierarchy(
  el: Element,
  extraInternals?: string[]
): ComponentEntry[] {
  const fiber = getReactFiber(el);
  if (!fiber) return [];

  const internals = new Set<string>([
    ...DEFAULT_FRAMEWORK_INTERNALS,
    ...(extraInternals ?? []),
  ]);

  const components: ComponentEntry[] = [];
  const seen = new Set<string>();
  let current: FiberNode | null = fiber;
  let levels = 0;

  while (current && levels < 30) {
    const name = getComponentName(current);
    if (name && !seen.has(name) && !internals.has(name)) {
      seen.add(name);
      let source: string | null = null;
      if (current._debugSource) {
        const path = normalizeSourcePath(current._debugSource.fileName);
        source = `${path}:${current._debugSource.lineNumber}`;
      }
      components.push({
        name,
        source,
        key: current.key,
      });
    }
    current = current.return;
    levels++;
  }

  return components;
}

// --- Source from React _debugSource (dev mode only) ---

function getDebugSource(
  el: Element,
  extraInternals?: string[]
): { path: string; line: number } | null {
  const fiber = getReactFiber(el);
  if (!fiber) return null;

  const internals = new Set<string>([
    ...DEFAULT_FRAMEWORK_INTERNALS,
    ...(extraInternals ?? []),
  ]);

  let current: FiberNode | null = fiber;
  let levels = 0;
  while (current && levels < 30) {
    const name = getComponentName(current);
    if (name && !internals.has(name) && current._debugSource) {
      const path = normalizeSourcePath(current._debugSource.fileName);
      return { path, line: current._debugSource.lineNumber };
    }
    current = current.return;
    levels++;
  }
  return null;
}

// --- Source file inference (fallback when _debugSource unavailable) ---

function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function stripTrailingSegments(slug: string): string[] {
  const parts = slug.split("-");
  const candidates: string[] = [];
  for (let i = parts.length; i >= 1; i--) {
    candidates.push(parts.slice(0, i).join("-"));
  }
  return candidates;
}

function inferSourceFile(
  components: string[],
  dataSlot: string,
  componentBases?: Set<string>,
  sourcePathPrefix?: string
): { path: string; confidence: string } | null {
  if (!componentBases || componentBases.size === 0) return null;

  const prefix = sourcePathPrefix ?? "src/components/ui/";

  // 1. High confidence: data-slot based
  if (dataSlot && dataSlot !== "-") {
    for (const candidate of stripTrailingSegments(dataSlot)) {
      if (componentBases.has(candidate)) {
        return {
          path: `${prefix}${candidate}.tsx`,
          confidence: "high",
        };
      }
    }
  }

  // 2. Medium confidence: only check the FIRST (closest) component.
  if (components.length > 0) {
    const kebab = toKebabCase(components[0]);
    for (const candidate of stripTrailingSegments(kebab)) {
      if (componentBases.has(candidate)) {
        return {
          path: `${prefix}${candidate}.tsx`,
          confidence: "medium",
        };
      }
    }
  }

  return null;
}

// --- CSS selector generation ---

const TAILWIND_PATTERN =
  /^(?:-?(?:sm|md|lg|xl|2xl):)?(?:hover:|focus:|active:|group-|peer-)?(?:m[trblxy]?|p[trblxy]?|w|h|min-w|min-h|max-w|max-h|gap|top|right|bottom|left|inset|z|order|col|row|flex|grow|shrink|basis|grid|auto|place|justify|items|self|content|text|font|leading|tracking|decoration|underline|overline|line-through|no-underline|uppercase|lowercase|capitalize|normal-case|truncate|overflow|whitespace|break|bg|from|via|to|border|rounded|outline|ring|shadow|opacity|mix-blend|filter|blur|brightness|contrast|grayscale|invert|saturate|sepia|backdrop|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|accent|appearance|cursor|pointer-events|resize|scroll|snap|touch|select|will-change|sr-only|not-sr-only|fill|stroke|table|inline|block|hidden|visible|invisible|absolute|relative|fixed|sticky|static|float|clear|isolation|object|aspect|columns|space|divide)-/;

function isTailwindClass(cls: string): boolean {
  if (TAILWIND_PATTERN.test(cls)) return true;
  const exactMatches = new Set([
    "flex",
    "grid",
    "block",
    "inline",
    "hidden",
    "absolute",
    "relative",
    "fixed",
    "sticky",
    "static",
    "truncate",
    "uppercase",
    "lowercase",
    "capitalize",
    "underline",
    "overline",
    "invisible",
    "visible",
    "antialiased",
    "italic",
    "not-italic",
    "isolate",
    "container",
    "prose",
    "sr-only",
    "group",
    "peer",
  ]);
  return exactMatches.has(cls);
}

function isUnique(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function collectAncestors(
  el: Element,
  maxLevels: number
): Array<{ tag: string; nthOfType: number | null }> {
  const result: Array<{ tag: string; nthOfType: number | null }> = [];
  let node: Element | null = el;
  for (
    let i = 0;
    i < maxLevels && node && node !== document.documentElement;
    i++
  ) {
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    let nthOfType: number | null = null;
    if (parent) {
      const nodeName = node.tagName;
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === nodeName
      );
      if (siblings.length > 1) {
        nthOfType = siblings.indexOf(node) + 1;
      }
    }
    result.push({ tag, nthOfType });
    node = parent;
  }
  return result;
}

export function generateSelector(el: Element): string {
  // 1. ID
  if (el.id) {
    const sel = `#${CSS.escape(el.id)}`;
    if (isUnique(sel)) return sel;
  }

  const tag = el.tagName.toLowerCase();

  // 2. data-slot
  const slot = el.getAttribute("data-slot");
  if (slot) {
    const sel = `${tag}[data-slot="${slot}"]`;
    if (isUnique(sel)) return sel;
  }

  // 3. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    const sel = `${tag}[aria-label="${ariaLabel}"]`;
    if (isUnique(sel)) return sel;
  }

  // 4. Semantic (non-Tailwind) class
  const classes = Array.from(el.classList).filter((c) => !isTailwindClass(c));
  for (const cls of classes) {
    const sel = `${tag}.${CSS.escape(cls)}`;
    if (isUnique(sel)) return sel;
  }

  // 5. Fallback: parent > child path (max 4 levels)
  const parts: string[] = [];
  const ancestors = collectAncestors(el, 4);
  for (const { tag: ancestorTag, nthOfType } of ancestors) {
    parts.unshift(
      nthOfType ? `${ancestorTag}:nth-of-type(${nthOfType})` : ancestorTag
    );
    const candidate = parts.join(" > ");
    if (isUnique(candidate)) return candidate;
  }

  return parts.join(" > ");
}

// --- Public API ---

export function extractElementInfo(
  el: Element,
  options?: {
    componentBases?: string[];
    sourcePathPrefix?: string;
    frameworkInternals?: string[];
  }
): ElementInfo {
  const text = el.textContent?.trim() ?? "";
  const dataSlot = el.getAttribute("data-slot") || "-";
  const dataTestId = el.getAttribute("data-testid") || "-";
  const entries = getComponentHierarchy(el, options?.frameworkInternals);
  const componentNames = entries.map((e) => e.name);

  const componentBasesSet =
    options?.componentBases && options.componentBases.length > 0
      ? new Set(options.componentBases)
      : undefined;

  // Try _debugSource first (exact), fall back to inference (heuristic)
  const debugSource = getDebugSource(el, options?.frameworkInternals);
  let sourcePath: string;
  let sourceConfidence: string;

  if (debugSource) {
    sourcePath = `${debugSource.path}:${debugSource.line}`;
    sourceConfidence = "exact";
  } else {
    const inferred = inferSourceFile(
      componentNames,
      dataSlot,
      componentBasesSet,
      options?.sourcePathPrefix
    );
    sourcePath = inferred?.path ?? "-";
    sourceConfidence = inferred?.confidence ?? "-";
  }

  // Format component tree with source references
  const componentTree =
    entries.length > 0
      ? entries
          .map((e) => (e.source ? `${e.name} (${e.source})` : e.name))
          .join(" > ")
      : "-";

  return {
    pageUrl: typeof window !== "undefined" ? window.location.href : "-",
    reactComponent: entries.length > 0 ? entries[0].name : "-",
    reactKey: entries.length > 0 ? (entries[0].key ?? "-") : "-",
    componentTree,
    sourcePath,
    sourceConfidence,
    tagName: el.tagName.toLowerCase(),
    id: el.id || "-",
    dataSlot,
    dataTestId,
    ariaLabel: el.getAttribute("aria-label") || "-",
    textContent: text.length > 80 ? text.slice(0, 80) + "..." : text || "-",
    cssSelector: generateSelector(el),
  };
}

export function formatElementInfo(info: ElementInfo): string {
  const lines: string[] = [
    "## Element Picker",
    `- Page: \`${info.pageUrl}\``,
    `- React Component: \`${info.reactComponent}\``,
  ];

  if (info.reactKey !== "-") {
    lines.push(`- React Key: \`${info.reactKey}\``);
  }

  lines.push(`- Component Tree: \`${info.componentTree}\``);

  if (info.sourcePath !== "-") {
    lines.push(`- Source (${info.sourceConfidence}): \`${info.sourcePath}\``);
  }

  lines.push(`- data-slot: \`${info.dataSlot}\``);

  if (info.dataTestId !== "-") {
    lines.push(`- data-testid: \`${info.dataTestId}\``);
  }

  if (info.id !== "-") {
    lines.push(`- id: \`${info.id}\``);
  }
  if (info.ariaLabel !== "-") {
    lines.push(`- aria-label: \`${info.ariaLabel}\``);
  }

  lines.push(`- Text: \`${info.textContent}\``);
  lines.push(`- Selector: \`${info.cssSelector}\``);

  return lines.join("\n");
}
