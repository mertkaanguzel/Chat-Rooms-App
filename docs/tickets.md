# Tickets: E2E rewrite

A tracer-bullet breakdown of the E2E-encrypted, no-multi-login, QR-invite, nickname-bearing rewrite described in `docs/SPEC-E2E-rewrite.md` (built on ADR-0001, ADR-0002, ADR-0003). The existing vanilla-JS front-end in `src/public/` is unsalvageable for these features and is replaced; the backend `User`/`Room` collections and their REST/Socket.IO surface are reshaped to the Account / Membership / Room / RoomInvite / EncryptedFrame / PendingNotification ubiquitous language in `CONTEXT.md`.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom. The DAG fans out after T4 — T5, T6 and T9 run in parallel — then reconverges at T8 and T10.

```
T1 ── T2 ── T3 ── T4 ─┬─ T5 ───────────────┐
                      ├─ T6 ─ T7 ──┐         │
                      └─ T9 ───────┴─ T8 ─── T10
```

## T1 — Monorepo skeleton & tooling spine

**What to build:** A working npm-workspaces monorepo (`server/`, `client/`, `shared/`) on a single Express origin at `localhost:3000` — Vite in middleware mode during dev so the browser sees one origin (eliminating cross-origin cookie fragility for the session-bound auth model), Vite-built React served as static by Express in prod. The existing backend is relocated into `server/` and its existing tests still pass. A minimal React `/login` route posts to a stubbed `POST /auth/login` and renders the response end-to-end through the new tooling spine. Three `tsconfig`s at root, `client/`, `server/` (both `strict: true`). CI runs Jest + Vitest + `tsc --noEmit` + lint on push and PR. The unsalvageable vanilla-JS UI is parked in-repo (no longer the served front-end) pending deletion at parity in T10.

**Blocked by:** None — can start immediately.

- [x] npm workspaces wired (`server/`, `client/`, `shared/` as `@chat/shared`)
- [x] Existing backend relocated into `server/`; existing Jest suite green from new layout
- [x] Vite middleware mounted on the Express server; single `localhost:3000` origin serves both API and the React app in dev
- [x] Production: Vite builds `client/dist`; Express serves it as static
- [x] Three `tsconfig.json`s (root base, client `lib: ["DOM","ES2022"]`, server `lib: ["ES2022"]`), all `strict: true`, `tsc --noEmit` clean across the workspace
- [x] Minimal React `/login` route posts to a stubbed `POST /auth/login` and renders the response
- [x] CI runs Jest, Vitest, `tsc --noEmit`, and lint on push and PR
- [x] `server/public/` no longer the served front-end; legacy UI is in-repo but not routed

## T2 — Account, Envelope, Login ceremony, Session, no-multi-login

**What to build:** The end-to-end Account lifecycle with E2E envelope, narrated login, server-enforced no-multi-login, and a clean logout. Register (email + password + confirm password + show-password toggle): the Client mints an X25519 keypair, generates a random salt, Argon2id-derives the envelope key (`m_cost = 64 MiB, t_cost = 3, p_cost = 1`), secretbox-wraps the privKey with a 24-byte nonce, derives `password_hash` independently of the envelope key, and POSTs `{ email, password_hash, pub, salt, ciphertext, nonce }` to `/accounts`. Login as a three-phase narrated ceremony ("Authenticating…" → "Unlocking E2E…" → "Ready") hitting `/auth/login` which returns `{ sessionId, envelope: { salt, ciphertext, nonce } }`; the Client runs Argon2id in tab, opens the secretbox, and holds the privKey in a module-scoped `Uint8Array`. The server binds Account→live Session via a Redis key and enforces no-multi-login: a new login destroys the prior Session and the prior tab observes socket disconnect plus `session-revoked` and returns to the login screen. Logout best-effort zeroizes the privKey and destroys the Session (8h sliding / 24h hard cap TTL). Wrong-password yields a clear retry; an envelope-fetch network failure offers Retry or Logout (never "continue without E2E"); a decrypt failure offers a "Reset E2E identity" CTA that lands on the password-reset flow built in T9. The login form carries a disabled "Forgot password?" link that T9 will wire. The legacy `User` collection, the `/users` and `/auth` routes, and their `*.spec.ts` tests are replaced by Account-shaped server-seam tests (with mocked Argon2id for speed).

