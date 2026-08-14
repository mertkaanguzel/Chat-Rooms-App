# ADR-0003: Front-end visual & interaction design

Date: 2026-08-13
Status: Accepted

## Context

The front end is being rewritten from the current single-page
vanilla JS bundle (`src/public/index.html`, `app.js`, `style.css`)
to a React + Vite + TypeScript SPA (ADR scope implicit; see ADR-0001
for the E2E/cryptography context and the resolved wire contract for
the server↔client event surface).

After the framework, tooling, and protocol decisions were resolved
(Router, Zustand, TanStack Query, Tailwind + Radix Primitives), a
thin layer of visual / interaction choices remained. These were
resolved inline during the grilling session but not recorded as a
persistent decision. This ADR records them so the front-end rewrite
has a documented baseline before implementation begins.

Scope of this ADR: the six visual / interaction choices listed
below. It does not re-litigate framework choice, repo layout, the
wire contract, or the E2E protocol — those are settled elsewhere.

## Decision

### 1. Component library — shadcn/ui (Tailwind + Radix Primitives)

Adopt [shadcn/ui](https://ui.shadcn.com/) as the component library.
shadcn/ui is not a dependency in the npm-installed sense — its
components are vendored into the client repo and modified freely.
It is built directly on Tailwind CSS and Radix Primitives, both of
which were already chosen in the secondary-stack decision.

### 2. Layout shell — adaptive sidebar + main pane

A two-pane layout on wide screens (sidebar with Room list + main
pane with Room view) collapsing to a single pane on small screens
(sidebar slides over as a drawer; main pane full-width). No separate
"mobile layout" codebase; the same components adapt via Tailwind
breakpoints.

### 3. QR code rendering — `qrcode.react`

The RoomInvite QR code is rendered via the
[`qrcode.react`](https://github.com/zpao/qrcode.react) library. One
React component (`QRCodeSVG` or `QRCodeCanvas`); no manual canvas
plumbing.

### 4. Pending-notifications UI — notification center (bell + panel)

Drained PendingNotifications (`room-closed`,
`frame-expired-summary`, `IdentityReset`) surface in a notification
center — a bell icon in the app header with an unread badge, opening
a panel listing notifications. Not a toast stream (too ephemeral
for the kind of information being conveyed); not a modal list
(too heavy for routine post-login drain).

### 5. Dark mode — supported from day one via Tailwind `dark:` variants

Tailwind's native dark-mode support is used; all components are
styled with `dark:` variants from the first commit. A theme toggle
in the UI is optional but supported.

### 6. Accessibility — WCAG 2.1 AA via Radix primitives as the floor

Radix Primitives (underneath shadcn/ui) handle the bulk of
keyboard navigation, focus management, and ARIA attributes for
dialogs, dropdowns, menus, tooltips, etc. The remaining
`aria-*` annotations are added only where Radix leaves gaps —
e.g. bespoke icon-only buttons, the QR code rendering (which needs
a text alternative for screen readers: the RoomInvite URL as
fallback), and any custom-built layout components.

## Consequences

### Positive

- shadcn/ui gives full source control over components — no
  fighting an upstream component library's opinions; components
  can be reshaped as the visual language matures.
- Adaptive layout with shared components means one codebase covers
  mobile and desktop; bugs fixed once apply to both.
- `qrcode.react` is a single React component with no canvas
  plumbing, the smallest reasonable surface for QR generation.
- Notification center matches user expectations from other chat
  apps (Slack, Discord, WhatsApp Web); the drained batch of
  PendingNotifications reads naturally as a feed of "what happened
  while you were away."
- Dark mode from day one avoids the retrofit cost (which can be
  substantial — every component needs dark variants, easier to do
  up-front than later).
- WCAG 2.1 AA coverage via Radix is largely free; the marginal
  accessibility work is well-scoped.

### Negative

- shadcn/ui has a smaller ecosystem than Material UI or Chakra;
  some specialized components (e.g. rich calendar pickers) may
  need to be built or sourced separately.
- Adaptive layout incurs real testing cost — every breakpoint
  permutation must be checked manually and in CI screenshot tests
  if those are added later. Mitigated but not eliminated by
  adoption of Radix primitives that abstract away much of the
  responsive plumbing.
- Notification center is a custom component not provided by
  shadcn/ui; it must be built in-house. Real but bounded cost.
- Dark mode from day one doubles the visual decisions (every
  component needs a dark variant). The cost is paid up front;
  doing it later would cost more.

### Neutral / risks

- shadcn/ui's "vendored component" model means the repo carries
  the component source code; this is a feature (full control) and
  a small maintenance cost (component updates must be applied
  manually if the upstream pattern improves).
- Accessibility beyond WCAG 2.1 AA (e.g. AAA, ATAG for authoring
  tools) is out of scope and would be its own ADR if required.

## Alternatives considered

### 1. Component library

- **Material UI (MUI).** Larger ecosystem; opinionated default
  styling that fights Tailwind's utility-first approach. Rejected
  for the styling mismatch.
- **Chakra UI.** Similar story to MUI; its own styling system
  that overlaps with Tailwind. Rejected for the same reason.
- **Radix Themes (as opposed to Radix Primitives).** Radix Themes
  is a full styled component library built on the Primitives;
  closer to shadcn/ui but with fewer escape hatches for restyling.
  Rejected in favor of shadcn/ui's vendored-component model.
- **Hand-built components on Radix Primitives only.** Maximum
  control, maximum cost — every component authored from scratch.
  Rejected as too expensive for the rewrite scope.

### 2. Layout shell

- **Sidebar + main pane, fixed (no mobile adaptation).** Simpler
  to implement; refuses to work on phones. Rejected as the user
  base is likely to include mobile usage at some point.
- **Stacked layout (mobile-first, no sidebar).** Single column,
  navigation via back-button drill-down. Rejected as worse on
  desktop, where most chat-app usage happens.
- **Separate desktop and mobile layouts** (two codebases or
  diverged component trees). Rejected for the doubled maintenance
  cost.

### 3. QR code rendering

- **`qrcode` (CLI/library).** Pre-renders the QR to an SVG or
  PNG file. Useful for server-side QR rendering, but we render
  in the browser from a known URL string. Rejected for the
  client-side use case.
- **`qrcode-generator` (the older `davidshimjs/qrcodejs`).**
  Smaller and less maintained than `qrcode.react`. Rejected.
- **Hand-rolled SVG QR encoding.** Rejected as duplicating
  well-tested library work.

### 4. Pending-notifications UI

- **Toast stream.** Rejected as too ephemeral — a drained batch of
  notifications ("Carlos missed 47 messages in Room X this
  weekend") deserves to live long enough for the user to actually
  read it, not vanish after 4 seconds.
- **Modal list on login.** Rejected as too heavy — a modal blocks
  interaction with the rest of the app and forces an explicit
  dismissal, which is antagonistic for routine drain contents.
- **Embedded in the Room view itself** (e.g. banner "X messages
  expired while you were away" per Room). Tempting for
  Room-scoped notifications like `frame-expired-summary`, but
  doesn't host Account-scoped notifications like `IdentityReset`
  (peer re-keyed) or Room-wide `room-closed` for rooms the user
  isn't currently viewing. Rejected in favor of the cross-Room
  notification center pattern.

### 5. Dark mode

- **Light mode only, no dark mode.** Simpler, but the cost of
  retrofitting dark mode later (re-touching every component) is
  much higher than the cost of adding `dark:` variants up front.
  Rejected.
- **Dark mode only.** Polarizing for users who prefer light
  backgrounds; rejected in favor of user-toggleable theme.
- **Auto theme based on `prefers-color-scheme` with no toggle.**
  Viable; the absence of an explicit toggle is the only loss.
  The decision here supports both auto-detect and a manual toggle;
  the toggle's presence or absence is implementation-detail and
  not part of this ADR.

### 6. Accessibility

- **No explicit accessibility baseline.** Rejected: an E2E app's
  core screens (login, room list, chat view) are exactly the
  screens where accessibility matters most — keyboard users and
  screen-reader users can't avoid them.
- **WCAG 2.1 AAA.** Stricter; rarely achievable across all
  components without significant extra effort and sometimes
  genuinely conflicts with chat-app visual conventions (e.g.
  AAA's 7:1 contrast ratio on text inside message bubbles,
  which often brands itself on lower-contrast secondary text).
  Rejected as a hardcoded obligation; available as a future ADR
  if a subset of screens needs it.
- **Author components without Radix / from scratch.** Rejected
  as the accessibility cost of hand-rolled interactive components
  (focus traps, ARIA trees, keyboard semantics) is high and easy
  to get wrong. Radix's free coverage is the orthochoice.