import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimeCell from './TimeCell'
import { GridProvider, type GridContextValue } from './GridContext'

afterEach(() => {
  cleanup()
})

function renderCell() {
  const updateCell = vi.fn()
  const markEditing = vi.fn()
  const unmarkEditing = vi.fn()

  const ctx: GridContextValue = {
    registerCellRef: vi.fn(),
    focusCell: vi.fn(),
    updateCell,
    markEditing,
    unmarkEditing,
  }

  render(
    <GridProvider value={ctx}>
      <TimeCell value="" rowKey="row-1" col={0} field="startTime" />
    </GridProvider>
  )

  const input = screen.getByPlaceholderText('00:00')
  return { input, updateCell }
}

describe('TimeCell', () => {
  it('blocks Enter navigation when input is invalid', () => {
    const { input, updateCell } = renderCell()

    fireEvent.change(input, { target: { value: '99:99' } })
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(updateCell).not.toHaveBeenCalled()
  })

  it('normalizes valid compact input before Enter navigation', () => {
    const { input, updateCell } = renderCell()

    fireEvent.change(input, { target: { value: '0900' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(updateCell).toHaveBeenCalledWith('row-1', 'startTime', '09:00')
  })
})
