## Problem Statement

As a registered user of Chat-Rooms-App, I want my conversations to be private end-to-end, accessible only from one of my devices at a time, and to survive my recipients being offline — so that I have confidence my messages reach the people I sent them to, and only those people. As the Room Owner, I also want to be able to close a Room when it has run its course, and to invite people via QR code instead of typing identifiers.

As the developer, I want to rewrite the front-end completely (it is currently a minimal Socket.IO demo) so that the new E2E-encrypted, no-multi-login, QR-invite, nickname-bearing user experience can actually be delivered. The existing vanilla JS in `src/public/` is not salvageable for these features.

## Solution

Build E2E encryption on top of a server-stored envelope that is unlocked client-side at login by Argon2id (see ADR-0001). Persist each Account's identity keypair in the Account row in encrypted form; decrypt it in the browser tab on login; never persist any key material client-side. The private key lives in tab memory for the duration of a Session; on logout it is best-effort zeroed.

Enforce "no multi-login" by binding an Account to at most one live Session at a time. A new login destroys the prior Session; the prior tab observes this as socket disconnect plus a `session-revoked` event and returns to the login screen.

Replace the existing plaintext Socket.IO broadcast with a per-recipient EncryptedFrame delivery model. The sender's Client encrypts the plaintext N times (once per recipient Client in the Room), POSTs the resulting frames to the server, and the server fans out `new-frame` socket pushes to live recipients. EncryptedFrames are stored server-side with a 24h safety-net TTL and deleted on the recipient's DeliveredAck (which is tied to decrypt-success in tab memory, not socket receipt). Frames for recipients who are offline past the 24h TTL are silently dropped, but the sender is notified via a coalesced `frame-expired-summary` PendingNotification the next time they log in.

Persist Room lifetime events that fire while an Account is offline as PendingNotifications, drained on the Account's next login as part of the `drain-pending` protocol. PendingNotifications carry informational events (`room-closed`, `frame-expired-summary`, `IdentityReset`) only — never ciphertext.

Add Memberships (the Account ↔ Room join) with a per-Membership Nickname that the joining Account picks at join time and which is immutable for the Membership's lifetime. Add Owner-only Room close, Member leave, and a server-driven `member-left` event that drives per-Room re-keying on the remaining Clients. Account deletion cascades: the Account's Memberships are removed and `member-left` is emitted per affected Room; Rooms owned by the deleted Account are auto-hard-closed with `room-closed` PendingNotifications to offline Members.

Add RoomInvites — server-stored tokens rendered as QR codes, with Owner-chosen lifecycle (one-shot vs. multi-use; expiry duration) and per-token revocation. Scanning a QR code lands the user on a preview → confirm → nickname-prompt ceremony; non-logged-in scanners are sent to login with redirect-back; current Members are redirected directly into the Room; ex-Members re-join with a fresh nickname.

Completely rewrite the front-end as a React + Vite + TypeScript SPA served by Express (see ADR-0003 for the visual / interaction design). Vite runs in middleware mode during dev so the browser sees a single origin (`localhost:3000`) in both dev and prod — eliminating cross-origin cookie fragility for the session-bound auth model.

## User Stories

### Account & Authentication

1. As a new user, I want to register with my email and a password, so that I have a registered identity in the system.
2. As a registering user, I want to be asked to type my password twice and to optionally show the password in clear, so that I catch typos at registration time and don't lock myself out of my own E2E identity.
3. As a registering user, I want the registration ceremony to generate my E2E keypair, encrypt the private key with my password, and store only the ciphertext on the server, so that the server cannot read my private key.
4. As a returning user, I want to log in with my email and password, so that I resume my Account.
5. As a logging-in user, I want to see progressive narration ("Authenticating…" → "Unlocking E2E…" → "Ready") during the login ceremony, so that I understand the Argon2id wait is normal.
6. As a logged-in user, I want to be able to log out, so that I end my Session and clear the in-tab private key.
7. As a user who forgot my password, I want to reset it via a reset link sent to my email, so that I can regain access to my Account.
8. As a user resetting my password, I want the system to generate a fresh identity keypair and emit an `IdentityReset` notification to my peers, so that my contacts know to re-verify my identity.
9. As a user who typed my password wrong, I want a clear "wrong password" error and a retry, so that I can correct myself.
10. As a user whose envelope ciphertext is corrupted on the server, I want a clear message offering me to reset my E2E identity, so that I can recover gracefully rather than guess what's wrong.
11. As a user whose envelope fetch failed mid-login due to a network issue, I want a retry option (not a "continue without E2E" option), so that I am never in a logged-in-but-keyless state.
12. As a logged-in user who initiated login from another device, I want my prior tab to be kicked with a clear "another session was started" message, so that I understand why I was logged out.

### Sessions & Multi-Login

