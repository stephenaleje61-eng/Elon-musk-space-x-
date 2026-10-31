# Security Specification: ELON MUSK SPACE

## 1. Data Invariants
- Public users can read products, articles, and categories without authentication.
- Private conversation records are restricted strictly to the conversation creator (visitorId == request.auth.uid) and verified platform administrators.
- No visitor can access, read, or write to another visitor's private messages or conversations.
- Only verified administrators (`sirrodstephen@gmail.com` or documents in `/admins/{uid}`) can publish/edit/delete products, articles, and categories, or inspect all conversations.
- User profile documents (`/users/{uid}`) and saved items (`/savedItems/{id}`) are restricted to their owner (`userId == request.auth.uid`) or admin.

## 2. The Dirty Dozen Payloads (Targeting Exploits)
1. Impersonate admin in conversation: Non-admin visitor creating a message with `senderRole: "admin"`.
2. Cross-user conversation hijacking: Visitor B querying or fetching `conversations/{convA}` where `visitorId == userA`.
3. Unauthenticated product creation: Anonymous user without admin privilege pushing to `/products`.
4. Privilege escalation on user profile: Setting `role: "admin"` on self profile without admin token.
5. Injected oversized ID: Setting 2MB document key to cause denial of wallet.
6. Shadow update: Modifying product `price` or `isFeatured` as non-admin.
7. Modifying someone else's investment watchlist: Writing to `investmentWatchlists` with `userId` of another user.
8. Malicious report injection: Deleting reports as normal visitor.
9. Audit log tampering: Writing or erasing `adminAuditLogs` as non-admin.
10. Blanket message listening: Listing all subcollection messages across the database.
11. Deleting other users' saved bookmarks: Writing or deleting `savedItems/{id}` belonging to user A.
12. Unverified email claiming admin: Attempting to bypass `isAdmin()` without email verification or valid admin doc.
