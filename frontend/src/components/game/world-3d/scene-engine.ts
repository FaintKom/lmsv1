export type Direction3D = "north" | "east" | "south" | "west";

export interface SceneObject {
  id: string;
  type: "wall" | "collectible" | "button" | "door" | "platform" | "goal";
  position: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
  properties?: Record<string, unknown>;
  collected?: boolean;
  activated?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  direction: Direction3D;
  inventory: string[];
  collected: number;
}

export interface WorldState {
  objects: SceneObject[];
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
    objects: SceneObject[],
    playerStart: { x: number; y: number; z: number; direction?: Direction3D },
    winCondition: WinCondition3D = "reach_goal"
  ) {
    this.state = {
      objects: objects.map((o) => ({ ...o })),
      player: {
        x: playerStart.x,
        y: playerStart.y || 0,
        z: playerStart.z,
        direction: playerStart.direction || "north",
        inventory: [],
        collected: 0,
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
      objects: s.objects.map((o) => ({ ...o, position: { ...o.position } })),
      player: { ...s.player, inventory: [...s.player.inventory] },
    };
  }

  private isBlocked(x: number, z: number): boolean {
    return this.state.objects.some(
      (o) =>
        o.type === "wall" &&
        Math.abs(o.position.x - x) < 0.5 &&
        Math.abs(o.position.z - z) < 0.5
    );
  }

  private isDoor(x: number, z: number): SceneObject | undefined {
    return this.state.objects.find(
      (o) =>
        o.type === "door" &&
        !o.activated &&
        Math.abs(o.position.x - x) < 0.5 &&
        Math.abs(o.position.z - z) < 0.5
    );
  }

  moveForward(): { success: boolean; message?: string } {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const nx = this.state.player.x + dx;
    const nz = this.state.player.z + dz;

    if (this.isBlocked(nx, nz) || this.isDoor(nx, nz)) {
      return { success: false, message: "Path blocked" };
    }

    this.state.player.x = nx;
    this.state.player.z = nz;
    this.state.stepsUsed++;

    // Check goal
    const goal = this.state.objects.find(
      (o) => o.type === "goal" && Math.abs(o.position.x - nx) < 0.5 && Math.abs(o.position.z - nz) < 0.5
    );
    if (goal) this.state.goalReached = true;

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

  jump(): { success: boolean } {
    this.state.stepsUsed++;
    return { success: true }; // Visual only for now
  }

  pickUp(): { success: boolean; message?: string } {
    const nearby = this.state.objects.find(
      (o) =>
        o.type === "collectible" &&
        !o.collected &&
        Math.abs(o.position.x - this.state.player.x) < 0.8 &&
        Math.abs(o.position.z - this.state.player.z) < 0.8
    );
    if (!nearby) return { success: false, message: "Nothing to pick up" };

    nearby.collected = true;
    this.state.player.collected++;
    this.state.player.inventory.push(nearby.id);
    this.state.stepsUsed++;
    return { success: true };
  }

  interact(): { success: boolean; message?: string } {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const fx = this.state.player.x + dx;
    const fz = this.state.player.z + dz;

    // Check for button
    const button = this.state.objects.find(
      (o) => o.type === "button" && Math.abs(o.position.x - fx) < 0.8 && Math.abs(o.position.z - fz) < 0.8
    );
    if (button) {
      button.activated = !button.activated;
      // Open linked door
      const doorId = button.properties?.doorId as string;
      if (doorId) {
        const door = this.state.objects.find((o) => o.id === doorId);
        if (door) door.activated = true;
      }
      this.state.stepsUsed++;
      return { success: true };
    }

    // Check for door
    const door = this.isDoor(fx, fz);
    if (door) return { success: false, message: "Door is locked. Find a button!" };

    return { success: false, message: "Nothing to interact with" };
  }

  // ─── Condition checks ─────────────────────────────────────────────

  isWallAhead(): boolean {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    return this.isBlocked(this.state.player.x + dx, this.state.player.z + dz);
  }

  isItemHere(): boolean {
    return this.state.objects.some(
      (o) =>
        o.type === "collectible" &&
        !o.collected &&
        Math.abs(o.position.x - this.state.player.x) < 0.8 &&
        Math.abs(o.position.z - this.state.player.z) < 0.8
    );
  }

  isAtGoal(): boolean {
    return this.state.goalReached;
  }

  isNearObject(): boolean {
    const { dx, dz } = DIRECTION_DELTA[this.state.player.direction];
    const fx = this.state.player.x + dx;
    const fz = this.state.player.z + dz;
    return this.state.objects.some(
      (o) =>
        (o.type === "button" || o.type === "door") &&
        Math.abs(o.position.x - fx) < 0.8 &&
        Math.abs(o.position.z - fz) < 0.8
    );
  }

  checkWinCondition(): boolean {
    switch (this.winCondition) {
      case "reach_goal":
        return this.state.goalReached;
      case "collect_all":
        return this.state.objects.filter((o) => o.type === "collectible").every((o) => o.collected);
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
