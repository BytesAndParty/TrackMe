import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DayView from './DayView'

const mocks = vi.hoisted(() => ({
  commitAllDirty: vi.fn(async () => true),
  useLiveQuery: vi.fn(() => []),
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: mocks.useLiveQuery,
}))

vi.mock('../components/grid/EditableGrid', () => ({
  default: ({
    onCommitAllDirtyReady,
  }: {
    onCommitAllDirtyReady?: (commitAllDirty: () => Promise<boolean>) => void
  }) => {
    onCommitAllDirtyReady?.(mocks.commitAllDirty)
    return <div data-testid="editable-grid" />
  },
}))

function LocationSearchProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

function renderDayView() {
  return render(
    <MemoryRouter initialEntries={['/?date=2026-02-11']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <DayView />
              <LocationSearchProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('DayView', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.commitAllDirty.mockResolvedValue(true)
    mocks.useLiveQuery.mockReturnValue([])
  })

  it('flushes pending edits before navigating to the next day', async () => {
    renderDayView()

    fireEvent.click(screen.getByLabelText('Nächster Tag'))

    await waitFor(() => {
      expect(mocks.commitAllDirty).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?date=2026-02-12')
    })
  })

  it('does not navigate when saving pending edits fails', async () => {
    mocks.commitAllDirty.mockResolvedValue(false)
    renderDayView()

    fireEvent.click(screen.getByLabelText('Nächster Tag'))

    await waitFor(() => {
      expect(mocks.commitAllDirty).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByTestId('location-search')).toHaveTextContent('?date=2026-02-11')
  })
})
