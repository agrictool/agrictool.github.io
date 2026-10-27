import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import AdminLayout from './components/admin/AdminLayout'
import { RequireAuth, RequireAdmin, RequireGuest } from './components/layout/ProtectedRoute'

// Public
import HomePage from './pages/public/HomePage'
import PrivacyPage from './pages/public/PrivacyPage'

// Auth
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'
import ResetPasswordPage from './pages/public/ResetPasswordPage'

// Student
import DashboardPage from './pages/student/DashboardPage'
import AssessmentPage from './pages/student/AssessmentPage'
import CertificatePage from './pages/student/CertificatePage'

// Toolkit
import ToolkitDirectoryPage from './pages/toolkit/ToolkitDirectoryPage'
import ToolkitDetailPage from './pages/toolkit/ToolkitDetailPage'
import ContributePage from './pages/toolkit/ContributePage'

// Admin
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminParticipantsPage from './pages/admin/AdminParticipantsPage'
import AdminSurveyPage from './pages/admin/AdminSurveyPage'
import AdminImpactPage from './pages/admin/AdminImpactPage'
import AdminChallengePage from './pages/admin/AdminChallengePage'
import AdminToolkitPage from './pages/admin/AdminToolkitPage'
import AdminPhasesPage from './pages/admin/AdminPhasesPage'
import AdminCertificatesPage from './pages/admin/AdminCertificatesPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            {/* ── Public (with nav + footer) ── */}
            <Route element={<PublicLayout><Outlet /></PublicLayout>}>
              <Route path="/" element={<HomePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/toolkit" element={<ToolkitDirectoryPage />} />
              <Route path="/toolkit/:id" element={<ToolkitDetailPage />} />
              <Route path="/contribute" element={<ContributePage />} />
              <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
              <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />
              <Route path="/reset-password" element={<RequireGuest><ResetPasswordPage /></RequireGuest>} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/assessment/:type" element={<RequireAuth><AssessmentPage /></RequireAuth>} />
              <Route path="/certificate" element={<RequireAuth><CertificatePage /></RequireAuth>} />
              <Route path="*" element={
                <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
                  <div>
                    <p className="text-5xl font-bold text-[#12304A] mb-2">404</p>
                    <p className="text-lg font-semibold text-[#12304A] mb-1">Page Not Found</p>
                    <p className="text-sm text-[#5A6472]">The page you are looking for does not exist.</p>
                    <a href="/" className="mt-4 inline-block text-sm text-[#2E7D32] underline">Return to homepage</a>
                  </div>
                </div>
              } />
            </Route>

            {/* ── Admin (with sidebar layout, no footer) ── */}
            <Route path="/admin" element={<RequireAdmin><PublicNavOnlyWrapper><AdminLayout /></PublicNavOnlyWrapper></RequireAdmin>}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="participants" element={<AdminParticipantsPage />} />
              <Route path="pre-survey" element={<AdminSurveyPage type="pre" />} />
              <Route path="post-survey" element={<AdminSurveyPage type="post" />} />
              <Route path="impact" element={<AdminImpactPage />} />
              <Route path="challenge" element={<AdminChallengePage />} />
              <Route path="toolkit" element={<AdminToolkitPage />} />
              <Route path="phases" element={<AdminPhasesPage />} />
              <Route path="certificates" element={<AdminCertificatesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Thin wrapper: Navbar only, no footer, for admin section
function PublicNavOnlyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">{children}</div>
    </div>
  )
}

// Re-export Outlet for nested routes
import { Outlet } from 'react-router-dom'
