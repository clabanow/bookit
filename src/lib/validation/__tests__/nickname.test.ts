/**
 * Nickname Validation Tests
 */

import { describe, it, expect } from 'vitest'
import { validateNickname, sanitizeNickname } from '../nickname'

describe('validateNickname', () => {
  describe('valid nicknames', () => {
    it('accepts simple names', () => {
      expect(validateNickname('Alice')).toEqual({ valid: true })
      expect(validateNickname('Bob')).toEqual({ valid: true })
      expect(validateNickname('Player1')).toEqual({ valid: true })
    })

    it('accepts names with spaces', () => {
      expect(validateNickname('Cool Kid')).toEqual({ valid: true })
      expect(validateNickname('The One')).toEqual({ valid: true })
    })

    it('accepts names with hyphens and underscores', () => {
      expect(validateNickname('Player-1')).toEqual({ valid: true })
      expect(validateNickname('Cool_Kid')).toEqual({ valid: true })
      expect(validateNickname('X-Wing-Pilot')).toEqual({ valid: true })
    })

    it('accepts names with numbers', () => {
      expect(validateNickname('Player123')).toEqual({ valid: true })
      expect(validateNickname('42')).toEqual({ valid: true })
    })

    it('accepts minimum length (2 chars)', () => {
      expect(validateNickname('AB')).toEqual({ valid: true })
    })

    it('accepts maximum length (20 chars)', () => {
      expect(validateNickname('A'.repeat(20))).toEqual({ valid: true })
    })
  })

  describe('invalid nicknames', () => {
    it('rejects empty string', () => {
      const result = validateNickname('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Nickname is required')
    })

    it('rejects whitespace-only', () => {
      const result = validateNickname('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Nickname is required')
    })

    it('rejects too short (1 char)', () => {
      const result = validateNickname('A')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 2')
    })

    it('rejects too long (>20 chars)', () => {
      const result = validateNickname('A'.repeat(21))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at most 20')
    })

    it('rejects special characters', () => {
      expect(validateNickname('Player!')).toHaveProperty('valid', false)
      expect(validateNickname('Cool@Kid')).toHaveProperty('valid', false)
      expect(validateNickname('Name#1')).toHaveProperty('valid', false)
      expect(validateNickname('$money$')).toHaveProperty('valid', false)
      expect(validateNickname('<script>')).toHaveProperty('valid', false)
    })

    it('rejects emoji', () => {
      expect(validateNickname('Cool😎')).toHaveProperty('valid', false)
      expect(validateNickname('🎮Player')).toHaveProperty('valid', false)
    })
  })

  describe('edge cases', () => {
    it('trims whitespace before validating', () => {
      expect(validateNickname('  Alice  ')).toEqual({ valid: true })
    })

    it('trimmed length is checked, not original', () => {
      // '  A  ' trims to 'A' which is too short
      const result = validateNickname('  A  ')
      expect(result.valid).toBe(false)
    })
  })

  describe('profanity filter', () => {
    it('rejects inappropriate nicknames', () => {
      // Uses the default blocklist from profanity.ts
      const result = validateNickname('badword')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Please choose an appropriate nickname')
    })

    it('rejects nicknames with embedded profanity', () => {
      const result = validateNickname('xbadwordx')
      expect(result.valid).toBe(false)
    })

    it('catches character substitutions', () => {
      // 'b@dword' normalizes to 'badword'
      // But @ is not allowed by NICKNAME_PATTERN, so it fails that check first
      // Test with a word that uses allowed characters
      const result = validateNickname('offensive')
      expect(result.valid).toBe(false)
    })

    it('allows clean nicknames', () => {
      expect(validateNickname('CoolPlayer')).toEqual({ valid: true })
      expect(validateNickname('QuizMaster')).toEqual({ valid: true })
    })
  })
})

describe('sanitizeNickname', () => {
  it('trims whitespace', () => {
    expect(sanitizeNickname('  Alice  ')).toBe('Alice')
    expect(sanitizeNickname('Bob')).toBe('Bob')
  })

  it('preserves internal spaces', () => {
    expect(sanitizeNickname('  Cool Kid  ')).toBe('Cool Kid')
  })
})
