import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DayView from './pages/DayView'

const WeekView = lazy(() => import('./pages/WeekView'))
const MonthView = lazy(() => import('./pages/MonthView'))
const Reports = lazy(() => import('./pages/Reports'))
const Items = lazy(() => import('./pages/Items'))
const Todo = lazy(() => import('./pages/Todo'))
const Projects = lazy(() => import('./pages/Projects'))
const Import = lazy(() => import('./pages/Import'))
const ItemDetailOverlay = lazy(() => import('./components/kanban/ItemDetailOverlay'))

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DayView />} />
          <Route path="/week" element={<Suspense fallback={<Loading />}><WeekView /></Suspense>} />
          <Route path="/month" element={<Suspense fallback={<Loading />}><MonthView /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<Loading />}><Reports /></Suspense>} />
          <Route path="/items" element={<Suspense fallback={<Loading />}><Items /></Suspense>}>
            <Route path=":id" element={<Suspense fallback={<Loading />}><ItemDetailOverlay /></Suspense>} />
          </Route>
          <Route path="/todo" element={<Suspense fallback={<Loading />}><Todo /></Suspense>} />
          <Route path="/projects" element={<Suspense fallback={<Loading />}><Projects /></Suspense>} />
          <Route path="/import" element={<Suspense fallback={<Loading />}><Import /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
