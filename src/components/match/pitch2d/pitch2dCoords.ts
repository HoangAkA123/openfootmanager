import type { EnginePlayerData, MatchEvent } from "../types";

export interface PlayerPitchPos {
  playerId: string;
  name: string;
  number: number;
  position: string;
  isGoalkeeper: boolean;
  side: "Home" | "Away";
  x: number; // 0..100 (%)
  y: number; // 0..100 (%)
}

export interface PassTrajectory {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface BallPos {
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  highlightPlayerId?: string | null;
  actionText?: string;
  actionType?: "pass" | "shot" | "goal" | "save" | "tackle" | "foul" | "idle";
  isGoal: boolean;
  isShot?: boolean;
  passTrajectory?: PassTrajectory | null;
}

const ZONE_X_OFFSETS: Record<string, number> = {
  HomeBox: -7,
  HomeDefense: -4,
  Midfield: 0,
  AwayDefense: 4,
  AwayBox: 8,
};

const ZONE_DEFAULT_X: Record<string, number> = {
  HomeBox: 10,
  HomeDefense: 28,
  Midfield: 50,
  AwayDefense: 72,
  AwayBox: 90,
};

function parseFormationCounts(formation: string): number[] {
  const parts = formation.split("-").map((n) => Number.parseInt(n, 10));
  if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n) && n > 0)) {
    return parts;
  }
  return [4, 4, 2];
}

