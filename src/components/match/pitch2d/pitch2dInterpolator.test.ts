import { describe, it, expect } from "vitest";
import { lerp, lerpPosition, calculateBallHeight, lerpBallWithHeight } from "./pitch2dInterpolator";

describe("pitch2dInterpolator", () => {
  it("interpolates scalar values linearly with lerp", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(100, 0, 0.25)).toBe(75);
  });

  it("interpolates 2D positions smoothly", () => {
    const posA = { x: 20, y: 30 };
    const posB = { x: 60, y: 70 };
    const mid = lerpPosition(posA, posB, 0.5);

    expect(mid.x).toBe(40);
    expect(mid.y).toBe(50);
  });

  it("calculates parabolic ball height (Z-axis) for shots and passes", () => {
    // Ground ball at start and end
    expect(calculateBallHeight(0, "shot")).toBeCloseTo(0, 1);
    expect(calculateBallHeight(1, "shot")).toBeCloseTo(0, 1);

    // Ball reaches peak height at middle of trajectory (progress = 0.5)
    const midShotHeight = calculateBallHeight(0.5, "shot");
    expect(midShotHeight).toBeGreaterThan(2.0);

    const midPassHeight = calculateBallHeight(0.5, "pass");
    expect(midPassHeight).toBeGreaterThan(1.0);
    expect(midPassHeight).toBeLessThan(midShotHeight);

    // Ground action has 0 height
    expect(calculateBallHeight(0.5, "ground")).toBe(0);
  });

  it("interpolates ball position including 2.5D height Z", () => {
    const ballA = { x: 10, y: 20 };
    const ballB = { x: 70, y: 80 };

    const midBall = lerpBallWithHeight(ballA, ballB, 0.5, "shot");
    expect(midBall.x).toBe(40);
    expect(midBall.y).toBe(50);
    expect(midBall.z).toBeGreaterThan(2.0);
  });
});
