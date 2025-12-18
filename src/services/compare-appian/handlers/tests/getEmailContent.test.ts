import { describe, expect, it } from "vitest";
import { getEmailContent } from "../utils/getEmailContent";

describe("getEmailContent", () => {
  const testId = "TN-25-1234-P";
  const testSubdomain = "seadev";

  describe("when isUrgent is false", () => {
    it("returns non-urgent email content", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: false,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain("This is a reminder");
      expect(result.htmlData).not.toContain("This is an urgent reminder");
      expect(result.htmlData).not.toContain(
        "Failure to address this could lead to critical delays"
      );
    });

    it("includes the SPA ID in the content", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: false,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain(testId);
      expect(result.textData).toContain(testId);
    });

    it("includes the correct SEA Tool subdomain link", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: false,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain(`https://${testSubdomain}.cms.gov/`);
    });
  });

  describe("when isUrgent is true", () => {
    it("returns urgent email content", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: true,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain("This is an urgent reminder");
      expect(result.htmlData).not.toContain(
        "This is a reminder that there's no matching"
      );
    });

    it("includes the critical delays warning", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: true,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain(
        "Failure to address this could lead to critical delays in the review process and a deemed approved SPA action."
      );
    });

    it("includes the SPA ID in the content", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: true,
        seatoolSubdomain: testSubdomain,
      });

      expect(result.htmlData).toContain(testId);
      expect(result.textData).toContain(testId);
    });
  });

  describe("subdomain handling", () => {
    it("defaults to 'sea' subdomain when not provided", () => {
      const result = getEmailContent({
        id: testId,
        isUrgent: false,
      });

      expect(result.htmlData).toContain("https://sea.cms.gov/");
    });

    it("uses custom subdomain when provided", () => {
      const customSubdomain = "seaval";
      const result = getEmailContent({
        id: testId,
        isUrgent: false,
        seatoolSubdomain: customSubdomain,
      });

      expect(result.htmlData).toContain(`https://${customSubdomain}.cms.gov/`);
    });
  });
});

