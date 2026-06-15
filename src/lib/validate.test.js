import { describe, it, expect } from 'vitest'
import { validatePhone, validateAmount, validateUTR, validateEmail, validateUPI, validateText, rateLimit } from './validate'

describe('validatePhone', () => {
  it('accepts valid 10-digit number', () => expect(validatePhone('9876543210').valid).toBe(true))
  it('accepts number with country code', () => expect(validatePhone('919876543210').valid).toBe(true))
  it('rejects empty', () => expect(validatePhone('').valid).toBe(false))
  it('rejects short number', () => expect(validatePhone('12345').valid).toBe(false))
  it('rejects too long', () => expect(validatePhone('98765432101234').valid).toBe(false))
})

describe('validateAmount', () => {
  it('accepts valid amount', () => expect(validateAmount('500').valid).toBe(true))
  it('accepts decimal', () => expect(validateAmount('1250.50').valid).toBe(true))
  it('rejects zero', () => expect(validateAmount('0').valid).toBe(false))
  it('rejects negative', () => expect(validateAmount('-100').valid).toBe(false))
  it('rejects non-numeric', () => expect(validateAmount('abc').valid).toBe(false))
  it('rejects empty', () => expect(validateAmount('').valid).toBe(false))
  it('rejects too large', () => expect(validateAmount('2000000').valid).toBe(false))
})

describe('validateUTR', () => {
  it('accepts valid UTR', () => expect(validateUTR('406123456789').valid).toBe(true))
  it('rejects empty', () => expect(validateUTR('').valid).toBe(false))
  it('rejects whitespace only', () => expect(validateUTR('   ').valid).toBe(false))
  it('rejects too short', () => expect(validateUTR('abc').valid).toBe(false))
})

describe('validateEmail', () => {
  it('accepts valid email', () => expect(validateEmail('test@example.com').valid).toBe(true))
  it('rejects no @', () => expect(validateEmail('testexample.com').valid).toBe(false))
  it('rejects empty', () => expect(validateEmail('').valid).toBe(false))
})

describe('validateUPI', () => {
  it('accepts valid UPI ID', () => expect(validateUPI('name@upi').valid).toBe(true))
  it('accepts phone@bank format', () => expect(validateUPI('9876543210@okaxis').valid).toBe(true))
  it('rejects no @', () => expect(validateUPI('invalidupi').valid).toBe(false))
  it('rejects empty', () => expect(validateUPI('').valid).toBe(false))
})

describe('validateText', () => {
  it('accepts normal text', () => expect(validateText('Hello World').valid).toBe(true))
  it('rejects empty', () => expect(validateText('').valid).toBe(false))
  it('rejects whitespace only', () => expect(validateText('   ').valid).toBe(false))
  it('rejects too short with min option', () => expect(validateText('hi', 'Field', { min: 5 }).valid).toBe(false))
  it('rejects too long', () => expect(validateText('a'.repeat(501)).valid).toBe(false))
})

describe('rateLimit', () => {
  it('allows calls within limit', () => {
    expect(rateLimit('test_action_1', 3, 60000)).toBe(true)
    expect(rateLimit('test_action_1', 3, 60000)).toBe(true)
    expect(rateLimit('test_action_1', 3, 60000)).toBe(true)
  })
  it('blocks when limit exceeded', () => {
    rateLimit('test_action_2', 2, 60000)
    rateLimit('test_action_2', 2, 60000)
    expect(rateLimit('test_action_2', 2, 60000)).toBe(false)
  })
})
