import { CampaignProvider } from '@/lib/CampaignProvider'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/authContext'
import { ToastProvider } from '@/components/ui/toast'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Login from '@/pages/Login'
import Overview from '@/pages/Overview'
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
import Trends from '@/pages/Trends'
import TerritorialIntelligence from '@/pages/TerritorialIntelligence'
import { CampaignPage } from '@/components/dashboard/CampaignPage'

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
                  <CampaignProvider><DashboardLayout /></CampaignProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Overview />} />
              <Route path="/conteudos" element={<Content />} />
              <Route path="/conteudos/:postId" element={<ContentDetail />} />
              <Route path="/temas-formatos" element={<Topics />} />
              <Route path="/dias-horarios" element={<Schedule />} />
              <Route path="/audiencia" element={<Audience />} />
              <Route path="/insights" element={<CampaignPage><TerritorialIntelligence /></CampaignPage>} />
              <Route path="/analise-estrategica" element={<Insights />} />
              <Route path="/tendencias" element={<CampaignPage><Trends /></CampaignPage>} />
              <Route path="/concorrentes" element={<CampaignPage><Comparison /></CampaignPage>} />
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
