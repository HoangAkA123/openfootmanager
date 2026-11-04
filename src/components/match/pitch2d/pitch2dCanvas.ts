import type { PlayerPitchPos, PassTrajectory } from "./pitch2dCoords";
import type { Ball3D } from "./pitch2dInterpolator";

export interface PitchDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrajectoryData {
  pass?: PassTrajectory | null;
  shot?: { fromX: number; fromY: number; toX: number; toY: number } | null;
}

/**
 * Tính toán kích thước và vị trí sân bóng giữ nguyên tỷ lệ FIFA 105:68
 * và căn giữa trên Canvas.
 */
export function calculatePitchDimensions(
  canvasWidth: number,
  canvasHeight: number,
  margin = 20,
): PitchDimensions {
  const availableWidth = Math.max(10, canvasWidth - margin * 2);
  const availableHeight = Math.max(10, canvasHeight - margin * 2);
  const targetAspect = 105 / 68; // Tỷ lệ chuẩn FIFA 105m x 68m

  let width = availableWidth;
  let height = width / targetAspect;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * targetAspect;
  }

  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;

  return { x, y, width, height };
}

/**
 * Chuyển tọa độ chuẩn hóa 0..100 sang pixel trên Canvas
 */
export function toCanvasCoords(
  normX: number,
  normY: number,
  pitch: PitchDimensions,
): { px: number; py: number } {
  return {
    px: pitch.x + (normX / 100) * pitch.width,
    py: pitch.y + (normY / 100) * pitch.height,
  };
}

/**
 * Vẽ mặt sân bóng chuẩn (mặt cỏ sọc ngang xen kẽ, vạch vôi, vòng cấm địa, vòng tròn giữa sân, khung thành)
 */
