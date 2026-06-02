# Firestore security spec — BODY COUNT

This specification documents the strict Zero-Trust data invariants and threat model safeguards applied in the Body Count Firebase backend.

## 1. Data Invariants

1. **User Identity Invariant (Attribute-Based Access Control)**:
   - A user profile document situated at `/users/{userId}` is strictly owned by the entity whose `request.auth.uid == userId`.
   - No user may read or modify another user's private statistical dashboard or claim their username.
   - Profile creation requires valid Google Authentication.

2. **Debate Integrity Invariant**:
   - Comments sitting at `/comments/{commentId}` are accessible for read querying (`allow list`, `allow get`) by any user (authenticated or anonymous) so the community can read the hilarious disputes.
   - Comment creation requires a signed-on authenticated user (`request.auth != null`).
   - The writer's ID (`userId`) must match the logged-in UID (`request.auth.uid`).
   - Upvotes are incremented via atomic operations, subject to a designated update action check that locks overall text and author fields from being hijacked.

## 2. The "Dirty Dozen" Payloads (Threat Model Attack Patterns)

Below are 12 rogue payloads designed to poison, escalate, or spoof the Firebase backwall, that should always fail under the firestore.rules firewall.

### Attack Profile A: User Stats Spoofing & Poisoning

1. **The Ghost Field (Unbounded Schema Poisoning)**
   - *Target Document*: `/users/attackerUID`
   - *Payload*: `{"userId": "attackerUID", "username": "SuperHacker", "bestStreak": 9999, "extraPrivileges": true}`
   - *Result*: **FAILED** (Rejected by strict schema keys count and structure check).

2. **The Streak Elevator (Arbitrary High Score Inundation)**
   - *Target Document*: `/users/attackerUID`
   - *Payload*: `{"userId": "attackerUID", "username": "NoobMaster", "bestStreak": 5000000}`
   - *Result*: **FAILED** (Enforced size limits: `bestStreak <= 50000`).

3. **Identity Squatting (Profile Identity Spoofing)**
   - *Target Document*: `/users/victimUID`
   - *Payload*: `{"userId": "victimUID", "username": "MyVictim", "bestStreak": 25}`
   - *Result*: **FAILED** (Rejected because `request.auth.uid != "victimUID"`).

4. **Temporal Manipulation (Spoofed Client Timestamps)**
   - *Target Document*: `/users/attackerUID`
   - *Payload*: `{"userId": "attackerUID", "username": "TimeTraveler", "updatedAt": "2030-01-01T00:00:00Z"}`
   - *Result*: **FAILED** (Requires `updatedAt == request.time`).

5. **Resource Poisoning (1MB Alphanumeric Flood)**
   - *Target Document*: `/users/attackerUID`
   - *Payload*: `{"userId": "attackerUID", "username": "Aaaaaaaaa...[10000 characters]...aaa"}`
   - *Result*: **FAILED** (Rejected by maximum character size constrain of 20).

### Attack Profile B: Debate Comments & Votes Poisoning

6. **The Shadow Hijacker (Altering Comment Author ID)**
   - *Target Document*: `/comments/comment123`
   - *Payload*: `{"commentId": "comment123", "characterId": "Geralt", "userId": "victimUID", "username": "FriendlyUser", "text": "Wrong", "upvotes": 0, "timestamp": 123456789}`
   - *Result*: **FAILED** (Commenter `userId` field must strictly match `request.auth.uid`).

7. **Anonymous Vandalism (Writing Comments Unauthenticated)**
   - *Target Document*: `/comments/anonymousWrite`
   - *Payload*: `{"commentId": "anonymousWrite", "characterId": "Geralt", "userId": "anonymous", "username": "Anonymous", "text": "Spam!", "upvotes": 0}`
   - *Result*: **FAILED** (Writing comments requires active `request.auth != null`).

8. **Upvote Escalation (Self-Assigned Upvotes Boost)**
   - *Target Document*: `/comments/hijackedVotes`
   - *Payload*: `{"commentId": "hijackedVotes", "upvotes": 500000}`
   - *Result*: **FAILED** (Only dynamic atomic increment actions are allowed; modifying arbitrary integers directly is banned by affectedKeys).

9. **Comment Alteration (Updating Other Users' Opinions)**
   - *Target Document*: `/comments/comment123` (Owned by victim)
   - *Payload*: `{"text": "I changed my mind, my old opinion was dumb!"}` (Sent by attacker)
   - *Result*: **FAILED** (Write denied on update unless caller owns the comment).

10. **The Content Flooder (Giant Comment Text Payload)**
    - *Target Document*: `/comments/comment123`
    - *Payload*: `{"text": "[50,000 character review of Witcher lore]"}`
    - *Result*: **FAILED** (Enforces `text.size() <= 500` characters limit).

### Attack Profile C: Path Poisoning & System Exploits

11. **ID Injection Attack (Path Traversal attempt)**
    - *Target Document*: `/comments/../../../path/to/admins`
    - *Payload*: `{"admin": true}`
    - *Result*: **FAILED** (Checked against `isValidId()` characters and path format).

12. **The Read Scraper (Blanket Collection Query Scraping)**
    - *Target Query*: `Firestore.collection("users")` (Querying all user files in a single pass)
    - *Result*: **FAILED** (List rules enforce query-filter equivalence `resource.data.userId == request.auth.uid`, blocking global database dumps).
