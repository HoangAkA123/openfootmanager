import React from "react";
import type { PassTrajectory } from "./pitch2dCoords";

interface PitchSVGProps {
  passTrajectory?: PassTrajectory | null;
  isShot?: boolean;
  targetX?: number;
  targetY?: number;
  ballX?: number;
  ballY?: number;
}

export const PitchSVG: React.FC<PitchSVGProps> = React.memo(function PitchSVG({
  passTrajectory,
  isShot,
  targetX,
  targetY,
  ballX,
  ballY,
}) {
  return (
    <svg
      viewBox="0 0 100 68"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="lawn-stripes" width="10" height="68" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="5" height="68" fill="#15803d" />
          <rect x="5" y="0" width="5" height="68" fill="#166534" />
        </pattern>
      </defs>

      {/* Grass Background */}
      <rect width="100" height="68" fill="url(#lawn-stripes)" />

      {/* Touchlines and Goal lines */}
      <rect
        x="2"
        y="2"
        width="96"
        height="64"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />

      {/* Halfway Line */}
      <line x1="50" y1="2" x2="50" y2="66" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />

      {/* Center Circle & Center Spot */}
      <circle
        cx="50"
        cy="34"
        r="9.15"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <circle cx="50" cy="34" r="0.6" fill="rgba(255,255,255,0.85)" />

      {/* Left Penalty Area */}
      <rect
        x="2"
        y="15"
        width="16.5"
        height="38"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <rect
        x="2"
        y="24"
        width="5.5"
        height="20"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <circle cx="11" cy="34" r="0.6" fill="rgba(255,255,255,0.85)" />
      <path
        d="M 18.5 28 A 9.15 9.15 0 0 1 18.5 40"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <rect
        x="0.3"
        y="29.5"
        width="1.7"
        height="9"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="0.6"
      />

      {/* Right Penalty Area */}
      <rect
        x="81.5"
        y="15"
        width="16.5"
        height="38"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <rect
        x="92.5"
        y="24"
        width="5.5"
        height="20"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <circle cx="89" cy="34" r="0.6" fill="rgba(255,255,255,0.85)" />
      <path
        d="M 81.5 28 A 9.15 9.15 0 0 0 81.5 40"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <rect
        x="98"
        y="29.5"
        width="1.7"
        height="9"
        fill="rgba(255,255,255,0.15)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="0.6"
      />

      {/* Corner Arcs */}
      <path
        d="M 2 4 A 2 2 0 0 0 4 2"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <path
        d="M 2 64 A 2 2 0 0 1 4 66"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <path
        d="M 98 4 A 2 2 0 0 1 96 2"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />
      <path
        d="M 98 64 A 2 2 0 0 0 96 66"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
      />

      {/* Pass Trajectory Path */}
      {passTrajectory && (
        <line
          x1={passTrajectory.fromX}
          y1={(passTrajectory.fromY * 68) / 100}
          x2={passTrajectory.toX}
          y2={(passTrajectory.toY * 68) / 100}
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth="0.7"
          strokeDasharray="2 1.5"
        />
      )}

      {/* Shot Trajectory Path */}
      {isShot && targetX !== undefined && ballX !== undefined && ballY !== undefined && (
        <line
          x1={ballX}
          y1={(ballY * 68) / 100}
          x2={targetX}
          y2={((targetY ?? 50) * 68) / 100}
          stroke="rgba(250, 204, 21, 0.85)"
          strokeWidth="0.9"
          strokeDasharray="2 1"
        />
      )}
    </svg>
  );
});