**Blocked by:** T1 — Monorepo skeleton & tooling spine.

- [ ] `POST /accounts` accepts `{ email, password_hash, pub, salt, ciphertext, nonce }` and stores the Account (no `firstName`/`lastName`, no embedded `rooms`)
- [ ] Registration ceremony generates X25519 keypair, Argon2id-derives envelope key, secretbox-wraps privKey, derives `password_hash` independently; posts to `/accounts`; on success sets privKey in tab memory and navigates home
- [ ] Registration form has email, password, confirm-password, and a show-password toggle
- [ ] `POST /auth/login` returns `{ sessionId, envelope: { salt, ciphertext, nonce } }`; Session is Redis-bound with an 8h sliding / 24h hard-cap TTL
- [ ] Login ceremony narrates "Authenticating…" → "Unlocking E2E…" → "Ready"
- [ ] Argon2id runs in tab; `crypto_secretbox_open` extracts privKey into a module-scoped `Uint8Array`
- [ ] A second login destroys the prior Session; the prior tab observes socket disconnect + `session-revoked` and returns to the login screen
- [ ] Logout zeroizes the privKey (best-effort `.fill(0)`) and destroys the Session, forcing socket disconnect
- [ ] Wrong password yields a clear error and retry
- [ ] Envelope-fetch network failure offers Retry or Logout — never "continue without E2E"
- [ ] Decrypt failure (`secretbox_open` returns null) offers a "Reset E2E identity" CTA heading to T9's flow
- [ ] Login form shows a (disabled until T9) "Forgot password?" link
- [ ] Legacy `User` collection, `/users` and `/auth` routes, and their tests are replaced by Account-shaped server-seam tests with mocked Argon2id

## T3 — PendingNotification infrastructure (Redis)

**What to build:** The server-side Redis-backed pending-notification primitives, ahead of any UI or feature that consumes them — a prefactor so T4, T6 and T9 each have a single clean enqueue target instead of inventing their own queue. Two Account-scoped keys per Account: `pending:misc:{accountId}` (a Redis list of `{ type: 'room-closed' | 'IdentityReset', roomId?, accountId?, timestamp }` events with a 7-day TTL on the list) and `pending:exp:{accountId}` (a coalesced hash for `frame-expired-summary` events keyed per `{roomId}:{recipientId}` with an integer count maintained via `HINCRBY`, plus sidecar `:first`/`:last` timestamp fields, a 7-day TTL on the parent hash refreshed on every update via `EXPIRE`, and a soft cap of 100 fields with a `__truncated__` sentinel set via `HSETNX` once `HLEN >= 100`). Helpers `enqueueMisc(accountId, event)`, `enqueueFrameExpired(accountId, roomId, recipientId)`, and `drainPending(accountId)` that returns misc events and coalesced exp summaries and atomically `HGETALL`+`DEL`s the exp hash in a single `MULTI`/`EXEC` roundtrip. No UI. Server-seam tests assert round-trip, coalescing per `(roomId, recipientId)`, the cap behaviour, and TTL refresh on update. Consumed by T4 (`room-closed`), T6 (`frame-expired-summary`), and T9 (`IdentityReset`).

**Blocked by:** T2 — Account, Envelope, Login ceremony, Session, no-multi-login.

- [ ] `pending:misc:{accountId}` Redis list with 7-day TTL, holding `{ type, roomId?, accountId?, timestamp }` events of `room-closed` and `IdentityReset` shapes
- [ ] `pending:exp:{accountId}` Redis hash keyed `{roomId}:{recipientId}` with integer count via `HINCRBY`, plus `:first`/`:last` timestamp fields
- [ ] Parent hash has a 7-day TTL refreshed on every update (`EXPIRE pending:exp:{accountId} 604800`)
- [ ] Soft cap of 100 fields: once `HLEN >= 100`, `__truncated__` sentinel is set via `HSETNX` and no new fields are created
- [ ] `enqueueMisc`, `enqueueFrameExpired`, and `drainPending` helpers exist and are unit/server-seam exercised
- [ ] `drainPending` returns misc events and coalesced exp summaries and atomically deletes the exp hash (`MULTI`/`EXEC`)
- [ ] Server-seam tests assert round-trip, coalescing per `(roomId, recipientId)`, the 100-field cap, and TTL refresh on update