13. As an Account, I want at most one live Session at a time, so that "no multi-login" is enforced by the server.
14. As a user, I want my Session to last 8 hours sliding with a 24-hour hard cap, so that I can use the app across a workday without re-logging-in constantly.
15. As a user, I want my socket connection to die promptly when my Session is superseded, so that the UI can react rather than half-live indefinitely.

### Rooms & Membership

16. As a logged-in user, I want to create a Room with a name, so that I become its Owner.
17. As a Room Owner, I want to be the only one who can close my Room, so that I control its lifecycle.
18. As a Room Owner, I want to invite people to my Room via QR code, so that I don't need their email addresses or IDs to add them.
19. As a Room Owner, I want to choose, when minting an invite, whether the QR is one-shot or multi-use, so that I can match the invite's exposure (a single in-person add vs. a QR on a poster).
20. As a Room Owner, I want to choose, when minting an invite, an expiry duration (1h / 1d / 7d / never), so that leaked QRs don't stay live forever.
21. As a Room Owner, I want to see which Accounts redeemed a given invite, so that I can audit invite usage.
22. As a Room Owner, I want to revoke a specific invite at any time, so that I can invalidate a leaked QR without affecting my other invites.
23. As a Room Owner, I want to be able to mint multiple simultaneous invites for the same Room, so that I can share different QRs in different contexts.
24. As a Room Owner, I want to be forbidden from leaving my Room without first closing it, so that I cannot silently orphan a Room I created.
25. As a Room Member (non-Owner), I want to be able to leave the Room at any time, so that I can exit conversations I no longer want to be part of.
26. As a Room Member who left, I want to be able to re-join via a fresh QR invite, so that leaving is reversible.
27. As a Room Owner who deleted my Account, I want all my Rooms to be auto-closed and `room-closed` notifications sent to my Members, so that my Rooms die with me cleanly.
28. As a Room Member who deleted my Account, I want my Memberships to be removed and `member-left` to fire per affected Room, so that my departure is consistent with a manual leave.
29. As a remaining Member in a Room where someone left, I want my Client to receive a `member-left` event and drop that recipient from my per-Room sender state, so that I stop sending EncryptedFrames to a departed Member.
30. As a Member of a Room that has only the Owner left, I want the 1-person-Room state to be valid (not auto-closed), so that the Owner can re-invite fresh Members at a later time.
31. As a Room Member, I want to see other Members' nicknames rendered next to their messages, so that I know who said what.
32. As a joining user, I want to be required to enter a nickname when I accept an invite, so that my Membership has a display name from the start.
33. As a joining user, I want my nickname to be immutable for the lifetime of my Membership, so that other Members can rely on stable names.
34. As a Room Member, I want duplicate nicknames within a Room to be allowed, so that the system doesn't refuse reasonable nicknames just because someone else got there first.
35. As a Room Owner, when I close my Room, I want the close to be permanent (no reopen), so that closed means closed.
36. As a Room Owner, when I close my Room, I want all pending EncryptedFrames for that Room to be deleted immediately, so that in-flight ciphertext doesn't linger after the Room is gone.

### Invitation via QR

37. As a user with a QR code, I want the camera-scan or paste-the-URL to land me on an invite preview page showing the Room name, so that I know what I'm joining before I commit.
38. As an invitee who is not logged in, I want to be redirected to login with the invite URL preserved in the redirect-back, so that I land back on the invite preview after authenticating.
39. As an invitee who scans a QR for a Room I'm already a Member of, I want to be redirected straight into the Room (no nickname prompt, no confirm), so that the QR just gets me back to the conversation I'm already in.
40. As an invitee who is an ex-Member of the Room, I want to be prompted for a fresh nickname on redemption, so that my new Membership carries a nickname (since my old Membership was destroyed on leave).
41. As an invitee, I want to be able to cancel at the preview/confirm step, so that an accidental scan doesn't auto-join me.
42. As an invitee scanning a revoked invite, I want a clear "this invite is no longer valid" message, so that I know to ask the Owner for a fresh one.
43. As an invitee scanning an expired invite, I want a clear "this invite has expired" message, so that I know what happened.
44. As an invitee scanning a one-shot invite that was already redeemed, I want a clear "this invite has already been used" message, so that I know to ask for a fresh one.
45. As an invitee scanning a malformed or non-existent token ID, I want a 404-style "invite not found" message, so that I'm not left staring at a blank screen.

### E2E Messaging

