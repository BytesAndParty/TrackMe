import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DayView from './pages/DayView'
import WeekView from './pages/WeekView'
import MonthView from './pages/MonthView'
import Reports from './pages/Reports'
import Projects from './pages/Projects'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/month" element={<MonthView />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/projects" element={<Projects />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
