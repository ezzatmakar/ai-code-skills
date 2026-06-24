// Finding shape, deterministic IDs, severity model, and scoring.
//
// Every check module returns an array of findings built with finding().
// Findings are deterministic: the same input always yields the same id +
// severity + status, so reports diff cleanly across runs.

/** Ordered most→least severe. `info` means "could not measure / not an issue". */
export const SEVERITIES = ["critical", "high", "medium", "low", "info"];

/** Score penalty per failing finding, by severity. Documented in references/severity-rubric.md. */
export const PENALTY = { critical: 20, high: 10, medium: 4, low: 1, info: 0 };

/** Markdown severity badges (emoji scan fast in a rendered README). */
export const BADGE = {
  critical: "🔴 Critical",
  high: "🟠 High",
  medium: "🟡 Medium",
  low: "🔵 Low",
  info: "⚪ Info",
};

// Which check categories feed each score. Rendering/SSR counts toward BOTH
// because JS-only content hurts search indexing and AI-crawler citation alike.
export const SEO_CATEGORIES = ["crawlability", "rendering", "performance", "metadata", "semantics"];
export const GEO_CATEGORIES = ["geo", "rendering"];

/**
 * Build one finding. `status`:
 *   - "fail" → a real defect (penalises the score by severity)
 *   - "info" → could not be measured / informational (never penalises)
 *   - "pass" → verified good (never penalises; usually not emitted)
 */
export function finding({
  id,
  title,
  severity,
  category,
  scope = "page",        // "page" | "site"
  page = null,           // route/url for page-scoped findings
  status = "fail",
  evidence = "",
  recommendation = "",
  fixSnippet = "",
  fixLang = "",          // fenced-block language hint, e.g. "js", "html", "nginx"
}) {
  if (!SEVERITIES.includes(severity)) {
    throw new Error(`finding ${id}: invalid severity "${severity}"`);
  }
  if (!["fail", "info", "pass"].includes(status)) {
    throw new Error(`finding ${id}: invalid status "${status}"`);
  }
  return {
    id,
    title,
    severity,
    category,
    scope,
    page,
    status,
    evidence: String(evidence).trim(),
    recommendation: String(recommendation).trim(),
    fixSnippet: String(fixSnippet).trim(),
    fixLang,
  };
}

/** Count non-passing findings by severity. */
export function countBySeverity(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.status === "pass") continue;
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}

/** Deterministic 0–100 score for the given category set. Only `fail` findings penalise. */
export function scoreFor(findings, categories) {
  let score = 100;
  for (const f of findings) {
    if (f.status !== "fail") continue;
    if (!categories.includes(f.category)) continue;
    score -= PENALTY[f.severity] ?? 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function seoScore(findings) {
  return scoreFor(findings, SEO_CATEGORIES);
}

export function geoScore(findings) {
  return scoreFor(findings, GEO_CATEGORIES);
}

/** Letter band + label for a 0–100 score. */
export function band(score) {
  if (score >= 90) return "A — Excellent";
  if (score >= 75) return "B — Good";
  if (score >= 60) return "C — Needs work";
  if (score >= 40) return "D — Poor";
  return "F — Critical";
}

/** Sort findings most→least severe; stable within a severity by id. */
export function bySeverity(a, b) {
  const d = SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity);
  return d !== 0 ? d : a.id.localeCompare(b.id);
}