## T4 — Memberships & Room lifecycle

**What to build:** The Room and Membership lifecycle end-to-end — Account creates a Room (becomes the Owner; `POST /rooms`), an Account lists its Memberships (`GET /rooms`), and the adaptive sidebar+main layout shell renders the Room list and a Room view showing the Member roster and per-Membership nicknames. Membership is a new join collection carrying an immutable, set-at-join-time, 1–32-Unicode-char Nickname (duplicates allowed within a Room); a Room with only its Owner is a valid steady state (no auto-close). The legacy `Room.users[]` field, the `/rooms` routes and their tests are replaced. A non-Owner Member leaves (`DELETE /rooms/{roomId}/membership`); the Owner is forbidden from leaving without first closing (403, "Close the Room or stay."). Owner-close (`DELETE /rooms/{roomId}`) hard-deletes the Room row, emits `room-closed { roomId }` to live Members, and queues a `room-closed` PendingNotification for offline Members. Account deletion (`POST /accounts/delete`) cascades: the Account's Memberships are removed and `member-left { roomId, accountId }` is emitted per affected Room; Rooms the deleted Account owns are auto-hard-closed with `room-closed` PendingNotifications to offline Members and `room-closed` to live Members. Remaining Members receive `member-left` on leave or Account deletion. The deletion UI warns "This will close N Rooms you own. Continue?" This ticket amends in T6 once EncryptedFrames exist (T6 also deletes pending frames for affected Rooms). Components ship with `dark:` variants from the first commit.

**Blocked by:** T2 — Account, Envelope, Login ceremony, Session, no-multi-login; T3 — PendingNotification infrastructure (Redis).

