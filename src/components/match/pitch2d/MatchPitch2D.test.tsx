import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchPitch2D from "./MatchPitch2D";
import { makeSnapshot } from "../matchScreenFixtures";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string } | string) => {
      if (typeof options === "string") return options;
      return options?.defaultValue ?? key;
    },
    i18n: { language: "en" },
  }),
}));

describe("MatchPitch2D", () => {
  it("renders the 2D football pitch with player dots and ball", () => {
    const snapshot = makeSnapshot();
    const { container } = render(<MatchPitch2D snapshot={snapshot} />);

    // Renders the pitch container, 60fps Canvas, and SVG field
    expect(container.querySelector('[data-testid="match-pitch-2d"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="pitch-2d-canvas"]')).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();

    // Renders player dots
    const dots = container.querySelectorAll('[data-testid^="player-dot-"]');
    expect(dots.length).toBeGreaterThan(0);

    // Renders the ball dot
    expect(container.querySelector('[data-testid="ball-dot"]')).toBeInTheDocument();
  });

  it("displays home and away team names in the scoreboard header", () => {
    const snapshot = makeSnapshot();
    render(<MatchPitch2D snapshot={snapshot} />);

    expect(screen.getByText("Alpha FC")).toBeInTheDocument();
    expect(screen.getByText("Beta FC")).toBeInTheDocument();
    expect(screen.getByText(/2\s*-\s*1/)).toBeInTheDocument();
  });

  it("shows goal celebration indicator when a goal event is active", () => {
    const snapshot = makeSnapshot();
    const goalEvents = [
      {
        minute: 88,
        event_type: "Goal",
        side: "Home" as const,
        zone: "AwayBox",
        player_id: "p1",
        secondary_player_id: null,
      },
    ];

    render(<MatchPitch2D snapshot={snapshot} latestEvents={goalEvents} />);
    expect(screen.getAllByText(/GOAL!/i).length).toBeGreaterThan(0);
  });

  it("renders pass trajectory line and action badge when a pass occurs", () => {
    const snapshot = makeSnapshot();
    const passEvents = [
      {
        minute: 22,
        event_type: "PassCompleted",
        side: "Home" as const,
        zone: "Midfield",
        player_id: snapshot.home_team.players[1]?.id ?? "p2",
        secondary_player_id: snapshot.home_team.players[0]?.id ?? "p1",
      },
    ];

    const { container } = render(<MatchPitch2D snapshot={snapshot} latestEvents={passEvents} />);
    expect(container.querySelector('[data-testid="ball-dot"]')).toBeInTheDocument();
    expect(screen.getByText(/Pass/i)).toBeInTheDocument();
  });

  it("renders shot action badge during a shot event", () => {
    const snapshot = makeSnapshot();
    const shotEvents = [
      {
        minute: 60,
        event_type: "ShotOnTarget",
        side: "Home" as const,
        zone: "AwayBox",
        player_id: snapshot.home_team.players[0]?.id ?? "p1",
        secondary_player_id: null,
      },
    ];

    render(<MatchPitch2D snapshot={snapshot} latestEvents={shotEvents} />);
    expect(screen.getByText(/Shot/i)).toBeInTheDocument();
  });
});
