# Barnhem Super App — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Authentication & Email Verification Gate**: Every read and write operation across all collections MUST reject unauthenticated requests (`request.auth == null`) and unverified email tokens (`request.auth.token.email_verified != true`).
2. **Foundation Allowlist Isolation (Zero Blanket Reads)**: No user outside `allowedEmails` (which always includes the bootstrapped foundation owner `barnhem.tscf@gmail.com`) may `get` or `list` any member profile, sick report, snack bill, shop item, or setting.
3. **Admin-Only Destructive & Sensitive Mutations**: Only `isAdmin()` (`barnhem.tscf@gmail.com` or an UID in `/admins/{uid}`) can create/delete members, modify a member's `pin`, `role`, `restrictedDocsUrl`, or `allowedEmails`, add/delete `shop_items`, or modify `foundation_settings`.
4. **Tier 2 Operational Updates Only**: Authorized non-admin foundation members (staff/kids in `allowedEmails`) may only update bounded progress fields on `members` (`stars`, `dailyProgress`, `penalties`, `starHistory`, cover decor), create `sick_reports` (`resolved == false`) and mark them `resolved: true`, or create `snack_bills` and mark them `fulfilled: true` (terminal lock).
5. **Temporal & Ownership Integrity**: `createdAt == request.time` on create; `createdAt` and `ownerUid` are immutable on update; `updatedAt == request.time` on every write.
6. **Strict Bounds & Path ID Guards**: Every document ID must match `^[a-zA-Z0-9_\-]+$` (`size <= 128`). Strings and arrays have strict max lengths (`imageBase64 <= 140000`, `allowedEmails <= 30`, `starHistory <= 100`).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Member Read**: Anonymous client attempts `get /members/j1` (`auth == null`).
2. **Unverified Email Spoof**: User signs in with `email: "barnhem.tscf@gmail.com"` and `email_verified: false` attempting `get /members/j1`.
3. **Random External Google User Blanket List**: Verified external user `outsider@gmail.com` executes `list /members`.
4. **External User Targeted Read**: Verified external user `outsider@gmail.com` reads `/members/s7` directly.
5. **Shadow / Ghost Field Injection**: Authorized user updates `/members/j1` with `{ stars: 999, isAdmin: true }`.
6. **Privilege Escalation via PIN / Role Tamper**: Non-admin authorized user updates `/members/j1` attempting to change `pin: "0000"` or `role: "manager"`.
7. **Self-Admin Registration**: Non-admin user attempts `create /admins/{theirUid}` to grant themselves admin privileges.
8. **Orphaned Sick Report Creation**: User creates `/sick_reports/rep_bad` referencing non-existent `kidId: "ghost_kid"`.
9. **Terminal State Re-opening**: Non-admin attempts to revert `/snack_bills/bill_1` from `fulfilled: true` back to `fulfilled: false`.
10. **Client Timestamp Forgery**: Client creates `/shop_items/item_x` with backdated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
11. **Denial-of-Wallet Oversized String / ID**: Attacker attempts `create /shop_items/<150-char-invalid-id>` or `imageBase64` of 500KB (`> 140000`).
12. **Creator Settings Tampering by Non-Admin**: Non-admin authorized user updates `/foundation_settings/main` to replace `creatorPins`.
