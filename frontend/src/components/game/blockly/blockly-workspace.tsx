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

    const blockStyles: Record<string, Blockly.Theme.BlockStyle> = {};
    const categoryStyles: Record<string, Blockly.Theme.CategoryStyle> = {};

    const lightTheme = Blockly.Theme.defineTheme("kidLight", {
      name: "kidLight",
      base: Blockly.Themes.Classic,
      blockStyles,
      categoryStyles,
      componentStyles: {
        workspaceBackgroundColour: "#f8fafc",
        toolboxBackgroundColour: "#ffffff",
        toolboxForegroundColour: "#1e293b",
        flyoutBackgroundColour: "#f1f5f9",
        flyoutForegroundColour: "#334155",
        flyoutOpacity: 0.97,
        scrollbarColour: "#cbd5e1",
        insertionMarkerColour: "#6366f1",
        scrollbarOpacity: 0.5,
      },
      fontStyle: {
        family: "'Inter', 'Segoe UI', system-ui, sans-serif",
        weight: "bold",
        size: 13,
      },
    });

    const darkTheme = Blockly.Theme.defineTheme("kidDark", {
      name: "kidDark",
      base: Blockly.Themes.Classic,
      blockStyles,
      categoryStyles,
      componentStyles: {
        workspaceBackgroundColour: "#1a1a2e",
        toolboxBackgroundColour: "#16162a",
        toolboxForegroundColour: "#e2e8f0",
        flyoutBackgroundColour: "#1e1e36",
        flyoutForegroundColour: "#cbd5e1",
        flyoutOpacity: 0.97,
        scrollbarColour: "#334155",
        insertionMarkerColour: "#818cf8",
        scrollbarOpacity: 0.5,
      },
      fontStyle: {
        family: "'Inter', 'Segoe UI', system-ui, sans-serif",
        weight: "bold",
        size: 13,
      },
    });

    const theme = isDark ? darkTheme : lightTheme;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: activeToolbox,
      theme,
      grid: {
        spacing: 25,
        length: 3,
        colour: isDark ? "#2a2a44" : "#e2e8f0",
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
    <div ref={containerRef} className={`relative ${className}`} style={{ minHeight: 300 }} />
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
          : "bg-slate-50 text-slate-800"
      }`}
    >
      {code || "# Build blocks to see Python code here"}
    </pre>
  );
}