function distributePlayers(
  players: EnginePlayerData[],
  formation: string,
): { gk: EnginePlayerData | null; lines: EnginePlayerData[][] } {
  const gk = players.find((p) => p.position === "Goalkeeper") ?? players[0] ?? null;
  const outfields = players.filter((p) => p !== gk);

  const counts = parseFormationCounts(formation);
  const lines: EnginePlayerData[][] = [];
  let cursor = 0;

  for (let i = 0; i < counts.length; i++) {
    const count = counts[i];
    if (i === counts.length - 1) {
      lines.push(outfields.slice(cursor));
    } else {
      lines.push(outfields.slice(cursor, cursor + count));
      cursor += count;
    }
  }

  return { gk, lines };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function isShotEvent(eventType: string): boolean {
  return (
    eventType === "ShotOnTarget" ||
    eventType === "ShotOffTarget" ||
    eventType === "ShotSaved" ||
    eventType === "ShotBlocked" ||
    eventType === "Goal" ||
    eventType === "PenaltyGoal"
  );
}

export function buildPitchCoordinates(
  formationHome: string,
  formationAway: string,
  playersHome: EnginePlayerData[],
  playersAway: EnginePlayerData[],
  sentOff: string[] = [],
  zone = "Midfield",
  possession: "Home" | "Away" = "Home",
  events: MatchEvent[] = [],
  step = 0,
): { home: PlayerPitchPos[]; away: PlayerPitchPos[] } {
  const sentOffSet = new Set(sentOff);
  const zoneShift = ZONE_X_OFFSETS[zone] ?? 0;
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  const isHomePoss = possession === "Home";

  // 1. Layout Home team (attacking Left -> Right: 0% -> 100%)
  const homeDist = distributePlayers(playersHome, formationHome);
  const homePositions: PlayerPitchPos[] = [];

  if (homeDist.gk && !sentOffSet.has(homeDist.gk.id)) {
    // Defending GK dives if shot against home
    const isUnderShot =
      latestEvent && isShotEvent(latestEvent.event_type) && latestEvent.side === "Away";
    const gkDiveY = isUnderShot && step >= 1 ? 44 : 50;
    const gkX = clamp(5 + zoneShift * 0.3 + (isHomePoss ? 3 : -1), 2, 14);

    homePositions.push({
      playerId: homeDist.gk.id,
      name: homeDist.gk.name,
      number: 1,
      position: homeDist.gk.position,
      isGoalkeeper: true,
      side: "Home",
      x: gkX,
      y: gkDiveY,
    });
  }

  const homeLineCount = homeDist.lines.length;
  homeDist.lines.forEach((linePlayers, lineIdx) => {
    const isAttackingLine = lineIdx === homeLineCount - 1;
    const baseX = homeLineCount > 1 ? 20 + (lineIdx * 40) / (homeLineCount - 1) : 35;

    // Tactical shift: push forward when in possession, drop slightly when defending
    const possessionShift = isHomePoss ? (isAttackingLine ? 9 : 5) : -3;
    const shiftedX = clamp(baseX + zoneShift + possessionShift, 8, 92);

    linePlayers.forEach((player, pIdx) => {
      if (sentOffSet.has(player.id)) return;
      let y = Math.round((100 * (pIdx + 1)) / (linePlayers.length + 1));

      // Wide players spread out in attack, compact in defense
      if (isHomePoss) {
        y = clamp(Math.round(50 + (y - 50) * 1.15), 6, 94);
      } else {
        y = clamp(Math.round(50 + (y - 50) * 0.88), 12, 88);
      }

      let posX = shiftedX;

      // Special action movements
      if (latestEvent) {
        // Goal celebration: Scorer runs towards opponent corner
        if (
          (latestEvent.event_type === "Goal" || latestEvent.event_type === "PenaltyGoal") &&
          latestEvent.side === "Home" &&
          latestEvent.player_id === player.id &&
          step >= 1
        ) {
          posX = 92;
          y = 15;
        } else if (
          isShotEvent(latestEvent.event_type) &&
          latestEvent.side === "Home" &&
          latestEvent.player_id === player.id &&
          step >= 1
        ) {
          // Shooter surges towards goal
          posX = clamp(posX + 8, 20, 90);
        }
      }

      homePositions.push({
        playerId: player.id,
        name: player.name,
        number: pIdx + 2,
        position: player.position,
        isGoalkeeper: false,
        side: "Home",
        x: posX,
        y,
      });
    });
  });

  // 2. Layout Away team (attacking Right -> Left: 100% -> 0%)
  const awayDist = distributePlayers(playersAway, formationAway);
  const awayPositions: PlayerPitchPos[] = [];

  if (awayDist.gk && !sentOffSet.has(awayDist.gk.id)) {
    // Defending GK dives if shot against away
    const isUnderShot =
      latestEvent && isShotEvent(latestEvent.event_type) && latestEvent.side === "Home";
    const gkDiveY = isUnderShot && step >= 1 ? 44 : 50;
    const gkX = clamp(95 + zoneShift * 0.3 + (!isHomePoss ? -3 : 1), 86, 98);

    awayPositions.push({
      playerId: awayDist.gk.id,
      name: awayDist.gk.name,
      number: 1,
      position: awayDist.gk.position,
      isGoalkeeper: true,
      side: "Away",
      x: gkX,
      y: gkDiveY,
    });
  }

  const awayLineCount = awayDist.lines.length;
  awayDist.lines.forEach((linePlayers, lineIdx) => {
    const isAttackingLine = lineIdx === awayLineCount - 1;
    const baseX = awayLineCount > 1 ? 100 - (20 + (lineIdx * 40) / (awayLineCount - 1)) : 65;

    // Tactical shift for Away
    const possessionShift = !isHomePoss ? (isAttackingLine ? -9 : -5) : 3;
    const shiftedX = clamp(baseX + zoneShift + possessionShift, 8, 92);

    linePlayers.forEach((player, pIdx) => {
      if (sentOffSet.has(player.id)) return;
      let y = Math.round((100 * (pIdx + 1)) / (linePlayers.length + 1));

      if (!isHomePoss) {
        y = clamp(Math.round(50 + (y - 50) * 1.15), 6, 94);
      } else {
        y = clamp(Math.round(50 + (y - 50) * 0.88), 12, 88);
      }

      let posX = shiftedX;

      if (latestEvent) {
        // Goal celebration for away
        if (
          (latestEvent.event_type === "Goal" || latestEvent.event_type === "PenaltyGoal") &&
          latestEvent.side === "Away" &&
          latestEvent.player_id === player.id &&
          step >= 1
        ) {
          posX = 8;
          y = 15;
        } else if (
          isShotEvent(latestEvent.event_type) &&
          latestEvent.side === "Away" &&
          latestEvent.player_id === player.id &&
          step >= 1
        ) {
          posX = clamp(posX - 8, 10, 80);
        }
      }

      awayPositions.push({
        playerId: player.id,
        name: player.name,
        number: pIdx + 2,
        position: player.position,
        isGoalkeeper: false,
        side: "Away",
        x: posX,
        y,
      });
    });
  });

  return { home: homePositions, away: awayPositions };
}

export function calculateBallPosition(params: {
  zone: string;
  possession: "Home" | "Away";
  events: MatchEvent[];
  homePositions: PlayerPitchPos[];
  awayPositions: PlayerPitchPos[];
  step?: number;
}): BallPos {
  const { zone, events, homePositions, awayPositions, step = 0 } = params;
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  if (latestEvent) {
    const allPositions = [...homePositions, ...awayPositions];

    // 1. Goal Event
    if (latestEvent.event_type === "Goal" || latestEvent.event_type === "PenaltyGoal") {
      const isHomeGoal = latestEvent.side === "Home";
      const goalX = isHomeGoal ? 99 : 1;
      return {
        x: goalX,
        y: 50,
        targetX: goalX,
        targetY: 50,
        isGoal: true,
        isShot: true,
        actionType: "goal",
        actionText: "GOAL!",
        highlightPlayerId: latestEvent.player_id,
      };
    }

    // 2. Pass / Assist Event
    if (
      latestEvent.event_type === "PassCompleted" ||
      (latestEvent.secondary_player_id &&
        latestEvent.player_id &&
        latestEvent.event_type !== "Foul")
    ) {
      const passerId = latestEvent.secondary_player_id;
      const receiverId = latestEvent.player_id;

      const passer = allPositions.find((p) => p.playerId === passerId);
      const receiver = allPositions.find((p) => p.playerId === receiverId);

      if (passer && receiver) {
        const passTrajectory: PassTrajectory = {
          fromX: passer.x,
          fromY: passer.y,
          toX: receiver.x,
          toY: receiver.y,
        };

        if (step === 0) {
          return {
            x: passer.x,
            y: passer.y,
            targetX: receiver.x,
            targetY: receiver.y,
            highlightPlayerId: passerId,
            actionType: "pass",
            actionText: "Pass",
            isGoal: false,
            passTrajectory,
          };
        }

        if (step === 1) {
          return {
            x: (passer.x + receiver.x) / 2,
            y: (passer.y + receiver.y) / 2,
            targetX: receiver.x,
            targetY: receiver.y,
            highlightPlayerId: receiverId,
            actionType: "pass",
            actionText: "Pass",
            isGoal: false,
            passTrajectory,
          };
        }

        return {
          x: receiver.x,
          y: receiver.y,
          highlightPlayerId: receiverId,
          actionType: "pass",
          isGoal: false,
          passTrajectory,
        };
      }
    }

    // 3. Shot Events
    if (isShotEvent(latestEvent.event_type)) {
      const isHomeShot = latestEvent.side === "Home";
      const targetX = isHomeShot ? 98.5 : 1.5;
      const targetY = 48;
      const shooter = latestEvent.player_id
        ? allPositions.find((p) => p.playerId === latestEvent.player_id)
        : null;

      if (step === 0 && shooter) {
        return {
          x: shooter.x,
          y: shooter.y,
          targetX,
          targetY,
          isGoal: false,
          isShot: true,
          actionType: "shot",
          actionText: "Shot",
          highlightPlayerId: shooter.playerId,
        };
      }

      return {
        x: targetX,
        y: targetY,
        targetX,
        targetY,
        isGoal: false,
        isShot: true,
        actionType: latestEvent.event_type === "ShotSaved" ? "save" : "shot",
        actionText: latestEvent.event_type === "ShotSaved" ? "Save" : "Shot",
        highlightPlayerId: latestEvent.player_id,
      };
    }

    // 4. Default player event
    if (latestEvent.player_id) {
      const playerPos = allPositions.find((p) => p.playerId === latestEvent.player_id);
      if (playerPos) {
        return {
          x: playerPos.x,
          y: playerPos.y,
          isGoal: false,
          highlightPlayerId: latestEvent.player_id,
          actionText: latestEvent.event_type,
        };
      }
    }
  }

  // Zone fallback
  const defaultX = ZONE_DEFAULT_X[zone] ?? 50;

  return {
    x: clamp(defaultX, 5, 95),
    y: 50,
    isGoal: false,
    actionType: "idle",
  };
}
