export type CellType = "empty" | "wall" | "item" | "start" | "goal";
export type Direction = "up" | "right" | "down" | "left";

export interface Cell {
  x: number;
  y: number;
  type: CellType;
}

export interface RobotState {
  x: number;
  y: number;
  direction: Direction;
  collected: number;
  inventory: string[];
}

export interface GridState {
  width: number;
  height: number;
  cells: Cell[];
  robot: RobotState;
  totalItems: number;
  goalReached: boolean;
  stepsUsed: number;
}

export interface MoveResult {
  success: boolean;
  message?: string;
  newState: GridState;
}

const DIRECTION_ORDER: Direction[] = ["up", "right", "down", "left"];
const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};

export type WinCondition = "reach_goal" | "collect_all" | "custom";

export class GridEngine {
  private state: GridState;
  private initialState: GridState;
  private winCondition: WinCondition;

  constructor(
    width: number,
    height: number,
    cells: Cell[],
    winCondition: WinCondition = "reach_goal"
  ) {
    // Find start position
    const startCell = cells.find((c) => c.type === "start");
    const startX = startCell?.x ?? 0;
    const startY = startCell?.y ?? 0;
    const totalItems = cells.filter((c) => c.type === "item").length;

    this.state = {
      width,
      height,
      cells: cells.map((c) => ({ ...c })),
      robot: {
        x: startX,
        y: startY,
        direction: "right",
        collected: 0,
        inventory: [],
      },
      totalItems,
      goalReached: false,
      stepsUsed: 0,
    };
    this.initialState = this.cloneState(this.state);
    this.winCondition = winCondition;
  }

  getState(): GridState {
    return this.cloneState(this.state);
  }

  reset(): GridState {
    this.state = this.cloneState(this.initialState);
    return this.getState();
  }

  private cloneState(s: GridState): GridState {
    return {
      ...s,
      cells: s.cells.map((c) => ({ ...c })),
      robot: { ...s.robot, inventory: [...s.robot.inventory] },
    };
  }

  private getCellAt(x: number, y: number): Cell | undefined {
    return this.state.cells.find((c) => c.x === x && c.y === y);
  }

  private isBlocked(x: number, y: number): boolean {
    if (x < 0 || x >= this.state.width || y < 0 || y >= this.state.height) {
      return true;
    }
    const cell = this.getCellAt(x, y);
    return cell?.type === "wall";
  }

  /** Move in the robot's current facing direction */
  moveForward(): MoveResult {
    const { dx, dy } = DIRECTION_DELTA[this.state.robot.direction];
    return this._moveBy(dx, dy);
  }

  /** Directional moves: face that direction + move one cell */
  moveUp(): MoveResult {
    this.state.robot.direction = "up";
    return this._moveBy(0, -1);
  }

  moveDown(): MoveResult {
    this.state.robot.direction = "down";
    return this._moveBy(0, 1);
  }

  moveLeft(): MoveResult {
    this.state.robot.direction = "left";
    return this._moveBy(-1, 0);
  }

  moveRight(): MoveResult {
    this.state.robot.direction = "right";
    return this._moveBy(1, 0);
  }

  private _moveBy(dx: number, dy: number): MoveResult {
    const newX = this.state.robot.x + dx;
    const newY = this.state.robot.y + dy;

    if (this.isBlocked(newX, newY)) {
      return {
        success: false,
        message: "Blocked by wall or boundary",
        newState: this.getState(),
      };
    }

    this.state.robot.x = newX;
    this.state.robot.y = newY;
    this.state.stepsUsed++;

    const cell = this.getCellAt(newX, newY);
    if (cell?.type === "goal") {
      this.state.goalReached = true;
    }

    return { success: true, newState: this.getState() };
  }

  turnLeft(): MoveResult {
    const idx = DIRECTION_ORDER.indexOf(this.state.robot.direction);
    this.state.robot.direction = DIRECTION_ORDER[(idx + 3) % 4];
    this.state.stepsUsed++;
    return { success: true, newState: this.getState() };
  }

  turnRight(): MoveResult {
    const idx = DIRECTION_ORDER.indexOf(this.state.robot.direction);
    this.state.robot.direction = DIRECTION_ORDER[(idx + 1) % 4];
    this.state.stepsUsed++;
    return { success: true, newState: this.getState() };
  }

  pickUp(): MoveResult {
    const cell = this.getCellAt(this.state.robot.x, this.state.robot.y);
    if (!cell || cell.type !== "item") {
      return {
        success: false,
        message: "No item here",
        newState: this.getState(),
      };
    }

    cell.type = "empty";
    this.state.robot.collected++;
    this.state.robot.inventory.push("item");
    this.state.stepsUsed++;
    return { success: true, newState: this.getState() };
  }

  placeItem(): MoveResult {
    if (this.state.robot.inventory.length === 0) {
      return {
        success: false,
        message: "No items in inventory",
        newState: this.getState(),
      };
    }

    const cell = this.getCellAt(this.state.robot.x, this.state.robot.y);
    if (cell && cell.type === "empty") {
      cell.type = "item";
      this.state.robot.inventory.pop();
      this.state.robot.collected--;
    }
    this.state.stepsUsed++;
    return { success: true, newState: this.getState() };
  }

  // ─── Condition checks (used by Blockly condition blocks) ──────────

  isWallAhead(): boolean {
    const { dx, dy } = DIRECTION_DELTA[this.state.robot.direction];
    return this.isBlocked(this.state.robot.x + dx, this.state.robot.y + dy);
  }

  isItemHere(): boolean {
    const cell = this.getCellAt(this.state.robot.x, this.state.robot.y);
    return cell?.type === "item";
  }

  isAtGoal(): boolean {
    return this.state.goalReached;
  }

  // ─── Win condition check ──────────────────────────────────────────

  checkWinCondition(): boolean {
    switch (this.winCondition) {
      case "reach_goal":
        return this.state.goalReached;
      case "collect_all":
        return this.state.robot.collected >= this.state.totalItems;
      case "custom":
        // Custom win conditions handled externally
        return false;
      default:
        return false;
    }
  }

  /** Execute a command by name (used by step executor) */
  executeCommand(type: string): MoveResult {
    switch (type) {
      case "moveForward":
        return this.moveForward();
      case "moveUp":
        return this.moveUp();
      case "moveDown":
        return this.moveDown();
      case "moveLeft":
        return this.moveLeft();
      case "moveRight":
        return this.moveRight();
      case "turnLeft":
        return this.turnLeft();
      case "turnRight":
        return this.turnRight();
      case "pickUp":
        return this.pickUp();
      case "placeItem":
        return this.placeItem();
      default:
        return {
          success: false,
          message: `Unknown command: ${type}`,
          newState: this.getState(),
        };
    }
  }

  /** Evaluate a condition string from Blockly-generated code */
  evaluateCondition(condition: string): boolean {
    if (condition.includes("isWallAhead")) return this.isWallAhead();
    if (condition.includes("isItemHere")) return this.isItemHere();
    if (condition.includes("isAtGoal")) {
      // Handle negation: !robot.isAtGoal()
      if (condition.includes("!")) return !this.isAtGoal();
      return this.isAtGoal();
    }
    return false;
  }
}
