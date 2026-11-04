import { useEffect, useRef } from "react";
import type { PlayerPitchPos, BallPos } from "./pitch2dCoords";
import {
  calculatePitchDimensions,
  drawPitchSurface,
  drawPlayerToken,
  drawBall,
  drawTrajectories,
} from "./pitch2dCanvas";
import { lerpPosition, lerpBallWithHeight } from "./pitch2dInterpolator";

export interface UsePitch2DRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  homePositions: PlayerPitchPos[];
  awayPositions: PlayerPitchPos[];
  ball: BallPos;
  homeColor?: string;
  awayColor?: string;
  isGoal?: boolean;
}

/**
 * Hook điều khiển vòng lặp render Canvas 2D 60 FPS
 * Áp dụng thuật toán LERP để làm mượt chuyển động của 22 cầu thủ và quả bóng.
 */
export function usePitch2DRenderer(options: UsePitch2DRendererOptions): void {
  const {
    canvasRef,
    homePositions,
    awayPositions,
    ball,
    homeColor = "#2563eb",
    awayColor = "#e11d48",
    isGoal = false,
  } = options;

  // Lưu lại vị trí frame trước đó để nội suy (LERP)
  const prevHomeRef = useRef<PlayerPitchPos[]>(homePositions);
  const prevAwayRef = useRef<PlayerPitchPos[]>(awayPositions);
  const prevBallRef = useRef<BallPos>(ball);

  const startAnimTimeRef = useRef<number>(performance.now());
  const animDurationMs = 380; // Thời gian chuyển động mượt giữa các ticks/micro-steps

  // Khi vị trí mục tiêu thay đổi, cập nhật mốc thời gian bắt đầu chuyển động
  useEffect(() => {
    startAnimTimeRef.current = performance.now();
  }, [homePositions, awayPositions, ball]);

  useEffect(() => {
    let animId: number;

    const renderFrame = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Môi trường test không hỗ trợ Canvas 2D getContext
        return;
      }

      // 1. Tự động scale độ phân giải theo Device Pixel Ratio (DPI)
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width * dpr);
      const displayHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 2. Tính toán tiến trình nội suy LERP (từ 0.0 đến 1.0)
      const elapsed = now - startAnimTimeRef.current;
      const rawProgress = Math.min(1, Math.max(0, elapsed / animDurationMs));
      // Áp dụng Cubic Ease-Out để chuyển động mượt và tự nhiên hơn
      const easedT = 1 - (1 - rawProgress) ** 3;

      const pitch = calculatePitchDimensions(rect.width, rect.height, 16);

      // 3. Vẽ mặt cỏ và các vạch kẻ sân bóng
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawPitchSurface(ctx, pitch);

      // 4. Vẽ đường quỹ đạo chuyền / sút bóng
      drawTrajectories(
        ctx,
        {
          pass: ball.passTrajectory,
          shot:
            ball.isShot && ball.targetX !== undefined
              ? {
                  fromX: ball.x,
                  fromY: ball.y,
                  toX: ball.targetX,
                  toY: ball.targetY ?? 50,
                }
              : null,
        },
        pitch,
      );

      // 5. Nội suy và vẽ đội nhà (Home Team)
      homePositions.forEach((targetP, idx) => {
        const prevP = prevHomeRef.current[idx] || targetP;
        const currentCoord = lerpPosition(
          { x: prevP.x, y: prevP.y },
          { x: targetP.x, y: targetP.y },
          easedT,
        );
        const playerWithLerp: PlayerPitchPos = {
          ...targetP,
          x: currentCoord.x,
          y: currentCoord.y,
        };
        drawPlayerToken(
          ctx,
          playerWithLerp,
          homeColor,
          pitch,
          ball.highlightPlayerId === targetP.playerId,
        );
      });

      // 6. Nội suy và vẽ đội khách (Away Team)
      awayPositions.forEach((targetP, idx) => {
        const prevP = prevAwayRef.current[idx] || targetP;
        const currentCoord = lerpPosition(
          { x: prevP.x, y: prevP.y },
          { x: targetP.x, y: targetP.y },
          easedT,
        );
        const playerWithLerp: PlayerPitchPos = {
          ...targetP,
          x: currentCoord.x,
          y: currentCoord.y,
        };
        drawPlayerToken(
          ctx,
          playerWithLerp,
          awayColor,
          pitch,
          ball.highlightPlayerId === targetP.playerId,
        );
      });

      // 7. Nội suy vị trí bóng kèm độ cao Parabol Z
      const prevBall = prevBallRef.current;
      const ball3D = lerpBallWithHeight(
        { x: prevBall.x, y: prevBall.y },
        { x: ball.x, y: ball.y },
        easedT,
        ball.actionType,
      );
      drawBall(ctx, { ...ball3D, isGoal }, pitch);

      ctx.restore();

      // Cập nhật vị trí đã hoàn thành khi tiến trình đạt 100%
      if (rawProgress >= 1) {
        prevHomeRef.current = homePositions;
        prevAwayRef.current = awayPositions;
        prevBallRef.current = ball;
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [homePositions, awayPositions, ball, homeColor, awayColor, isGoal]);
}
