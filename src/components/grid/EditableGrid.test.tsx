import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditableGrid from './EditableGrid'

const mocks = vi.hoisted(() => {
  const timeEntriesAdd = vi.fn(async () => 1)
  const timeEntriesUpdate = vi.fn(async () => 1)
  const timeEntriesDelete = vi.fn(async () => 1)
  const itemsWhere = vi.fn(() => ({
    equals: vi.fn(() => ({
      filter: vi.fn(() => ({ first: vi.fn(async () => undefined) })),
      toArray: vi.fn(async () => []),
    })),
  }))
  const itemsAdd = vi.fn(async () => 1)

  return {
    timeEntriesAdd,
    timeEntriesUpdate,
    timeEntriesDelete,
    itemsWhere,
    itemsAdd,
  }
})

vi.mock('../../db', () => ({
  db: {
    timeEntries: {
      add: mocks.timeEntriesAdd,
      update: mocks.timeEntriesUpdate,
      delete: mocks.timeEntriesDelete,
    },
    items: {
      where: mocks.itemsWhere,
      add: mocks.itemsAdd,
    },
  },
}))

describe('EditableGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('does not auto-commit when focus moves to another cell in the same row', async () => {
    render(
      <EditableGrid
        date="2026-02-11"
        entries={[]}
        projects={[]}
        subProjects={[]}
        items={[]}
      />
    )

    const startInput = screen.getAllByPlaceholderText('00:00')[0]

    fireEvent.focus(startInput)
    fireEvent.change(startInput, { target: { value: '0900' } })
    fireEvent.blur(startInput)

    const endInput = screen.getAllByPlaceholderText('00:00')[1]
    fireEvent.focus(endInput)

    vi.advanceTimersByTime(150)
    await Promise.resolve()

    expect(mocks.timeEntriesAdd).not.toHaveBeenCalled()
  })
})