46. As a sender, I want my Client to encrypt the plaintext once per recipient Client in the Room, so that each recipient gets their own dedicated ciphertext.
47. As a sender, I want the sent message to gain a "Sent ✓" mark when the server confirms the POST of the EncryptedFrames succeeded, so that I know the server received my frames.
48. As a sender, I want a per-message "Delivered ✓" mark once at least one recipient's DeliveredAck arrives, so that I know my message reached at least one Client's tab memory.
49. As a recipient, I want my Client to emit a DeliveredAck only after `secretbox_open` successfully decrypted the frame in tab memory, so that an ack means real decrypt-success, not bytes-on-socket.
50. As a recipient whose socket pushed a `new-frame` event, I want my Client to decrypt immediately and ack, so that the server can free storage.
51. As a sender whose frame TTL-fired without an ack, I want to receive a `frame-expired-summary` PendingNotification on my next login, so that I know "Carlos missed 47 of my messages in Room X."
52. As a sender who was online when the TTL fired, I want a live `frame-expired` socket event, so that I see the dropped-message indication immediately.
53. As a recipient who rejoined the app after a long weekend, I want my Client to run `drain-pending` and pull any non-expired EncryptedFrames addressed to me, so that I catch up on messages sent within the last 24h.
54. As a recipient running `drain-pending`, I want the drain to be paginated per-Room (50 frames per page per Room), so that a single chatty Room doesn't bottleneck the whole drain.
55. As a recipient, I want each Room to become ready for interaction as soon as its own frames are drained, so that I don't wait for all Rooms to finish before opening any one.
56. As a recipient running `drain-pending`, I want drained frames and live frames to interleave by `serverReceivedAt` timestamp, so that the ordering stays compositional even if a live frame arrives mid-drain.
57. As a user whose `drain-pending` was interrupted by tab close, I want the drain to resume on next login from where it left off (since acked frames are already deleted), so that no special re-resume logic is needed.
58. As a recipient of a frame sent under an old identity (peer reset their E2E), I want my Client to detect decrypt-failure and not auto-ack, so that the 24h TTL safety net cleans the frame up rather than acking something I couldn't read.
59. As a peer of an Account that just reset their E2E identity, I want my Client to receive an `IdentityReset` PendingNotification and surface a "re-verify Alice" UX, so that I'm aware the safety number I trusted has changed.
60. As a user, I want my Client's ratchet state and decrypted plaintext to live only in tab memory (never persisted to IndexedDB or localStorage), so that closing the tab reliably clears those secrets.

### Front-End UX

61. As a user on desktop, I want a sidebar + main pane layout, so that I can see my Room list and an active Room at the same time.
62. As a user on mobile, I want the sidebar to collapse into a drawer (single-pane main view), so that the chat bubbles get adequate width.
63. As a user, I want a dark mode toggle (or system-following dark mode), so that I can use the app in the dark without eye strain.
64. As a user with pending notifications drained on login, I want a notification-center bell icon with an unread badge, so that I can review "what happened while I was away" at my own pace rather than dismissing a toast.
65. As a keyboard user, I want all primary flows (login, room navigation, message input, invite redemption) to be operable without a pointing device, so that I can navigate the app accessibly.
66. As a screen-reader user, I want the QR code on an invite screen to expose the underlying invite URL as text alternative, so that the QR isn't a blind spot in the screen-reader experience.
67. As a user with reduced vision, I want text contrast to meet WCAG 2.1 AA at minimum, so that I can read messages without straining.
68. As a developer-oriented user, I want the dev experience to run a single server process on port 3000 with Vite in middleware mode, so that cookies and WebSockets behave the same in dev as in production.
69. As a Room Owner, I want to see the QR code for any of my outstanding invites rendered in the RoomInvite management UI, so that I can share them by screenshot or printout.

## Implementation Decisions

### Cryptographic stack (see ADR-0001 for full context)

- **Identity key:** X25519 via libsodium `crypto_box_keypair`.
- **KDF:** `Argon2id(password, salt)`, `m_cost = 64 MiB`, `t_cost = 3`, `p_cost = 1`.
- **Envelope cipher:** libsodium `crypto_secretbox` (XSalsa20-Poly1305), 24-byte random nonce.
- **Envelope wraps:** the 32-byte X25519 private key (and only that).
- **Salt storage:** server-side on the Account row, 16 random bytes.
- **Password handling:** the `password_hash` used for auth is derived independently of the `envelopeKey` (different salt / different derivation). The server never sees the raw password.

### Account schema changes

The existing `User` collection will be renamed to `Account` per the ubiquitous language. Account fields:

- `_id` (UUID, kept)
- `email` (string, unique, required)
- `password_hash` (string, `select: false`, required) — auth-only; independently derived from the `envelopeKey`.
- `pub` (32-byte X25519 public key) — cleartext.
- `salt` (16 bytes, Argon2id salt) — cleartext.
- `ciphertext` (secretbox output over `privKey`) — encrypted.
- `nonce` (24-byte secretbox nonce) — cleartext.
- `pub_superseded_at` (timestamp, optional) — set on password reset, used by peer Clients to render "re-verify" UX.
- The existing `firstName` and `lastName` fields are dropped — they were never rendered under the new design and the per-Room Nickname replaces their role.
- The existing embedded `rooms: IRooms[]` on the User is removed — Memberships become a separate join collection.

### Session handling (Redis)

