import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MatchCard from "../components/MatchCard";
import ScoreBreakdown from "../components/ScoreBreakdown";
import {
  berthLabel,
  formatProbability,
  formatScore,
  scoreTier,
  statusLabel,
  statusTone,
} from "../utils/formatters";
import {
  hasErrors,
  validateLogin,
  validatePreference,
  validateRegistration,
} from "../utils/validators";

const match = {
  candidate_booking_id: 12,
  candidate_display_name: "Demo passenger",
  rank: 1,
  compatibility_score: 91.25,
  current_berth_type: "LOWER",
  desired_berth_type: "MIDDLE",
  candidate_coach_number: "S4",
  candidate_berth_number: 21,
  same_coach: false,
  ml: { available: true, score: 0.82 },
  explanation: {
    summary: "Both passengers prefer each other's current berth.",
  },
};

describe("reciprocal match presentation", () => {
  it("renders both directions and invokes the review callback", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<MatchCard match={match} onView={onView} />);

    expect(screen.getByText("Demo passenger")).toBeInTheDocument();
    expect(screen.getByText("Lower")).toBeInTheDocument();
    expect(screen.getByText("Middle")).toBeInTheDocument();
    expect(screen.getByText("Both directions verified")).toBeInTheDocument();
    expect(screen.getByText("ML support available")).toBeInTheDocument();
    expect(screen.getByText("91.3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /review match/i }));
    expect(onView).toHaveBeenCalledWith(match);
  });

  it("renders transparent score contributions", () => {
    render(
      <ScoreBreakdown
        breakdown={{
          score: 82.4,
          note: "Illustrative weighted baseline.",
          contributions: [
            {
              feature: "reciprocity",
              label: "Reciprocal preference",
              value: 1,
              weight: 0.35,
              contribution: 35,
            },
            {
              feature: "journey_match",
              label: "Same journey",
              value: 1,
              weight: 0.2,
              contribution: 20,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("82.4")).toBeInTheDocument();
    expect(screen.getByText("Reciprocal preference")).toBeInTheDocument();
    expect(screen.getByText("+35.0")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Reciprocal preference: 100 percent" })
    ).toBeInTheDocument();
  });
});

describe("matching and form rules", () => {
  it("validates supported preference values", () => {
    expect(validatePreference({ desired_berth_type: "LOWER", coach_scope: "ANY" })).toEqual(
      {}
    );
    const errors = validatePreference({
      desired_berth_type: "WINDOW",
      coach_scope: "NEARBY",
    });
    expect(hasErrors(errors)).toBe(true);
    expect(errors.desired_berth_type).toMatch(/berth type/i);
    expect(errors.coach_scope).toMatch(/coach scope/i);
  });

  it("validates login and registration input", () => {
    expect(validateLogin({ email: "not-an-email", password: "" })).toEqual({
      email: "Enter a valid email address.",
      password: "Password is required.",
    });
    const registration = validateRegistration({
      display_name: "A",
      email: "demo@example.com",
      password: "short",
      confirm_password: "different",
    });
    expect(registration.display_name).toMatch(/at least 2/i);
    expect(registration.password).toMatch(/at least 8/i);
    expect(registration.confirm_password).toMatch(/do not match/i);
  });

  it("formats score, berth, and workflow status consistently", () => {
    expect(formatScore(90)).toBe("90.0");
    expect(formatScore(null)).toBe("—");
    expect(formatProbability(0.9278)).toBe("0.9278");
    expect(formatProbability(null)).toBe("—");
    expect(berthLabel("SIDE_LOWER")).toBe("Side Lower");
    expect(statusLabel("ACCEPTED_BY_BOTH")).toBe("Accepted by both");
    expect(statusTone("PENDING")).toBe("warning");
    expect(scoreTier(95).label).toBe("Very strong");
    expect(scoreTier(72).tone).toBe("warning");
  });
});
