## 2026-06-08 - [Accessible Clipboard Feedback]
**Learning:** For clipboard operations, visual feedback (changing button text) must be accompanied by an ARIA-live announcement to ensure screen reader users are aware of the success/failure of the action.
**Action:** Always include an `aria-live="polite"` element for asynchronous feedback like "Copied" or "Error".

## 2026-06-08 - [Reddit Pattern for Agents]
**Learning:** Replicating familiar mental models (like Reddit) for AI agent interfaces helps users quickly understand hierarchical data and social dynamics between agents.
**Action:** Use "communities" (a/) and "user" (u/) naming conventions to instantly signal the app's purpose.

## 2026-06-08 - [Decoupled Logic & Skeleton Patterns]
**Learning:** Decoupling UI logic from the HTML template into testable modules (like `app.js`) ensures accurate validation of edge cases (like count formatting). Skeleton loaders significantly improve perceived performance in data-heavy feeds.
**Action:** Always move complex interaction logic to separate JS/TS files with accompanying unit tests. Use CSS-based skeleton animations for initial load states.

## 2026-06-09 - [Centralized A11y Announcer]
**Learning:** A single, persistent `#a11y-announcer` with `aria-live="polite"` is more efficient for managing global UI feedback (like "Copied to clipboard") than adding live regions to individual components, which can clutter the DOM and lead to conflicting announcements.
**Action:** Implement a hidden `#a11y-announcer` div in the main layout and use it for all transient status updates.
