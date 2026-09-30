const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Routes Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test('should filter tasks by status query param', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    test('should return empty array for non-matching status filter', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return paginated results correctly', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const res = await request(app).get('/tasks?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(5);
      expect(res.body[0].title).toBe('Task 1');
    });

    test('should return paginated tasks with fallback values when page/limit are non-numeric strings', async () => {
      for (let i = 1; i <= 12; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const res = await request(app).get('/tasks?page=abc&limit=xyz');
      expect(res.status).toBe(200);
      // Fallback pageNum=1, limitNum=10 -> should return 10 items
      expect(res.body.length).toBe(10);
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return stats summary', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todo', 1);
      expect(res.body).toHaveProperty('in_progress', 0);
      expect(res.body).toHaveProperty('done', 1);
      expect(res.body).toHaveProperty('overdue', 0);
    });

    test('should return all zeros when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('should count overdue tasks correctly', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'Overdue Task', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Done Task', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(1); // only the todo task is overdue
    });
  });

  describe('POST /tasks', () => {
    test('should create a task with valid payload', async () => {
      const payload = { title: 'New Task', priority: 'high' };
      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    test('should return 400 for missing title', async () => {
      const res = await request(app).post('/tasks').send({ priority: 'high' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 for empty title', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    test('should return 400 for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', status: 'invalid_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    test('should return 400 for invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', priority: 'urgent' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    test('should return 400 for invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date string/);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update existing task', async () => {
      const task = taskService.create({ title: 'Task to update' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('in_progress');
    });

    test('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated Title' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('should return 400 for invalid update payload', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid_priority' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    test('should return 400 for empty title in update', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title must be a non-empty string/);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete task and return 204', async () => {
      const task = taskService.create({ title: 'Delete me' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('should return 404 for non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('should not delete other tasks', async () => {
      const task1 = taskService.create({ title: 'Keep me' });
      const task2 = taskService.create({ title: 'Delete me' });
      await request(app).delete(`/tasks/${task2.id}`);
      const res = await request(app).get('/tasks');
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(task1.id);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should mark task as completed', async () => {
      const task = taskService.create({ title: 'Complete me' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
    });

    test('should preserve original priority when completing (bug was fixed)', async () => {
      const task = taskService.create({ title: 'High prio task', priority: 'high' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    test('should return 404 if task does not exist', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('should assign a task to a user', async () => {
      const task = taskService.create({ title: 'Task to assign' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Charlie' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Charlie');
    });

    test('should allow re-assigning to a different user', async () => {
      const task = taskService.create({ title: 'Task' });
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('should return 400 if assignee is whitespace-only string', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a non-empty string/);
    });

    test('should return 400 if assignee field is missing from body', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a non-empty string/);
    });

    test('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Charlie' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });
});
