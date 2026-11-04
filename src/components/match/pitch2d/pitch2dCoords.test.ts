import { describe, it, expect } from "vitest";
import { buildPitchCoordinates, calculateBallPosition, type PlayerPitchPos } from "./pitch2dCoords";
import type { EnginePlayerData, MatchEvent } from "../types";

function makePlayer(id: string, name: string, position: string, _number = 1): EnginePlayerData {
  return {
    id,
    name,
    position,
    ovr: 75,
    condition: 100,
    pace: 75,
    stamina: 75,
    strength: 75,
    agility: 75,
    passing: 75,
    shooting: 75,
    tackling: 75,
    dribbling: 75,
    defending: 75,
    positioning: 75,
    vision: 75,
    decisions: 75,
    composure: 75,
    aggression: 50,
    teamwork: 75,
    leadership: 60,
    handling: position === "Goalkeeper" ? 80 : 20,
    reflexes: position === "Goalkeeper" ? 80 : 20,
    aerial: 70,
    traits: [],
    role: "Standard",
  };
}

function makeTeamXI(prefix: string): EnginePlayerData[] {
  return [
    makePlayer(`${prefix}-gk`, `${prefix} Keeper`, "Goalkeeper", 1),
    makePlayer(`${prefix}-df1`, `${prefix} LB`, "Defender", 2),
    makePlayer(`${prefix}-df2`, `${prefix} CB1`, "Defender", 3),
    makePlayer(`${prefix}-df3`, `${prefix} CB2`, "Defender", 4),
    makePlayer(`${prefix}-df4`, `${prefix} RB`, "Defender", 5),
    makePlayer(`${prefix}-mf1`, `${prefix} LM`, "Midfielder", 6),
    makePlayer(`${prefix}-mf2`, `${prefix} CM1`, "Midfielder", 7),
    makePlayer(`${prefix}-mf3`, `${prefix} CM2`, "Midfielder", 8),
    makePlayer(`${prefix}-mf4`, `${prefix} RM`, "Midfielder", 9),
    makePlayer(`${prefix}-fw1`, `${prefix} ST1`, "Forward", 10),
    makePlayer(`${prefix}-fw2`, `${prefix} ST2`, "Forward", 11),
  ];
}

