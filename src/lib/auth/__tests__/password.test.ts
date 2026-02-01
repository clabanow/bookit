/**
 * Password Hashing Tests
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecretPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are ~60 chars
    })

    it('should produce different hashes for same password', async () => {
      const password = 'samePassword'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      // Each hash has a different salt
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctPassword123'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'correctPassword123'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword('wrongPassword', hash)
      expect(isValid).toBe(false)
    })

    it('should be case sensitive', async () => {
      const password = 'CaseSensitive'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword('casesensitive', hash)
      expect(isValid).toBe(false)
    })
  })
})