- A separate Redis key `session:account:{accountId}` maps Account → live Session ID.
- On login: look up the existing Session ID, destroy it (`STORE.destroy(oldId)`), overwrite the key with the new Session ID (`SET`), issue the new Session.
- Auth middleware (Express + `io.use()` socket): on each request/socket connect, compare the request's `sessionId` to `session:account:{accountId}`; if they differ, return 401 (HTTP) or refuse the socket.
- Session TTL: 8 hours sliding, 24 hours hard cap.
- Logout: delete the Account's `session:account:{accountId}` key, destroy the Session, force socket disconnect.

### Membership (new join collection)

A new Mongoose schema `Membership`:

- `_id` (UUID)
- `accountId` (UUID, ref Account, indexed)
- `roomId` (UUID, ref Room, indexed)
- `nickname` (string, 1–32 Unicode characters, required, immutable for the Membership's lifetime)
- `joinedAt` (timestamp)
- `leftAt?` (timestamp, set on leave or Account deletion)
- Unique compound index on `(accountId, roomId)` while `leftAt` is null — prevents duplicate live Memberships.

### Room schema changes

The existing `Room` schema (`{ _id, name, createdBy, users[] }`) is updated:

- `createdBy` is kept (renamed conceptually to "Owner": no transfer, so the creator is the Owner forever).
- `users: UUID[]` is removed — replaced by the Membership collection.
- New field `closedAt?: timestamp` — set on Owner-initiated close; at that point the Room is considered deleted for member-facing purposes (we either soft-delete via `closedAt` and hide from listings, or hard-delete the Room row entirely per ADR-0002 and the maintenance-closed-over-outcome decision from the grilling session).
- *Decision from grilling: hard-close* — the Room row is deleted from Mongo, `room-closed` PendingNotifications are emitted to all Members, pending EncryptedFrames for the Room are deleted.

### RoomInvite (new collection)

A new Mongoose schema `RoomInvite`:

- `_id` (UUID), used as the token ID in the QR URL.
- `roomId` (UUID, ref Room, indexed)
- `invitedBy` (UUID, ref Account) — the Owner at mint time.
- `createdAt` (timestamp)
- `expiresAt` (timestamp; nullable for "never expires")
- `oneShot` (boolean) — true → first successful redemption revokes the token.
- `redeemedBy: UUID[]` — every Account ID that successfully redeemed this invite (for Owner audit).
- `revokedAt?` (timestamp, set on owner-initiated revoke)

The QR encodes the URL `https://{host}/invite/{tokenId}`. The server validates the token on redemption: revoked, expired, or (one-shot + already-redeemed) tokens are rejected.

### EncryptedFrame (new collection — Queue 1)

A new Mongoose schema `EncryptedFrame`:

- `_id` (UUID)
- `messageId` (UUID, client-generated, indexed) — for ack idempotency only, not grouped.
- `roomId` (UUID, ref Room, indexed with TTL compound)
- `senderId` (UUID, ref Account)
- `recipientId` (UUID, ref Account, indexed) — primary query key for `drain-pending`.
- `ciphertext` (bytes)
- `nonce` (bytes)
- `createdAt` (timestamp, indexed) — used for `serverReceivedAt`-style ordering and the 24h TTL.
- TTL index: `expiresAt = createdAt + 24h`, documents auto-deleted by Mongo at expiry.

The `DeliveredAck` flow is implemented as a `POST /frames/ack` HTTP endpoint (or socket event `frame-acked`, either acceptable; pick one and use consistently across server and client) carrying `{ messageId, recipientId }`. The server deletes the matching EncryptedFrame row and emits `frame-expired-summary` to the sender if the deletion was via TTL rather than ack (via a Mongo change stream or a per-row `expiresAt` watcher — implementation detail).

### PendingNotification (Redis, not Mongo)

PendingNotifications live in Redis, not Mongo, because they are short-lived and per-Account:

- `pending:misc:{accountId}` — Redis list of `{ type: 'room-closed' | 'IdentityReset', roomId?, accountId?, timestamp }` events. 7-day TTL on the list. Capped implicitly by event volume.
- `pending:exp:{accountId}` — Redis hash for `frame-expired-summary` events, coalesced per `(roomId, recipientId)`:
  - Field key: `{roomId}:{recipientId}`
  - Field value: integer count, maintained via `HINCRBY` (single atomic op)
  - Sidecar timestamp fields `{roomId}:{recipientId}:first` and `:last` via `HSET`
  - 7-day TTL on the parent hash, refreshed on any update (`EXPIRE pending:exp:{accountId} 604800`)
  - Soft count cap of 100 fields — if `HLEN ≥ 100`, set sentinel field `__truncated__` via `HSETNX` and stop creating new fields.
  - On drain: `HGETALL` + `DEL` of the hash in a single `MULTI`/`EXEC` roundtrip.

### drain-pending protocol

After envelope unlock succeeds, the Client runs `drain-pending` — two HTTP-based fetches:

1. `GET /notifications/pending` → drains both `pending:misc` and `pending:exp` queues for the Account. Returns a structured payload separating misc events from expired-frame summaries.
2. `GET /frames/pending?roomId={X}&cursor={optionalCreatedAtCursor}` → paginated EncryptedFrames for one Room, max 50 per page, sorted by `createdAt` ascending. The Client repeats this per Room the Account is a Member of, in parallel per Room, until each Room's queue is empty. Each drained frame is followed by a `DeliveredAck` to the server (which deletes the row).

Resumable by idempotency: tabla close mid-drain just resumes on next login — acked frames are gone; unacked frames are still queued.

Per-Room independent readiness: the Client's UI marks a Room as `RoomReady(roomId)` when its frame drain returns empty. The user can navigate to any Room at any time; Rooms still draining show per-Room skeleton loaders. New live frames arriving via socket during a drain interleave with drained frames by `serverReceivedAt` (= `createdAt`) timestamp.

`ClientReady` is reached when `GET /notifications/pending` returns and per-Room `RoomReady` is tracked independently per Room.

### Wire contract

Socket events:

- **Server → Client:**
  - `new-frame { frame: EncryptedFrame }` — live frame push from server to a recipient's live socket.
  - `member-joined { roomId, accountId, nickname }` — emitted to remaining Members on RoomInvite redemption.
  - `member-left { roomId, accountId }` — emitted to remaining Members on Member leave or Account deletion.
  - `room-closed { roomId }` — emitted to live Members at close time; offline Members receive a PendingNotification.
  - `session-revoked` — emitted to a socket whose Session was superseded by a new login.
  - `frame-expired` — delivered live to a sender's socket when their frame TTL-fires while they're online; offline senders receive `frame-expired-summary` in PendingNotifications instead.

- **Client → Server:**
  - `frame-acked { messageId, recipientId }` — emitted by recipient after successful in-tab decrypt. Idempotent on server.
  - `subscribe-room { roomId }` — Client requests to receive live events for a Room; server checks Membership and calls `socket.join(roomId)`.
  - `unsubscribe-room { roomId }` — Client leaves the Room channel; `socket.leave(roomId)`.

HTTP endpoints:

- `POST /auth/login { email, password_hash }` → `{ sessionId?, envelope: { salt, ciphertext, nonce } }` (the Client then runs Argon2id locally and `crypto_secretbox_open` to get the privKey).
- `POST /auth/logout` → destroys the Session.
- `POST /accounts { email, password_hash, pub, salt, ciphertext, nonce }` → creates Account (envelope-minting at registration).
- `POST /frames { messageId, roomId, frames: [{ recipientId, ciphertext, nonce }] }` → uploads N EncryptedFrames; server fans out via socket.
- `GET /notifications/pending` → drains `pending:misc` and `pending:exp` for the Account.
- `GET /frames/pending?roomId=X&cursor=Y` → paginated EncryptedFrames for the Room.
- `GET /rooms` → list of Account's Memberships.
- `POST /rooms { name }` → create Room (caller becomes Owner).
- `POST /rooms/{roomId}/invites { oneShot, expiresAfter }` → mint RoomInvite.
- `POST /invites/{tokenId}/redeem { nickname }` → accept invite, create Membership. Returns the new Membership.
- `DELETE /rooms/{roomId}` → hard-close Room (Owner only).
- `DELETE /rooms/{roomId}/membership` → leave the Room (Member-side; forbidden for the Owner).
- `DELETE /invites/{tokenId}` → revoke RoomInvite (Owner only).
- `POST /accounts/delete` → cascade-delete: all Memberships removed (`member-left` per Room); all owned Rooms hard-closed (`room-closed` to Members).

### Existing Socket.IO events that die

The existing events in `src/index.ts` (`new-user`, `send-chat-message`, `user-connected`, `user-disconnected`, the `disconnecting` handler) are removed. Their responsibilities are replaced by the domain-level events above.

### Front-end architecture

- Monorepo with `server/` (rename of current `src/`), `client/` (new React app), `shared/` (TypeScript types for the wire contract — exported as `@chat/shared` workspace package).
- npm workspaces (you already use npm).
- React 18, React Router, Zustand for state, TanStack Query for HTTP-shaped data, Tailwind CSS + Radix Primitives (as shadcn/ui vendored components) for styling and accessibility.
- Vite in middleware mode during dev: the React app loads via the Express server on port 3000, so dev and prod share the same origin. Single `ts-node-dev` process for back-end with Vite mounted as middleware.
- Production: Vite builds `client/dist`; Express serves it as static.
- Three `tsconfig.json`s: `tsconfig.base.json` at root, `client/tsconfig.json` (`lib: ["DOM", "ES2022"]`), `server/tsconfig.json` (`lib: ["ES2022"]`), both `strict: true`.
- Vitest + React Testing Library for client tests; Jest (existing) for server tests.
- The existing `src/public/` directory is deleted only after the new client has reached feature parity (login, room list, chat view, send message all work end-to-end with the new design).

### Login ceremony implementation

The login UI is a single form (email + password) with progressive narration across three phases:

1. "Authenticating…" — POST `/auth/login` with email + client-derived `password_hash`. Server validates, issues Session, returns envelope `{ salt, ciphertext, nonce }`.
2. "Unlocking E2E…" — Client runs `Argon2id(password, salt)` in tab, derives `envelopeKey`, runs `crypto_secretbox_open(envelopeKey, ciphertext, nonce)` to extract `privKey`. Mock for ~150-300ms Argon2id runtime via spinner.
3. "Ready" — `privKey` stored in a module-scoped `Uint8Array`; on logout, best-effort `.fill(0)` before nulling.

Failure modes:

- Wrong password → server returns 401, UI shows "wrong password" and retries.
- Decrypt failure (`secretbox_open` returns null) → UI offers "Reset E2E identity" link → flow generates new keypair, re-wraps envelope under a new password (the user must set a new password at this step), server stores new envelope + new `pub_superseded_at`, old identity is unrecoverable; `IdentityReset` PendingNotifications queued for peers.
- Envelope fetch network failure → UI shows "Retry" or "Logout" — no "continue without E2E" option.

### Registration ceremony implementation

- Single form: email, password, confirm password, "show password" toggle.
- On submit: Client generates X25519 keypair, generates random salt, runs Argon2id on password + salt → `envelopeKey`, generates 24-byte nonce, `crypto_secretbox(envelopeKey, privKey, nonce)` → ciphertext, derives `password_hash` independently, POSTs `{ email, password_hash, pub, salt, ciphertext, nonce }`.
- On success: Client sets `privKey` in tab memory, navigates to home.

### Password reset ceremony implementation

- User clicks "Forgot password?" → server sends reset email (out-of-band, not part of E2E).
- User clicks reset link → lands on "new password" form.
- On submit: Client generates fresh X25519 keypair, fresh salt, runs Argon2id on new password + new salt → new `envelopeKey`, generates fresh nonce, `crypto_secretbox` encrypts the new `privKey`, derives new `password_hash`. Server stores: `password_hash = new`, `pub = new`, `salt = new`, `ciphertext = new`, `nonce = new`, `pub_superseded_at = now`. Old envelope is destroyed.
- Server queues `IdentityReset` PendingNotifications for relevant peers (Accounts that had this Account's old `pub` in their contact state).

### RoomInvite QR rendering

- The mint-invite UI uses `qrcode.react` (`<QRCodeSVG>` component) to render the URL `https://{host}/invite/{tokenId}` as an inline QR.
- The QR component is wrapped in a container that includes an `aria-label` or visible text alternative exposing the URL string, so screen-reader users can hear the invite URL and manually navigate to it if needed.

### Notification center UI

- Header contains a bell icon with an unread badge count.
- Clicking opens a panel (Radix `Dialog` or `Popover`) listing drained PendingNotifications.
- Each notification renders by type:
  - `room-closed` → "Owner closed Room X"
  - `frame-expired-summary` → "N messages to {recipient nickname} in {room name} expired undelivered"
  - `IdentityReset` → "{nickname} reset their E2E identity — re-verify"
- Coalesced summary entries (per-room-per-recipient) are rendered as a single line with the count, not expanded to N lines.

### Adaptive layout

- Two-pane (sidebar + main) on `md` and wider; sidebar is fixed, main pane is fluid.
- Single-pane on `sm` and narrower; sidebar collapses to a drawer triggered by a hamburger in the app header.
- All layouts are achieved via Tailwind breakpoint variants on the same component tree — no separate mobile/desktop codebase.

### Dark mode

- Tailwind `dark:` variants on every styled element from the first commit.
- Theme toggle available in user settings; also respects `prefers-color-scheme` by default.
- Implementation: a Zustand `themeStore` holds `'light' | 'dark' | 'system'`; applies/removes the `dark` class on `<html>` accordingly.

### Accessibility

- All interactive elements (buttons, links, inputs) are operable via keyboard; Tab order follows visual order.
- Focus management on route changes (React Router) and on modal/drawer open/close (Radix handles this for free).
- WCAG 2.1 AA contrast on text — Radix Themes defaults meet this for shadcn/ui's default palette; verify per-component after the design system is generated.
- QR codes carry text alternatives (the invite URL).

### Account deletion cascade

- `POST /accounts/delete` triggers:
  - For each Membership of the Account: `leftAt = now`, emit `member-left { roomId, accountId }` to remaining Members; remove from `room.members` view.
  - For each Room where the Account is Owner: hard-close the Room (delete Room row), delete pending EncryptedFrames for that Room, queue `room-closed` PendingNotifications for offline Members, emit `room-closed` to live Members.
- UI: confirm dialog warns "This will close N Rooms you own. Continue?"

### Member leave flow

- `DELETE /rooms/{roomId}/membership` by a non-Owner Member:
  - Sets `Membership.leftAt = now`, removes the Account from `room.members` view.
  - Emits `member-left { roomId, accountId }` to remaining Members.
  - Forces the leaving socket out of the Room channel.
- Forbidden for the Owner: returns 403 with message "Close the Room or stay."

### Owner-close flow

- `DELETE /rooms/{roomId}` by the Owner:
  - Deletes the Room row from Mongo.
  - Deletes all pending EncryptedFrames for that Room.
  - Queues `room-closed` PendingNotifications for offline Members.
  - Emits `room-closed { roomId }` to live Members.
  - Forces all sockets out of the Room channel.

## Testing Decisions

### Test philosophy (general)

Tests verify *external behavior*, not implementation details. They do not make assertions on private functions, internal data structures, or library calls. They make assertions on observable outputs: HTTP responses, socket events emitted, persisted state visible through subsequent reads. They are not brittle to refactors that preserve behavior.

### Seam 1 — Server protocol-level integration (Jest)

The server seam is integration tests in Jest. Mount the Express app + Socket.IO server with:

- Mongo via `mongodb-memory-server` (in-memory Mongo); initialize the Mongoose connection in `beforeAll()`.
- Redis via `ioredis-mock` or a real Redis instance in a testcontainer; initialize the Redis client similarly.

Tests issue real HTTP requests (`supertest` against the Express app) and connect real Socket.IO clients (`socket.io-client`). They assert on:

- HTTP responses (status codes, response bodies).
- Socket events received by connected test clients (`new-frame`, `member-joined`, `member-left`, `room-closed`, `session-revoked`).
- Side-effect verification: e.g. after `POST /rooms/{roomId}/invites` succeeds, a follow-up `GET /rooms/{roomId}/invites` returns the new invite.
- Cross-cutting scenarios: registration → login → envelope-fetch → drain-pending → no-multi-login supersession → logout.

Prior art: `src/users/users.service.spec.ts` and `src/rooms/rooms.service.spec.ts` already use Jest to test service-layer logic in isolation. The new seam is one level up — it tests the whole server at the HTTP/socket boundary rather than each service in isolation. The existing unit tests remain for pure-function corners (validation, business rules) that don't need the full app mounted.

Coverage targets for the server seam:

- E2E envelope register/login/unlock success path (with mocked Argon2id via dependency injection, since real Argon2id 64MiB per test invocation is too slow).
- All Account, Session, Membership, RoomInvite, EncryptedFrame, PendingNotification lifecycle paths.
- drain-pending HTTP path with paginated per-Room fetch.
- All socket event emissions on each side of the lifecycle (member-joined/left, room-closed, session-revoked, new-frame).
- failure modes: wrong password, expired invite, revoked invite, one-shot-already-redeemed, no-multi-login-supersession, room-not-found, etc.

### Seam 2 — Client component-level integration (Vitest + React Testing Library)

The client seam is component-level integration tests in Vitest + React Testing Library. Tests render complete React trees (router, providers, Zustand stores) with the transport boundary mocked:

- HTTP via MSW (Mock Service Worker) intercepting `fetch` / `XMLHttpRequest` requests and returning canned responses.
- Socket.IO via a thin transport adapter injected from the test — the test's mock socket can emit events into the Client and capture events emitted by the Client.

Tests simulate user input via Testing Library's `userEvent` (typing in the login form, clicking the invite-redeem button, navigating to a Room). They assert on rendered output (presence of the Room name, the "Delivered ✓" mark, the notification-center unread badge, etc.) and on the mocked transport's received requests/emitted events.

Coverage targets for the client seam:

- Login ceremony progression through "Authenticating…" → "Unlocking E2E…" → "Ready".
- Login failure modes (wrong password → retry; corrupt envelope → "Reset E2E identity" CTA; fetch network failure → retry/logout).
- Registration ceremony with mocked libsodium (so Argon2id is fast in tests).
- Password reset → IdentityReset PendingNotification queued for peers.
- drain-pending → notification-center renders `room-closed`, `frame-expired-summary`, `IdentityReset`.
- drain-pending → per-Room skeleton loading state; drained Room becomes `RoomReady`; live frame interleaving via `serverReceivedAt` ordering.
- QR redemption: not-logged-in redirect to login with redirect-back; already-Member redirect to Room; ex-Member nickname prompt; revoked/expired/used/404 error messages.
- Adaptive layout: render at different viewport widths in `jsdom` + Tailwind classes (assert presence/absence of sidebar vs drawer trigger).
- Dark mode: assert `dark` class on `<html>` when theme store is `'dark'`.

Prior art: none on the client side (the existing `src/public/app.js` is vanilla JS and has no tests). This seam is new.

### Existing unit tests (preserved)

The existing `*.service.spec.ts` and `*.middleware.spec.ts` files in `src/users/`, `src/rooms/`, `src/auth/` remain. Their structural patterns are reused as the Project migrates the `User` collection to `Account`, removes `users[]` from Room, adds the new schemas, etc. The migration of these tests is part of the implementation work, not a separate track.

### What good tests do NOT do

- They do not snapshot DOM rendered output — snapshots are brittle and conflate incidental style choices with behavior.
- They do not assert on internal Zustand store state via private APIs — they assert on rendered output driven by the store.
- They do not call private socket / Mongoose functions directly — they drive through the public HTTP/socket boundary.
- They do not test Argon2id with production parameters (64 MiB / `t_cost = 3`) — they inject a fast KDF or a mock.

## Out of Scope

- **DMs / one-to-one messaging** — explicitly removed per ADR-0002. A two-person Room is just a small Room. If DMs are later re-added, the recommended migration is a `kind` discriminator on a `Conversation` entity (see ADR-0002 alternatives).
- **Read receipts.** DeliveredAck exists (decrypt-success tied to frame deletion); ReadAck does not. The user does not see "✓✓" read receipts. Adding read receipts later would not affect the storage model (ReadAck carries no storage consequence) but would require a new socket event and UI work — not in this spec.
- **Multi-device support.** One Client per Account; "no multi-login" means one live Session at a time. Device-level identity (Matrix-style cross-signing) is explicitly out of scope per ADR-0001.
- **Persistent client-side state.** Ratchet state and decrypted plaintext live only in tab memory. They are not persisted to IndexedDB or localStorage. Surviving tab close is the user's responsibility (re-login on resume).
- **Service Worker for push notifications.** Service Workers do not hold key material. If push is added later, the notification payload is opaque; actual decryption happens in the main `Window` context on demand.
- **Typing indicators / presence.** Not in the wire contract. The existing transport-level `new-user` and `user-disconnected` events in `src/index.ts:159-189` are deleted; their presence-signal role is not replaced.
- **Admin / moderator role.** Two roles only: Owner and Member. No transfer of ownership. Admin tier not in this spec (see Branch 5 / R1 of grilling session).
- **Room reopen.** Owner-close is hard and permanent. No undo / grace-period state.
- **Account recovery from forgotten password.** Lost password = old identity unrecoverable. The reset flow mints a *new* identity; old messages targeted at the old `pub` are unrecoverable. Recovery is "re-join Rooms via fresh QR invites," not data restoration.
- **Anti-spam / abuse controls.** No rate-limiting rules, no invite-QR abuse prevention beyond per-token revocation. Out of scope for this spec.
- **Internationalization (i18n).** Error messages and UI strings are English. i18n infrastructure is not in this spec.
- **Server-side rate limiting / DoS protection.** Out of scope.
- **Database migrations from current schema.** The existing `User` collection is migrated to `Account` (rename + field changes) and `Membership` (new). Migration script mechanics are an implementation concern, not a spec decision.

## Further Notes

- The spec assumes ADR-0001 (E2E envelope) and ADR-0002 (no DM) as accepted context. ADR-0003 (front-end visual / interaction design) is also accepted and the implementation decisions above build on its choices (shadcn/ui, Tailwind, Radix, qrcode.react, notification center, adaptive layout, dark mode, WCAG 2.1 AA).
- Ubiquitous language throughout the spec matches `CONTEXT.md` (Account, Session, Client, Envelope, Owner, Member, Membership, Nickname, Room, RoomInvite, Message, EncryptedFrame, DeliveredAck, PendingNotification, drain-pending, ClientReady, RoomReady, IdentityReset, SessionSupersessment).
- Implementation should be split into tracer-bullet tickets before work begins. Suggested tracer-bullet dimensions:
  1. Monorepo restructure (`server/`, `client/`, `shared/`, npm workspaces, tsconfig split, Vite middleware wiring) — a working skeleton that renders a login form via React, posts to `/auth/login`, and the server stubs the response. Establishes the tooling spine end-to-end before any feature lands.
  2. Account + envelope (register with client-side libsodium; login with Argon2id + secretbox; Session via Redis with no-multi-login supersssion).
  3. Membership + RoomInvite + Room lifecycle (create, invite-via-QR, redeem-with-nickname, leave, close, member-left/room-closed events).
  4. EncryptedFrame + drain-pending + DeliveredAck + PendingNotification (the messaging subsystem).
  5. drain-pending UX + notification center + IdentityReset peer UX.
  6. Front-end rewrite parity completion (Room view, messages list, send-message input, adaptive layout, dark mode, accessibility) — gate the deletion of `src/public/` against parity with this ticket.
- Cryptography dependency: `libsodium-wrappers` (client); the server does not run crypto. The Argon2id parameters (`m_cost = 64 MiB, t_cost = 3, p_cost = 1`) are defaults; tuning can be revisited if login latency is unacceptable on low-end devices.
- The first user story ticket to start with is the monorepo restructure (tracer-bullet 1), as it unblocks all subsequent work.
