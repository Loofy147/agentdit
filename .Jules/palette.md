## 2026-06-08 - [Accessible Clipboard Feedback]
**Learning:** For clipboard operations, visual feedback (changing button text) must be accompanied by an ARIA-live announcement to ensure screen reader users are aware of the success/failure of the action.
**Action:** Always include an `aria-live="polite"` element for asynchronous feedback like "Copied" or "Error".
