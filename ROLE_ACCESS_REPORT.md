# Role-Based Access Control (RBAC) Test & Verification Report

**Branch:** `role-checks`  
**Assignee:** Akshaya Reddy  
**Date:** October 2026  

---

## 1. Executive Summary

This report documents the verification, testing, and audit of the authentication and authorization middlewares (`verifyToken` and `allowedRoles`) across the Subscription Support Desk application.

- **Middlewares Tested:**
  - `verifyToken` ([backend/middlewares/verifyToken.js](backend/middlewares/verifyToken.js))
  - `allowedRoles` ([backend/middlewares/allowedRoles.js](backend/middlewares/allowedRoles.js))
- **Roles Evaluated:**
  - `CUSTOMER`
  - `SPECIALIST`
  - `KNOWLEDGE_MANAGER`
  - `SUPERVISOR`

All existing middlewares function correctly as designed without requiring structural rewrites. Automated test coverage has been added in `backend/tests/roleMiddleware.test.js` (8/8 tests passing).

---

## 2. Middleware Behavior Analysis

### 2.1 `verifyToken` Middleware
- **Cookie Extraction:** Inspects `req.cookies.accessToken`.
- **Missing Token:** If no token is provided, returns `401 Unauthorized`:
  ```json
  { "success": false, "message": "you must login first" }
  ```
- **Invalid / Expired Token:** If token signature is invalid or expired, returns `401 Unauthorized`:
  ```json
  { "success": false, "message": "invalid or expired token" }
  ```
- **Valid Token:** Verifies token with `process.env.SECRET_KEY`, attaches decoded payload `{ id, role }` to `req.user`, and calls `next()`.

### 2.2 `allowedRoles` Middleware
- **Role Verification:** Evaluates `roles.includes(req.user.role)`.
- **Authorized Role:** Calls `next()`.
- **Unauthorized Role:** Returns `403 Forbidden`:
  ```json
  { "success": false, "message": "you are not authorized to access" }
  ```

---

## 3. Route Access & Authorization Matrix

The table below records access permissions for each role across all system endpoints:

| Endpoint | Method | Authentication Required | Allowed Role(s) | CUSTOMER | SPECIALIST | KNOWLEDGE_MANAGER | SUPERVISOR | Status / Note |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/signup` | POST | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Registers customer |
| `/api/auth/login` | POST | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Issues `accessToken` cookie |
| `/api/auth/logout` | POST | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Clears cookie |
| `/api/tickets` | POST | `verifyToken` | `CUSTOMER` | ✅ **Allowed** | ❌ 403 Blocked | ❌ 403 Blocked | ❌ 403 Blocked | Org membership also validated |
| `/api/tickets` | GET | `verifyToken` | `CUSTOMER` | ✅ **Allowed** | ❌ 403 Blocked | ❌ 403 Blocked | ❌ 403 Blocked | Returns customer's tickets |
| `/api/tickets/:ticketId` | GET | `verifyToken` | `CUSTOMER` | ✅ **Allowed** | ❌ 403 Blocked | ❌ 403 Blocked | ❌ 403 Blocked | Creator ownership checked |
| `/api/tickets/:ticketId` | PATCH | `verifyToken` | `SPECIALIST`, `SUPERVISOR` | ❌ 403 Blocked | ✅ **Allowed** | ❌ 403 Blocked | ✅ **Allowed** | Staff membership checked |
| `/api/help` | GET | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Public published articles |
| `/api/help/drafts` | POST | `verifyToken` | `KNOWLEDGE_MANAGER` | ❌ 403 Blocked | ❌ 403 Blocked | ✅ **Allowed** | ❌ 403 Blocked | Creates draft article |
| `/api/help/drafts/:id/publish` | POST | `verifyToken` | `KNOWLEDGE_MANAGER` | ❌ 403 Blocked | ❌ 403 Blocked | ✅ **Allowed** | ❌ 403 Blocked | Publishes article |
| `/api/status` | GET | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Public incident status |
| `/api/plans` | GET | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Public plan listing |
| `/api/plans` | POST | **None (Missing)** | **None (Missing)** | ⚠️ Unprotected | ⚠️ Unprotected | ⚠️ Unprotected | ⚠️ Unprotected | **Missing auth check** |
| `/api/entitlements` | GET | None | Public | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | Entitlements view |
| `/api/entitlements` | POST | **None (Missing)** | **None (Missing)** | ⚠️ Unprotected | ⚠️ Unprotected | ⚠️ Unprotected | ⚠️ Unprotected | **Missing auth check** |

---

## 4. Friday & Saturday Verification Findings

### Friday Checklist:
1. **Test `verifyToken` and `allowedRoles` middlewares:**  
   - Handled missing token (401), invalid token (401), expired token (401), and valid token forwarding.
2. **Check access for all 4 roles:**  
   - Tested matrix combinations across `CUSTOMER`, `SPECIALIST`, `KNOWLEDGE_MANAGER`, and `SUPERVISOR`.
3. **Record which roles can access each existing protected route:**  
   - Detailed matrix recorded in Section 3 above.

### Saturday Checklist:
1. **Check whether unauthorized roles are blocked correctly:**  
   - Verified that attempts with unauthorized roles consistently receive `403 Forbidden` (`you are not authorized to access`).
   - Requests without valid authentication consistently receive `401 Unauthorized` (`you must login first` / `invalid or expired token`).
2. **Document missing authorization checks:**  
   - `POST /api/plans` and `POST /api/entitlements` currently lack `verifyToken` and `allowedRoles`. In production, these admin/management actions should be restricted (e.g. `allowedRoles("SUPERVISOR")`).
3. **Automated Test Suite:**  
   - Configured `npm test` script in `backend/package.json`.
   - All tests passing with 0 failures:
     ```
     ✔ verifyToken: returns 401 when accessToken cookie is missing
     ✔ verifyToken: returns 401 when token is invalid
     ✔ verifyToken: returns 401 when token is expired
     ✔ verifyToken: successfully sets req.user and calls next() on valid token
     ✔ allowedRoles: allows matching single role
     ✔ allowedRoles: allows matching role among multiple allowed roles
     ✔ allowedRoles: returns 403 when role is unauthorized
     ✔ Role access matrix for all 4 roles across all protected route role rules
     ```

---

## 5. Conclusion & Recommendations
- The existing middleware functions properly without modifications.
- Authorization barriers are intact on existing protected ticket and help-desk endpoints.
- Recommending adding `verifyToken, allowedRoles("SUPERVISOR")` to `POST /api/plans` and `POST /api/entitlements` in the next sprint.
