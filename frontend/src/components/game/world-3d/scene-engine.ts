export type Direction3D = "north" | "east" | "south" | "west";

/** Cell types on the 3D grid */
export type CellType3D = "empty" | "wall" | "collectible" | "button" | "door" | "goal" | "platform";

/** A single cell in the 3D grid */
export interface GridCell3D {
  x: number;
  z: number;
  y: number;         // elevation (0 = ground, 1 = one step up, etc.)
  type: CellType3D;
  id?: string;
  color?: string;
  properties?: Record<string, unknown>;
  collected?: boolean;
  activated?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;         // current elevation level
  z: number;
  direction: Direction3D;
  inventory: string[];
  collected: number;
  isJumping: boolean;
}

export interface WorldState {
  gridWidth: number;
  gridDepth: number;
  cells: GridCell3D[];
  player: PlayerState;
  goalReached: boolean;
  stepsUsed: number;
}

const DIRECTION_ORDER: Direction3D[] = ["north", "east", "south", "west"];
const DIRECTION_DELTA: Record<Direction3D, { dx: number; dz: number }> = {
  north: { dx: 0, dz: -1 },
  east: { dx: 1, dz: 0 },
  south: { dx: 0, dz: 1 },
  west: { dx: -1, dz: 0 },
};

export const DIRECTION_ANGLE: Record<Direction3D, number> = {
  north: Math.PI,
  east: -Math.PI / 2,
  south: 0,
  west: Math.PI / 2,
};

export type WinCondition3D = "reach_goal" | "collect_all" | "custom";

export class SceneEngine {
  private state: WorldState;
  private initialState: WorldState;
  private winCondition: WinCondition3D;

  constructor(
    gridWidth: number,
    gridDepth: number,
    cells: GridCell3D[],
    playerStart: { x: number; y?: number; z: number; direction?: Direction3D },
    winCondition: WinCondition3D = "reach_goal"
  ) {
    this.state = {
      gridWidth,
      gridDepth,
      cells: cells.map((c) => ({ ...c })),
      player: {
        x: playerStart.x,
        y: playerStart.y ?? 0,
        z: playerStart.z,
        direction: playerStart.direction || "north",
        inventory: [],
        collected: 0,
        isJumping: false,
      },
      goalReached: false,
      stepsUsed: 0,
    };
    this.initialState = this.cloneState(this.state);
    this.winCondition = winCondition;
  }

  getState(): WorldState {
    return this.cloneState(this.state);
  }

  reset(): WorldState {
    this.state = this.cloneState(this.initialState);
    return this.getState();
  }

  private cloneState(s: WorldState): WorldState {
    return {
      ...s,
      cells: s.cells.map((c) => ({ ...c })),
      player: { ...s.player, inventory: [...s.player.inventory] },
    };
  }

  /** Get all cells at a grid position */
  private getCellsAt(x: number, z: number): GridCell3D[] {
    return this.state.cells.filter((c) => c.x === x && c.z === z);
  }

  /** Get the top walkable surface height at a position */
  private getGroundHeight(x: number, z: number): number {
    const platforms = this.getCellsAt(x, z).filter(
      (c) => c.type === "platform" || c.type === "wall"
    );
    if (platforms.length === 0) return 0;
    // Wall = impassable at any height, platforms give elevation
    const maxPlatformY = Math.max(...platforms.filter((c) => c.type === "platform").map((c) => c.y));
    return maxPlatformY;
  }

  /** Check if a cell is a solid wall blocking movement at the given height */
  private isWallAt(x: number, z: number, atY: number): boolean {
    return this.getCellsAt(x, z).some(
      (c) => c.type === "wall" && c.y <= atY + 1 && c.y >= atY
    );
  }

  /** Check if a locked door blocks this cell */
  private isDoorAt(x: number, z: number): GridCell3D | undefined {
    return this.state.cells.find(
      (c) => c.type === "door" && !c.activated && c.x === x && c.z === z
    );
  }

