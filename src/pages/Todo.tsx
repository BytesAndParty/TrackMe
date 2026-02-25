import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db, type Item, type TodoTask } from '../db'

type DropPosition = 'before' | 'after' | null

function buildItemLabel(item: Item, projectKey?: string): string {
  const itemRef = item.itemNr.trim() || String(item.id ?? '')
  const projectPrefix = projectKey ? `${projectKey} ` : ''
  return `${projectPrefix}#${itemRef} - ${item.title}`
}

export default function Todo() {
  const { t } = useTranslation()
  const todos = useLiveQuery(() => db.todoTasks.orderBy('sortOrder').toArray()) ?? []
  const items = useLiveQuery(() => db.items.orderBy('sortOrder').toArray()) ?? []
  const projects = useLiveQuery(() => db.projects.toArray()) ?? []

  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [linkedItemId, setLinkedItemId] = useState<number | undefined>()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<DropPosition>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const itemById = new Map<number, Item>()
  for (const item of items) {
    if (item.id) itemById.set(item.id, item)
  }

  const projectKeyById = new Map<number, string>()
  for (const project of projects) {
    if (project.id) projectKeyById.set(project.id, project.key.toUpperCase())
  }

  function focusEditor() {
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  function resetComposer() {
    setDraftTitle('')
    setDraftText('')
    setLinkedItemId(undefined)
    setEditingId(null)
  }

  function resetDragState() {
    setDragOverId(null)
    setDropPosition(null)
  }

  function startEdit(todo: TodoTask) {
    if (!todo.id) return
    setEditingId(todo.id)
    setDraftTitle(todo.title)
    setDraftText(todo.text)
    setLinkedItemId(todo.linkedItemId)
    focusEditor()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = draftTitle.trim()
    const text = draftText.trim()
    if (!title && !text) return

    const now = new Date().toISOString()

    if (editingId) {
      await db.todoTasks.update(editingId, {
        title,
        text,
        linkedItemId,
        updatedAt: now,
      })
    } else {
      const maxSort = todos.reduce((max, todo) => Math.max(max, todo.sortOrder), 0)
      await db.todoTasks.add({
        title,
        text,
        linkedItemId,
        sortOrder: maxSort + 1000,
        createdAt: now,
        updatedAt: now,
      })
    }

    resetComposer()
    focusEditor()
  }

  async function deleteTodo(id: number) {
    await db.todoTasks.delete(id)
    if (editingId === id) resetComposer()
  }

  async function persistOrder(nextTodos: TodoTask[]) {
    const now = new Date().toISOString()
    await db.transaction('rw', db.todoTasks, async () => {
      for (let index = 0; index < nextTodos.length; index += 1) {
        const todo = nextTodos[index]
        if (!todo.id) continue
        const nextSortOrder = (index + 1) * 1000
        if (todo.sortOrder !== nextSortOrder) {
          await db.todoTasks.update(todo.id, {
            sortOrder: nextSortOrder,
            updatedAt: now,
          })
        }
      }
    })
  }

  async function moveTodo(draggedId: number, targetId: number, position: Exclude<DropPosition, null>) {
    if (draggedId === targetId) return

    const dragged = todos.find((todo) => todo.id === draggedId)
    if (!dragged) return

    const withoutDragged = todos.filter((todo) => todo.id !== draggedId)
    const targetIndex = withoutDragged.findIndex((todo) => todo.id === targetId)
    if (targetIndex === -1) return

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
    withoutDragged.splice(insertIndex, 0, dragged)
    await persistOrder(withoutDragged)
  }

  async function moveTodoToEnd(draggedId: number) {
    const dragged = todos.find((todo) => todo.id === draggedId)
    if (!dragged) return

    const withoutDragged = todos.filter((todo) => todo.id !== draggedId)
    withoutDragged.push(dragged)
    await persistOrder(withoutDragged)
  }

  async function handleDropOnTodo(e: React.DragEvent<HTMLDivElement>, targetId: number) {
    e.preventDefault()
    const draggedId = Number(e.dataTransfer.getData('text/plain'))
    if (!draggedId || !dropPosition) {
      resetDragState()
      return
    }

    await moveTodo(draggedId, targetId, dropPosition)
    resetDragState()
  }

  async function handleDropOnEnd(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const draggedId = Number(e.dataTransfer.getData('text/plain'))
    if (!draggedId || todos.length === 0) {
      resetDragState()
      return
    }

    const lastTodo = todos[todos.length - 1]
    if (lastTodo.id && lastTodo.id !== draggedId) {
      await moveTodoToEnd(draggedId)
    }
    resetDragState()
  }

  return (
    <>
      <div className="space-y-6 pb-56">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('layout.nav.todo')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('todo.subtitle')}</p>
        </div>

        <div className="space-y-2">
          {todos.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('todo.empty')}</p>
            </div>
          )}

          {todos.map((todo) => {
            const linkedItem = todo.linkedItemId ? itemById.get(todo.linkedItemId) : undefined
            const linkedItemId = linkedItem?.id
            const isDropTarget = dragOverId === todo.id
            const showDropBefore = isDropTarget && dropPosition === 'before'
            const showDropAfter = isDropTarget && dropPosition === 'after'

            return (
              <div
                key={todo.id}
                draggable={Boolean(todo.id)}
                onDragStart={(e) => {
                  if (!todo.id) return
                  e.dataTransfer.setData('text/plain', String(todo.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  const bounds = e.currentTarget.getBoundingClientRect()
                  const nextPosition: Exclude<DropPosition, null> =
                    e.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
                  setDragOverId(todo.id ?? null)
                  setDropPosition(nextPosition)
                  e.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(e) => {
                  if (!todo.id) return
                  void handleDropOnTodo(e, todo.id)
                }}
                onDragEnd={resetDragState}
                onClick={() => startEdit(todo)}
                className={`relative rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 shadow-sm transition-all cursor-pointer ${
                  editingId === todo.id
                    ? 'border-emerald-400 ring-1 ring-emerald-300/70 dark:ring-emerald-700/60'
                    : 'border-slate-200 dark:border-slate-700 hover:shadow-md'
                }`}
              >
                {showDropBefore && <div className="absolute left-3 right-3 top-0 h-0.5 rounded-full bg-emerald-500" />}
                {showDropAfter && <div className="absolute left-3 right-3 bottom-0 h-0.5 rounded-full bg-emerald-500" />}

                <div className="flex items-start gap-3">
                  <div className="mt-1 text-slate-300 dark:text-slate-600" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {todo.title && (
                      <p className="text-sm font-semibold leading-snug">{todo.title}</p>
                    )}
                    {todo.text && (
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-600 dark:text-slate-400${todo.title ? ' mt-1' : ''}`}>{todo.text}</p>
                    )}

                    {linkedItem && linkedItemId && (
                      <Link
                        to={`/items/${linkedItemId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex mt-2 items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3.46-3.46a5 5 0 0 0-7.07-7.07L11.7 5.24" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54L3 13.93a5 5 0 0 0 7.07 7.07l2.24-2.24" />
                        </svg>
                        {buildItemLabel(linkedItem, projectKeyById.get(linkedItem.projectId))}
                      </Link>
                    )}

                    {!linkedItem && todo.linkedItemId && (
                      <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                        {t('todo.linkedItemMissing')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!todo.id) return
                      void deleteTodo(todo.id)
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title={t('todo.quickDeleteTitle')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            )
          })}

          {todos.length > 1 && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverId(null)
                setDropPosition(null)
              }}
              onDrop={(e) => void handleDropOnEnd(e)}
              className="mt-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-center text-xs text-slate-400 dark:text-slate-500"
            >
              {t('todo.dropHint')}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={titleRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={t('todo.titlePlaceholder')}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/15 dark:focus:ring-slate-100/15"
            />
            <textarea
              rows={2}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={t('todo.descriptionPlaceholder')}
              className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15 dark:focus:ring-slate-100/15"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={linkedItemId ?? ''}
                onChange={(e) => setLinkedItemId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full sm:w-auto sm:min-w-80 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15 dark:focus:ring-slate-100/15"
              >
                <option value="">{t('todo.noLinkedItem')}</option>
                {items
                  .filter((item) => Boolean(item.id) && item.status !== 'done')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {buildItemLabel(item, projectKeyById.get(item.projectId))}
                    </option>
                  ))}
              </select>

              <div className="flex items-center gap-2 sm:ml-auto">
                {(editingId || draftTitle || draftText || linkedItemId) && (
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t('todo.reset')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!draftTitle.trim() && !draftText.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                >
                  {editingId ? t('todo.saveEdit') : t('todo.saveNew')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
