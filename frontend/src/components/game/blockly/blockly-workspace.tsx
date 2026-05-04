"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import { pythonGenerator } from "blockly/python";
import type { ToolboxDef, Difficulty } from "./toolbox-configs";
import { DIFFICULTY_TOOLBOXES } from "./toolbox-configs";

// Register custom blocks (side-effect import)
import "./custom-blocks";

interface BlocklyWorkspaceProps {
  toolbox?: ToolboxDef;
  difficulty?: Difficulty;
  mode?: "blocks" | "python";
  initialXml?: string | null;
  maxBlocks?: number;
  onCodeChange?: (jsCode: string, pythonCode: string, xml: string) => void;
  className?: string;
}

export default function BlocklyWorkspace({
  toolbox,
  difficulty = "beginner",
  mode = "blocks",
  initialXml,
  maxBlocks,
  onCodeChange,
  className = "",
}: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Dark mode detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () =>
      setIsDark(
        document.documentElement.classList.contains("dark") || mq.matches
      );
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    mq.addEventListener("change", check);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", check);
    };
  }, []);

  const activeToolbox = toolbox || DIFFICULTY_TOOLBOXES[difficulty];

  // Handle code changes
  const handleChange = useCallback(() => {
    if (!workspaceRef.current || !onCodeChange) return;
    try {
      const js = javascriptGenerator.workspaceToCode(workspaceRef.current);
      const py = pythonGenerator.workspaceToCode(workspaceRef.current);
      const xml = Blockly.Xml.domToText(
        Blockly.Xml.workspaceToDom(workspaceRef.current)
      );
      onCodeChange(js, py, xml);
    } catch {
      // Ignore errors during initialization
    }
  }, [onCodeChange]);

  // Initialize Blockly workspace
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up existing workspace
    if (workspaceRef.current) {
      workspaceRef.current.dispose();
    }

    // Scratch-style block colors
    const h = "";
    const blockStyles: Record<string, Blockly.Theme.BlockStyle> = {
      motion_blocks: { colourPrimary: "#4C97FF", colourSecondary: "#3373CC", colourTertiary: "#2E5EB8", hat: h },
      looks_blocks: { colourPrimary: "#9966FF", colourSecondary: "#774DCB", colourTertiary: "#6B44B8", hat: h },
      event_blocks: { colourPrimary: "#FFBF00", colourSecondary: "#E6AC00", colourTertiary: "#CC9900", hat: h },
      control_blocks: { colourPrimary: "#FFAB19", colourSecondary: "#EC9C13", colourTertiary: "#CF8B17", hat: h },
      sensing_blocks: { colourPrimary: "#5CB1D6", colourSecondary: "#47A8D1", colourTertiary: "#2E8EB8", hat: h },
      operator_blocks: { colourPrimary: "#59C059", colourSecondary: "#46B946", colourTertiary: "#389438", hat: h },
      variable_blocks: { colourPrimary: "#FF8C1A", colourSecondary: "#E07513", colourTertiary: "#CC6A12", hat: h },
      list_blocks: { colourPrimary: "#FF6680", colourSecondary: "#E0506B", colourTertiary: "#CC4460", hat: h },
    };

    const categoryStyles: Record<string, Blockly.Theme.CategoryStyle> = {
      motion_category: { colour: "#4C97FF" },
      looks_category: { colour: "#9966FF" },
      event_category: { colour: "#FFBF00" },
      control_category: { colour: "#FFAB19" },
      sensing_category: { colour: "#5CB1D6" },
      operator_category: { colour: "#59C059" },
      variable_category: { colour: "#FF8C1A" },
      list_category: { colour: "#FF6680" },
    };

    const lightTheme = Blockly.Theme.defineTheme("scratchLight", {
      name: "scratchLight",
      base: Blockly.Themes.Classic,
      blockStyles,
      categoryStyles,
      componentStyles: {
        workspaceBackgroundColour: "#F9F9F9",
        toolboxBackgroundColour: "#FFFFFF",
        toolboxForegroundColour: "#575E75",
        flyoutBackgroundColour: "#F9F9F9",
        flyoutForegroundColour: "#575E75",
        flyoutOpacity: 0.98,
        scrollbarColour: "#CECDCE",
        insertionMarkerColour: "#4C97FF",
        scrollbarOpacity: 0.4,
      },
      fontStyle: {
        family: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        weight: "bold",
        size: 12,
      },
    });

    const darkTheme = Blockly.Theme.defineTheme("scratchDark", {
      name: "scratchDark",
      base: Blockly.Themes.Classic,
      blockStyles,
      categoryStyles,
      componentStyles: {
        workspaceBackgroundColour: "#1E1E2E",
        toolboxBackgroundColour: "#181825",
        toolboxForegroundColour: "#CDD6F4",
        flyoutBackgroundColour: "#1E1E2E",
        flyoutForegroundColour: "#BAC2DE",
        flyoutOpacity: 0.98,
        scrollbarColour: "#45475A",
        insertionMarkerColour: "#89B4FA",
        scrollbarOpacity: 0.5,
      },
      fontStyle: {
        family: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        weight: "bold",
        size: 12,
      },
    });

    const theme = isDark ? darkTheme : lightTheme;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: activeToolbox,
      theme,
      grid: {
        spacing: 28,
        length: 1,
        colour: isDark ? "#333" : "#d4c9b8",
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 2,
        minScale: 0.4,
        scaleSpeed: 1.1,
      },
      trashcan: true,
      maxBlocks: maxBlocks || Infinity,
      renderer: "zelos",
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      sounds: false,
    });

    workspaceRef.current = workspace;

    // Load initial XML
    if (initialXml) {
      try {
        const dom = Blockly.utils.xml.textToDom(initialXml);
        Blockly.Xml.domToWorkspace(dom, workspace);
      } catch {
        // Invalid XML, ignore
      }
    }

    // Listen for changes
    workspace.addChangeListener(handleChange);

    return () => {
      workspace.removeChangeListener(handleChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, maxBlocks]);

  // Update toolbox when it changes
  useEffect(() => {
    if (workspaceRef.current) {
      workspaceRef.current.updateToolbox(activeToolbox);
    }
  }, [activeToolbox]);

  if (mode === "python") {
    return (
      <div className={`relative ${className}`}>
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ visibility: "hidden" }}
        />
        <PythonCodeView workspaceRef={workspaceRef} isDark={isDark} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .blocklySvg { border: none !important; }
        .blocklyScrollbarVertical, .blocklyScrollbarHorizontal { display: none !important; }
        /* Scratch-style toolbox */
        .blocklyToolboxDiv {
          border-right: 1px solid ${isDark ? "#313244" : "#E9EDF2"} !important;
          padding-top: 8px !important;
          background: ${isDark ? "#181825" : "#FFFFFF"} !important;
        }
        .blocklyTreeRow {
          margin: 0 4px 2px !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          height: auto !important;
          line-height: 1.3 !important;
        }
        .blocklyTreeRow:hover { background: ${isDark ? "#313244" : "#F0F0F0"} !important; }
        .blocklyTreeLabel {
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.3px !important;
        }
        .blocklyFlyoutBackground { fill: ${isDark ? "#1E1E2E" : "#F9F9F9"} !important; }
        /* Scratch-style block text */
        .blocklyText { font-size: 12px !important; font-weight: 700 !important; fill: #FFFFFF !important; }
        .blocklyEditableText text { fill: #FFFFFF !important; }
        /* Rounded block connections (zelos already handles most) */
        .blocklyPath { stroke-width: 1px !important; }
        /* Trashcan */
        .blocklyTrash { opacity: 0.3; transition: opacity 0.2s; }
        .blocklyTrash:hover { opacity: 0.9; }
        /* Drop shadow on blocks */
        .blocklyDraggable:not(.blocklyDisabled) > .blocklyPath { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); }
        /* Category icons */
        .blocklyTreeIcon { display: none !important; }
      `}</style>
      <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: 300 }} />
    </>
  );
}

/** Read-only Python code view generated from current Blockly workspace */
function PythonCodeView({
  workspaceRef,
  isDark,
}: {
  workspaceRef: React.MutableRefObject<Blockly.WorkspaceSvg | null>;
  isDark: boolean;
}) {
  const [code, setCode] = useState("");

  useEffect(() => {
    const update = () => {
      if (workspaceRef.current) {
        try {
          setCode(pythonGenerator.workspaceToCode(workspaceRef.current));
        } catch {
          setCode("# Error generating Python code");
        }
      }
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [workspaceRef]);

  return (
    <pre
      className={`h-full overflow-auto rounded-lg p-4 font-mono text-sm ${
        isDark
          ? "bg-[#1e1e2e] text-[#cdd6f4]"
          : "bg-ink-50 text-ink-900"
      }`}
    >
      {code || "# Build blocks to see Python code here"}
    </pre>
  );
}
