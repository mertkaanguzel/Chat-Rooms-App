# Context — Chat-Rooms-App

A glossary of the domain terms used in this project. It defines the
ubiquitous language; it is *not* a spec, a database schema, or a record of
implementation decisions. Those live in `docs/adr/`.

## Account

The registered identity (email + password). Persistent; lives for the
lifetime of the registration. One Account corresponds to one set of E2E
key material (one identity keypair).

## Session

One authenticated browser session. Cardinality: an Account has many
Sessions over its lifetime, but **at most one live at a time** ("no
multi-login"). A new login destroys the prior Session.

## Client

The browser tab holding the Account's identity private key in memory for
the duration of a Session. The private key lives only in the tab's
memory for the duration of the Session and is never persisted client-side.

## Envelope

The encrypted form of the Account's private identity key, stored
server-side. Unlockable only with the Account's password. Establishes
the long-lived identity that survives across Sessions.

## Owner

The Account that created a Room. Exactly one Owner per Room; immutable
for the Room's lifetime. The Owner is the only role that can close the
Room.

## Member

Any Account currently in a Room, including the Owner.

## Membership

The join of an Account and a Room. Carries the Nickname. Created on
invite redemption; destroyed on leave or Account deletion.

## Nickname

Display name scoped to a Membership. Set by the joining Account at
join time; immutable for the Membership's lifetime. Other Members see
this Nickname in the Room. Duplicates are allowed within a Room.

## Room

A multi-party conversation with an Owner and Members. Persisted.
Can be hard-closed by the Owner. A Room with only its Owner (no other
Members) is a valid steady state. (DMs are *not* a separate concept
— see ADR-002.)

## RoomInvite

A revocable invitation token to join a Room, rendered as a QR code.
Has an Owner-chosen lifecycle (one-shot vs. multi-use; expiry
duration). Multiple simultaneous invites per Room are allowed.

## Message

A logical utterance sent by an Account to a Room. Identified by a
client-generated `messageId`. A client-side concept; the server does
not group frames by `messageId`.

## EncryptedFrame

A per-recipient server-side ciphertext row holding one Message's
content for one recipient Client. Deleted on the recipient's
DeliveredAck or on a safety-net TTL, whichever fires first.

## DeliveredAck

A recipient Client's confirmation that an EncryptedFrame was
successfully decrypted in tab memory. Triggers deletion of that
frame on the server. Idempotent. Deletion is tied to
decrypt-success, not socket-receipt or user-visible-render.

## PendingNotification

A server-side event queued for an Account that had no live Session
when the event fired. Drained to the Account's Client on next login.
Examples: `room-closed`, `frame-expired-summary`, `IdentityReset`.

## drain-pending

The post-login catch-up protocol a Client runs after envelope
unlock: pulls PendingNotifications and pending EncryptedFrames,
decrypts and acks each frame. Resumable by idempotency. Per-Room
readiness tracked independently.

## ClientReady

State where the envelope has been unlocked and PendingNotifications
have been drained. Per-Room readiness tracked separately.

## RoomReady(roomId)

Per-Room state reached once that Room's pending EncryptedFrames have
been drained.

## IdentityReset

An event announcing that an Account's identity keypair was rotated
(via password reset). Emitted as a PendingNotification to relevant
peers so their Clients can surface a "re-verify" UX.

## SessionSupersession

The act of a new login destroying the Account's prior Session.
Observed by the old tab as socket disconnect plus HTTP 401.