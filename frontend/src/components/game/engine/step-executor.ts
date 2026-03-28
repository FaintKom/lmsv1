export interface GameCommand {
  type: string;
  args?: Record<string, unknown>;
}

export type StepCallback = (command: GameCommand, index: number) => boolean | void;
export type CompleteCallback = (success: boolean, stepsUsed: number) => void;
export type ErrorCallback = (message: string, index: number) => void;

/** Map Python method names to JS method names used by the engine */
const PYTHON_TO_JS: Record<string, string> = {
  move_forward: "moveForward",
  turn_left: "turnLeft",
  turn_right: "turnRight",
  pick_up: "pickUp",
  place_item: "placeItem",
  is_wall_ahead: "isWallAhead",
  is_item_here: "isItemHere",
  is_at_goal: "isAtGoal",
  is_near_object: "isNearObject",
};

/**
 * Parse Python code written by the user into GameCommands.
 * Supports: robot.method(), for i in range(N):, while not robot.is_at_goal():, if/else
 */
export function parsePythonCommands(pythonCode: string): GameCommand[] {
  const lines = pythonCode.split("\n");
  const commands: GameCommand[] = [];

  const parseLinesAtIndent = (startIdx: number, minIndent: number): { cmds: GameCommand[]; endIdx: number } => {
    const result: GameCommand[] = [];
    let i = startIdx;

    while (i < lines.length) {
      const raw = lines[i];
      const stripped = raw.trimStart();
      if (!stripped || stripped.startsWith("#")) { i++; continue; }

      const currentIndent = raw.length - raw.trimStart().length;
      if (currentIndent < minIndent) break;

      // robot.method() calls
      const methodMatch = stripped.match(/^robot\.(\w+)\(\)\s*$/);
      if (methodMatch) {
        const pyMethod = methodMatch[1];
        const jsMethod = PYTHON_TO_JS[pyMethod] || pyMethod;
        result.push({ type: jsMethod });
        i++;
        continue;
      }

      // for i in range(N):
      const forMatch = stripped.match(/^for\s+\w+\s+in\s+range\((\d+)\)\s*:\s*$/);
      if (forMatch) {
        const times = parseInt(forMatch[1], 10);
        const bodyIndent = currentIndent + 2; // at least 2 more
        const body = parseLinesAtIndent(i + 1, bodyIndent);
        for (let t = 0; t < times; t++) {
          result.push(...body.cmds);
        }
        i = body.endIdx;
        continue;
      }

      // while condition:
      const whileMatch = stripped.match(/^while\s+(.+):\s*$/);
      if (whileMatch) {
        const condition = whileMatch[1].trim();
        const bodyIndent = currentIndent + 2;
        const body = parseLinesAtIndent(i + 1, bodyIndent);
        // Convert Python condition to JS-style for evaluateCondition
        let jsCond = condition;
        if (condition.includes("not robot.is_at_goal()")) jsCond = "!robot.isAtGoal()";
        else if (condition.includes("robot.is_wall_ahead()")) jsCond = "robot.isWallAhead()";
        else if (condition.includes("not robot.is_wall_ahead()")) jsCond = "!robot.isWallAhead()";

        result.push({
          type: "_while",
          args: { condition: jsCond, body: body.cmds, maxIterations: 100 },
        });
        i = body.endIdx;
        continue;
      }

      // if condition:
      const ifMatch = stripped.match(/^if\s+(.+):\s*$/);
      if (ifMatch) {
        const condition = ifMatch[1].trim();
        const bodyIndent = currentIndent + 2;
        const body = parseLinesAtIndent(i + 1, bodyIndent);
        let jsCond = condition;
        if (condition.includes("robot.is_wall_ahead()")) jsCond = "robot.isWallAhead()";
        if (condition.includes("not robot.is_wall_ahead()")) jsCond = "!robot.isWallAhead()";
        if (condition.includes("robot.is_item_here()")) jsCond = "robot.isItemHere()";
        if (condition.includes("robot.is_at_goal()")) jsCond = "robot.isAtGoal()";

        const ifCmd: GameCommand = {
          type: "_if",
          args: { condition: jsCond, body: body.cmds },
        };

        // Check for else/elif
        if (body.endIdx < lines.length) {
          const nextStripped = lines[body.endIdx]?.trimStart();
          if (nextStripped?.startsWith("else:")) {
            const elseBody = parseLinesAtIndent(body.endIdx + 1, bodyIndent);
            ifCmd.args!.elseBody = elseBody.cmds;
            i = elseBody.endIdx;
          } else {
            i = body.endIdx;
          }
        } else {
          i = body.endIdx;
        }

        result.push(ifCmd);
        continue;
      }

      // Unknown line — skip
      i++;
    }

    return { cmds: result, endIdx: i };
  };

  return parseLinesAtIndent(0, 0).cmds;
}

/**
 * Parses generated Blockly JS code into a list of structured commands.
 * The generated code uses `robot.methodName()` calls which we parse into commands.
 */
