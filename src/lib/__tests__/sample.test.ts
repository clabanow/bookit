import { describe, it, expect } from 'vitest';

describe('Sample test suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const roomCode = 'ABC123';
    expect(roomCode).toHaveLength(6);
    expect(roomCode).toMatch(/^[A-Z0-9]+$/);
  });
});
