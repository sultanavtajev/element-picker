"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  extractElementInfo,
  formatElementInfo,
  getComponentHierarchy,
} from "./utils";
import type { ElementPickerConfig } from "./types";

const PICKER_ATTR = "data-element-picker";

function isPickerElement(el: Element | null): boolean {
  if (!el) return false;
  return el.closest(`[${PICKER_ATTR}]`) !== null;
}

export function ElementPicker(props: ElementPickerConfig) {
  const {
    componentBases,
    sourcePathPrefix,
    frameworkInternals,
    shortcut,
    formatOutput,
  } = props;

  const [isActive, setIsActive] = useState(false);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [tooltipLabel, setTooltipLabel] = useState("");
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const [CrosshairIcon, setCrosshairIcon] = useState<LucideIcon | null>(null);
  const [Toaster, setToaster] = useState<React.ComponentType | null>(null);

  const extractOptions = useMemo(
    () => ({
      componentBases,
      sourcePathPrefix,
      frameworkInternals,
    }),
    [componentBases, sourcePathPrefix, frameworkInternals]
  );

  const deactivate = useCallback(() => {
    setIsActive(false);
    setHoveredRect(null);
    setTooltipLabel("");
  }, []);

  // Lazy-load lucide-react and sonner to avoid SSR side-effects
  useEffect(() => {
    import("lucide-react")
      .then((mod) => setCrosshairIcon(() => mod.Crosshair))
      .catch(() => {});
    import("sonner")
      .then((mod) => setToaster(() => mod.Toaster))
      .catch(() => {});
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const sc = shortcut ?? { ctrl: true, shift: true, key: "X" };

    function onKeyDown(e: KeyboardEvent) {
      const ctrlMatch = sc.ctrl ? e.ctrlKey : !e.ctrlKey;
      const shiftMatch = sc.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = sc.alt ? e.altKey : !e.altKey;

      if (ctrlMatch && shiftMatch && altMatch && e.key === sc.key) {
        e.preventDefault();
        setIsActive((prev) => {
          if (prev) {
            setHoveredRect(null);
            setTooltipLabel("");
          }
          return !prev;
        });
      }
      if (e.key === "Escape" && isActive) {
        e.preventDefault();
        deactivate();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive, deactivate, shortcut]);

  // Cursor style injection
  useEffect(() => {
    if (isActive) {
      const style = document.createElement("style");
      style.textContent = `body.element-picker-active, body.element-picker-active * { cursor: crosshair !important; }`;
      document.head.appendChild(style);
      document.body.classList.add("element-picker-active");
      styleRef.current = style;
    } else {
      document.body.classList.remove("element-picker-active");
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    }
    return () => {
      document.body.classList.remove("element-picker-active");
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [isActive]);

  // Mousemove + Click handlers
  useEffect(() => {
    if (!isActive) return;

    function onMouseMove(e: MouseEvent) {
      const target = e.target as Element;
      if (isPickerElement(target)) {
        setHoveredRect(null);
        setTooltipLabel("");
        return;
      }
      const rect = target.getBoundingClientRect();
      setHoveredRect(rect);

      const tag = target.tagName.toLowerCase();
      const slot = target.getAttribute("data-slot");
      const hierarchy = getComponentHierarchy(target, frameworkInternals);
      const component = hierarchy.length > 0 ? hierarchy[0].name : null;

      if (component) {
        const slotSuffix = slot ? ` [${slot}]` : "";
        setTooltipLabel(`${component} <${tag}>${slotSuffix}`);
      } else {
        setTooltipLabel(slot ? `<${tag}> [${slot}]` : `<${tag}>`);
      }
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element;
      if (isPickerElement(target)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const info = extractElementInfo(target, extractOptions);
      const text = formatOutput
        ? formatOutput(info)
        : formatElementInfo(info);

      navigator.clipboard.writeText(text).then(
        async () => {
          try {
            const { toast } = await import("sonner");
            toast.success("Element info copied to clipboard");
          } catch {}
        },
        async () => {
          try {
            const { toast } = await import("sonner");
            toast.error("Failed to copy to clipboard");
          } catch {}
        }
      );

      deactivate();
    }

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [isActive, deactivate, extractOptions, formatOutput, frameworkInternals]);

  // SSR guard — all hooks must be above this
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Highlight overlay */}
      {isActive && hoveredRect && (
        <div
          {...{ [PICKER_ATTR]: "" }}
          style={{
            position: "fixed",
            top: hoveredRect.top,
            left: hoveredRect.left,
            width: hoveredRect.width,
            height: hoveredRect.height,
            border: "2px solid #3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            pointerEvents: "none",
            zIndex: 99999,
            borderRadius: 4,
            transition: "all 0.05s ease-out",
          }}
        />
      )}

      {/* Tooltip */}
      {isActive && hoveredRect && tooltipLabel && (
        <div
          {...{ [PICKER_ATTR]: "" }}
          style={{
            position: "fixed",
            top: Math.max(4, hoveredRect.top - 28),
            left: hoveredRect.left,
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            fontSize: 12,
            fontFamily: "monospace",
            padding: "2px 8px",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 100000,
            whiteSpace: "nowrap",
            lineHeight: "20px",
          }}
        >
          {tooltipLabel}
        </div>
      )}

      {/* Status badge */}
      {isActive && (
        <button
          {...{ [PICKER_ATTR]: "" }}
          onClick={deactivate}
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #3b82f6",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Click or press Escape to deactivate"
        >
          {CrosshairIcon ? <CrosshairIcon size={14} /> : <span style={{ width: 14, height: 14, display: "inline-block" }} />}
          Element Picker
        </button>
      )}

      {/* Toaster for toast notifications (auto-included so users don't need to add it) */}
      {Toaster && <Toaster />}
    </>,
    document.body
  );
}
