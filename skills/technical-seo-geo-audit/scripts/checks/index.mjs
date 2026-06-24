// Check registry. Each module exports site(siteCtx) and/or page(pageCtx, siteCtx).
import * as crawlability from "./crawlability.mjs";
import * as rendering from "./rendering.mjs";
import * as performance from "./performance.mjs";
import * as metadata from "./metadata.mjs";
import * as semantics from "./semantics.mjs";
import * as geo from "./geo.mjs";

export const MODULES = { crawlability, rendering, performance, metadata, semantics, geo };

/** Run every site-level check. */
export function runSiteChecks(siteCtx) {
  const out = [];
  for (const mod of Object.values(MODULES)) {
    if (typeof mod.site === "function") out.push(...mod.site(siteCtx));
  }
  return out;
}

/** Run every page-level check for a single page. */
export function runPageChecks(pageCtx, siteCtx) {
  const out = [];
  for (const mod of Object.values(MODULES)) {
    if (typeof mod.page === "function") out.push(...mod.page(pageCtx, siteCtx));
  }
  return out;
}
