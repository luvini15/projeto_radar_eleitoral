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
import ExecutiveOverview from '@/pages/ExecutiveOverview'
import Assistant from '@/pages/Assistant'
import Content from '@/pages/Content'
import ContentDetail from '@/pages/ContentDetail'
import Topics from '@/pages/Topics'
import Schedule from '@/pages/Schedule'
import Audience from '@/pages/Audience'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'
import Comparison from '@/pages/Comparison'
import Collections from '@/pages/Collections'
import Reports from '@/pages/Reports'
import DigitalReport from '@/pages/DigitalReport'
import Trends from '@/pages/Trends'
import TerritorialIntelligence from '@/pages/TerritorialIntelligence'
import { CampaignPage } from '@/components/dashboard/CampaignPage'

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
            <Route path="/relatorios/:id" element={<ProtectedRoute><DigitalReport /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <CampaignProvider><DashboardLayout /></CampaignProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/visao-geral" element={<ExecutiveOverview />} />
              <Route path="/painel" element={<Overview />} />
              <Route path="/ia" element={<Assistant />} />
              <Route path="/conteudos" element={<Content />} />
              <Route path="/conteudos/:postId" element={<ContentDetail />} />
              <Route path="/temas-formatos" element={<Topics />} />
              <Route path="/dias-horarios" element={<Schedule />} />
              <Route path="/audiencia" element={<Audience />} />
              <Route path="/inteligencia" element={<CampaignPage><TerritorialIntelligence /></CampaignPage>} />
              <Route path="/inteligencia-territorial" element={<CampaignPage><TerritorialIntelligence /></CampaignPage>} />
              <Route path="/insights" element={<CampaignPage><TerritorialIntelligence /></CampaignPage>} />
              <Route path="/analise-estrategica" element={<Insights />} />
              <Route path="/tendencias" element={<CampaignPage><Trends /></CampaignPage>} />
              <Route path="/concorrentes" element={<CampaignPage><Comparison /></CampaignPage>} />
              <Route path="/relatorios/novo" element={<CampaignPage><Reports /></CampaignPage>} />
              <Route path="/relatorios" element={<CampaignPage><Reports /></CampaignPage>} />
              <Route path="/coletas" element={<CampaignPage><Collections /></CampaignPage>} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
