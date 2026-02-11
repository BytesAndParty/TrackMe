import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimeCell from './TimeCell'

afterEach(() => {
  cleanup()
})

function renderCell() {
  const onChange = vi.fn()
  const onKeyDown = vi.fn()
  const onFocus = vi.fn()
  const onBlur = vi.fn()

  render(
    <TimeCell
      value=""
      onChange={onChange}
      onKeyDown={onKeyDown}
      inputRef={() => {}}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  )

  const input = screen.getByPlaceholderText('00:00')
  return { input, onChange, onKeyDown }
}

describe('TimeCell', () => {
  it('blocks Enter navigation when input is invalid', () => {
    const { input, onChange, onKeyDown } = renderCell()

    fireEvent.change(input, { target: { value: '99:99' } })
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('normalizes valid compact input before Enter navigation', () => {
    const { input, onChange, onKeyDown } = renderCell()

    fireEvent.change(input, { target: { value: '0900' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('09:00')
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })
})
