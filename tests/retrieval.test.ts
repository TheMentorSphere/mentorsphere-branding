import { describe, expect, it } from "vitest";
import { currentKnowledgeEntries, knowledgeBase } from "../src/assistant/knowledge-base";
import { isReliableRetrieval, retrieveKnowledge, sourceLinks } from "../src/assistant/retrieval";

function ids(query: string): string[] {
  return retrieveKnowledge(query).map((result) => result.entry.id);
}

describe("hybrid retrieval and terminology", () => {
  it.each([
    ["How much is math tutering?", "tutoring-payg-prices"],
    ["Do you help with home schooling?", "ehe-eotas-support"],
    ["I need SEN help", "education-send-scope"],
    ["Is ADHD therapy available?", "coaching-audiences-boundaries"],
    ["Can my employer pay for coaching?", "coaching-funded-prices"],
    ["What if I miss a lesson?", "cancellation-general-payg"],
    ["Could someone else teach my lesson?", "cover-tutors"],
    ["How much is a monthly tutoring package?", "tutoring-subscription-prices"],
    ["Do you sort an EHCP?", "ehcp-support"],
    ["Can you help me get assessed for autism?", "referral-preparation"],
    ["Can two siblings share sessions?", "tutoring-combined-family"],
    ["What computer do I need?", "technical-requirements"],
  ])("maps %s to %s", (query, expectedId) => {
    expect(ids(query)).toContain(expectedId);
  });

  it("uses recent user turns to resolve a price follow-up", () => {
    const query = [
      "Do you coach teenagers with ADHD?",
      "How much?",
      "Can a parent join some sessions?",
    ].join(" ");
    const results = ids(query);
    expect(results).toContain("coaching-self-funded-prices");
    expect(results).toContain("coaching-family-involvement");
  });

  it("returns exact current price and term sources", () => {
    const entries = currentKnowledgeEntries(new Date("2026-07-30T12:00:00Z"));
    expect(entries.find((entry) => entry.id === "tutoring-payg-prices")?.content).toContain("£45.00");
    expect(entries.find((entry) => entry.id === "coaching-self-funded-prices")?.content).toContain("£390");
    expect(entries.find((entry) => entry.id === "coaching-self-funded-prices")?.content).toContain("six months");
    expect(entries.find((entry) => entry.id === "cancellation-general-payg")?.content).toContain("48 hours");
    expect(entries.find((entry) => entry.id === "subscription-terms")?.content).toContain("10 working days");
    expect(entries.find((entry) => entry.id === "coaching-audiences-boundaries")?.content).toContain("10 to 17");
  });

  it("expires temporally limited transition wording", () => {
    expect(
      currentKnowledgeEntries(new Date("2026-08-31T12:00:00Z")).some(
        (entry) => entry.id === "coaching-existing-client-transition",
      ),
    ).toBe(true);
    expect(
      currentKnowledgeEntries(new Date("2026-09-01T12:00:00Z")).some(
        (entry) => entry.id === "coaching-existing-client-transition",
      ),
    ).toBe(false);
  });

  it("never retrieves excluded content", () => {
    expect(
      retrieveKnowledge("old Maths Mentor complaints policy").some(
        (result) => result.entry.status !== "current",
      ),
    ).toBe(false);
  });

  it("treats an unsupported general query as unreliable", () => {
    expect(isReliableRetrieval(retrieveKnowledge("Who won the football last night?"))).toBe(false);
  });

  it("returns only verified MentorSphere source URLs", () => {
    const links = sourceLinks(retrieveKnowledge("ADHD coaching prices"));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((source) => new URL(source.url).hostname === "www.thementorsphere.co.uk")).toBe(true);
  });

  it("requires metadata on every knowledge entry", () => {
    for (const entry of knowledgeBase) {
      expect(entry.id).not.toBe("");
      expect(entry.title).not.toBe("");
      expect(entry.category).not.toBe("");
      expect(entry.content).not.toBe("");
      expect(entry.sourcePage).not.toBe("");
      expect(entry.sourceUrl).not.toBe("");
      expect(entry.documentVersion).not.toBe("");
      expect(entry.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["current", "pending", "archived", "excluded"]).toContain(entry.status);
    }
  });
});
