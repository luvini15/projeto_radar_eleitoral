import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/authContext'
import { ToastProvider } from '@/components/ui/toast'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Login from '@/pages/Login'
import Overview from '@/pages/Overview'
import Content from '@/pages/Content'
import Topics from '@/pages/Topics'
import Schedule from '@/pages/Schedule'
import Audience from '@/pages/Audience'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Overview />} />
              <Route path="/conteudos" element={<Content />} />
              <Route path="/temas-formatos" element={<Topics />} />
              <Route path="/dias-horarios" element={<Schedule />} />
              <Route path="/audiencia" element={<Audience />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
