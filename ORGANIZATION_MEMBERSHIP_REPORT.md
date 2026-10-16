# Organization and Membership Review & Verification Report

**Branch:** `org-membership`  
**Assignee:** Antigravity Engineering  
**Date:** October 2026  
**Status:** Completed & Verified  

---

## 1. Executive Summary

This report documents the review, testing, corrections, and security boundary verification of the Organization and Membership data models and associated business logic within the **Subscription Support Desk** platform.

### Objectives Achieved:
1. **Model & Relationship Audit:** Reviewed `organizationModel.js` and `membershipModel.js`, mapped entity relationships, and analyzed how users and roles are associated.
2. **API & Route Review:** Audited the existing route modules; identified how memberships enforce multi-tenant isolation, and documented missing dedicated Organization/Membership CRUD endpoints.
3. **Mock Data Architecture:** Created a dual-purpose mock dataset featuring valid entities (pass conditions) and deliberate negative edge cases (fail conditions).
4. **Validation Verification:** Tested schema validations, strict mode enforcement, enum restrictions, and duplicate membership prevention.
5. **Tenant Identification:** Verified that customer organizations can be deterministically resolved via `userId` and `membershipModel` records.
6. **Cross-Tenant Isolation Testing:** Verified both programmatically and over HTTP that customers cannot access or create data in another organization by manipulating `organizationId` (IDOR defense).
7. **Model Corrections & Bug Fixes:** Fixed a critical vulnerability in `membershipModel.js` by adding a compound unique index on `{ userId: 1, organizationId: 1 }` to stop duplicate membership creation, and added explicit validation messages.
8. **Postman Testing Suite:** Generated an automated Postman Collection (`postman/Organization_Membership_Review.postman_collection.json`) with 10 test scenarios covering authentication, access control, and edge-case validation.

---

## 2. Model & Relationship Review

### 2.1 `organizationModel.js`
- **Collection:** `organizations`
- **Fields:**
  - `name`: `String`, required, trimmed, unique.
  - `planId`: `Types.ObjectId`, references `plan` model (`ref: "plan"`), required, indexed.
- **Options:**
  - `timestamps: true` (creates `createdAt`, `updatedAt`)
  - `versionKey: false`
  - `strict: "throw"` (rejects unrecognized/arbitrary payload keys)
- **Relationship:** Each organization references exactly one subscription plan (`1:1` or `N:1`).

### 2.2 `membershipModel.js`
- **Collection:** `memberships`
- **Fields:**
  - `userId`: `Types.ObjectId`, references `user` model (`ref: "user"`), required, indexed.
  - `organizationId`: `Types.ObjectId`, references `organization` model (`ref: "organization"`), required, indexed.
  - `role`: `String`, required, enum: `["CUSTOMER", "SPECIALIST", "KNOWLEDGE_MANAGER", "SUPERVISOR"]`.
- **Options:**
  - `timestamps: true`
  - `versionKey: false`
  - `strict: "throw"`
- **Index:** Compound unique index `{ userId: 1, organizationId: 1 }` (enforced via `membershipSchema.index(...)`).
- **Relationship:** Implements a **many-to-many (M:N)** relationship between `users` and `organizations`.

### 2.3 User-to-Organization Association & Dual-Role Storage
The platform employs a dual-tier role architecture:
1. **Global User Role (`userModel.role`):**
   - Stored on the user document and baked directly into the JWT payload (`{ id, role }`).
   - Evaluated by the global route middleware `allowedRoles(...)`.
2. **Organization-Specific Role (`membershipModel.role`):**
   - Stored in the join document connecting a user to an organization.
   - Evaluated by route controllers (e.g. `ticketRouter.js`) when validating operations within a specific organization tenant.

---

## 3. Organization & Membership API Audit

### 3.1 Status of Organization & Membership APIs
- **Finding:** There are currently **no dedicated CRUD API endpoints** for Organizations or Memberships (i.e. `routes/organizationRouter.js` and `routes/membershipRouter.js` do not exist in the codebase).
- **Current Integration:** Organizations and Memberships are consumed directly by `ticketRouter.js`:
  - `POST /api/tickets`: Queries `membershipModel.findOne({ userId: req.user.id, organizationId: req.body.organizationId, role: "CUSTOMER" })`. If not found, blocks request with `403 Forbidden` (`"You are not a customer of this organization"`).
  - `PATCH /api/tickets/:ticketId`: Queries `membershipModel.findOne({ userId: req.user.id, organizationId: ticket.organizationId, role: { $in: ["SPECIALIST", "SUPERVISOR"] } })`. If not found, blocks staff with `403 Forbidden` (`"you are not authorized to update tickets in this organization"`).

### 3.2 Proposed Dedicated APIs (For Future Team Coordination)
To support full administrative lifecycle management, the following dedicated routes are recommended:
- `POST /api/organizations` (Supervisor only): Create tenant organization.
- `GET /api/organizations` (Authenticated): List organizations.
- `GET /api/organizations/:id` (Authenticated): View organization details and subscription tier.
- `POST /api/memberships` (Supervisor only): Assign user to organization with designated role.
- `GET /api/memberships/user/:userId` (User or Supervisor): Retrieve user's organization memberships.
- `DELETE /api/memberships/:id` (Supervisor only): Revoke organization membership.

