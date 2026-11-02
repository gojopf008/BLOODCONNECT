# BLOODCONNECT AI - Firestore Security Specification

## Data Invariants
1. A user can only read, create, and update their own `/users/{userId}` document where `{userId} == request.auth.uid`.
2. A hospital can only create and manage `/hospitals/{hospitalId}` where `{hospitalId} == request.auth.uid`.
3. A donor can only read, create and update their own `/donors/{donorId}` profile where `{donorId} == request.auth.uid`. Hospitals may read donor records to evaluate blood compatibility and match emergency requisitions, but cannot modify donor profiles.
4. A hospital can create and update `/requisitions/{requisitionId}` where `incoming().hospitalId == request.auth.uid`. Any authenticated donor may read open requisitions to match emergencies.
5. A donor can create/update `/responses/{responseId}` where `incoming().donorId == request.auth.uid` and `{responseId} == incoming().requisitionId + '_' + request.auth.uid`. The hospital owning the requisition and the donor can read responses.

## The Dirty Dozen Threat Vectors
1. **User Role Elevation**: User attempts to overwrite another user's role in `/users/{otherUid}`. (Rejected: `request.auth.uid == userId`)
2. **Ghost Hospital Profile**: Malicious user creates `/hospitals/{victimUid}` pretending to be an authorized hospital. (Rejected: `request.auth.uid == hospitalId`)
3. **Donor Impersonation**: Attacker modifies another donor's phone number or location in `/donors/{victimUid}`. (Rejected: `request.auth.uid == donorId`)
4. **Requisition Hijack**: Non-hospital or attacker creates requisition with another hospital's ID. (Rejected: `incoming().hospitalId == request.auth.uid`)
5. **Requisition Mutation Attack**: Attacker modifies a requisition owned by a different hospital. (Rejected: `existing().hospitalId == request.auth.uid`)
6. **Fake Donor Response Injection**: Attacker submits an 'ACCEPTED' response on behalf of another donor. (Rejected: `incoming().donorId == request.auth.uid`)
7. **Cross-Tenant Response Read**: Unrelated user attempts to list responses of private hospital requisitions. (Rejected: access limited to requisition owner and responding donor)
8. **Negative Units Attack**: Hospital tries to submit requisitions with unitsRequired <= 0 or invalid strings. (Rejected: validation helper enforces `unitsRequired >= 1`)
9. **Status Manipulation Post-Fulfillment**: Hospital or donor tries to modify a 'CANCELLED' or 'FULFILLED' requisition. (Rejected: status terminal rules)
10. **ID Poisoning / Denial of Wallet**: Injecting 2MB payload or illegal regex document IDs. (Rejected: `isValidId()`)
11. **Shadow Key Injection**: Injecting arbitrary extra fields like `isAdmin: true` into donor profile. (Rejected: strict schema field enforcement)
12. **Unauthenticated Read/Write**: Unauthenticated visitor attempting to read private donor data. (Rejected: `isSignedIn()`)
