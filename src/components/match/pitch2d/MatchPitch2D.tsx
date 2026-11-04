import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MatchSnapshot, MatchEvent } from "../types";
import { buildPitchCoordinates, calculateBallPosition, type PlayerPitchPos } from "./pitch2dCoords";
import { usePitch2DRenderer } from "./usePitch2DRenderer";
import { PitchSVG } from "./PitchSVG";

export interface MatchPitch2DProps {
  snapshot: MatchSnapshot;
  latestEvents?: MatchEvent[];
  className?: string;
  userSide?: "Home" | "Away" | null;
}

export default function MatchPitch2D({
  snapshot,
  latestEvents,
  className = "",
  userSide: _userSide,
}: MatchPitch2DProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Multi-step micro animation per minute / event update (0: setup, 1: action, 2: resolution)
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    setAnimationStep(0);
    const t1 = setTimeout(() => setAnimationStep(1), 250);
    const t2 = setTimeout(() => setAnimationStep(2), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [snapshot.current_minute, latestEvents]);

  const activeEvents = useMemo(() => {
    return latestEvents ?? snapshot.events;
  }, [latestEvents, snapshot.events]);

  const coords = useMemo(() => {
    return buildPitchCoordinates(
      snapshot.home_team.formation,
      snapshot.away_team.formation,
      snapshot.home_team.players,
      snapshot.away_team.players,
      snapshot.sent_off,
      snapshot.ball_zone,
      snapshot.possession,
      activeEvents,
      animationStep,
    );
  }, [
    snapshot.home_team.formation,
    snapshot.away_team.formation,
    snapshot.home_team.players,
    snapshot.away_team.players,
    snapshot.sent_off,
    snapshot.ball_zone,
    snapshot.possession,
    activeEvents,
    animationStep,
  ]);

  const ball = useMemo(() => {
    return calculateBallPosition({
      zone: snapshot.ball_zone,
      possession: snapshot.possession,
      events: activeEvents,
      homePositions: coords.home,
      awayPositions: coords.away,
      step: animationStep,
    });
  }, [snapshot.ball_zone, snapshot.possession, activeEvents, coords, animationStep]);

  const activeEvent = useMemo(() => {
    return activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : null;
  }, [activeEvents]);

  const isGoal = ball.isGoal || activeEvent?.event_type === "Goal";

  // Vòng lặp render Canvas 2D 60 FPS với LERP & bóng đổ 2.5D
  usePitch2DRenderer({
    canvasRef,
    homePositions: coords.home,
    awayPositions: coords.away,
    ball,
    isGoal,
    homeColor: "#2563eb",
    awayColor: "#e11d48",
  });

  return (
    <div
      data-testid="match-pitch-2d"
      className={`relative flex flex-col rounded-xl overflow-hidden border border-emerald-950/40 bg-emerald-900 shadow-lg ${className}`}
    >
      {/* Top Floating Match Header */}
      <div className="absolute top-2 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white shadow-sm">
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-blue-400">
            {snapshot.home_team.name}
          </span>
          <span className="font-heading font-black text-sm px-1.5 py-0.5 bg-white/10 rounded tabular-nums">
            {snapshot.home_score} - {snapshot.away_score}
          </span>
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-rose-400">
            {snapshot.away_team.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isGoal && (
            <div className="animate-bounce bg-amber-500 text-black font-heading font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              ⚽ {t("match.goalCelebration", "GOAL!")}
            </div>
          )}
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-emerald-300 font-heading text-xs font-bold tabular-nums shadow-sm">
            {snapshot.current_minute}'
          </div>
        </div>
      </div>

      {/* 2D Pitch Field View */}
      <div className="relative w-full aspect-[16/10] max-h-[460px] overflow-hidden select-none">
        {/* Layer 1: Canvas 2D 60 FPS Hardware-Accelerated Renderer */}
        <canvas
          ref={canvasRef}
          data-testid="pitch-2d-canvas"
          className="absolute inset-0 w-full h-full block"
        />

        {/* Layer 2: SVG Surface Fallback & Trajectory lines */}
        <PitchSVG
          passTrajectory={ball.passTrajectory}
          isShot={ball.isShot}
          targetX={ball.targetX}
          targetY={ball.targetY}
          ballX={ball.x}
          ballY={ball.y}
        />

        {/* Layer 3: Dynamic Action Badges */}
        {ball.actionText && (
          <div
            style={{
              left: `${ball.x}%`,
              top: `${Math.max(8, ball.y - 7)}%`,
              transition:
                "left 350ms cubic-bezier(0.2, 0.8, 0.2, 1), top 350ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-black tracking-wider uppercase shadow-md flex items-center gap-1 border ${
                ball.actionType === "goal"
                  ? "bg-amber-400 border-white text-black animate-bounce ring-2 ring-yellow-400"
                  : ball.actionType === "shot"
                    ? "bg-rose-500 border-rose-200 text-white animate-pulse"
                    : ball.actionType === "save"
                      ? "bg-emerald-600 border-emerald-300 text-white"
                      : "bg-blue-600/90 border-blue-300/60 text-white backdrop-blur-sm"
              }`}
            >
              <span>
                {ball.actionType === "goal"
                  ? "⚽"
                  : ball.actionType === "shot"
                    ? "⚡"
                    : ball.actionType === "save"
                      ? "🧤"
                      : "👟"}
              </span>
              <span>{ball.actionText}</span>
            </div>
          </div>
        )}

        {/* Layer 4: Interactive Player Tokens (DOM Overlay for tooltips & accessibility) */}
        {coords.home.map((p) => renderPlayerDot(p, ball.highlightPlayerId === p.playerId))}
        {coords.away.map((p) => renderPlayerDot(p, ball.highlightPlayerId === p.playerId))}

        {/* Layer 5: Ball Token */}
        <div
          data-testid="ball-dot"
          style={{
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            transition:
              "left 350ms cubic-bezier(0.2, 0.8, 0.2, 1), top 350ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full pointer-events-none ${
            isGoal
              ? "w-5 h-5 bg-yellow-300 border-2 border-white shadow-lg animate-pulse ring-4 ring-yellow-400/70"
              : "w-3.5 h-3.5 bg-white border-2 border-gray-900 shadow-md"
          }`}
        >
          <span className="text-[7px] leading-none select-none">⚽</span>
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="bg-emerald-950/90 border-t border-emerald-800/60 px-3 py-1.5 flex items-center justify-between text-xs text-emerald-200/90 font-heading">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="uppercase tracking-wider font-semibold text-[11px]">
            {snapshot.ball_zone}
          </span>
        </div>
        <div className="text-[11px] text-emerald-300/80">
          {snapshot.possession === "Home"
            ? `${snapshot.home_team.name} (${t("match.possession") || "Possession"})`
            : `${snapshot.away_team.name} (${t("match.possession") || "Possession"})`}
        </div>
      </div>
    </div>
  );
}

function renderPlayerDot(p: PlayerPitchPos, isHighlighted: boolean) {
  const isHome = p.side === "Home";
  const bgClass = p.isGoalkeeper
    ? "bg-amber-500 border-yellow-200 text-gray-950"
    : isHome
      ? "bg-blue-600 border-white text-white"
      : "bg-rose-600 border-white text-white";

  const initials = p.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      key={`${p.side}-${p.playerId}`}
      data-testid={`player-dot-${p.playerId}`}
      style={{
        left: `${p.x}%`,
        top: `${p.y}%`,
        transition:
          "left 400ms cubic-bezier(0.2, 0.8, 0.2, 1), top 400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group cursor-pointer"
      title={`${p.name} (${p.position})`}
    >
      <div
        className={`w-6 h-6 md:w-6.5 md:h-6.5 rounded-full border-2 flex items-center justify-center font-heading font-black text-[10px] shadow-md transition-transform group-hover:scale-125 ${bgClass} ${
          isHighlighted ? "ring-2 ring-yellow-400 ring-offset-1 scale-110" : ""
        }`}
      >
        {p.isGoalkeeper ? "🧤" : p.number || initials}
      </div>

      <span className="text-[8px] md:text-[9px] font-heading font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate max-w-[56px] text-center pointer-events-none mt-0.5">
        {p.name.split(" ").pop()}
      </span>
    </div>
  );
}