export function drawPitchSurface(ctx: CanvasRenderingContext2D, pitch: PitchDimensions): void {
  const { x, y, width, height } = pitch;

  // 1. Mặt cỏ sọc ngang đặc trưng sân bóng
  const stripeCount = 12;
  const stripeWidth = width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#15803d" : "#166534";
    ctx.fillRect(x + i * stripeWidth, y, stripeWidth, height);
  }

  // Cấu hình vạch kẻ vôi trắng
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = Math.max(1.5, width * 0.0035);

  // 2. Đường biên ngoài
  ctx.strokeRect(x, y, width, height);

  // 3. Đường giữa sân
  const midX = x + width / 2;
  ctx.beginPath();
  ctx.moveTo(midX, y);
  ctx.lineTo(midX, y + height);
  ctx.stroke();

  // 4. Vòng tròn giữa sân và chấm phát bóng
  const centerCircleRadius = height * 0.145;
  ctx.beginPath();
  ctx.arc(midX, y + height / 2, centerCircleRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(midX, y + height / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // 5. Vòng cấm địa (16m50 và 5m50)
  const penaltyWidth = width * 0.158;
  const penaltyHeight = height * 0.58;
  const penaltyY = y + (height - penaltyHeight) / 2;

  const goalAreaWidth = width * 0.055;
  const goalAreaHeight = height * 0.28;
  const goalAreaY = y + (height - goalAreaHeight) / 2;

  // Bên trái (Đội nhà)
  ctx.strokeRect(x, penaltyY, penaltyWidth, penaltyHeight);
  ctx.strokeRect(x, goalAreaY, goalAreaWidth, goalAreaHeight);

  // Bên phải (Đội khách)
  ctx.strokeRect(x + width - penaltyWidth, penaltyY, penaltyWidth, penaltyHeight);
  ctx.strokeRect(x + width - goalAreaWidth, goalAreaY, goalAreaWidth, goalAreaHeight);

  // Chấm phạt đền 11m
  const spotDistance = width * 0.105;
  ctx.beginPath();
  ctx.arc(x + spotDistance, y + height / 2, 2.5, 0, Math.PI * 2);
  ctx.arc(x + width - spotDistance, y + height / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Cầu môn (Goal cages)
  const goalWidth = width * 0.02;
  const goalHeight = height * 0.14;
  const goalY = y + (height - goalHeight) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(x - goalWidth, goalY, goalWidth, goalHeight);
  ctx.strokeRect(x - goalWidth, goalY, goalWidth, goalHeight);
  ctx.fillRect(x + width, goalY, goalWidth, goalHeight);
  ctx.strokeRect(x + width, goalY, goalWidth, goalHeight);
}

/**
 * Vẽ một chấm tròn cầu thủ (Player Token)
 */
export function drawPlayerToken(
  ctx: CanvasRenderingContext2D,
  player: PlayerPitchPos,
  teamColor: string,
  pitch: PitchDimensions,
  isHighlighted = false,
): void {
  const { px, py } = toCanvasCoords(player.x, player.y, pitch);
  const radius = Math.max(9, pitch.height * 0.025);

  ctx.save();

  // Đổ bóng dưới chân
  ctx.beginPath();
  ctx.ellipse(px, py + radius * 0.65, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fill();

  // Thân chấm tròn (Body)
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = player.isGoalkeeper ? "#f59e0b" : teamColor;
  ctx.fill();

  // Viền
  ctx.lineWidth = isHighlighted ? 2.5 : 1.8;
  ctx.strokeStyle = isHighlighted ? "#facc15" : "#ffffff";
  ctx.stroke();

  // Số áo hoặc icon thủ môn
  ctx.fillStyle = player.isGoalkeeper ? "#111827" : "#ffffff";
  ctx.font = `bold ${Math.round(radius * 1.05)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.isGoalkeeper ? "🧤" : String(player.number || "•"), px, py + 1);

  // Nhãn tên cầu thủ rút gọn
  const fontSize = Math.max(9, Math.round(radius * 0.8));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.lineWidth = 2.5;

  const lastName = player.name.split(" ").pop() || player.name;
  ctx.strokeText(lastName, px, py + radius + fontSize);
  ctx.fillText(lastName, px, py + radius + fontSize);

  ctx.restore();
}

/**
 * Vẽ Quả bóng (Ball) kèm hiệu ứng độ cao 2.5D (Bounce & Shadow)
 */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball3D & { isGoal?: boolean },
  pitch: PitchDimensions,
): void {
  const { px, py } = toCanvasCoords(ball.x, ball.y, pitch);
  const baseRadius = Math.max(4, pitch.height * 0.012);
  const z = ball.z || 0;

  ctx.save();

  // 1. Bóng đổ (Shadow) trên mặt đất khi bóng bay bổng
  const shadowOffsetX = z * 2.5;
  const shadowOffsetY = z * 3.5;
  const shadowRadius = Math.max(1.5, baseRadius * (1 - z * 0.05));
  const shadowAlpha = Math.max(0.15, 0.5 - z * 0.04);

  ctx.beginPath();
  ctx.ellipse(
    px + shadowOffsetX,
    py + shadowOffsetY,
    shadowRadius * 1.2,
    shadowRadius * 0.6,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.fill();

  // 2. Thân quả bóng bay trên cao
  const visualLiftY = z * 4.0;
  const visualRadius = baseRadius * (1 + z * 0.08);

  ctx.beginPath();
  ctx.arc(px, py - visualLiftY, visualRadius, 0, Math.PI * 2);
  ctx.fillStyle = ball.isGoal ? "#fde047" : "#ffffff";
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#111827";
  ctx.stroke();

  // Điểm sáng phản chiếu 3D
  ctx.beginPath();
  ctx.arc(
    px - visualRadius * 0.3,
    py - visualLiftY - visualRadius * 0.3,
    visualRadius * 0.35,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fill();

  ctx.restore();
}

/**
 * Vẽ đường quỹ đạo chuyền bóng hoặc sút bóng dạng nét đứt
 */
export function drawTrajectories(
  ctx: CanvasRenderingContext2D,
  trajectories: TrajectoryData,
  pitch: PitchDimensions,
): void {
  ctx.save();

  if (trajectories.pass) {
    const from = toCanvasCoords(trajectories.pass.fromX, trajectories.pass.fromY, pitch);
    const to = toCanvasCoords(trajectories.pass.toX, trajectories.pass.toY, pitch);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(from.px, from.py);
    ctx.lineTo(to.px, to.py);
    ctx.stroke();
  }

  if (trajectories.shot) {
    const from = toCanvasCoords(trajectories.shot.fromX, trajectories.shot.fromY, pitch);
    const to = toCanvasCoords(trajectories.shot.toX, trajectories.shot.toY, pitch);

    ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(from.px, from.py);
    ctx.lineTo(to.px, to.py);
    ctx.stroke();
  }

  ctx.restore();
}
