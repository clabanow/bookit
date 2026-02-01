/**
 * Profanity Filter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ProfanityFilter,
  isCleanText,
  checkProfanity,
  getProfanityFilter,
} from '../profanity'

describe('ProfanityFilter', () => {
  describe('Basic filtering', () => {
    it('detects blocked words', () => {
      const filter = new ProfanityFilter()
      const result = filter.check('this is badword')

      expect(result.containsProfanity).toBe(true)
      expect(result.matchedWords).toContain('badword')
    })

    it('allows clean text', () => {
      const filter = new ProfanityFilter()
      const result = filter.check('hello world')

      expect(result.containsProfanity).toBe(false)
      expect(result.matchedWords).toHaveLength(0)
    })

    it('is case insensitive', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('BADWORD').containsProfanity).toBe(true)
      expect(filter.check('BadWord').containsProfanity).toBe(true)
      expect(filter.check('bAdWoRd').containsProfanity).toBe(true)
    })

    it('detects words embedded in other text', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('xbadwordy').containsProfanity).toBe(true)
      expect(filter.check('prefix_offensive_suffix').containsProfanity).toBe(true)
    })
  })

  describe('Character substitution detection', () => {
    it('detects @ used for a', () => {
      const filter = new ProfanityFilter({ blocklist: ['bad'] })

      expect(filter.check('b@d').containsProfanity).toBe(true)
    })

    it('detects 4 used for a', () => {
      const filter = new ProfanityFilter({ blocklist: ['bad'] })

      expect(filter.check('b4d').containsProfanity).toBe(true)
    })

    it('detects 3 used for e', () => {
      const filter = new ProfanityFilter({ blocklist: ['hello'] })

      expect(filter.check('h3llo').containsProfanity).toBe(true)
    })

    it('detects 0 used for o', () => {
      const filter = new ProfanityFilter({ blocklist: ['foo'] })

      expect(filter.check('f00').containsProfanity).toBe(true)
    })

    it('detects $ used for s', () => {
      const filter = new ProfanityFilter({ blocklist: ['test'] })

      expect(filter.check('te$t').containsProfanity).toBe(true)
    })

    it('detects multiple substitutions', () => {
      const filter = new ProfanityFilter({ blocklist: ['test'] })

      expect(filter.check('t3$t').containsProfanity).toBe(true)
    })
  })

  describe('Custom configuration', () => {
    it('uses custom blocklist', () => {
      const filter = new ProfanityFilter({
        blocklist: ['customword'],
      })

      expect(filter.check('customword').containsProfanity).toBe(true)
      expect(filter.check('badword').containsProfanity).toBe(false) // Not in custom list
    })

    it('adds additional words to default list', () => {
      const filter = new ProfanityFilter({
        additionalWords: ['extraword'],
      })

      expect(filter.check('badword').containsProfanity).toBe(true) // Default still works
      expect(filter.check('extraword').containsProfanity).toBe(true) // Additional word works
    })

    it('respects allowlist', () => {
      const filter = new ProfanityFilter({
        blocklist: ['badword'],
        allowlist: ['badword'], // Explicitly allow this word
      })

      expect(filter.check('badword').containsProfanity).toBe(false)
    })
  })

  describe('Runtime modification', () => {
    let filter: ProfanityFilter

    beforeEach(() => {
      filter = new ProfanityFilter({ blocklist: ['initial'] })
    })

    it('can add blocked words at runtime', () => {
      expect(filter.check('newword').containsProfanity).toBe(false)

      filter.addBlockedWord('newword')

      expect(filter.check('newword').containsProfanity).toBe(true)
    })

    it('can remove blocked words at runtime', () => {
      expect(filter.check('initial').containsProfanity).toBe(true)

      filter.removeBlockedWord('initial')

      expect(filter.check('initial').containsProfanity).toBe(false)
    })

    it('can add allowed words at runtime', () => {
      filter.addBlockedWord('blocked')
      expect(filter.check('blocked').containsProfanity).toBe(true)

      filter.addAllowedWord('blocked')
      expect(filter.check('blocked').containsProfanity).toBe(false)
    })
  })

  describe('isClean helper', () => {
    it('returns true for clean text', () => {
      const filter = new ProfanityFilter()

      expect(filter.isClean('hello world')).toBe(true)
    })

    it('returns false for profane text', () => {
      const filter = new ProfanityFilter()

      expect(filter.isClean('badword')).toBe(false)
    })
  })

  describe('getBlocklist', () => {
    it('returns the current blocklist', () => {
      const filter = new ProfanityFilter({ blocklist: ['word1', 'word2'] })
      const list = filter.getBlocklist()

      expect(list).toContain('word1')
      expect(list).toContain('word2')
      expect(list).toHaveLength(2)
    })
  })
})

describe('Convenience functions', () => {
  describe('isCleanText', () => {
    it('returns true for clean text', () => {
      expect(isCleanText('hello world')).toBe(true)
    })

    it('returns false for profane text', () => {
      expect(isCleanText('badword')).toBe(false)
    })
  })

  describe('checkProfanity', () => {
    it('returns detailed result', () => {
      const result = checkProfanity('badword')

      expect(result.containsProfanity).toBe(true)
      expect(result.matchedWords).toContain('badword')
    })
  })

  describe('getProfanityFilter', () => {
    it('returns singleton instance', () => {
      const filter1 = getProfanityFilter()
      const filter2 = getProfanityFilter()

      expect(filter1).toBe(filter2)
    })
  })
})
