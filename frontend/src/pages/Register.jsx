import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Brain, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

const TOPICS = [
  { id: 'Artificial Intelligence', label: '🤖 Artificial Intelligence', desc: 'ML, NLP, deep learning' },
  { id: 'Web Development', label: '💻 Web Development', desc: 'React, APIs, databases' },
  { id: 'Business & Entrepreneurship', label: '🚀 Business', desc: 'Startups, marketing, strategy' },
  { id: 'Health & Wellness', label: '🧘 Health & Wellness', desc: 'Fitness, mindfulness, nutrition' },
  { id: 'Finance & Investing', label: '📈 Finance', desc: 'Investing, personal finance' },
  { id: 'Education & Learning', label: '📚 Education', desc: 'Learning techniques, EdTech' },
]

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [selectedTopics, setSelectedTopics] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const toggleTopic = (id) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedTopics.length === 0) {
      setError('Please select at least one topic to personalize your feed.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({ ...form, topic_preferences: selectedTopics })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-white/10 p-3 rounded-2xl">
              <Brain className="w-10 h-10 text-blue-300" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-blue-200 mt-1 text-sm">
            Personalized content starts here — powered by AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="johndoe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="you@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="••••••••"
                  required minLength={6}
                />
              </div>
            </div>

            {/* Topic Preferences — Cold Start Solution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select your interests
                <span className="ml-2 text-xs text-indigo-600 font-normal">
                  (Cold-start personalization — required)
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map(topic => {
                  const selected = selectedTopics.includes(topic.id)
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {selected && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{topic.label}</p>
                        <p className="text-xs text-gray-500">{topic.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Your selections seed the AI recommendation engine until behavioral data is available.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account & Start'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
