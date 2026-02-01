/**
 * Registration Validation Tests
 */

import { describe, it, expect } from 'vitest'
import { validateRegistration } from '../register'

describe('Registration Validation', () => {
  describe('validateRegistration', () => {
    it('should accept valid email and password', () => {
      const error = validateRegistration({
        email: 'test@example.com',
        password: 'validPassword123',
      })
      expect(error).toBeNull()
    })

    it('should reject empty email', () => {
      const error = validateRegistration({
        email: '',
        password: 'validPassword123',
      })
      expect(error).toBe('Please enter a valid email address')
    })

    it('should reject invalid email format', () => {
      const error = validateRegistration({
        email: 'notanemail',
        password: 'validPassword123',
      })
      expect(error).toBe('Please enter a valid email address')
    })

    it('should reject email without domain', () => {
      const error = validateRegistration({
        email: 'test@',
        password: 'validPassword123',
      })
      expect(error).toBe('Please enter a valid email address')
    })

    it('should reject email without @', () => {
      const error = validateRegistration({
        email: 'test.example.com',
        password: 'validPassword123',
      })
      expect(error).toBe('Please enter a valid email address')
    })

    it('should reject very long email', () => {
      const error = validateRegistration({
        email: 'a'.repeat(250) + '@test.com',
        password: 'validPassword123',
      })
      expect(error).toBe('Email address is too long')
    })

    it('should reject short password', () => {
      const error = validateRegistration({
        email: 'test@example.com',
        password: 'short',
      })
      expect(error).toBe('Password must be at least 8 characters')
    })

    it('should reject empty password', () => {
      const error = validateRegistration({
        email: 'test@example.com',
        password: '',
      })
      expect(error).toBe('Password must be at least 8 characters')
    })

    it('should reject very long password', () => {
      const error = validateRegistration({
        email: 'test@example.com',
        password: 'a'.repeat(130),
      })
      expect(error).toBe('Password is too long')
    })

    it('should accept password exactly 8 characters', () => {
      const error = validateRegistration({
        email: 'test@example.com',
        password: '12345678',
      })
      expect(error).toBeNull()
    })

    it('should accept complex email formats', () => {
      const validEmails = [
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ]

      for (const email of validEmails) {
        const error = validateRegistration({
          email,
          password: 'validPassword123',
        })
        expect(error).toBeNull()
      }
    })
  })
})
