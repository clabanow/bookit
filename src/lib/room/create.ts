/**
 * Room Creation Utilities
 *
 * Functions for creating and managing game rooms.
 * A "room" is essentially a session that players can join via a code.
 */

import { getSessionStore, type LiveSession } from '@/lib/session'
import { prisma } from '@/lib/db'

/**
 * Error codes for room operations.
 * These match the REALTIME_PROTOCOL.md specification.
 */
export const RoomErrorCodes = {
  INVALID_QUESTION_SET: 'INVALID_QUESTION_SET',
  QUESTION_SET_NOT_FOUND: 'QUESTION_SET_NOT_FOUND',
  QUESTION_SET_EMPTY: 'QUESTION_SET_EMPTY',
  RATE_LIMITED: 'RATE_LIMITED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
} as const

export type RoomErrorCode = (typeof RoomErrorCodes)[keyof typeof RoomErrorCodes]

/**
 * Custom error class for room operations.
 * Includes an error code that can be sent to clients.
 */
export class RoomError extends Error {
  constructor(
    public code: RoomErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'RoomError'
  }
}

/**
 * Create a new game room.
 *
 * This is the main entry point for room creation. It:
 * 1. Validates the question set exists and has questions
 * 2. Creates a session in the store
 * 3. Returns the session with its room code
 *
 * @param hostSocketId - Socket ID of the host creating the room
 * @param questionSetId - ID of the question set to use
 * @returns The created session
 * @throws RoomError if question set is invalid or not found
 */
export async function createRoom(
  hostSocketId: string,
  questionSetId: string
): Promise<LiveSession> {
  // Validate questionSetId is provided
  if (!questionSetId || questionSetId.trim() === '') {
    throw new RoomError(RoomErrorCodes.INVALID_QUESTION_SET, 'Question set ID is required')
  }

  // Validate question set exists in database
  const questionSet = await prisma.questionSet.findUnique({
    where: { id: questionSetId },
    include: {
      questions: {
        select: { id: true },
      },
    },
  })

  if (!questionSet) {
    throw new RoomError(RoomErrorCodes.QUESTION_SET_NOT_FOUND, 'Question set not found')
  }

  // Validate question set has at least one question
  if (questionSet.questions.length === 0) {
    throw new RoomError(RoomErrorCodes.QUESTION_SET_EMPTY, 'Question set has no questions')
  }

  const store = getSessionStore()
  const session = await store.createSession(hostSocketId, questionSetId)

  console.log(`🎮 Room created: ${session.roomCode} (session: ${session.sessionId})`)

  return session
}

/**
 * Get a room by its code.
 *
 * @param roomCode - The 6-character room code
 * @returns The session if found, null otherwise
 */
export async function getRoomByCode(roomCode: string): Promise<LiveSession | null> {
  const store = getSessionStore()
  return store.getSessionByCode(roomCode)
}

/**
 * Get a room by session ID.
 *
 * @param sessionId - The session UUID
 * @returns The session if found, null otherwise
 */
export async function getRoom(sessionId: string): Promise<LiveSession | null> {
  const store = getSessionStore()
  return store.getSession(sessionId)
}
