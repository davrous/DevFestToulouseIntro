export const KEYNOTE_PERFORMANCE_QUERY = "performance=keynote";
export const KEYNOTE_PERFORMANCE_URL = `./strudel/?${KEYNOTE_PERFORMANCE_QUERY}`;

export function requestsKeynotePerformance(search: string): boolean {
  return new URLSearchParams(search).get("performance") === "keynote";
}
