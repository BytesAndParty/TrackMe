import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useGridState } from './useGridState'

const mocks = vi.hoisted(() => {
  const timeEntriesAdd = vi.fn(async () => 42)
  const timeEntriesUpdate = vi.fn(async () => 1)
  const timeEntriesDelete = vi.fn(async () => 1)
  const itemsFirst = vi.fn(async () => undefined)
  const todoItemsToArray = vi.fn(async () => [])
  const itemsWhere = vi.fn(() => ({
    equals: vi.fn(() => ({
      filter: vi.fn(() => ({ first: itemsFirst })),
      toArray: todoItemsToArray,
    })),
  }))
  const itemsAdd = vi.fn(async () => 99)

  return {
    timeEntriesAdd,
    timeEntriesUpdate,
    timeEntriesDelete,
    itemsWhere,
    itemsAdd,
    itemsFirst,
    todoItemsToArray,
  }
})

vi.mock('../db', () => ({
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

describe('useGridState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates concurrent commit calls for a new row', async () => {
    const { result } = renderHook(() => useGridState('2026-02-11', [], [], []))
    const rowKey = result.current.rows[0]._key

    act(() => {
      result.current.updateCell(rowKey, 'startTime', '09:00')
    })

    await act(async () => {
      await Promise.all([
        result.current.commitRow(rowKey),
        result.current.commitRow(rowKey),
      ])
    })

    expect(mocks.timeEntriesAdd).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current.rows[0]._id).toBe(42))
  })
})
