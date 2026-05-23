import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DepartmentsPage from './pages/DepartmentsPage'
import DepartmentPage from './pages/DepartmentPage'
import ProjectPage from './pages/ProjectPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DepartmentsPage />} />
        <Route path="departments/:id" element={<DepartmentPage />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App