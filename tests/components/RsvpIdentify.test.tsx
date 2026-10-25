// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const ph = vi.hoisted(() => ({
  __loaded: true,
  get_distinct_id: vi.fn(() => "anon"),
  identify: vi.fn(),
  group: vi.fn(),
  register: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: ph }));

import { RsvpIdentify } from "@/components/RsvpIdentify";

describe("RsvpIdentify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("identifies by the stable id and groups by run, without names", () => {
    render(
      <RsvpIdentify distinctId="reg-1" eventId="ev-1" attendeeId="att-1" isOrganizer={false} />,
    );
    expect(ph.identify).toHaveBeenCalledWith("reg-1", { is_organizer: false });
    expect(ph.group).toHaveBeenCalledWith("run", "ev-1");
    expect(ph.register).toHaveBeenCalledWith({ event_id: "ev-1", attendee_id: "att-1" });
  });

  it("doesn't re-identify someone already identified as this person", () => {
    ph.get_distinct_id.mockReturnValueOnce("reg-1");
    render(
      <RsvpIdentify distinctId="reg-1" eventId="ev-1" attendeeId="att-1" isOrganizer />,
    );
    expect(ph.identify).not.toHaveBeenCalled();
  });
});
