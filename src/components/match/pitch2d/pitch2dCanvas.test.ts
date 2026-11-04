import { describe, it, expect, vi } from "vitest";
import {
  calculatePitchDimensions,
  toCanvasCoords,
  drawPitchSurface,
  drawPlayerToken,
  drawBall,
  drawTrajectories,
} from "./pitch2dCanvas";

describe("pitch2dCanvas", () => {
  it("calculates pitch dimensions preserving FIFA aspect ratio (105:68)", () => {
    const dim = calculatePitchDimensions(800, 600, 20);
    const aspect = dim.width / dim.height;

    expect(aspect).toBeCloseTo(105 / 68, 2);
    expect(dim.width).toBeLessThanOrEqual(760);
    expect(dim.height).toBeLessThanOrEqual(560);
    expect(dim.x).toBeGreaterThan(0);
    expect(dim.y).toBeGreaterThan(0);
  });

  it("converts normalized 0-100 coordinates to pixel canvas positions", () => {
    const pitch = { x: 50, y: 30, width: 700, height: 450 };

    const origin = toCanvasCoords(0, 0, pitch);
    expect(origin.px).toBe(50);
    expect(origin.py).toBe(30);

    const center = toCanvasCoords(50, 50, pitch);
    expect(center.px).toBe(400);
    expect(center.py).toBe(255);

    const opposite = toCanvasCoords(100, 100, pitch);
    expect(opposite.px).toBe(750);
    expect(opposite.py).toBe(480);
  });

  it("draws pitch surface, player tokens, and ball on canvas context without throwing", () => {
    // Create mock 2D rendering context
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      setLineDash: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "",
      textBaseline: "",
    } as unknown as CanvasRenderingContext2D;

    const pitch = calculatePitchDimensions(600, 400);

    expect(() => drawPitchSurface(ctx, pitch)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();

    const player = {
      playerId: "p1",
      name: "Erling Haaland",
      number: 9,
      position: "ST",
      isGoalkeeper: false,
      side: "Home" as const,
      x: 75,
      y: 50,
    };

    expect(() => drawPlayerToken(ctx, player, "#2563eb", pitch, false)).not.toThrow();
    expect(ctx.fillText).toHaveBeenCalled();

    const ball = { x: 75, y: 50, z: 2.5, isGoal: false };
    expect(() => drawBall(ctx, ball, pitch)).not.toThrow();

    const trajectories = {
      pass: { fromX: 50, fromY: 50, toX: 75, toY: 50 },
      shot: { fromX: 75, fromY: 50, toX: 98, toY: 50 },
    };
    expect(() => drawTrajectories(ctx, trajectories, pitch)).not.toThrow();
  });
});
