import { describe, it, expect } from 'vitest'
import { moderateMessage } from '../moderation'

describe('moderateMessage', () => {
  it('allows clean messages', () => {
    const result = moderateMessage('Hello everyone!')
    expect(result.allowed).toBe(true)
    expect(result.sanitized).toBeDefined()
  })

  it('rejects empty strings', () => {
    const result = moderateMessage('')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/empty/)
  })

  it('rejects whitespace-only strings', () => {
    const result = moderateMessage('   ')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/empty/)
  })

  it('rejects non-string input', () => {
    const result = moderateMessage(123)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/string/)
  })

  it('rejects messages over 200 characters', () => {
    const longMessage = 'a'.repeat(201)
    const result = moderateMessage(longMessage)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/200/)
  })

  it('allows messages exactly 200 characters', () => {
    const exactMessage = 'a'.repeat(200)
    const result = moderateMessage(exactMessage)
    expect(result.allowed).toBe(true)
  })

  it('rejects messages with XSS patterns', () => {
    const result = moderateMessage('<script>alert("xss")</script>')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/disallowed/)
  })

  it('rejects messages with javascript: protocol', () => {
    const result = moderateMessage('javascript:alert(1)')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/disallowed/)
  })

  it('rejects profanity', () => {
    // Using a word that's on the blocklist
    const result = moderateMessage('you are a jackass')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/inappropriate/)
  })

  it('allows words from the allowlist (e.g., "class")', () => {
    const result = moderateMessage('I have class today')
    expect(result.allowed).toBe(true)
  })

  it('sanitizes HTML entities in allowed messages', () => {
    const result = moderateMessage('1 < 2 & 3 > 0')
    expect(result.allowed).toBe(true)
    expect(result.sanitized).toContain('&lt;')
    expect(result.sanitized).toContain('&amp;')
    expect(result.sanitized).toContain('&gt;')
  })

  it('trims whitespace before checking', () => {
    const result = moderateMessage('  hello  ')
    expect(result.allowed).toBe(true)
    expect(result.sanitized).toBe('hello')
  })
})
