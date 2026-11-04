import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePitch2DRenderer } from "./usePitch2DRenderer";
import type { BallPos, PlayerPitchPos } from "./pitch2dCoords";

describe("usePitch2DRenderer", () => {
  it("initializes without errors when canvas is null (e.g., SSR or jsdom)", () => {
    const canvasRef = { current: null };
    const homePositions: PlayerPitchPos[] = [
      {
        playerId: "p1",
        name: "Goalkeeper",
        number: 1,
        position: "GK",
        isGoalkeeper: true,
        side: "Home",
        x: 5,
        y: 50,
      },
    ];
    const awayPositions: PlayerPitchPos[] = [];
    const ball: BallPos = { x: 50, y: 50, isGoal: false };

    expect(() => {
      renderHook(() =>
        usePitch2DRenderer({
          canvasRef,
          homePositions,
          awayPositions,
          ball,
        }),
      );
    }).not.toThrow();
  });
});