---

## 4. Mock Data Architecture & Test Matrix

A reproducible mock dataset seeder was implemented in `backend/scripts/mockDataSeeder.js` with structured output written to `backend/scripts/mockData.json`.

### 4.1 Valid Mock Data (Pass Conditions)
| Entity | Identifier / Name | Related Id / Details | Role |
| :--- | :--- | :--- | :--- |
| **Plan A** | `Enterprise Support Plan` | 24/7 dedicated support | N/A |
| **Plan B** | `Standard Support Plan` | Standard business hours | N/A |
| **Org A** | `Apex Global Technologies` | Linked to Plan A (`Enterprise`) | N/A |
| **Org B** | `Nexus Dynamic Systems` | Linked to Plan B (`Standard`) | N/A |
| **Customer 1** | `Alice` (`alice.apex@example.com`) | Member of Org A (`Apex`) | `CUSTOMER` |
| **Customer 2** | `Bob` (`bob.nexus@example.com`) | Member of Org B (`Nexus`) | `CUSTOMER` |
| **Customer 3** | `Charlie` (`charlie.orphan@example.com`) | No organization membership | `CUSTOMER` |
| **Specialist 1**| `Sarah` (`sarah.specialist@apex.com`) | Staff of Org A (`Apex`) | `SPECIALIST` |
| **Supervisor 1**| `Sam` (`sam.supervisor@support.com`) | Supervisor in Org A (`Apex`) | `SUPERVISOR` |

### 4.2 Negative / Failure Mock Test Cases (Fail Conditions)
| Case ID | Target Tested | Input Payload / Action | Expected Result | Condition Validated |
| :--- | :--- | :--- | :--- | :--- |
| `TC-FAIL-01` | `organizationModel` | Missing `name` field | Validation Error | Required field enforcement |
| `TC-FAIL-02` | `organizationModel` | Missing `planId` field | Validation Error | Required reference enforcement |
| `TC-FAIL-03` | `organizationModel` | Extra unknown key `{ extra: "hack" }` | `StrictModeError` | Strict schema defense (`strict: "throw"`) |
| `TC-FAIL-04` | `membershipModel` | Missing `userId` field | Validation Error | Required user reference |
| `TC-FAIL-05` | `membershipModel` | Missing `organizationId` field | Validation Error | Required tenant reference |
| `TC-FAIL-06` | `membershipModel` | Role `"ADMIN"` | Validation Error | Role enum constraint |
| `TC-FAIL-07` | `membershipModel` | Duplicate `(userId, orgId)` insert | Mongo E11000 Error | Compound unique index enforcement |
| `TC-FAIL-08` | `POST /api/tickets` | Alice submits `organizationId: Org B` | `403 Forbidden` | Multi-tenant IDOR protection |
| `TC-FAIL-09` | `POST /api/tickets` | Bob submits `organizationId: Org A` | `403 Forbidden` | Cross-tenant ticket creation blocked |
| `TC-FAIL-10` | `POST /api/tickets` | Charlie (unaffiliated) creates ticket | `403 Forbidden` | Zero-membership user blocked |
| `TC-FAIL-11` | `POST /api/tickets` | Missing `title` and `description` | `400 Bad Request` | Request body validation |
| `TC-FAIL-12` | `POST /api/tickets` | Malformed string for `organizationId` | `400 Bad Request` | ObjectId validation |
| `TC-FAIL-13` | `POST /api/tickets` | Body contains protected `status` key | `400 Bad Request` | Unpermitted field rejection |
| `TC-FAIL-14` | `GET /api/tickets/:id`| Alice requests Bob's ticket ID | `403 Forbidden` | Creator ownership isolation |
| `TC-FAIL-15` | `PATCH /api/tickets/:id`| Specialist Sarah updates Org B ticket| `403 Forbidden` | Staff tenant boundary isolation |

---

## 5. Customer Organization Identification Verification

### 5.1 Verification Query
To determine a customer's organization from their `userId`, the system queries the `memberships` collection and populates the `organizationId` reference:

```javascript
const customerMembership = await membershipModel
    .findOne({ userId: targetUserId, role: "CUSTOMER" })
    .populate("organizationId")

const organization = customerMembership ? customerMembership.organizationId : null
```

### 5.2 Verification Execution Results
- **Customer 1 (`Alice`):** Resolved cleanly to `Apex Global Technologies` (`_id: 6ad24aa286b6069eb40bd0cd`, Plan: `Enterprise Support Plan`).
- **Customer 2 (`Bob`):** Resolved cleanly to `Nexus Dynamic Systems` (`_id: 6ad24aa286b6069eb40bd0ce`, Plan: `Standard Support Plan`).
- **Customer 3 (`Charlie`):** Query returned `null`, confirming proper handling of unaffiliated users.

---

## 6. Cross-Tenant Access Restriction & Security Testing

Testing was executed against live MongoDB Atlas and running Express API endpoints.

