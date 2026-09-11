import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGridState } from './useGridState'
import { type TimeEntry, type Project, type SubProject } from '../db'

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

  const draftRowsBulkPut = vi.fn(async () => undefined)
  const draftRowsBulkDelete = vi.fn(async () => undefined)
  const draftRowsDelete = vi.fn(async () => 0)
  const draftRowsToArray = vi.fn(async () => [])
  const draftRowsWhere = vi.fn(() => ({
    equals: vi.fn(() => ({ toArray: draftRowsToArray, delete: draftRowsDelete })),
  }))

  // Transaction mock: executes the callback immediately
  const transaction = vi.fn(async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => {
    await cb()
  })

  return {
    timeEntriesAdd,
    timeEntriesUpdate,
    timeEntriesDelete,
    itemsWhere,
    itemsAdd,
    itemsFirst,
    todoItemsToArray,
    draftRowsBulkPut,
    draftRowsBulkDelete,
    draftRowsDelete,
    draftRowsToArray,
    draftRowsWhere,
    transaction,
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
    draftRows: {
      where: mocks.draftRowsWhere,
      bulkPut: mocks.draftRowsBulkPut,
      bulkDelete: mocks.draftRowsBulkDelete,
    },
    transaction: mocks.transaction,
  },
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => [],
}))

