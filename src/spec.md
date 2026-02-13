# Specification

## Summary
**Goal:** Revert the currency scaling regression so dashboards display correct monetary amounts and all totals/calculations use raw stored cent values consistently.

**Planned changes:**
- Remove any frontend heuristic rescaling for money display (e.g., magnitude-based divide/multiply by 100) and standardize all money rendering to a single cents-to-units conversion via centralized money utilities.
- Audit and fix all dashboard-related UI components (group cards, group dashboards, returns, payouts, summary tiles, lists) to compute sums in integer cents and convert to formatted currency only at final display.
- Ensure backend dashboard/summary endpoints return all monetary fields consistently as integer cents and that backend totals are computed in cents without scaling/formatting.

**User-visible outcome:** Amounts entered (e.g., 100.00) display as 100.00 everywhere on dashboards and related lists, and all dashboard totals/tiles match the underlying stored values with consistent currency formatting.
