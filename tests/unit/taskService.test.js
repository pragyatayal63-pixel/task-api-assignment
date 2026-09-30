const taskService = require('../../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull(); // assignee defaults to null
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('should create a task with custom fields', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Details');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });

    test('should generate unique IDs for each task', () => {
      const task1 = taskService.create({ title: 'Task A' });
      const task2 = taskService.create({ title: 'Task B' });
      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('getAll()', () => {
    test('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
    });

    test('should return empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('should return a copy, not a reference to internal store', () => {
      taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();
      tasks.push({ title: 'Fake Task' });
      expect(taskService.getAll().length).toBe(1); // internal store unaffected
    });
  });

  describe('findById()', () => {
    test('should return task by id if exists', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('should return undefined if task does not exist', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });

    test('should return undefined for empty string id', () => {
      expect(taskService.findById('')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('should filter tasks by status with exact match', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    test('should return empty array for partial status matches (bug was fixed)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const matches = taskService.getByStatus('do');
      expect(matches.length).toBe(0);
    });

    test('should return empty array for non-existent status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      expect(taskService.getByStatus('cancelled')).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    test('should correctly handle 1-based page indexing offset', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');

      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(5);
      expect(page2[0].title).toBe('Task 11');
    });

    test('should return empty array for a page beyond available data', () => {
      taskService.create({ title: 'Only Task' });
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getStats()', () => {
    test('should calculate correct status counts and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });

    test('should return all zeros when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('should not count completed tasks as overdue even if past due', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'Done Task', status: 'done', dueDate: pastDate });
      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  describe('update()', () => {
    test('should update specified fields', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
    });

    test('should return null if task not found', () => {
      expect(taskService.update('invalid-id', { title: 'New' })).toBeNull();
    });

    test('should preserve unmodified fields', () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });
      const updated = taskService.update(task.id, { title: 'New Title' });
      expect(updated.priority).toBe('high'); // priority unchanged
    });
  });

  describe('remove()', () => {
    test('should remove task and return true', () => {
      const task = taskService.create({ title: 'Delete Me' });
      const success = taskService.remove(task.id);
      expect(success).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('should return false if task to delete does not exist', () => {
      expect(taskService.remove('invalid-id')).toBe(false);
    });

    test('should not affect other tasks when deleting one', () => {
      const task1 = taskService.create({ title: 'Keep' });
      const task2 = taskService.create({ title: 'Delete' });
      taskService.remove(task2.id);
      expect(taskService.findById(task1.id)).toBeDefined();
      expect(taskService.getAll().length).toBe(1);
    });
  });

  describe('completeTask()', () => {
    test('should mark task complete and preserve original high priority', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(completed.priority).toBe('high');
    });

    test('should preserve low priority when completing task', () => {
      const task = taskService.create({ title: 'Low Priority Task', priority: 'low' });
      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('low');
      expect(completed.status).toBe('done');
    });

    test('should return null if task not found', () => {
      expect(taskService.completeTask('invalid-id')).toBeNull();
    });
  });

  describe('assignTask()', () => {
    test('should assign task to specified user', () => {
      const task = taskService.create({ title: 'Task to assign' });
      const assigned = taskService.assignTask(task.id, 'Alice');
      expect(assigned.assignee).toBe('Alice');
    });

    test('should trim whitespace from assignee name', () => {
      const task = taskService.create({ title: 'Task' });
      const assigned = taskService.assignTask(task.id, '  Bob  ');
      expect(assigned.assignee).toBe('Bob');
    });

    test('should allow re-assigning a task to a different user', () => {
      const task = taskService.create({ title: 'Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');
    });

    test('should return null if task does not exist', () => {
      expect(taskService.assignTask('invalid-id', 'Alice')).toBeNull();
    });
  });
});