describe('useGridState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('sichert eine unvollständige Zeile beim Unmount als Draft', async () => {
    const { result, unmount } = renderHook(() => useGridState('2026-02-11', [], [], []))
    const rowKey = result.current.rows[0]._key

    // Kommentar ohne vollständige Zeiten: ergibt keine Zeitbuchung, darf aber nicht verloren gehen.
    act(() => {
      result.current.updateCell(rowKey, 'taskText', 'Telefonat mit Kunde')
    })

    unmount()

    await waitFor(() => expect(mocks.draftRowsBulkPut).toHaveBeenCalled())
    expect(mocks.timeEntriesAdd).not.toHaveBeenCalled()

    const savedDrafts = mocks.draftRowsBulkPut.mock.calls.at(-1)![0]
    expect(savedDrafts).toHaveLength(1)
    expect(savedDrafts[0]).toMatchObject({
      date: '2026-02-11',
      rowKey,
      taskText: 'Telefonat mit Kunde',
    })
  })

  it('entfernt den Draft, sobald die Zeile eine gültige Zeitbuchung wird', async () => {
    const { result } = renderHook(() => useGridState('2026-02-11', [], [], []))
    const rowKey = result.current.rows[0]._key

    act(() => {
      result.current.updateCell(rowKey, 'taskText', 'Telefonat mit Kunde')
      result.current.updateCell(rowKey, 'startTime', '09:00')
      result.current.updateCell(rowKey, 'endTime', '10:00')
    })

    await act(async () => {
      await result.current.commitRow(rowKey)
    })

    expect(mocks.timeEntriesAdd).toHaveBeenCalledTimes(1)
    expect(mocks.draftRowsDelete).toHaveBeenCalled()
  })

  it('deduplicates concurrent commit calls for a new row', async () => {
    const { result } = renderHook(() => useGridState('2026-02-11', [], [], []))
    const rowKey = result.current.rows[0]._key

    act(() => {
      result.current.updateCell(rowKey, 'startTime', '09:00')
      result.current.updateCell(rowKey, 'endTime', '10:00')
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

  it('keeps a single row when db sync arrives during create commit', async () => {
    const projects: Project[] = [{ id: 1, key: 'abc', name: 'ABC', active: true }]
    const subProjects: SubProject[] = []
    const syncedEntry: TimeEntry = {
      id: 77,
      date: '2026-02-11',
      startTime: '09:00',
      endTime: '',
      durationMinutes: 0,
      projectId: 1,
      subProjectId: undefined,
      workItemLinkId: undefined,
      itemNr: '',
      taskText: '',
      notes: '',
    }

    let triggerDbSync: (() => void) | null = null
    mocks.timeEntriesAdd.mockImplementationOnce(async () => {
      triggerDbSync?.()
      await Promise.resolve()
      return 77
    })

    const { result, rerender } = renderHook(
      ({ dbEntries, allProjects, allSubProjects }) =>
        useGridState('2026-02-11', dbEntries, allProjects, allSubProjects),
      {
        initialProps: {
          dbEntries: [] as TimeEntry[],
          allProjects: projects,
          allSubProjects: subProjects,
        },
      }
    )

    const rowKey = result.current.rows[0]._key
    triggerDbSync = () => {
      rerender({
        dbEntries: [syncedEntry],
        allProjects: projects,
        allSubProjects: subProjects,
      })
    }

    act(() => {
      result.current.updateCell(rowKey, 'startTime', '09:00')
      result.current.updateCell(rowKey, 'endTime', '10:00')
      result.current.updateCell(rowKey, 'project', 'abc')
    })

    await act(async () => {
      await result.current.commitRow(rowKey)
    })

    await waitFor(() => {
      const rowsWithId = result.current.rows.filter((r) => r._id === 77)
      expect(rowsWithId).toHaveLength(1)
    })
  })

  it('resets save status after debounce when no row can be persisted yet', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useGridState('2026-02-11', [], [], []))
      const rowKey = result.current.rows[0]._key

      act(() => {
        result.current.updateCell(rowKey, 'taskText', 'draft')
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
        await Promise.resolve()
      })

      expect(result.current.saveStatus).toBe('saved')
      expect(mocks.timeEntriesAdd).not.toHaveBeenCalled()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it('does not persist incomplete or invalid time ranges', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useGridState('2026-02-11', [], [], []))
      const rowKey = result.current.rows[0]._key

      act(() => {
        result.current.updateCell(rowKey, 'startTime', '10:00')
      })
      await act(async () => {
        await result.current.commitRow(rowKey)
      })

      act(() => {
        result.current.updateCell(rowKey, 'endTime', '09:00')
      })
      await act(async () => {
        await result.current.commitRow(rowKey)
      })

      expect(mocks.timeEntriesAdd).not.toHaveBeenCalled()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it('blocks overlapping changes when committing all rows', async () => {
    const existingEntry: TimeEntry = {
      id: 7,
      date: '2026-02-11',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      itemNr: '',
      taskText: '',
      notes: '',
    }
    const { result } = renderHook(() => useGridState('2026-02-11', [existingEntry], [], []))
    const newRow = result.current.rows.find((row) => row._isNew)!

    act(() => {
      result.current.updateCell(newRow._key, 'startTime', '09:30')
      result.current.updateCell(newRow._key, 'endTime', '10:30')
    })

    await act(async () => {
      expect(await result.current.commitAllDirty()).toBe(false)
    })

    expect(mocks.timeEntriesAdd).not.toHaveBeenCalled()
    expect(result.current.saveStatus).toBe('error')
  })

  it('saves a complete row on unmount even when another row is only half filled', async () => {
    // Stabile Referenzen, damit der Unmount-Effect nur beim Unmount läuft
    const projects: Project[] = []
    const subProjects: SubProject[] = []
    const entries: TimeEntry[] = []

    const { result, unmount } = renderHook(() =>
      useGridState('2026-02-11', entries, projects, subProjects, [])
    )
    const completeKey = result.current.rows[0]._key

    act(() => {
      result.current.updateCell(completeKey, 'startTime', '09:00')
      result.current.updateCell(completeKey, 'endTime', '10:00')
    })

    // Zweite Zeile nur angetippt, dann Ansicht verlassen
    const halfFilledKey = result.current.rows[1]._key
    act(() => {
      result.current.updateCell(halfFilledKey, 'startTime', '10:00')
    })

    await act(async () => {
      unmount()
      await Promise.resolve()
    })

    expect(mocks.timeEntriesAdd).toHaveBeenCalledTimes(1)
    expect(mocks.timeEntriesAdd).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '09:00', endTime: '10:00' })
    )
  })

  it('saves an edited existing entry on unmount even when another row is only half filled', async () => {
    const existingEntry: TimeEntry = {
      id: 7,
      date: '2026-02-11',
      startTime: '08:00',
      endTime: '09:00',
      durationMinutes: 60,
      itemNr: '',
      taskText: 'alt',
      notes: '',
    }
    const projects: Project[] = []
    const subProjects: SubProject[] = []
    const entries: TimeEntry[] = [existingEntry]

    const { result, unmount } = renderHook(() =>
      useGridState('2026-02-11', entries, projects, subProjects, [])
    )

    const existingKey = result.current.rows.find((row) => row._id === 7)!._key
    act(() => {
      result.current.updateCell(existingKey, 'taskText', 'geändert')
    })

    const halfFilledKey = result.current.rows.find((row) => row._isNew)!._key
    act(() => {
      result.current.updateCell(halfFilledKey, 'startTime', '10:00')
    })

    await act(async () => {
      unmount()
      await Promise.resolve()
    })

    expect(mocks.timeEntriesUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.timeEntriesUpdate).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ taskText: 'geändert' })
    )
  })
})
