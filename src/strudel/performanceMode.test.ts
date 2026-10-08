import { describe, expect, it } from "vitest";
import { KEYNOTE_PERFORMANCE_URL, requestsKeynotePerformance } from "./performanceMode";

describe("integrated Strudel performance mode", () => {
  it("recognizes only the explicit keynote mode", () => {
    expect(requestsKeynotePerformance("?performance=keynote")).toBe(true);
    expect(requestsKeynotePerformance("?performance=demo")).toBe(false);
    expect(requestsKeynotePerformance("")).toBe(false);
  });

  it("uses a same-origin relative Strudel URL", () => {
    expect(KEYNOTE_PERFORMANCE_URL).toBe("./strudel/?performance=keynote");
  });
});
