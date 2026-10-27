import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, LayoutDashboard, Settings, BookOpen, ChevronDown } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { firebaseUser, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut(auth)
    setUserMenuOpen(false)
    navigate('/')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors px-1 py-0.5 rounded
     ${isActive ? 'text-[#2E7D32]' : 'text-[#12304A] hover:text-[#2E7D32]'}`

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDE3E7] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D32] rounded">
            <div className="w-8 h-8 bg-[#12304A] rounded flex items-center justify-center flex-shrink-0">
              <span className="text-[#D4AF37] font-bold text-xs">R</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-[#12304A] leading-tight">RAISSAT</p>
              <p className="text-xs text-[#5A6472] leading-tight">Digital Food Systems</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <NavLink to="/toolkit" className={navLinkClass}>
              Explore Toolkit
            </NavLink>
            <NavLink to="/contribute" className={navLinkClass}>
              Contribute a Tool
            </NavLink>
            {!firebaseUser ? (
              <>
                <NavLink to="/register" className={navLinkClass}>Register</NavLink>
                <Link
                  to="/login"
                  className="bg-[#12304A] text-white text-sm font-medium px-4 py-2 rounded hover:bg-[#0d2237] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#12304A]"
                >
                  Log In
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-[#12304A] hover:text-[#2E7D32] transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 bg-[#E8F5E9] rounded-full flex items-center justify-center text-xs font-bold text-[#2E7D32]">
                    {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="max-w-[120px] truncate">{profile?.fullName?.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white border border-[#DDE3E7] rounded-lg shadow-lg py-1 z-50"
                    role="menu"
                  >
                    <p className="px-3 py-2 text-xs text-[#5A6472] border-b border-[#DDE3E7]">
                      {profile?.participantId}
                    </p>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#12304A] hover:bg-[#F9FBF9] transition-colors"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      My Dashboard
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[#12304A] hover:bg-[#F9FBF9] transition-colors"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                        <Link
                          to="/admin/toolkit"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-[#12304A] hover:bg-[#F9FBF9] transition-colors"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <BookOpen className="w-4 h-4" />
                          Toolkit Moderation
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-[#C62828] hover:bg-[#FFEBEE] transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded text-[#12304A] hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#DDE3E7] bg-white" id="mobile-menu">
          <nav className="flex flex-col px-4 py-3 gap-1" aria-label="Mobile navigation">
            <MobileLink to="/toolkit" onClick={() => setMobileOpen(false)}>Explore Toolkit</MobileLink>
            <MobileLink to="/contribute" onClick={() => setMobileOpen(false)}>Contribute a Tool</MobileLink>
            {!firebaseUser ? (
              <>
                <MobileLink to="/register" onClick={() => setMobileOpen(false)}>Register</MobileLink>
                <MobileLink to="/login" onClick={() => setMobileOpen(false)}>Log In</MobileLink>
              </>
            ) : (
              <>
                <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>My Dashboard</MobileLink>
                {isAdmin && (
                  <>
                    <MobileLink to="/admin" onClick={() => setMobileOpen(false)}>Admin Dashboard</MobileLink>
                    <MobileLink to="/admin/toolkit" onClick={() => setMobileOpen(false)}>Toolkit Moderation</MobileLink>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-left px-3 py-2 text-sm text-[#C62828] rounded hover:bg-[#FFEBEE] transition-colors mt-1"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
      )}
    </header>
  )
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium rounded transition-colors
         ${isActive ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'text-[#12304A] hover:bg-gray-50'}`
      }
    >
      {children}
    </NavLink>
  )
}
