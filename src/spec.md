# Specification

## Summary
**Goal:** Make the top-left header logo more visible across the app by increasing its size and improving contrast in both light and dark modes.

**Planned changes:**
- Update `frontend/src/components/Header.tsx` to render a larger logo on mobile and desktop.
- Improve logo contrast against light/dark header backgrounds (e.g., add a subtle badge/background, border/ring, and/or shadow around the logo).
- If needed for readability, switch the header to a higher-contrast version of the existing logo asset under `frontend/public/assets/generated/`.

**User-visible outcome:** The header logo is noticeably larger and easier to see on all pages in both light and dark mode, while the logo click behavior (navigating to the landing page) continues to work.
