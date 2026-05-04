import { adminRequest } from "./admin-client";
import type { RevenueSummary } from "../types";

export function getRevenueSummary() {
  return adminRequest<{ summary: RevenueSummary }>("analytics/revenue");
}
