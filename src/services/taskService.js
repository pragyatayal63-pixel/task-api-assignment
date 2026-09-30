/**
 * Task Service - Business logic layer for the Task Manager API.
 * Uses an in-memory array as the data store (resets on server restart).
 * 
 * Bug Fixes Applied:
 * 1. getByStatus: Changed from .includes() to === for exact status matching
 * 2. getPaginated: Fixed offset calculation from (page * limit) to ((page - 1) * limit)
 * 3. completeTask: Removed hardcoded priority: 'medium' to preserve original priority
 * 
 * New Feature:
 * - assignTask: Assigns a user (string) to an existing task
 */
const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// FIX: Changed from .includes() to strict === to prevent partial string matching.
// Previously, filtering by 'do' would match both 'todo' and 'done'.
const getByStatus = (status) => tasks.filter((t) => t.status === status);

// FIX: Changed offset from (page * limit) to ((page - 1) * limit).
// With 1-based pagination, page=1 should return the first `limit` items (offset 0).
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    assignee,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

// FIX: Removed the hardcoded `priority: 'medium'` that was here before.
// Completing a task should only change status and completedAt, not alter the priority.
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * NEW FEATURE: Assign a task to a user.
 * 
 * Design Decisions:
 * - Assignee must be a non-empty string (validated at the route/validator level).
 * - Whitespace is trimmed from the assignee name to prevent accidental blank names.
 * - Re-assignment is allowed: calling assign on an already-assigned task simply
 *   overwrites the previous assignee. This keeps the API simple and RESTful —
 *   a PATCH semantically means "update this field".
 * - If "unassign" functionality is needed in the future, a separate endpoint
 *   (e.g., DELETE /tasks/:id/assign) would be more semantically correct.
 */
const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    assignee: assignee.trim(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