  /** Check if position is within grid bounds */
  private inBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.state.gridWidth && z >= 0 && z < this.state.gridDepth;
  }

  moveForward(): { success: boolean; message?: string } {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const nx = this.state.player.x + dx;
    const nz = this.state.player.z + dz;

    if (!this.inBounds(nx, nz)) {
      return { success: false, message: "Can't move outside the grid" };
    }

    const currentY = this.state.player.y;
    const targetGroundY = this.getGroundHeight(nx, nz);

    // Can't walk up more than 1 level without jumping
    if (targetGroundY > currentY + 1) {
      return { success: false, message: "Too high to walk up — try jumping!" };
    }

    // Can't walk to a wall at current height
    if (this.isWallAt(nx, nz, currentY)) {
      return { success: false, message: "Blocked by a wall" };
    }

    // Can't walk through locked doors
    if (this.isDoorAt(nx, nz)) {
      return { success: false, message: "Door is locked!" };
    }

    this.state.player.x = nx;
    this.state.player.z = nz;
    // Snap to ground level (can walk down freely, walk up 1 step)
    this.state.player.y = Math.max(targetGroundY, 0);
    this.state.player.isJumping = false;
    this.state.stepsUsed++;

    this._checkGoal();
    return { success: true };
  }

  turnLeft(): { success: boolean } {
    const idx = DIRECTION_ORDER.indexOf(this.state.player.direction);
    this.state.player.direction = DIRECTION_ORDER[(idx + 3) % 4];
    this.state.stepsUsed++;
    return { success: true };
  }

  turnRight(): { success: boolean } {
    const idx = DIRECTION_ORDER.indexOf(this.state.player.direction);
    this.state.player.direction = DIRECTION_ORDER[(idx + 1) % 4];
    this.state.stepsUsed++;
    return { success: true };
  }

  /** Jump forward — can go up 2 levels or over a 1-high wall */
  jump(): { success: boolean; message?: string } {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const nx = this.state.player.x + dx;
    const nz = this.state.player.z + dz;

    if (!this.inBounds(nx, nz)) {
      return { success: false, message: "Can't jump outside the grid" };
    }

    const currentY = this.state.player.y;
    const targetGroundY = this.getGroundHeight(nx, nz);

    // Jump can reach up to 2 levels higher
    if (targetGroundY > currentY + 2) {
      return { success: false, message: "Too high even for jumping!" };
    }

    // Can jump over 1-high walls (wall.y == currentY, but player jumps to currentY+1)
    const hasBlockingWall = this.getCellsAt(nx, nz).some(
      (c) => c.type === "wall" && c.y > currentY + 1
    );
    if (hasBlockingWall) {
      return { success: false, message: "Wall too high to jump over" };
    }

    // Can't jump through locked doors
    if (this.isDoorAt(nx, nz)) {
      return { success: false, message: "Door is locked!" };
    }

    this.state.player.x = nx;
    this.state.player.z = nz;
    this.state.player.y = Math.max(targetGroundY, 0);
    this.state.player.isJumping = true;
    this.state.stepsUsed++;

    this._checkGoal();
    return { success: true };
  }

  pickUp(): { success: boolean; message?: string } {
    const { x, z } = this.state.player;
    const item = this.state.cells.find(
      (c) => c.type === "collectible" && !c.collected && c.x === x && c.z === z
    );
    if (!item) return { success: false, message: "Nothing to pick up here" };

    item.collected = true;
    this.state.player.collected++;
    this.state.player.inventory.push(item.id || `item_${x}_${z}`);
    this.state.stepsUsed++;
    return { success: true };
  }

  interact(): { success: boolean; message?: string } {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const fx = this.state.player.x + dx;
    const fz = this.state.player.z + dz;

    const button = this.state.cells.find(
      (c) => c.type === "button" && c.x === fx && c.z === fz
    );
    if (button) {
      button.activated = !button.activated;
      const doorId = button.properties?.doorId as string;
      if (doorId) {
        const door = this.state.cells.find((c) => c.id === doorId);
        if (door) door.activated = true;
      }
      this.state.stepsUsed++;
      return { success: true };
    }

    const door = this.isDoorAt(fx, fz);
    if (door) return { success: false, message: "Door is locked. Find a button!" };

    return { success: false, message: "Nothing to interact with" };
  }

  private _checkGoal() {
    const { x, z } = this.state.player;
    const goal = this.state.cells.find(
      (c) => c.type === "goal" && c.x === x && c.z === z
    );
    if (goal) this.state.goalReached = true;
  }

  // ─── Condition checks ─────────────────────────────────────────────

  isWallAhead(): boolean {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const nx = this.state.player.x + dx;
    const nz = this.state.player.z + dz;
    if (!this.inBounds(nx, nz)) return true;
    return this.isWallAt(nx, nz, this.state.player.y) || !!this.isDoorAt(nx, nz);
  }

  isItemHere(): boolean {
    const { x, z } = this.state.player;
    return this.state.cells.some(
      (c) => c.type === "collectible" && !c.collected && c.x === x && c.z === z
    );
  }

  isAtGoal(): boolean {
    return this.state.goalReached;
  }

  isNearObject(): boolean {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const fx = this.state.player.x + dx;
    const fz = this.state.player.z + dz;
    return this.state.cells.some(
      (c) => (c.type === "button" || c.type === "door") && c.x === fx && c.z === fz
    );
  }

  checkWinCondition(): boolean {
    switch (this.winCondition) {
      case "reach_goal":
        return this.state.goalReached;
      case "collect_all":
        return this.state.cells.filter((c) => c.type === "collectible").every((c) => c.collected);
      default:
        return false;
    }
  }

  executeCommand(type: string): { success: boolean; message?: string } {
    switch (type) {
      case "moveForward": return this.moveForward();
      case "turnLeft": return this.turnLeft();
      case "turnRight": return this.turnRight();
      case "jump": return this.jump();
      case "pickUp": return this.pickUp();
      case "interact": return this.interact();
      default: return { success: false, message: `Unknown: ${type}` };
    }
  }

  evaluateCondition(condition: string): boolean {
    if (condition.includes("isWallAhead")) return this.isWallAhead();
    if (condition.includes("isItemHere")) return this.isItemHere();
    if (condition.includes("isNearObject")) return this.isNearObject();
    if (condition.includes("isAtGoal")) {
      return condition.includes("!") ? !this.isAtGoal() : this.isAtGoal();
    }
    return false;
  }
}
