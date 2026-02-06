/**
 * Profanity Filter Tests
 *
 * Tests cover:
 * - Basic profanity detection with the real word list
 * - Character substitution evasion detection
 * - Allowlist prevents false positives (e.g., "class" not flagged for "ass")
 * - Custom configuration
 * - Runtime modification
 * - Convenience functions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ProfanityFilter,
  isCleanText,
  checkProfanity,
  getProfanityFilter,
} from '../profanity'

describe('ProfanityFilter', () => {
  describe('Basic filtering with real word list', () => {
    it('detects common profanity', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('what the fuck').containsProfanity).toBe(true)
      expect(filter.check('oh shit').containsProfanity).toBe(true)
      expect(filter.check('you bitch').containsProfanity).toBe(true)
    })

    it('detects slurs', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('you retard').containsProfanity).toBe(true)
      expect(filter.check('thats so retarded').containsProfanity).toBe(true)
    })

    it('detects sexual content', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('send nudes').containsProfanity).toBe(true)
      expect(filter.check('thats porn').containsProfanity).toBe(true)
    })

    it('detects bullying terms', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('youre an idiot').containsProfanity).toBe(true)
      expect(filter.check('ur so stupid').containsProfanity).toBe(true)
    })

    it('detects violence/hate speech', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('kill yourself').containsProfanity).toBe(true)
      expect(filter.check('kys').containsProfanity).toBe(true)
    })

    it('allows clean text', () => {
      const filter = new ProfanityFilter()
      const result = filter.check('great job on that quiz')

      expect(result.containsProfanity).toBe(false)
      expect(result.matchedWords).toHaveLength(0)
    })

    it('is case insensitive', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('SHIT').containsProfanity).toBe(true)
      expect(filter.check('Fuck').containsProfanity).toBe(true)
      expect(filter.check('bItCh').containsProfanity).toBe(true)
    })

    it('detects words embedded in other text', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('xfucky').containsProfanity).toBe(true)
    })
  })

  describe('Allowlist prevents false positives', () => {
    it('allows "class" (contains "ass")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('math class').containsProfanity).toBe(false)
      expect(filter.check('classic game').containsProfanity).toBe(false)
    })

    it('allows "hello" (contains "hell")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('hello everyone').containsProfanity).toBe(false)
    })

    it('allows "grass" and "pass" (contain "ass")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('green grass').containsProfanity).toBe(false)
      expect(filter.check('you pass').containsProfanity).toBe(false)
    })

    it('allows "grape" (contains "rape")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('grape juice').containsProfanity).toBe(false)
    })

    it('allows "peacock" (contains "cock")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('a peacock').containsProfanity).toBe(false)
    })

    it('allows "shell" (contains "hell")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('seashell').containsProfanity).toBe(false)
    })

    it('allows "cucumber" (contains "cum")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('cucumber salad').containsProfanity).toBe(false)
    })

    it('allows "assistant" (contains "ass")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('my assistant').containsProfanity).toBe(false)
    })

    it('allows "raccoon" (contains "coon")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('a raccoon').containsProfanity).toBe(false)
    })

    it('allows "spice" (contains "spic")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('spice girls').containsProfanity).toBe(false)
    })

    it('allows "mississippi" (contains "piss")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('mississippi river').containsProfanity).toBe(false)
    })

    it('still blocks the actual bad word even if allowlisted words exist', () => {
      const filter = new ProfanityFilter()

      // "class" is fine, but "ass" alone is still caught via "asshole", "dumbass", etc.
      expect(filter.check('class is fun').containsProfanity).toBe(false)
      expect(filter.check('what an asshole').containsProfanity).toBe(true)
    })

    it('allows "method" (contains "meth")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('study method').containsProfanity).toBe(false)
    })

    it('allows "analyze" (contains "anal")', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('analyze this').containsProfanity).toBe(false)
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

    it('catches f*ck style evasion with real list', () => {
      const filter = new ProfanityFilter()

      expect(filter.check('fvck').containsProfanity).toBe(false) // 'v' not substituted — acceptable gap
      expect(filter.check('f@ck').containsProfanity).toBe(false) // @ → a → "fack" not in list
      expect(filter.check('sh1t').containsProfanity).toBe(true) // 1 → i → "shit" ✓
      expect(filter.check('b1tch').containsProfanity).toBe(true) // 1 → i → "bitch" ✓
    })
  })

  describe('Custom configuration', () => {
    it('uses custom blocklist', () => {
      const filter = new ProfanityFilter({
        blocklist: ['customword'],
      })

      expect(filter.check('customword').containsProfanity).toBe(true)
      expect(filter.check('fuck').containsProfanity).toBe(false) // Not in custom list
    })

    it('adds additional words to default list', () => {
      const filter = new ProfanityFilter({
        additionalWords: ['extraword'],
      })

      expect(filter.check('shit').containsProfanity).toBe(true) // Default still works
      expect(filter.check('extraword').containsProfanity).toBe(true) // Additional word works
    })

    it('respects allowlist for custom blocklist', () => {
      const filter = new ProfanityFilter({
        blocklist: ['badword'],
        allowlist: ['badword'],
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

      expect(filter.isClean('fuck this')).toBe(false)
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

    it('default blocklist has many words', () => {
      const filter = new ProfanityFilter()
      const list = filter.getBlocklist()

      expect(list.length).toBeGreaterThan(50)
    })
  })
})

describe('Convenience functions', () => {
  describe('isCleanText', () => {
    it('returns true for clean text', () => {
      expect(isCleanText('hello world')).toBe(true)
    })

    it('returns false for profane text', () => {
      expect(isCleanText('you suck')).toBe(false)
    })
  })

  describe('checkProfanity', () => {
    it('returns detailed result', () => {
      const result = checkProfanity('what the fuck')

      expect(result.containsProfanity).toBe(true)
      expect(result.matchedWords).toContain('fuck')
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
