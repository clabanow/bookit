/**
 * Validation Schema Tests
 */

import { describe, it, expect } from 'vitest'
import {
  validateRoomCode,
  validateTitle,
  validateQuestionPrompt,
  validateAnswerOption,
  validateAnswerIndex,
  validateTimeLimit,
  validateSessionId,
  sanitizeText,
  containsXSSPatterns,
} from '../schemas'

describe('Validation Schemas', () => {
  describe('validateRoomCode', () => {
    it('accepts valid 6-character codes', () => {
      // Uses only unambiguous chars: A-Z (except O,I,L) and 2-9 (except 0,1)
      expect(validateRoomCode('ABC234').valid).toBe(true)
      expect(validateRoomCode('ABCDEF').valid).toBe(true)
      expect(validateRoomCode('234567').valid).toBe(true)
    })

    it('normalizes to uppercase', () => {
      const result = validateRoomCode('abc234')
      expect(result.valid).toBe(true)
      expect(result.sanitized).toBe('ABC234')
    })

    it('rejects wrong length', () => {
      expect(validateRoomCode('ABC').valid).toBe(false)
      expect(validateRoomCode('ABC1234567').valid).toBe(false)
    })

    it('rejects ambiguous characters', () => {
      expect(validateRoomCode('ABCDO0').valid).toBe(false) // Contains O and 0
      expect(validateRoomCode('ABC1IL').valid).toBe(false) // Contains 1, I, L
    })

    it('rejects non-strings', () => {
      expect(validateRoomCode(123456).valid).toBe(false)
      expect(validateRoomCode(null).valid).toBe(false)
    })
  })

  describe('validateTitle', () => {
    it('accepts valid titles', () => {
      expect(validateTitle('Geography Quiz').valid).toBe(true)
      expect(validateTitle('Test').valid).toBe(true)
    })

    it('trims whitespace', () => {
      const result = validateTitle('  Quiz  ')
      expect(result.sanitized).toBe('Quiz')
    })

    it('rejects empty titles', () => {
      expect(validateTitle('').valid).toBe(false)
      expect(validateTitle('   ').valid).toBe(false)
    })

    it('rejects titles over 100 characters', () => {
      const longTitle = 'a'.repeat(101)
      expect(validateTitle(longTitle).valid).toBe(false)
    })

    it('sanitizes HTML', () => {
      const result = validateTitle('<script>alert("xss")</script>')
      expect(result.sanitized).not.toContain('<script>')
    })
  })

  describe('validateQuestionPrompt', () => {
    it('accepts valid questions', () => {
      expect(validateQuestionPrompt('What is 2+2?').valid).toBe(true)
    })

    it('rejects questions over 500 characters', () => {
      const longQuestion = 'a'.repeat(501)
      expect(validateQuestionPrompt(longQuestion).valid).toBe(false)
    })

    it('rejects empty questions', () => {
      expect(validateQuestionPrompt('').valid).toBe(false)
    })
  })

  describe('validateAnswerOption', () => {
    it('accepts valid answers', () => {
      expect(validateAnswerOption('Paris').valid).toBe(true)
      expect(validateAnswerOption('42').valid).toBe(true)
    })

    it('rejects answers over 200 characters', () => {
      const longAnswer = 'a'.repeat(201)
      expect(validateAnswerOption(longAnswer).valid).toBe(false)
    })

    it('rejects empty answers', () => {
      expect(validateAnswerOption('').valid).toBe(false)
    })
  })

  describe('validateAnswerIndex', () => {
    it('accepts 0-3', () => {
      expect(validateAnswerIndex(0).valid).toBe(true)
      expect(validateAnswerIndex(1).valid).toBe(true)
      expect(validateAnswerIndex(2).valid).toBe(true)
      expect(validateAnswerIndex(3).valid).toBe(true)
    })

    it('rejects out of range', () => {
      expect(validateAnswerIndex(-1).valid).toBe(false)
      expect(validateAnswerIndex(4).valid).toBe(false)
    })

    it('rejects non-integers', () => {
      expect(validateAnswerIndex(1.5).valid).toBe(false)
      expect(validateAnswerIndex('1').valid).toBe(false)
    })
  })

  describe('validateTimeLimit', () => {
    it('accepts valid time limits', () => {
      expect(validateTimeLimit(5).valid).toBe(true)
      expect(validateTimeLimit(20).valid).toBe(true)
      expect(validateTimeLimit(120).valid).toBe(true)
    })

    it('rejects below 5 seconds', () => {
      expect(validateTimeLimit(4).valid).toBe(false)
      expect(validateTimeLimit(0).valid).toBe(false)
    })

    it('rejects above 120 seconds', () => {
      expect(validateTimeLimit(121).valid).toBe(false)
    })

    it('rejects non-integers', () => {
      expect(validateTimeLimit(10.5).valid).toBe(false)
    })
  })

  describe('validateSessionId', () => {
    it('accepts valid UUIDs', () => {
      expect(validateSessionId('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true)
      expect(validateSessionId('550E8400-E29B-41D4-A716-446655440000').valid).toBe(true)
    })

    it('normalizes to lowercase', () => {
      const result = validateSessionId('550E8400-E29B-41D4-A716-446655440000')
      expect(result.sanitized).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('rejects invalid UUIDs', () => {
      expect(validateSessionId('not-a-uuid').valid).toBe(false)
      expect(validateSessionId('550e8400-e29b-41d4-a716').valid).toBe(false)
      expect(validateSessionId('').valid).toBe(false)
    })
  })

  describe('sanitizeText', () => {
    it('escapes HTML tags', () => {
      expect(sanitizeText('<script>')).toBe('&lt;script&gt;')
      expect(sanitizeText('<div>')).toBe('&lt;div&gt;')
    })

    it('escapes special characters', () => {
      expect(sanitizeText('&')).toBe('&amp;')
      expect(sanitizeText('"')).toBe('&quot;')
      expect(sanitizeText("'")).toBe('&#x27;')
    })

    it('removes null bytes', () => {
      expect(sanitizeText('test\0test')).toBe('testtest')
    })

    it('removes control characters', () => {
      expect(sanitizeText('test\x00\x01\x02test')).toBe('testtest')
    })

    it('preserves normal text', () => {
      expect(sanitizeText('Hello World!')).toBe('Hello World!')
      expect(sanitizeText('Question: 2+2=?')).toBe('Question: 2+2=?')
    })
  })

  describe('containsXSSPatterns', () => {
    it('detects script tags', () => {
      expect(containsXSSPatterns('<script>alert("xss")</script>')).toBe(true)
    })

    it('detects javascript: protocol', () => {
      expect(containsXSSPatterns('javascript:alert(1)')).toBe(true)
    })

    it('detects event handlers', () => {
      expect(containsXSSPatterns('<img onerror="alert(1)">')).toBe(true)
      expect(containsXSSPatterns('<a onclick="alert(1)">')).toBe(true)
    })

    it('detects eval', () => {
      expect(containsXSSPatterns('eval(code)')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(containsXSSPatterns('<SCRIPT>')).toBe(true)
      expect(containsXSSPatterns('JAVASCRIPT:')).toBe(true)
    })

    it('allows normal text', () => {
      expect(containsXSSPatterns('Hello World')).toBe(false)
      expect(containsXSSPatterns('What is 2+2?')).toBe(false)
    })
  })
})
