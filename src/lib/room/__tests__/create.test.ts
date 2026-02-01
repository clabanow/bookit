/**
 * Room Creation Tests
 *
 * Tests for room creation and code generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoom, getRoomByCode, getRoom, RoomError, RoomErrorCodes } from '../create'
import { resetSessionStore } from '@/lib/session'

// Mock prisma to avoid database dependency in unit tests
vi.mock('@/lib/db', () => ({
  prisma: {
    questionSet: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

// Helper to set up mock question set
function mockQuestionSet(id: string, questionCount: number = 5) {
  vi.mocked(prisma.questionSet.findUnique).mockResolvedValue({
    id,
    title: 'Test Quiz',
    ownerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: Array(questionCount).fill({ id: 'q-1' }),
  } as never)
}

function mockQuestionSetNotFound() {
  vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(null)
}

describe('Room Creation', () => {
  beforeEach(() => {
    // Reset the session store before each test
    resetSessionStore()
    vi.clearAllMocks()
  })

  describe('createRoom', () => {
    it('creates a room with a valid 6-character code', async () => {
      mockQuestionSet('question-set-1')

      const session = await createRoom('host-socket-1', 'question-set-1')

      expect(session.sessionId).toBeDefined()
      expect(session.roomCode).toMatch(/^[A-Z0-9]{6}$/)
      expect(session.hostSocketId).toBe('host-socket-1')
      expect(session.questionSetId).toBe('question-set-1')
      expect(session.phase).toBe('LOBBY')
    })

    it('creates rooms with unique codes', async () => {
      mockQuestionSet('qs-1')
      const codes = new Set<string>()

      // Create 50 rooms and verify all codes are unique
      for (let i = 0; i < 50; i++) {
        const session = await createRoom(`host-${i}`, 'qs-1')
        expect(codes.has(session.roomCode)).toBe(false)
        codes.add(session.roomCode)
      }
    })

    it('throws error for empty question set ID', async () => {
      await expect(createRoom('host-1', '')).rejects.toThrow(RoomError)
      await expect(createRoom('host-1', '')).rejects.toThrow('Question set ID is required')
    })

    it('throws error for whitespace-only question set ID', async () => {
      await expect(createRoom('host-1', '   ')).rejects.toThrow(RoomError)
    })

    it('throws RoomError with correct error code', async () => {
      try {
        await createRoom('host-1', '')
      } catch (error) {
        expect(error).toBeInstanceOf(RoomError)
        expect((error as RoomError).code).toBe(RoomErrorCodes.INVALID_QUESTION_SET)
      }
    })

    it('throws error when question set not found', async () => {
      mockQuestionSetNotFound()

      await expect(createRoom('host-1', 'non-existent-id')).rejects.toThrow(RoomError)
      await expect(createRoom('host-1', 'non-existent-id')).rejects.toThrow('Question set not found')
    })

    it('throws error when question set has no questions', async () => {
      mockQuestionSet('empty-set', 0) // 0 questions

      await expect(createRoom('host-1', 'empty-set')).rejects.toThrow(RoomError)
      await expect(createRoom('host-1', 'empty-set')).rejects.toThrow('Question set has no questions')
    })
  })

  describe('getRoomByCode', () => {
    it('finds a room by its code', async () => {
      mockQuestionSet('qs-1')
      const created = await createRoom('host-1', 'qs-1')
      const found = await getRoomByCode(created.roomCode)

      expect(found).toEqual(created)
    })

    it('returns null for non-existent code', async () => {
      const result = await getRoomByCode('XXXXXX')
      expect(result).toBeNull()
    })

    it('is case-insensitive', async () => {
      mockQuestionSet('qs-1')
      const created = await createRoom('host-1', 'qs-1')
      const found = await getRoomByCode(created.roomCode.toLowerCase())

      expect(found).toEqual(created)
    })
  })

  describe('getRoom', () => {
    it('finds a room by session ID', async () => {
      mockQuestionSet('qs-1')
      const created = await createRoom('host-1', 'qs-1')
      const found = await getRoom(created.sessionId)

      expect(found).toEqual(created)
    })

    it('returns null for non-existent session ID', async () => {
      const result = await getRoom('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('Room Code Format', () => {
    it('uses only unambiguous characters (no 0/O, 1/I/L)', async () => {
      mockQuestionSet('qs-1')
      // Create many rooms and verify no ambiguous characters
      const ambiguousChars = ['0', 'O', '1', 'I', 'L']

      for (let i = 0; i < 100; i++) {
        const session = await createRoom(`host-${i}`, 'qs-1')

        for (const char of ambiguousChars) {
          expect(session.roomCode).not.toContain(char)
        }
      }
    })
  })
})
