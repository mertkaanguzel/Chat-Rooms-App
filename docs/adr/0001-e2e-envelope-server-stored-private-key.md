# ADR-0001: E2E envelope — server-stored private key, client-side Argon2id unlock

Date: 2026-08-13
Status: Accepted

## Context

The app will offer end-to-end encrypted chat. Two coupled requirements
shape the key-store decision:

1. **No multi-login** — an Account has at most one live Session at a
   time, but Sessions can recur over the Account's lifetime. The
   identity keypair must therefore be reusable across Sessions; it
   cannot be per-session, or every re-login would force every Room to
   re-key and every contact to re-verify.
2. **Client state is in-memory only** — the Client's ratchet state
   and decrypted plaintext are deliberately not persisted
   client-side, to keep the threat boundary at "if the browser is
   compromised, E2E is moot" and avoid Trusted-Client-at-rest
   attackers.

If the identity private key is also kept purely in tab memory, it
dies on logout — and the long-lived-identity requirement (1) is
violated. The key has to live *somewhere*. This ADR records where.

## Decision

The private identity key (X25519) is stored server-side in **envelope
form**: the server holds an encrypted ciphertext that it cannot
decrypt itself. The envelope is unlocked on each login by running a
client-side KDF over the user's password.

Concretely:

- **Identity key:** X25519 via libsodium `crypto_box_keypair`.
  Public key is stored in cleartext on the Account; it is public.
- **KDF:** `Argon2id(password, salt)` with `m_cost = 64 MiB`,
  `t_cost = 3`, `p_cost = 1`. The salt is generated at registration
  and stored server-side on the Account row.
- **Envelope cipher:** libsodium `crypto_secretbox`
  (XSalsa20-Poly1305), 24-byte random nonce.
- **Envelope contents:** the 32-byte X25519 private key.
- **Stored on the Account:** `pub` (clear), `salt` (clear),
  `ciphertext` (encrypted), `nonce` (clear), `password_hash`
  (auth-only, never used to derive `envelopeKey`).
- **Login flow:** browser fetches `{salt, ciphertext, nonce}` from the
  server, runs Argon2id locally with the user's password + the
  fetched salt, derives `envelopeKey`, opens the secretbox in tab
  memory. The server never sees the raw password or the envelopeKey.
- **Private key residence in tab:** a module-scoped `Uint8Array` in
  the React client; raw bytes only. Best-effort `.fill(0)` on logout
  as hygiene; the security boundary is documented as "compromised
  tab = compromised E2E."
- **Passphrase identity:** the E2E passphrase is the Account login
  password; never sent to the server raw. The auth `password_hash`
  and the `envelopeKey` are independently derived — the server
  cannot compute one from the other.
- **Password reset** generates a **new** X25519 keypair; the old
  envelope is destroyed and unrecoverable. An `IdentityReset`
  PendingNotification is emitted to peers, surfacing a "re-verify"
  UX. The Account gains a `pub_superseded_at` field for peer-side
  rendering.
- **Recovery:** a forgotten password means the old identity is
  unrecoverable; the user starts a fresh identity and re-joins
  Rooms via fresh QR invitations.

## Consequences

### Positive

- One credential for the user (the login password doubles as the
  E2E passphrase); no second secret to forget.
- One keypair per Account; Rooms never re-key on re-login; peers
  re-verify only on explicit password reset.
- Server breach does not yield private keys — attacker must crack
  Argon2id per-guess to attempt envelope decryption.
- Browser compromise was already game-over; persisting the key
  server-side in encrypted form does not worsen the threat model.
- Re-uses the existing libsodium runtime already pulled in for the
  per-Message ratchet and `crypto_box`.

### Negative

- Argon2id in the browser is ~150–300 ms at the chosen parameters;
  this gates the login ceremony (one-time cost per login, mitigated
  by a narrated progress indicator in the UI).
- "Change password" must re-wrap the envelope under the new key;
  this is a real but bounded flow.
- Tab close / browser hibernation loses the in-tab private key; the
  user re-runs the login ceremony on resume (Argon2id + fetch +
  open). The login UX must be cheap enough to absorb this.
- Lost password = lost access to undecrypted incoming ciphertexts
  that were queued on the server. Recipients who required
  continuity with the old identity must manually re-verify.

### Neutral / risks

- The `password_hash` used for login must be derived **independently**
  of the `envelopeKey` (i.e. different salt / different derivation)
  so a server that sees `password_hash` cannot reconstruct
  `envelopeKey`. This is an implementation constraint, not a
  protocol-level risk.
- Tab memory zeroization via `Uint8Array.fill(0)` is best-effort;
  V8 may copy TypedArray contents during GC compaction. We accept
  this honestly: the threat model is XSS / process compromise, not
  memory forensics.

## Alternatives considered

### A. Per-session keypair (rotate on every login)

Strongest forward secrecy; no client-side persistence question. But
every re-login forces every Room to re-key and every contact to
re-verify — heavy group-chat churn. Violates the "long-lived
per-account identity" intent. Rejected.

### B. Persist the private key in IndexedDB

Cheapest UX (no unlock ceremony on re-login). But adds a callable
attack surface for any XSS that can read IndexedDB. Marked as
acceptable for some teams, but we chose to put nothing persistent
client-side; this is the consistent partner of the "in-memory only"
client-state decision.

### C. Per-device identity with cross-signing (Matrix / Element model)

Most flexible; supports a real multi-device future. But adds a
device model, cross-signing rites, and verification ceremony that
the current scope does not need. Complexity not justified for a
single-browser-tab-at-a-time app.

### D. Server-stored plaintext private key (no envelope)

Trivially simple login. But the server would be able to read all
messages — explicitly violates "end-to-end encrypted." Rejected as
not satisfying the requirement.