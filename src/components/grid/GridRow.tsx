import React from 'react'
import { type GridRowData } from '../../hooks/useGridRows'
import { type Item } from '../../db'
import { type Suggestion } from './AutocompleteCell'
import { calculateDuration, formatDuration } from '../../lib/parser'
import { useTranslation } from 'react-i18next'
import TimeCell from './TimeCell'
import AutocompleteCell from './AutocompleteCell'
import TextCell from './TextCell'

interface GridRowProps {
  row: GridRowData
  hasConflict: boolean
  projectSuggestions: Suggestion[]
  getSubProjectSuggestions: (projectKey: string) => Suggestion[]
  getItemSuggestions: (projectKey: string, subProjectKey: string) => Suggestion[]
  buildItemUrl: (itemNr: string, projectKey: string) => string | null
  findItem: (itemNr: string, projectKey: string) => Item | undefined
  onItemClick?: (item: Item) => void
  onDeleteRow: (rowKey: string) => void
  onProjectChange: (rowKey: string, value: string, currentSubProject: string) => void
}

function computeDuration(row: GridRowData): string {
  if (!row.startTime || !row.endTime) return '–'
  const mins = calculateDuration(row.startTime, row.endTime)
  if (mins <= 0) return '–'
  return formatDuration(mins)
}

export const GridRow = React.memo(function GridRow({
  row,
  hasConflict,
  projectSuggestions,
  getSubProjectSuggestions,
  getItemSuggestions,
  buildItemUrl,
  findItem,
  onItemClick,
  onDeleteRow,
  onProjectChange,
}: GridRowProps) {
  const { t } = useTranslation()
  const isEmptyNew = row._isNew && !row._dirty

  return (
    <tr
      className={`group border-b transition-colors ${
        hasConflict
          ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10'
          : 'border-slate-50 dark:border-slate-800'
      } ${isEmptyNew ? 'opacity-50' : ''}`}
      title={hasConflict ? t('grid.overlapTitle') : undefined}
    >
      {/* Start */}
      <td className="grid-cell" data-row-key={row._key} data-col={0}>
        <TimeCell value={row.startTime} rowKey={row._key} col={0} field="startTime" />
      </td>

      {/* End */}
      <td className="grid-cell" data-row-key={row._key} data-col={1}>
        <TimeCell value={row.endTime} rowKey={row._key} col={1} field="endTime" />
      </td>

      {/* Project */}
      <td className="grid-cell" data-row-key={row._key} data-col={2}>
        <AutocompleteCell
          value={row.project}
          suggestions={projectSuggestions}
          rowKey={row._key}
          col={2}
          field="project"
          onProjectChange={onProjectChange}
          currentSubProject={row.subProject}
        />
      </td>

      {/* SubProject */}
      <td className="grid-cell" data-row-key={row._key} data-col={3}>
        <AutocompleteCell
          value={row.subProject}
          suggestions={getSubProjectSuggestions(row.project)}
          rowKey={row._key}
          col={3}
          field="subProject"
        />
      </td>

      {/* Item Nr */}
      <td className="grid-cell" data-row-key={row._key} data-col={4}>
        <div className="flex items-center">
          <div className="flex-1">
            <AutocompleteCell
              value={row.itemNr}
              suggestions={getItemSuggestions(row.project, row.subProject)}
              rowKey={row._key}
              col={4}
              field="itemNr"
            />
          </div>
          {(() => {
            const itemUrl = buildItemUrl(row.itemNr, row.project)
            const item = findItem(row.itemNr, row.project)
            return (
              <>
                {itemUrl && (
                  <a
                    href={itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0"
                    tabIndex={-1}
                    title={t('grid.openInAzure')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
                {item && onItemClick && !itemUrl && (
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shrink-0"
                    tabIndex={-1}
                    title={t('grid.openItem')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                )}
              </>
            )
          })()}
        </div>
      </td>

      {/* Comment */}
      <td className="grid-cell" data-row-key={row._key} data-col={5}>
        <TextCell
          value={row.taskText}
          rowKey={row._key}
          col={5}
          field="taskText"
          placeholder={t('grid.descriptionPlaceholder')}
        />
      </td>

      {/* Duration (read-only) */}
      <td className="px-3 py-2 text-right">
        <span className={`text-sm tabular-nums ${hasConflict ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
          {computeDuration(row)}
        </span>
        {hasConflict && (
          <div className="text-[10px] leading-3 mt-0.5 text-amber-700 dark:text-amber-300">
            {t('grid.hint')}
          </div>
        )}
      </td>

      {/* Delete */}
      <td className="px-1 py-2">
        {row._id && (
          <button
            type="button"
            onClick={() => void onDeleteRow(row._key)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all rounded"
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
})