- [ ] `POST /rooms { name }` creates a Room; the caller becomes its Owner (immutable Owner for the Room's lifetime)
- [ ] `GET /rooms` returns the Account's Memberships
- [ ] Adaptive sidebar+main layout shell: Room list in the sidebar, Room view (Member roster + nicknames) in the main pane
- [ ] Membership collection: `_id`, `accountId` (indexed), `roomId` (indexed), `nickname` (1–32 Unicode, immutable for the Membership's lifetime), `joinedAt`, `leftAt?`
- [ ] Unique compound index on `(accountId, roomId)` while `leftAt` is null — prevents duplicate live Memberships
- [ ] Duplicate nicknames within a Room are allowed
- [ ] A Room with only its Owner is a valid steady state (not auto-closed)
- [ ] Legacy `Room.users[]` field and `/rooms` routes and their tests are replaced
- [ ] `DELETE /rooms/{roomId}/membership` lets a non-Owner Member leave; emits `member-left { roomId, accountId }` to remaining Members; removes the leaving socket from the Room channel
- [ ] Owner is forbidden from leaving (403, "Close the Room or stay.")
- [ ] `DELETE /rooms/{roomId}` (Owner only) hard-deletes the Room, emits `room-closed { roomId }` to live Members, queues a `room-closed` PendingNotification for offline Members, forces all sockets out of the Room channel
- [ ] `POST /accounts/delete` cascades: removes Memberships (`member-left` per Room) and hard-closes owned Rooms (`room-closed` to offline Members, `room-closed` to live Members)
- [ ] Deletion UI shows a confirm dialog: "This will close N Rooms you own. Continue?"
- [ ] Components carry `dark:` variants

## T5 — RoomInvite QR & redemption ceremony

**What to build:** The complete QR-invite lifecycle end-to-end — an Owner mints RoomInvites with Owner-chosen lifecycle (one-shot vs. multi-use; 1h/1d/7d/never expiry), mints multiple simultaneous invites per Room, sees each invite rendered as a QR code (`qrcode.react`) with an accessible text alternative exposing the underlying `https://{host}/invite/{tokenId}` URL, audits which Accounts redeemed a given invite, and revokes any single invite (`DELETE /invites/{tokenId}`) without affecting the others. A scanner of the QR (camera-scan or pasted URL) lands on an invite preview showing the Room name, then a confirm step, then a nickname prompt — a cancel at the preview/confirm step does not auto-join. A not-logged-in scanner is redirected to login with the invite URL preserved in the redirect-back, landing back on the invite preview after authenticating. A scanner who is already a Member of the Room is dropped straight into the Room (no nickname prompt, no confirm). A scanner who is an ex-Member is prompted for a fresh nickname. `POST /invites/{tokenId}/redeem { nickname }` creates the Membership and emits `member-joined { roomId, accountId, nickname }` to remaining Members. Invalid tokens surface clear messages: a revoked invite ("this invite is no longer valid"), an expired invite ("this invite has expired"), a one-shot invite already redeemed ("this invite has already been used"), and a malformed or non-existent token ID ("invite not found"). Components ship with `dark:` variants.

**Blocked by:** T4 — Memberships & Room lifecycle.

- [ ] RoomInvite collection: `_id` (UUID, used as the token ID in the QR URL), `roomId` (indexed), `invitedBy`, `createdAt`, `expiresAt` (nullable for "never"), `oneShot`, `redeemedBy: UUID[]`, `revokedAt?`
- [ ] `POST /rooms/{roomId}/invites { oneShot, expiresAfter }` mints a RoomInvite; multiple simultaneous invites per Room allowed
- [ ] Mint-invite UI renders the QR (`qrcode.react`) with an accessible aria-label / text alternative exposing the invite URL
- [ ] Owner can see which Accounts redeemed a given invite (audit)
- [ ] `DELETE /invites/{tokenId}` revokes a single invite without affecting the others
- [ ] Scanning lands on a preview (Room name) → confirm → nickname prompt; cancel does not auto-join
- [ ] Not-logged-in scanner redirected to login with the invite URL preserved in redirect-back, returning to the preview after auth
- [ ] Already-Member scanner redirected straight into the Room (no prompt, no confirm)
- [ ] Ex-Member scanner prompted for a fresh nickname
- [ ] `POST /invites/{tokenId}/redeem { nickname }` creates the Membership, returns it, emits `member-joined { roomId, accountId, nickname }` to remaining Members
- [ ] Revoked invite → "this invite is no longer valid"
- [ ] Expired invite → "this invite has expired"
- [ ] One-shot already-redeemed → "this invite has already been used"
- [ ] Malformed / non-existent token ID → "invite not found"
- [ ] Components carry `dark:` variants

## T6 — EncryptedFrame live messaging, DeliveredAck, frame-expired

**What to build:** The live messaging subsystem end-to-end — a sender's Client encrypts the plaintext once per recipient Client in the Room (`crypto_box` per recipient) with a client-generated `messageId`, POSTs the resulting frames to the server (`POST /frames { messageId, roomId, frames: [{ recipientId, ciphertext, nonce }] }`), and the server fans out `new-frame { frame }` socket pushes to live recipients. The sender gains a "Sent ✓" mark when the POST of the EncryptedFrames succeeds and a "Delivered ✓" mark once at least one recipient's DeliveredAck arrives. A recipient decrypts immediately via `crypto_secretbox_open` in tab memory and emits `frame-acked { messageId, recipientId }` only on successful decrypt (idempotent on the server) — an ack means real decrypt-success, not bytes-on-socket. A recipient of a frame sent under an old identity (peer reset their E2E) detects decrypt failure and does not auto-ack, so the 24h TTL safety net cleans the frame up rather than acking something unreadable. EncryptedFrames are stored server-side with a TTL index (`expiresAt = createdAt + 24h`) that auto-deletes documents at expiry; a Mongo change stream or per-row `expiresAt` watcher emits a live `frame-expired` socket event to an online sender when a TTL fires, or enqueues a coalesced `frame-expired-summary` PendingNotification for an offline sender (per `(roomId, recipientId)` via the T3 helpers). Ratchet state and decrypted plaintext live only in tab memory — never persisted to IndexedDB or localStorage. The Room view grows a send-message input and a decrypted-bubble message list. The T4 owner-close and account-deletion cascade is amended to also delete pending EncryptedFrames for the affected Room. Components ship with `dark:` variants.

**Blocked by:** T4 — Memberships & Room lifecycle.

- [ ] EncryptedFrame collection: `_id`, `messageId` (UUID, indexed for ack idempotency only — not grouped), `roomId` (indexed with TTL compound), `senderId`, `recipientId` (indexed, primary `drain-pending` key), `ciphertext`, `nonce`, `createdAt` (indexed, used for ordering and TTL)
- [ ] TTL index: `expiresAt = createdAt + 24h`, documents auto-deleted by Mongo at expiry
- [ ] `POST /frames { messageId, roomId, frames: [{ recipientId, ciphertext, nonce }] }` stores N rows and fans out `new-frame { frame }` to live recipients
- [ ] Sender's Client encrypts the plaintext once per recipient Client
- [ ] Sender gains a "Sent ✓" mark on POST success and a "Delivered ✓" mark once at least one recipient's DeliveredAck arrives
- [ ] Recipient emits `frame-acked { messageId, recipientId }` only after `crypto_secretbox_open` succeeds in tab memory (idempotent on server)
- [ ] Decrypt failure on an old-identity frame does not auto-ack — the 24h TTL cleans it up
- [ ] A TTL watcher emits a live `frame-expired` socket event to an online sender when a TTL fires
- [ ] A TTL fire on an offline sender enqueues a coalesced `frame-expired-summary` PendingNotification via the T3 helpers
- [ ] Ratchet state and decrypted plaintext live only in tab memory (never IndexedDB or localStorage) — asserted in tests
- [ ] Room view has a send-message input and a decrypted-bubble message list
- [ ] Owner-close (`DELETE /rooms/{roomId}`) and account deletion (`POST /accounts/delete`) amended to also delete pending EncryptedFrames for the affected Room
- [ ] Components carry `dark:` variants

## T9 — Password reset, E2E identity rotation, corrupted-envelope recovery

**What to build:** The password-reset / E2E-identity-rotation flow end-to-end — a user clicks "Forgot password?" (the link placed by T2 on the login form) and is sent a reset link out-of-band (in dev, rendered/printed rather than emailed); clicking it lands on a "new password" form. On submit the Client mints a fresh X25519 keypair, a fresh salt, Argon2id-derives a new envelope key over the new password + new salt, secretbox-wraps the new privKey with a fresh 24-byte nonce, derives a new `password_hash` independently, and the server stores the new `{ password_hash, pub, salt, ciphertext, nonce }` along with `pub_superseded_at = now`, destroys the old envelope, and queues `IdentityReset` PendingNotifications to the Account's relevant peers (Accounts that share a Membership with the reset Account). The old identity is unrecoverable; messages addressed to the old `pub` cannot be read (surfacing on peers as the decrypt-failure / re-verify path that T6's ack-suppression already backs). The same reset flow is the destination of the "Reset E2E identity" CTA offered (by T2) on a corrupted-envelope decrypt failure: `secretbox_open` returns null → "Reset E2E identity" → this flow → back to the login ceremony. Reset is demoable server-side by inspecting the queued `IdentityReset` notifications; the peer-side "re-verify Alice" UX surfacing lands in T8.

**Blocked by:** T4 — Memberships & Room lifecycle.

- [ ] "Forgot password?" link on the login form (placed by T2) initiates the reset flow
- [ ] Reset link is delivered out-of-band; in dev it is rendered/printed rather than emailed
- [ ] Reset link lands on a "new password" form
- [ ] On submit the Client mints a fresh X25519 keypair, fresh salt, Argon2id-derives a new envelope key, secretbox-wraps the new privKey, derives a new `password_hash` independently
- [ ] Server stores new `{ password_hash, pub, salt, ciphertext, nonce }` and sets `pub_superseded_at = now`; old envelope destroyed
- [ ] Server queues `IdentityReset` PendingNotifications to relevant peers (Accounts sharing a Membership with the reset Account) via the T3 helpers
- [ ] Old identity is unrecoverable — messages addressed to the old `pub` cannot be read (peers see the decrypt-failure / re-verify path)
- [ ] "Reset E2E identity" CTA on a corrupted-envelope decrypt failure (offered by T2) drives this same flow
- [ ] After reset, the user returns to the login ceremony
- [ ] Reset is demoable server-side via queued-notification inspection

## T7 — drain-pending protocol, ClientReady, RoomReady

**What to build:** The `drain-pending` post-login catch-up protocol end-to-end — after envelope unlock succeeds, the Client runs two HTTP-based fetches: `GET /notifications/pending` drains both `pending:misc` and `pending:exp` for the Account in a single structured response, and per-Room paginated `GET /frames/pending?roomId={X}&cursor={optionalCreatedAtCursor}` at 50 frames per page sorted by `createdAt` ascending, run in parallel per Room. Each drained frame is followed by a `DeliveredAck` (which deletes the row). The drain is resumable by idempotency — a tab close mid-drain simply resumes on next login because acked frames are already gone and unacked frames are still queued, with no special re-resume logic. Each Room becomes `RoomReady(roomId)` independently the moment its own frames finish draining, regardless of other Rooms still draining; `ClientReady` is reached once `GET /notifications/pending` returns. The UI marks each still-draining Room with a per-Room skeleton loader and lets the user navigate to any Room at any time. New live frames arriving via socket during a drain interleave with drained frames by `serverReceivedAt` (= `createdAt`) so ordering stays compositional even if a live frame arrives mid-drain. Per-Room readiness is tracked independently.

**Blocked by:** T6 — EncryptedFrame live messaging, DeliveredAck, frame-expired.

- [ ] After envelope unlock, the Client runs `drain-pending`
- [ ] `GET /notifications/pending` returns both `pending:misc` and `pending:exp` for the Account in a single structured response
- [ ] `GET /frames/pending?roomId={X}&cursor={Y}` returns paginated EncryptedFrames for one Room, max 50 per page, sorted by `createdAt` ascending
- [ ] The Client repeats the per-Room fetch in parallel per Room the Account is a Member of, until each Room's queue is empty
- [ ] Each drained frame is followed by a `DeliveredAck` to the server (which deletes the row)
- [ ] Drain is resumable by idempotency: tab close mid-drain resumes on next login with no special re-resume logic
- [ ] Per-Room independent readiness: a Room becomes `RoomReady(roomId)` when its own frames finish draining, regardless of other Rooms still draining
- [ ] `ClientReady` reached once `GET /notifications/pending` returns; per-Room readiness tracked separately per Room
- [ ] UI shows per-Room skeleton loaders for Rooms still draining; user can navigate to any Room at any time
- [ ] Live frames arriving via socket during a drain interleave with drained frames by `serverReceivedAt` (= `createdAt`)

## T8 — drain-pending UX, notification center, IdentityReset re-verify

**What to build:** The notification-center UX for the drained PendingNotifications and the peer-side IdentityReset re-verify flow — a bell icon in the app header with an unread badge, opening a Radix panel (Dialog or Popover) listing drained PendingNotifications, rendered by type: `room-closed` ("Owner closed Room X"), `frame-expired-summary` ("N messages to {recipient nickname} in {room name} expired undelivered", one coalesced line per `(room, recipient)` rather than N expanded lines), and `IdentityReset` ("{nickname} reset their E2E identity — re-verify"). The center is the user-pace surface for "what happened while you were away" — not a toast stream (too ephemeral) and not a modal list (too heavy). The peer-side "re-verify Alice" UX is driven by real `IdentityReset` notifications queued by T9 from a peer's password reset. The drained batch reads as a feed the user can review at their own pace rather than dismissing a toast. As a hard invariant, no decrypted plaintext or ratchet state is persisted client-side (the assertion test added here covers the whole client; this complements the T6 assertion). Components ship with `dark:` variants.

**Blocked by:** T7 — drain-pending protocol, ClientReady, RoomReady; T9 — Password reset, E2E identity rotation, corrupted-envelope recovery.

- [ ] App header contains a bell icon with an unread badge
- [ ] Clicking the bell opens a Radix panel (Dialog or Popover) listing drained PendingNotifications
- [ ] `room-closed` renders as "Owner closed Room X"
- [ ] `frame-expired-summary` renders as a single coalesced line per `(room, recipient)`: "N messages to {recipient nickname} in {room name} expired undelivered"
- [ ] `IdentityReset` renders as "{nickname} reset their E2E identity — re-verify" and surfaces the peer-side re-verify UX
- [ ] The re-verify UX is driven by real `IdentityReset` notifications queued by T9 from a peer's password reset
- [ ] The center is a persistent feed (not a toast stream, not a modal list) the user reviews at their own pace
- [ ] Client assertion test: no decrypted plaintext or ratchet state is persisted to IndexedDB or localStorage across the client
- [ ] Components carry `dark:` variants

## T10 — Front-end parity polish & legacy deletion gate

**What to build:** The front-end visual / interaction / accessibility parity completion that gates the deletion of the legacy vanilla-JS UI — adaptive layout where the sidebar collapses into a drawer (single-pane main view) on small screens via Tailwind breakpoint variants on the same component tree (no separate mobile/desktop codebase); a two-pane (sidebar + main) layout on `md` and wider. Dark mode via Tailwind `dark:` variants on every styled element from the first commit, driven by a Zustand `themeStore` of `'light' | 'dark' | 'system'` that applies/removes the `dark` class on `<html>` and respects `prefers-color-scheme` by default. Keyboard operability across all primary flows (login, room navigation, message input, invite redemption) with Tab order following visual order; focus management on route changes (React Router) and on modal/drawer open/close (Radix handles this for free). WCAG 2.1 AA text contrast verified per-component; the QR code's text alternative of the invite URL is confirmed for screen-reader users; reduced-vision users can read messages without strain. The single-origin dev experience (`localhost:3000` with Vite in middleware mode) is verified to behave the same in dev as in prod for cookies and WebSockets. Once parity is reached — login, Room list, chat view, send-message, invite redemption, notification center, and password reset all work end-to-end with the new design — the legacy vanilla-JS UI (`server/public/`) and the remaining legacy Socket.IO demo events (`new-user`, `send-chat-message`, `user-connected`, `user-disconnected`, the `disconnecting` handler) are deleted; no legacy endpoints, schemas, or tests remain.

**Blocked by:** T8 — drain-pending UX, notification center, IdentityReset re-verify; T5 — RoomInvite QR & redemption ceremony.

- [ ] Adaptive layout: two-pane (sidebar + main) on `md`+; sidebar collapses to a drawer (single-pane main view) on `sm` and narrower, via Tailwind breakpoints on the same component tree
- [ ] Dark mode: Tailwind `dark:` variants on every styled element; Zustand `themeStore` of `'light' | 'dark' | 'system'` applies/removes the `dark` class on `<html>`; respects `prefers-color-scheme` by default
- [ ] Keyboard operability across login, room navigation, message input, and invite redemption; Tab order follows visual order
- [ ] Focus management on route changes (React Router) and on modal/drawer open/close (Radix)
- [ ] WCAG 2.1 AA contrast verified per-component
- [ ] QR code text alternative (invite URL) confirmed for screen-reader users
- [ ] Single-origin dev experience verified: `localhost:3000` with Vite middleware behaves the same in dev as in prod for cookies and WebSockets
- [ ] Parity reached: login, Room list, chat view, send-message, invite redemption, notification center, password reset all work end-to-end with the new design
- [ ] Legacy vanilla-JS UI (`server/public/`) deleted
- [ ] Legacy Socket.IO demo events (`new-user`, `send-chat-message`, `user-connected`, `user-disconnected`, `disconnecting`) deleted
- [ ] No legacy endpoints, schemas, or tests remain in the codebase