### 6.1 Tenant Isolation Tests
```
✅ PASS | Customer 1 (Alice) creates ticket in Org A (Apex)           -> 201 Created
✅ PASS | Customer 1 (Alice) attempts ticket in Org B (Nexus ID)      -> 403 Forbidden ("You are not a customer of this organization")
✅ PASS | Customer 2 (Bob) attempts ticket in Org A (Apex ID)        -> 403 Forbidden ("You are not a customer of this organization")
✅ PASS | Customer 3 (Charlie, unaffiliated) creates ticket in Org A   -> 403 Forbidden ("You are not a customer of this organization")
✅ PASS | Customer 1 (Alice) views Customer 2 (Bob) ticket           -> 403 Forbidden ("you are not authorized to view this ticket")
✅ PASS | Specialist 1 (Sarah) updates Org A ticket                  -> 200 OK ("ticket updated successfully")
✅ PASS | Specialist 1 (Sarah) updates Org B ticket                  -> 403 Forbidden ("you are not authorized to update tickets in this organization")
```

---

## 7. Issues Identified & Corrections Applied

### 7.1 Corrections in Assigned Files

#### 1. `backend/models/membershipModel.js`
- **Issue:** The schema had no unique constraint on `(userId, organizationId)`. Calling `membershipModel.create()` multiple times for the same user in the same organization created duplicate memberships without error.
- **Fix:** Added compound unique index:
  ```javascript
  membershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true })
  ```
- **Enhancement:** Added descriptive validation messages:
  - `userId`: `required: [true, "User ID is required"]`
  - `organizationId`: `required: [true, "Organization ID is required"]`
  - `role`: `required: [true, "Role is required"]`
  - Added indexes on `userId` and `organizationId` for query optimization.

#### 2. `backend/models/organizationModel.js`
- **Issue:** Organization names lacked a uniqueness constraint, allowing duplicate tenants with identical names.
- **Fix:** Added `unique: true` to `name`:
  ```javascript
  name: {
      type: String,
      required: [true, "Organization name is required"],
      unique: true,
      trim: true
  }
  ```
- **Enhancement:** Added descriptive validation message on `planId` and index on `planId`.

---

## 8. Postman Testing Results

The test collection is committed at `postman/Organization_Membership_Review.postman_collection.json`.

| Request Name | Method | Route | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| Login Alice (Apex Customer) | POST | `/api/auth/login` | 200 OK | 200 OK | ✅ PASS |
| Login Bob (Nexus Customer) | POST | `/api/auth/login` | 200 OK | 200 OK | ✅ PASS |
| Login Charlie (Unaffiliated) | POST | `/api/auth/login` | 200 OK | 200 OK | ✅ PASS |
| Login Sarah (Apex Specialist) | POST | `/api/auth/login` | 200 OK | 200 OK | ✅ PASS |
| TC-01: Valid Ticket Creation (Apex) | POST | `/api/tickets` | 201 Created | 201 Created | ✅ PASS |
| TC-02: Cross-Tenant Org B ID (Alice) | POST | `/api/tickets` | 403 Forbidden | 403 Forbidden | ✅ PASS |
| TC-03: Cross-Tenant Org A ID (Bob) | POST | `/api/tickets` | 403 Forbidden | 403 Forbidden | ✅ PASS |
| TC-04: Unaffiliated User Ticket (Charlie) | POST | `/api/tickets` | 403 Forbidden | 403 Forbidden | ✅ PASS |
| TC-05: Creator Ownership Boundary | GET | `/api/tickets/:id` | 403 Forbidden | 403 Forbidden | ✅ PASS |
| TC-06: Staff Cross-Org Isolation | PATCH | `/api/tickets/:id` | 403 Forbidden | 403 Forbidden | ✅ PASS |
| TC-07: Validation - Missing Fields | POST | `/api/tickets` | 400 Bad Request | 400 Bad Request | ✅ PASS |
| TC-08: Validation - Malformed Org ID | POST | `/api/tickets` | 400 Bad Request | 400 Bad Request | ✅ PASS |
| TC-09: Validation - Protected Fields | POST | `/api/tickets` | 400 Bad Request | 400 Bad Request | ✅ PASS |

**Total Postman Test Scenarios:** 13  
**Passed:** 13 (100%)  
**Failed:** 0  

---

## 9. Deliverables Summary
- **Corrected Models:** [backend/models/organizationModel.js](backend/models/organizationModel.js) and [backend/models/membershipModel.js](backend/models/membershipModel.js).
- **Mock Seeder & JSON:** [backend/scripts/mockDataSeeder.js](backend/scripts/mockDataSeeder.js) and [backend/scripts/mockData.json](backend/scripts/mockData.json).
- **Automated Verification Suite:** [backend/scripts/verifyOrgMembership.js](backend/scripts/verifyOrgMembership.js) (`npm test`).
- **HTTP Isolation Verification Suite:** [backend/scripts/testHttpApiRoutes.js](backend/scripts/testHttpApiRoutes.js) (`npm run test:api`).
- **Postman Collection:** [postman/Organization_Membership_Review.postman_collection.json](postman/Organization_Membership_Review.postman_collection.json).
- **Git Branch:** `org-membership`.
