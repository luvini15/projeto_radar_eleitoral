import { lazy, Suspense } from 'react'
import { CampaignProvider } from '@/lib/CampaignProvider'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/authContext'
import { ToastProvider } from '@/components/ui/toast'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Login from '@/pages/Login'
import ResetPassword from '@/pages/ResetPassword'
import { PrivacyPolicy, TermsOfUse } from '@/pages/Legal'
import Overview from '@/pages/Overview'
import Content from '@/pages/Content'
import ContentDetail from '@/pages/ContentDetail'
import Topics from '@/pages/Topics'
import Schedule from '@/pages/Schedule'
import Audience from '@/pages/Audience'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'

const Landing = lazy(() => import('@/pages/Landing'))

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Suspense fallback={<div className="min-h-screen bg-black" />}><Landing /></Suspense>} />
            <Route path="/login" element={<Login />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route
              element={
                <ProtectedRoute>
                  <CampaignProvider><DashboardLayout /></CampaignProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/painel" element={<Overview />} />
              <Route path="/conteudos" element={<Content />} />
              <Route path="/conteudos/:postId" element={<ContentDetail />} />
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