export function parseCommands(jsCode: string): GameCommand[] {
  const commands: GameCommand[] = [];
  const lines = jsCode.split("\n");

  // Simple stack-based parser for loops and control flow
  const parseLines = (startIdx: number, endIdx: number): GameCommand[] => {
    const result: GameCommand[] = [];
    let i = startIdx;

    while (i < endIdx) {
      const line = lines[i].trim();

      // robot.method() calls
      const methodMatch = line.match(/^robot\.(\w+)\(\);?$/);
      if (methodMatch) {
        result.push({ type: methodMatch[1] });
        i++;
        continue;
      }

      // for loop: for (var i = 0; i < N; i++) {
      const forMatch = line.match(/^for\s*\(.*<\s*(\d+).*\)\s*\{$/);
      if (forMatch) {
        const times = parseInt(forMatch[1], 10);
        const bodyEnd = findClosingBrace(i);
        const bodyCommands = parseLines(i + 1, bodyEnd);
        for (let t = 0; t < times; t++) {
          result.push(...bodyCommands);
        }
        i = bodyEnd + 1;
        continue;
      }

      // while loop: while (!robot.isAtGoal()) {
      const whileMatch = line.match(/^while\s*\(.*\)\s*\{$/);
      if (whileMatch) {
        const bodyEnd = findClosingBrace(i);
        const bodyCommands = parseLines(i + 1, bodyEnd);
        // For while loops, we add a special marker - the executor will handle the condition
        result.push({
          type: "_while",
          args: {
            condition: line.match(/while\s*\((.*)\)/)?.[1] || "",
            body: bodyCommands,
            maxIterations: 100,
          },
        });
        i = bodyEnd + 1;
        continue;
      }

      // if statement: if (robot.isWallAhead()) {
      const ifMatch = line.match(/^if\s*\((.*)\)\s*\{$/);
      if (ifMatch) {
        const bodyEnd = findClosingBrace(i);
        const bodyCommands = parseLines(i + 1, bodyEnd);
        result.push({
          type: "_if",
          args: {
            condition: ifMatch[1],
            body: bodyCommands,
          },
        });
        i = bodyEnd + 1;

        // Check for else
        if (i < endIdx && lines[i]?.trim().startsWith("else")) {
          const elseBodyEnd = findClosingBrace(i);
          const elseCommands = parseLines(i + 1, elseBodyEnd);
          result[result.length - 1].args!.elseBody = elseCommands;
          i = elseBodyEnd + 1;
        }
        continue;
      }

      i++;
    }

    return result;
  };

  const findClosingBrace = (openIdx: number): number => {
    let depth = 0;
    for (let i = openIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      for (const ch of line) {
        if (ch === "{") depth++;
        if (ch === "}") {
          depth--;
          if (depth === 0) return i;
        }
      }
    }
    return lines.length - 1;
  };

  return parseLines(0, lines.length);
}

export class StepExecutor {
  private commands: GameCommand[] = [];
  private currentIndex = 0;
  private running = false;
  private paused = false;
  private aborted = false;
  private delayMs = 300;
  private stepsUsed = 0;
  private maxSteps = 500;

  onStep: StepCallback | null = null;
  onComplete: CompleteCallback | null = null;
  onError: ErrorCallback | null = null;

  /** Evaluate a condition string against the game state checker */
  private conditionChecker: ((condition: string) => boolean) | null = null;

  load(commands: GameCommand[], conditionChecker?: (condition: string) => boolean) {
    this.commands = commands;
    this.currentIndex = 0;
    this.stepsUsed = 0;
    this.running = false;
    this.paused = false;
    this.aborted = false;
    if (conditionChecker) this.conditionChecker = conditionChecker;
  }

  setSpeed(delayMs: number) {
    this.delayMs = Math.max(30, Math.min(1000, delayMs));
  }

  setMaxSteps(max: number) {
    this.maxSteps = max;
  }

  /** Execute one command and return it, or null if done */
  executeNext(): GameCommand | null {
    if (this.currentIndex >= this.commands.length) {
      return null;
    }

    const cmd = this.commands[this.currentIndex];
    this.currentIndex++;

    // Handle control flow commands
    if (cmd.type === "_while" && cmd.args) {
      const { condition, body, maxIterations } = cmd.args as {
        condition: string;
        body: GameCommand[];
        maxIterations: number;
      };
      let iterations = 0;
      while (
        this.conditionChecker?.(condition) !== false &&
        iterations < maxIterations
      ) {
        // Insert body commands at current position
        this.commands.splice(this.currentIndex, 0, ...body);
        iterations++;
      }
      return this.executeNext();
    }

    if (cmd.type === "_if" && cmd.args) {
      const { condition, body, elseBody } = cmd.args as {
        condition: string;
        body: GameCommand[];
        elseBody?: GameCommand[];
      };
      if (this.conditionChecker?.(condition)) {
        this.commands.splice(this.currentIndex, 0, ...body);
      } else if (elseBody) {
        this.commands.splice(this.currentIndex, 0, ...elseBody);
      }
      return this.executeNext();
    }

    this.stepsUsed++;
    if (this.stepsUsed > this.maxSteps) {
      this.onError?.("Maximum steps exceeded", this.currentIndex);
      return null;
    }

    // Notify listener and check if game state says stop
    const shouldStop = this.onStep?.(cmd, this.currentIndex - 1);
    if (shouldStop === true) {
      return null;
    }

    return cmd;
  }

  /** Auto-play all commands with delay */
  async executeAll(delayMs?: number): Promise<void> {
    if (delayMs !== undefined) this.delayMs = delayMs;
    this.running = true;
    this.paused = false;
    this.aborted = false;

    while (this.running && !this.aborted) {
      if (this.paused) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }

      const cmd = this.executeNext();
      if (!cmd) {
        this.running = false;
        break;
      }

      await new Promise((r) => setTimeout(r, this.delayMs));
    }

    if (!this.aborted) {
      this.onComplete?.(true, this.stepsUsed);
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  reset() {
    this.aborted = true;
    this.running = false;
    this.paused = false;
    this.currentIndex = 0;
    this.stepsUsed = 0;
  }

  get isRunning() {
    return this.running;
  }

  get isPaused() {
    return this.paused;
  }

  get totalSteps() {
    return this.stepsUsed;
  }
}
