const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators Unit Tests', () => {

  describe('validateCreateTask()', () => {
    test('should return null for valid task with title only', () => {
      expect(validateCreateTask({ title: 'Valid Task' })).toBeNull();
    });

    test('should return null for valid task with all fields', () => {
      const result = validateCreateTask({
        title: 'Full Task',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    test('should return error if title is missing', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
    });

    test('should return error if title is empty string', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
    });

    test('should return error if title is whitespace only', () => {
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    test('should return error if title is not a string', () => {
      expect(validateCreateTask({ title: 123 })).toBe('title is required and must be a non-empty string');
    });

    test('should return error for invalid status', () => {
      const result = validateCreateTask({ title: 'Task', status: 'invalid' });
      expect(result).toMatch(/status must be one of/);
    });

    test('should return error for invalid priority', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toMatch(/priority must be one of/);
    });

    test('should return error for invalid dueDate', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });

    test('should accept valid status values without error', () => {
      expect(validateCreateTask({ title: 'Task', status: 'todo' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', status: 'in_progress' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', status: 'done' })).toBeNull();
    });

    test('should accept valid priority values without error', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'low' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', priority: 'medium' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', priority: 'high' })).toBeNull();
    });
  });

  describe('validateUpdateTask()', () => {
    test('should return null for valid update body', () => {
      expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
    });

    test('should return null for empty body (no fields to update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    test('should return error if title is empty string', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
    });

    test('should return error if title is whitespace only', () => {
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    test('should return error for invalid status', () => {
      const result = validateUpdateTask({ status: 'invalid' });
      expect(result).toMatch(/status must be one of/);
    });

    test('should return error for invalid priority', () => {
      const result = validateUpdateTask({ priority: 'critical' });
      expect(result).toMatch(/priority must be one of/);
    });

    test('should return error for invalid dueDate', () => {
      const result = validateUpdateTask({ dueDate: 'tomorrow' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask()', () => {
    test('should return null for valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    test('should return error if assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error if assignee is empty string', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error if assignee is whitespace only', () => {
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 42 })).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error if assignee is null', () => {
      expect(validateAssignTask({ assignee: null })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
