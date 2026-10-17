# Organization & Membership API - Postman (Newman) results

Run against database `test`, local server, collection `Organization_Membership_API.postman_collection.json`.

**51 requests, 66 assertions, 0 failed.**

Plan/entitlement protection (curl): unauthenticated GET/POST on /plans and /entitlements -> 401; CUSTOMER POST -> 403; CUSTOMER GET -> 200.

| Request | Method | Status | Result |
|---|---|---|---|
| Signup Customer A | POST | 201 | PASS |
| Signup Customer B | POST | 201 | PASS |
| Login Customer B | POST | 200 | PASS |
| Login Customer A | POST | 200 | PASS |
| Customer cannot create organization | POST | 403 | PASS |
| Logout | POST | 200 | PASS |
| Unauthenticated cannot create organization | POST | 401 | PASS |
| Login Supervisor | POST | 200 | PASS |
| Missing name | POST | 400 | PASS |
| Invalid planId format | POST | 400 | PASS |
| Non-existent plan | POST | 404 | PASS |
| Unexpected field rejected | POST | 400 | PASS |
| Create Organization A | POST | 201 | PASS |
| Create Organization B | POST | 201 | PASS |
| Duplicate organization name | POST | 409 | PASS |
| Creator is SUPERVISOR member of both orgs | GET | 200 | PASS |
| Login Customer A | POST | 200 | PASS |
| Ticket rejected before membership exists | POST | 403 | PASS |
| Login Supervisor | POST | 200 | PASS |
| Invalid userId | POST | 400 | PASS |
| Invalid role | POST | 400 | PASS |
| Missing role | POST | 400 | PASS |
| Unexpected field rejected | POST | 400 | PASS |
| Non-existent user | POST | 404 | PASS |
| Non-existent organization | POST | 404 | PASS |
| Role must match account role | POST | 400 | PASS |
| Supervisor of another org cannot assign members | POST | 403 | PASS |
| Add Customer A to Org A | POST | 201 | PASS |
| Duplicate membership rejected | POST | 409 | PASS |
| Add Customer B to Org B | POST | 201 | PASS |
| List Org A members | GET | 200 | PASS |
| Supervisor cannot list members of another org | GET | 403 | PASS |
| Login Customer A | POST | 200 | PASS |
| Customer sees only own memberships | GET | 200 | PASS |
| Customer can view own organization | GET | 200 | PASS |
| Customer cannot view another organization | GET | 403 | PASS |
| Invalid organization ID | GET | 400 | PASS |
| Customer cannot list members | GET | 403 | PASS |
| Customer cannot assign members | POST | 403 | PASS |
| Customer cannot remove members | DELETE | 403 | PASS |
| Ticket created with valid CUSTOMER membership | POST | 201 | PASS |
| Ticket rejected for another org's ID | POST | 403 | PASS |
| Login Supervisor | POST | 200 | PASS |
| Invalid membership ID | DELETE | 400 | PASS |
| Cannot delete another org's membership via this org | DELETE | 404 | PASS |
| Supervisor cannot remove own membership | DELETE | 400 | PASS |
| Remove Customer A from Org A | DELETE | 200 | PASS |
| Removing again returns 404 | DELETE | 404 | PASS |
| Login Customer A | POST | 200 | PASS |
| Ticket rejected after membership removal | POST | 403 | PASS |
| Removed customer can no longer view org | GET | 403 | PASS |
