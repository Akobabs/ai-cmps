import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Brain, LayoutDashboard, BookOpen, Settings, LogOut, User, BarChart3 } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path
    ? 'bg-blue-700 text-white'
    : 'text-blue-100 hover:bg-blue-700 hover:text-white'

  return (
    <nav className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <Brain className="w-7 h-7 text-blue-300" />
            <span>AI-CMPS</span>
            <span className="text-xs text-blue-300 font-normal hidden sm:block">
              Content Management & Personalization
            </span>
          </Link>

          {/* Nav Links */}
          {user && (
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')}`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">My Feed</span>
              </Link>

              <Link
                to="/profile"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/profile')}`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>

              {user.is_admin && (
                <>
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin')}`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                  <Link
                    to="/analytics"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/analytics')}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </Link>
                </>
              )}

              <div className="ml-2 flex items-center gap-2 border-l border-blue-600 pl-2">
                <span className="text-blue-200 text-sm hidden md:inline">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
