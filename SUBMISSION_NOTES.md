# Submission Notes — The Untested API

## Coverage Summary

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.83 |    91.95 |   93.33 |   94.32 |
 src             |   69.23 |       75 |       0 |   69.23 |
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |       95 |     100 |     100 |
  taskService.js |     100 |       95 |     100 |     100 | 22
 src/utils       |   85.18 |    87.17 |     100 |   85.18 |
  validators.js  |   85.18 |    87.17 |     100 |   85.18 | 12,22,25,31
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       38+ passed
```

> **Note:** The uncovered lines in `app.js` (10-11, 17-18) are the Express error handler middleware and the `app.listen()` call — these only execute in production runtime, not in Supertest-based testing, which is expected.

---

## Bug Fix Approach

All three bugs were fixed (see [BUG_REPORT.md](./BUG_REPORT.md) for full details):

1. **Pagination offset** — Changed `page * limit` to `(page - 1) * limit`. The root cause was treating the 1-based page number as 0-based in the offset calculation. The fix is a single arithmetic change with no side effects.

2. **Status filter** — Changed `status.includes()` to `status === `. The original used JavaScript's string `.includes()` method, which is a substring check, not an equality check. Since statuses are discrete enumerated values, strict equality is the correct comparison.

3. **Priority reset on completion** — Removed the hardcoded `priority: 'medium'` from `completeTask()`. This was likely a copy-paste artifact or debugging leftover. The spread operator `...task` already carries forward the original priority.

---

## Feature Design Decisions: `PATCH /tasks/:id/assign`

### Implementation

- **Validator (`validateAssignTask`)**: Validates that `assignee` exists in the request body, is a string, and is non-empty after trimming. Returns a 400 error with a descriptive message if validation fails.

- **Service (`assignTask`)**: Looks up the task by ID, returns `null` if not found. On success, trims the assignee name and stores it on the task object. Returns the updated task.

- **Route Handler**: Validates → calls service → returns 400/404/200 with appropriate error or updated task JSON.

### Edge Case Decisions

| Scenario | Decision | Rationale |
|---|---|---|
| **Empty string `""`** | Rejected with 400 | An empty assignee is semantically meaningless — it's not a valid person. |
| **Whitespace-only `"   "`** | Rejected with 400 | Same as empty string; `.trim()` reduces it to `""`. |
| **Non-string types (numbers, null, boolean)** | Rejected with 400 | The validator checks `typeof body.assignee !== 'string'`. |
| **Task already assigned** | Overwrites silently | A PATCH request semantically means "update this field." Re-assigning is a normal operation. If conflict detection were needed, it should be a separate product decision. |
| **Unassign** | Not implemented | Out of scope. If needed, a `DELETE /tasks/:id/assign` or sending `{"assignee": null}` would be a future feature. |

---

## What I'd Test Next (With More Time)

1. **Concurrency / race conditions** — The in-memory store has no locking. Simultaneous updates to the same task could lead to lost writes. I'd test this with parallel requests.
2. **Input boundary testing** — Very long strings for title/description/assignee, unicode characters, special characters, and potential injection payloads.
3. **Pagination boundary cases** — Page 0, negative pages, limit 0, extremely large limits.
4. **API contract testing** — Verifying the exact shape of every response body (field names, types, presence of all expected fields) against a formal schema.

---

## What Surprised Me

1. **The status enum mismatch** — `README.md` documents statuses as `"pending | in-progress | completed"` but the actual code uses `"todo | in_progress | done"`. This would trip up any frontend developer relying on the README.
2. **The `completeTask` priority reset** — The hardcoded `priority: 'medium'` was subtle and would be easy to miss in a code review. It's the kind of bug that only surfaces when you test specific data combinations (a high-priority task being completed).
3. **The `.includes()` bug** — Using `.includes()` for status filtering is an easy mistake since it "works" for exact matches like `'todo'`. The bug only manifests with partial strings, making it hard to catch without deliberate edge-case testing.

---

## Questions I'd Ask Before Shipping to Production

1. **Database**: The in-memory store means all data is lost on restart. What is the target database (PostgreSQL, MongoDB, Redis)?
2. **Authentication & Authorization**: Who can create/update/delete/assign tasks? Should there be role-based access control?
3. **Input Sanitization**: Should we sanitize `title`, `description`, and `assignee` against XSS / HTML injection?
4. **Rate Limiting**: Is there a rate-limiting strategy to prevent API abuse (e.g., `express-rate-limit`)?
5. **Error Format Standardization**: Should error responses follow a standardized format (e.g., RFC 7807 Problem Details)?
6. **Logging & Monitoring**: What observability stack should be integrated (structured logging, APM, health checks)?
7. **Assignee Validation**: Should `assignee` be validated against a list of known users/team members, or is any string acceptable?
