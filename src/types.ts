export interface ComponentEntry {
  name: string;
  source: string | null; // "file:line" or null
  key: string | null;
}

export interface ElementInfo {
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

export interface ShortcutConfig {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}

export interface ElementPickerConfig {
  /** UI component base names for source file inference (e.g. ["button", "card", "dialog"]) */
  componentBases?: string[];
  /** Path prefix for inferred source files (default: "src/components/ui/") */
  sourcePathPrefix?: string;
  /** Additional framework internal component names to filter from hierarchy */
  frameworkInternals?: string[];
  /** Keyboard shortcut to toggle the picker (default: Ctrl+Shift+X) */
  shortcut?: ShortcutConfig;
  /** Custom output formatter — receives ElementInfo, returns string for clipboard */
  formatOutput?: (info: ElementInfo) => string;
}
