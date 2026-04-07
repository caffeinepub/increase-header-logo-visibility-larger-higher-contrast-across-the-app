# Specification

## Summary
**Goal:** Fix mis-scaled monetary amounts across the app by verifying the backend’s raw stored values and standardizing frontend money normalization/display to prevent double-scaling.

**Planned changes:**
- Add an admin-only, non-destructive backend query endpoint to return a small sample of raw stored monetary amounts (with record IDs and type discriminator) for a given venture group.
- Standardize all frontend money rendering to use a single shared conversion/formatting path, ensuring raw amounts are converted exactly once at final render and not manually divided/multiplied across components.
- Add a temporary frontend money-model compatibility/normalization layer at query-consumption boundaries to deterministically interpret legacy whole-unit records vs cent-stored records (no backend migration).
- Audit and update all frontend money input flows so submitted values match the chosen money model consistently (preserve 2-decimal UX and validation), and newly created records render at the same scale as existing records.

**User-visible outcome:** Monetary values (line items and totals) display at the correct scale everywhere (e.g., €100.00 no longer shows as €1.00), and admins/developers can verify raw backend stored amounts per group without modifying any data.
