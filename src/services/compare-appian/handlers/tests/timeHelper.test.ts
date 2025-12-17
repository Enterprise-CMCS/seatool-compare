import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { secondsBetweenDates } from "../utils/timeHelper";

describe("secondsBetweenDates", () => {
  const FIXED_NOW = new Date("2025-12-15T10:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic functionality", () => {
    it("returns positive seconds for past dates", () => {
      // 1 hour ago = 3600 seconds
      const oneHourAgo = new Date("2025-12-15T09:00:00.000Z");
      expect(secondsBetweenDates(oneHourAgo)).toBe(3600);
    });

    it("returns negative seconds for future dates", () => {
      // 1 hour in future = -3600 seconds
      const oneHourFromNow = new Date("2025-12-15T11:00:00.000Z");
      expect(secondsBetweenDates(oneHourFromNow)).toBe(-3600);
    });

    it("returns 0 for the current time", () => {
      expect(secondsBetweenDates(FIXED_NOW)).toBe(0);
    });
  });

  describe("input format handling", () => {
    it("handles ISO date strings", () => {
      const isoString = "2025-12-15T09:30:00.000Z" as unknown as Date;
      // 30 minutes = 1800 seconds
      expect(secondsBetweenDates(isoString)).toBe(1800);
    });

    it("handles Unix timestamps (milliseconds)", () => {
      // 20 minutes ago in milliseconds
      const twentyMinAgoMs = FIXED_NOW.getTime() - 20 * 60 * 1000;
      expect(secondsBetweenDates(twentyMinAgoMs as unknown as Date)).toBe(1200);
    });

    it("handles Date objects", () => {
      const dateObj = new Date("2025-12-15T08:00:00.000Z");
      // 2 hours = 7200 seconds
      expect(secondsBetweenDates(dateObj)).toBe(7200);
    });
  });

  describe("master environment timing scenarios (minutes)", () => {
    it("calculates 10 minutes correctly (first check threshold)", () => {
      const tenMinAgo = new Date(FIXED_NOW.getTime() - 10 * 60 * 1000);
      expect(secondsBetweenDates(tenMinAgo)).toBe(600);
    });

    it("calculates 20 minutes correctly (sinceSubmissionChoiceSec threshold)", () => {
      const twentyMinAgo = new Date(FIXED_NOW.getTime() - 20 * 60 * 1000);
      expect(secondsBetweenDates(twentyMinAgo)).toBe(1200);
    });

    it("calculates 30 minutes correctly (first email)", () => {
      const thirtyMinAgo = new Date(FIXED_NOW.getTime() - 30 * 60 * 1000);
      expect(secondsBetweenDates(thirtyMinAgo)).toBe(1800);
    });

    it("calculates 70 minutes correctly (urgent threshold)", () => {
      const seventyMinAgo = new Date(FIXED_NOW.getTime() - 70 * 60 * 1000);
      expect(secondsBetweenDates(seventyMinAgo)).toBe(4200);
    });
  });

  describe("val/production environment timing scenarios (days)", () => {
    it("calculates 2 days correctly (initial wait)", () => {
      const twoDaysAgo = new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(secondsBetweenDates(twoDaysAgo)).toBe(172800);
    });

    it("calculates 3 days correctly (sinceSubmissionChoiceSec threshold)", () => {
      const threeDaysAgo = new Date(FIXED_NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(secondsBetweenDates(threeDaysAgo)).toBe(259200);
    });

    it("calculates 5 days correctly (urgent threshold)", () => {
      const fiveDaysAgo = new Date(FIXED_NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(secondsBetweenDates(fiveDaysAgo)).toBe(432000);
    });

    it("calculates 201 days correctly (record age limit)", () => {
      const twoHundredOneDaysAgo = new Date(FIXED_NOW.getTime() - 201 * 24 * 60 * 60 * 1000);
      expect(secondsBetweenDates(twoHundredOneDaysAgo)).toBe(17366400);
    });
  });

  describe("edge cases", () => {
    it("handles millisecond precision by flooring to seconds", () => {
      // 30.5 seconds ago should floor to 30
      const halfSecondExtra = new Date(FIXED_NOW.getTime() - 30500);
      expect(secondsBetweenDates(halfSecondExtra)).toBe(30);
    });

    it("handles very large time differences (years)", () => {
      const oneYearAgo = new Date("2024-12-15T10:00:00.000Z");
      // ~365 days = 31536000 seconds (non-leap year)
      expect(secondsBetweenDates(oneYearAgo)).toBe(31536000);
    });
  });
});