describe("pitch2dCoords", () => {
  describe("buildPitchCoordinates", () => {
    it("returns 11 home and 11 away player positions for complete lineups", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const coords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, []);

      expect(coords.home).toHaveLength(11);
      expect(coords.away).toHaveLength(11);
    });

    it("positions home GK on the left and away GK on the right", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const coords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, []);

      const homeGk = coords.home.find((p) => p.isGoalkeeper);
      const awayGk = coords.away.find((p) => p.isGoalkeeper);

      expect(homeGk).toBeDefined();
      expect(awayGk).toBeDefined();
      if (homeGk && awayGk) {
        expect(homeGk.x).toBeLessThan(15);
        expect(awayGk.x).toBeGreaterThan(85);
        expect(homeGk.y).toBeCloseTo(50, 0);
        expect(awayGk.y).toBeCloseTo(50, 0);
      }
    });

    it("orders lines from defense to attack along the X axis", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const coords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, []);

      const homeDef = coords.home.find((p) => p.position === "Defender");
      const homeFwd = coords.home.find((p) => p.position === "Forward");
      expect(homeDef).toBeDefined();
      expect(homeFwd).toBeDefined();
      if (homeDef && homeFwd) {
        expect(homeDef.x).toBeLessThan(homeFwd.x);
      }

      const awayDef = coords.away.find((p) => p.position === "Defender");
      const awayFwd = coords.away.find((p) => p.position === "Forward");
      expect(awayDef).toBeDefined();
      expect(awayFwd).toBeDefined();
      if (awayDef && awayFwd) {
        expect(awayDef.x).toBeGreaterThan(awayFwd.x);
      }
    });

    it("filters out sent-off players", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const coords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, ["home-fw2"]);

      expect(coords.home).toHaveLength(10);
      expect(coords.home.some((p) => p.playerId === "home-fw2")).toBe(false);
      expect(coords.away).toHaveLength(11);
    });

    it("shifts team lines according to the active zone", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const midCoords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, [], "Midfield");
      const attackCoords = buildPitchCoordinates("4-4-2", "4-4-2", home, away, [], "AwayBox");

      const midHomeDef = midCoords.home.find((p) => p.position === "Defender");
      const attackHomeDef = attackCoords.home.find((p) => p.position === "Defender");

      expect(midHomeDef).toBeDefined();
      expect(attackHomeDef).toBeDefined();
      if (midHomeDef && attackHomeDef) {
        expect(attackHomeDef.x).toBeGreaterThan(midHomeDef.x);
      }
    });

    it("pushes attacking team forward and wide when in possession", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");

      const inPossessionCoords = buildPitchCoordinates(
        "4-4-2",
        "4-4-2",
        home,
        away,
        [],
        "Midfield",
        "Home",
      );
      const outOfPossessionCoords = buildPitchCoordinates(
        "4-4-2",
        "4-4-2",
        home,
        away,
        [],
        "Midfield",
        "Away",
      );

      const inPossFwd = inPossessionCoords.home.find((p) => p.position === "Forward");
      const outPossFwd = outOfPossessionCoords.home.find((p) => p.position === "Forward");

      expect(inPossFwd).toBeDefined();
      expect(outPossFwd).toBeDefined();
      if (inPossFwd && outPossFwd) {
        expect(inPossFwd.x).toBeGreaterThan(outPossFwd.x);
      }
    });

    it("moves defending goalkeeper to dive towards shot trajectory", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");
      const shotEvent: MatchEvent = {
        minute: 25,
        event_type: "ShotSaved",
        side: "Home",
        zone: "AwayBox",
        player_id: "home-fw1",
        secondary_player_id: null,
      };

      const coords = buildPitchCoordinates(
        "4-4-2",
        "4-4-2",
        home,
        away,
        [],
        "AwayBox",
        "Home",
        [shotEvent],
        1, // action step
      );

      const awayGk = coords.away.find((p) => p.isGoalkeeper);
      expect(awayGk).toBeDefined();
      // GK shifts from center (y=50) to make the dive
      if (awayGk) {
        expect(awayGk.x).toBeGreaterThan(88);
      }
    });

    it("makes the goal scorer celebrate towards the corner", () => {
      const home = makeTeamXI("home");
      const away = makeTeamXI("away");
      const goalEvent: MatchEvent = {
        minute: 35,
        event_type: "Goal",
        side: "Home",
        zone: "AwayBox",
        player_id: "home-fw1",
        secondary_player_id: null,
      };

      const coords = buildPitchCoordinates(
        "4-4-2",
        "4-4-2",
        home,
        away,
        [],
        "AwayBox",
        "Home",
        [goalEvent],
        2, // resolution / celebration step
      );

      const scorer = coords.home.find((p) => p.playerId === "home-fw1");
      expect(scorer).toBeDefined();
      if (scorer) {
        // Scorer runs deep towards the opponent corner to celebrate
        expect(scorer.x).toBeGreaterThan(85);
      }
    });
  });

  describe("calculateBallPosition", () => {
    it("places ball at player position when event has a primary player", () => {
      const home: PlayerPitchPos[] = [
        {
          playerId: "p-scorer",
          name: "Scorer",
          number: 9,
          position: "Forward",
          isGoalkeeper: false,
          side: "Home",
          x: 72,
          y: 45,
        },
      ];
      const away: PlayerPitchPos[] = [];

      const events: MatchEvent[] = [
        {
          minute: 15,
          event_type: "ShotOnTarget",
          side: "Home",
          zone: "AwayBox",
          player_id: "p-scorer",
          secondary_player_id: null,
        },
      ];

      const ball = calculateBallPosition({
        zone: "AwayBox",
        possession: "Home",
        events,
        homePositions: home,
        awayPositions: away,
      });

      expect(ball.highlightPlayerId).toBe("p-scorer");
      expect(ball.x).toBeCloseTo(72, 0);
      expect(ball.y).toBeCloseTo(45, 0);
    });

    it("places ball in net and sets isGoal on Goal event", () => {
      const home: PlayerPitchPos[] = [];
      const away: PlayerPitchPos[] = [];

      const events: MatchEvent[] = [
        {
          minute: 42,
          event_type: "Goal",
          side: "Home",
          zone: "AwayBox",
          player_id: "p-scorer",
          secondary_player_id: "p-assist",
        },
      ];

      const ball = calculateBallPosition({
        zone: "AwayBox",
        possession: "Home",
        events,
        homePositions: home,
        awayPositions: away,
      });

      expect(ball.isGoal).toBe(true);
      expect(ball.x).toBeGreaterThanOrEqual(98);
      expect(ball.y).toBeCloseTo(50, 0);
    });

    it("falls back to zone default when no active event", () => {
      const ball = calculateBallPosition({
        zone: "Midfield",
        possession: "Home",
        events: [],
        homePositions: [],
        awayPositions: [],
      });

      expect(ball.x).toBeCloseTo(50, 0);
      expect(ball.y).toBeCloseTo(50, 0);
      expect(ball.isGoal).toBe(false);
    });

    it("calculates pass trajectory when passer and receiver are present", () => {
      const home: PlayerPitchPos[] = [
        {
          playerId: "p-passer",
          name: "Passer",
          number: 8,
          position: "Midfielder",
          isGoalkeeper: false,
          side: "Home",
          x: 45,
          y: 50,
        },
        {
          playerId: "p-receiver",
          name: "Receiver",
          number: 9,
          position: "Forward",
          isGoalkeeper: false,
          side: "Home",
          x: 65,
          y: 40,
        },
      ];

      const events: MatchEvent[] = [
        {
          minute: 20,
          event_type: "PassCompleted",
          side: "Home",
          zone: "Midfield",
          player_id: "p-receiver",
          secondary_player_id: "p-passer",
        },
      ];

      const ballStep0 = calculateBallPosition({
        zone: "Midfield",
        possession: "Home",
        events,
        homePositions: home,
        awayPositions: [],
        step: 0,
      });

      const ballStep1 = calculateBallPosition({
        zone: "Midfield",
        possession: "Home",
        events,
        homePositions: home,
        awayPositions: [],
        step: 1,
      });

      expect(ballStep0.x).toBeCloseTo(45, 0);
      expect(ballStep1.passTrajectory).toBeDefined();
      if (ballStep1.passTrajectory) {
        expect(ballStep1.passTrajectory.fromX).toBeCloseTo(45, 0);
        expect(ballStep1.passTrajectory.toX).toBeCloseTo(65, 0);
      }
    });

    it("returns shot trajectory towards target goal on shot event", () => {
      const home: PlayerPitchPos[] = [
        {
          playerId: "p-striker",
          name: "Striker",
          number: 9,
          position: "Forward",
          isGoalkeeper: false,
          side: "Home",
          x: 80,
          y: 50,
        },
      ];

      const events: MatchEvent[] = [
        {
          minute: 30,
          event_type: "ShotOnTarget",
          side: "Home",
          zone: "AwayBox",
          player_id: "p-striker",
          secondary_player_id: null,
        },
      ];

      const ball = calculateBallPosition({
        zone: "AwayBox",
        possession: "Home",
        events,
        homePositions: home,
        awayPositions: [],
        step: 1,
      });

      expect(ball.isShot).toBe(true);
      expect(ball.targetX).toBeGreaterThanOrEqual(97);
    });
  });
});
