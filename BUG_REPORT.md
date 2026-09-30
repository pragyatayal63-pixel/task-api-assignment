# Bug Report — The Untested API

## Overview

During the test suite construction and source code audit of the Task Manager API, **three bugs** were discovered in `src/services/taskService.js`. All bugs were identified through writing tests that revealed unexpected behavior. All three have been fixed.

---

## Bug 1: Pagination Off-by-One Error (Critical)

- **Location**: [`src/services/taskService.js` — `getPaginated()`, Line 12 (original)](file:///c:/Users/User/Downloads/Take-Home-Assignment-The-Untested-API-main/Take-Home-Assignment-The-Untested-API-main/task-api/src/services/taskService.js)
- **Expected Behavior**: `GET /tasks?page=1&limit=10` should return tasks 1–10 (the first page).
- **Actual Behavior**: The offset was calculated as `page * limit` (i.e. `1 * 10 = 10`), skipping the first 10 tasks entirely. Page 1 would return tasks 11–15 (only 5 items if there were 15 tasks), and page 0 would be required to get the actual first page.
- **Why It's a Bug**: Standard pagination is 1-based. Users expect page 1 to contain the first results, not to skip them. This is a classic fencepost/off-by-one error.
- **How I Found It**: Writing a unit test that created 15 tasks and called `getPaginated(1, 10)` — expected 10 results, got 5.
- **Fix Applied**: Changed the offset formula to `(page - 1) * limit`:
  ```javascript
  const offset = (page - 1) * limit; // was: page * limit
  ```

---

## Bug 2: Partial String Matching in Status Filter (Medium)

- **Location**: [`src/services/taskService.js` — `getByStatus()`, Line 9 (original)](file:///c:/Users/User/Downloads/Take-Home-Assignment-The-Untested-API-main/Take-Home-Assignment-The-Untested-API-main/task-api/src/services/taskService.js)
- **Expected Behavior**: `GET /tasks?status=todo` should return only tasks whose status is exactly `'todo'`.
- **Actual Behavior**: The filter used `t.status.includes(status)` — JavaScript's `String.prototype.includes()` checks for substring containment, not equality. So `?status=do` would match both `'todo'` and `'done'`. Even `?status=in` would match `'in_progress'`.
- **Why It's a Bug**: Status filtering should be exact. Substring matching leads to incorrect, unpredictable query results and breaks any client relying on precise filtering.
- **How I Found It**: Writing an edge-case unit test that filtered by the partial status `'do'` and observed it returned tasks with both `'todo'` and `'done'` statuses.
- **Fix Applied**: Changed from `.includes()` to strict equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status); // was: t.status.includes(status)
  ```

---

## Bug 3: Task Completion Silently Resets Priority (Medium)

- **Location**: [`src/services/taskService.js` — `completeTask()`, Line 69 (original)](file:///c:/Users/User/Downloads/Take-Home-Assignment-The-Untested-API-main/Take-Home-Assignment-The-Untested-API-main/task-api/src/services/taskService.js)
- **Expected Behavior**: `PATCH /tasks/:id/complete` should set `status` to `'done'` and set `completedAt` to the current timestamp, without altering any other task properties.
- **Actual Behavior**: The function included a hardcoded `priority: 'medium'` in the updated task object. This means completing a `high` or `low` priority task would silently corrupt the priority field, resetting it to `medium`.
- **Why It's a Bug**: Completing a task is a status transition. It should not have the side effect of modifying the task's priority, which is unrelated metadata. This could cause data integrity issues in reports or dashboards that rely on priority.
- **How I Found It**: Writing a unit test that created a `high` priority task, called `completeTask()`, and checked that the returned task still had `priority: 'high'` — it had `'medium'`.
- **Fix Applied**: Removed the hardcoded `priority: 'medium'` line from the spread object:
  ```javascript
  const updated = {
    ...task,
    // priority: 'medium', ← REMOVED this line
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

## Additional Observation: Status Enum Discrepancy in Documentation

The `README.md` documents the task status values as `"pending | in-progress | completed"`, while the actual code in `validators.js` and `taskService.js` uses `"todo | in_progress | done"`. This documentation discrepancy could mislead API consumers. The code is internally consistent, so no code fix is needed, but the README should be updated to match the actual valid values.
