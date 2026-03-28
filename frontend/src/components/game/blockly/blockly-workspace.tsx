"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Blockly from "blockly";
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

    const theme = isDark
      ? Blockly.Theme.defineTheme("dark", {
          name: "dark",
          base: Blockly.Themes.Classic,
          componentStyles: {
            workspaceBackgroundColour: "#1e1e2e",
            toolboxBackgroundColour: "#181825",
            toolboxForegroundColour: "#cdd6f4",
            flyoutBackgroundColour: "#1e1e2e",
            flyoutForegroundColour: "#cdd6f4",
            flyoutOpacity: 0.95,
            scrollbarColour: "#45475a",
            insertionMarkerColour: "#cdd6f4",
          },
        })
      : Blockly.Themes.Classic;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: activeToolbox,
      theme,
      grid: {
        spacing: 20,
        length: 3,
        colour: isDark ? "#313244" : "#ccc",
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 2,
        minScale: 0.3,
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
