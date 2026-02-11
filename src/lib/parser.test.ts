import { describe, expect, it } from 'vitest'
import { parseTimeInput } from './parser'

describe('parseTimeInput', () => {
  it.each([
    ['0900', '09:00'],
    ['900', '09:00'],
    ['9:00', '09:00'],
    ['18,5', '18:30'],
    ['8,25', '08:15'],
    ['14', '14:00'],
  ])('parses "%s" to "%s"', (raw, expected) => {
    expect(parseTimeInput(raw)).toBe(expected)
  })

  it.each(['99:99', '24:00', '25', 'ab:cd'])('rejects invalid input "%s"', (raw) => {
    expect(parseTimeInput(raw)).toBeNull()
  })
})
