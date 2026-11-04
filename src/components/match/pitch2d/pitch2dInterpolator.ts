/**
 * 2D Pitch Interpolator & Ball Physics Helper
 * Cung cấp thuật toán LERP (Linear Interpolation) và mô phỏng độ cao trục Z (Parabolic Arc)
 * cho 22 cầu thủ và quả bóng di chuyển mượt mà ở 60 FPS.
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball3D extends Vector2D {
  z: number;
}

/**
 * Thuật toán Linear Interpolation (LERP) cơ bản
 * p(t) = a + (b - a) * t
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Nội suy tuyến tính tọa độ 2D giữa 2 điểm
 */
export function lerpPosition(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

/**
 * Tính toán độ cao Z (Parabolic Arc) của bóng theo tiến trình t [0, 1]
 * Đường cong parabol: z = 4 * maxHeight * t * (1 - t)
 */
export function calculateBallHeight(t: number, actionType?: string): number {
  const progress = Math.max(0, Math.min(1, t));

  let maxHeight = 0;
  if (actionType === "shot" || actionType === "goal") {
    maxHeight = 3.5; // Bóng bổng khi sút
  } else if (actionType === "pass" || actionType === "cross") {
    maxHeight = 1.8; // Đường chuyền bổng vừa phải
  } else {
    return 0; // Bóng sệt trên mặt cỏ
  }

  // Phương trình Parabol đạt đỉnh tại progress = 0.5
  return 4 * maxHeight * progress * (1 - progress);
}

/**
 * Nội suy toàn bộ vị trí quả bóng gồm cả tọa độ X, Y và độ cao Z
 */
export function lerpBallWithHeight(
  from: Vector2D,
  to: Vector2D,
  t: number,
  actionType?: string,
): Ball3D {
  const pos = lerpPosition(from, to, t);
  const z = calculateBallHeight(t, actionType);
  return {
    x: pos.x,
    y: pos.y,
    z,
  };
}
