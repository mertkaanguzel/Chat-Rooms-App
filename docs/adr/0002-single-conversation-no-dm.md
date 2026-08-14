# ADR-0002: Single conversation entity (no DM as a separately stored concept)

Date: 2026-08-13
Status: Accepted

## Context

The current codebase (`src/rooms/rooms.entity.ts`) has a single
`Room` entity: `{ _id, name, createdBy, users[] }`. The original
feature request proposed adding **one-to-one messaging** as a
distinct concept, alongside group rooms.

Three modeling options were considered:

1. **DM = Room-of-2.** Treat a DM as a Room with exactly two members
   and no special discrimination. Cheapest in code; but introduces
   fragile `room.users.length === 2` checks throughout the codebase
   to answer "is this a DM?", which break the moment a 3-person Room
   shrinks to 2 via leave. Forces a "do we re-key/reclassify on
   shrink to 2?" decision downstream.
2. **Separate Conversation/Room/DM entities with shared abstract
   base.** Type-safe; allows DM-only features (typing, presence) to
   be added later without polluting Room. Cost: two service layers,
   two controllers, forked invitation flows, more code than the
   feature scope warrants.
3. **Single `Conversation` entity with a `kind` discriminator**
   (`'room' | 'dm'`), one schema, one service, one invite flow.
   Removes fragile length checks, preserves the option to add DM-only
   features via the discriminator later without schema migration.

After grilling on these three, the maintainer elected to **remove the
DM feature entirely** from this scope of work.

## Decision

There is one conversation concept in the codebase: `Room`. There is
no `DM` entity, no `Conversation` abstract base, no `kind`
discriminator. A two-person `Room` is just a small Room — it carries
all the same machinery (Owner, Members, nicknames, RoomInvite, E2E
fan-out, leave, Owner-close).

This ADR records the *removal* of DM from the planned feature set, and
the declining of option (3) — which would have been the
recommendation had DMs been in scope.

## Consequences

### Positive

- One service, one controller, one set of socket events, one schema
  — reduces implementation surface by roughly a factor vs. option
  (2).
- Every feature (nickname, leave, close, QR invite) works uniformly
  across all Room sizes.
- Re-keying on membership changes is uniform — no special pair-DM
  re-key edge case.
- No fragile `length === 2` checks anywhere in the code path.

### Negative

- A genuine 1:1 private conversation is currently expressed as a
  2-person Room, which has an Owner (the Account that minted the QR
  invite). At a future date, the asymmetry between the two
  conversants might become meaningful (e.g. "Owner can close but
  non-Owner cannot"), and the missing DM concept would surface.
- The QR-invite flow must be applied even to invite a single friend
  into a 1:1 conversation — there's no lighter-weight "create a DM
  with this user" UX. This is consistent but not minimal.

### Neutral / risks

- The removal is reversible. If DMs are later re-added, option (3)
  (single entity with `kind` discriminator) remains the recommended
  migration path: add the discriminator retroactively, no schema
  change needed because all current Rooms become `kind: 'room'`.
- The "Owner-only can close" rule means a 2-person private
  conversation can be terminated by only one of the two participants.
  This is consistent with the rest of the design (Owner is the
  creator) but may feel asymmetric for the non-Owner participant.

## Alternatives considered

### A. DM as Room-of-2 (no discriminator)

Acceptable technically; rejected on UX-ground of "length-2 is a
brittle proxy for intent."

### B. Separate Conversation / Room / DM entities with shared base

Rejected as speculative complexity: would add substantial code for
a feature that is not in the agreed scope.

### C. Single Conversation entity with `kind: 'room' | 'dm'` discriminator

Would have been the recommended choice if DMs were in scope. The
maintainer declined DMs; this option is therefore not adopted. It
remains the recommended fallback should the DM scope be re-added.