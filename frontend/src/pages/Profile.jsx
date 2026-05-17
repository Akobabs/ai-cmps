import { useEffect, useState } from 'react'
import { user as userApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { User, Zap, BookOpen, Users, Clock, Activity, Brain } from 'lucide-react'
import { Link } from 'react-router-dom'

const MODE_COLORS = {
  'Content-Based (Cold Start)': 'bg-orange-100 text-orange-800',
  'Hybrid': 'bg-blue-100 text-blue-800',
  'Collaborative Filtering': 'bg-green-100 text-green-800',
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    userApi.profile()
      .then(res => setProfile(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  const modeColor = MODE_COLORS[profile?.recommendation_mode] || 'bg-gray-100 text-gray-800'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your AI Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* User info card */}
        <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-3">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">{user?.username}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>

            <div className="mt-4 w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Profile completeness</span>
                <span className="font-medium text-blue-600">{profile?.profile_completeness}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${profile?.profile_completeness}%` }}
                />
              </div>
            </div>

            <div className="mt-4 w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Interactions</span>
                <span className="font-medium">{profile?.user?.interaction_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alpha (α)</span>
                <span className="font-medium text-indigo-600">{profile?.alpha?.toFixed(3)}</span>
              </div>
            </div>

            <div className={`mt-4 px-3 py-1.5 rounded-full text-xs font-medium ${modeColor}`}>
              {profile?.recommendation_mode}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white">
            <Activity className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{profile?.user?.interaction_count}</p>
            <p className="text-blue-100 text-sm">Total Interactions</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl p-5 text-white">
            <Brain className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{profile?.alpha?.toFixed(2)}</p>
            <p className="text-indigo-100 text-sm">Current Alpha (α)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <BookOpen className="w-6 h-6 mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-gray-900">
              {profile?.user?.topic_preferences?.length || 0}
            </p>
            <p className="text-gray-500 text-sm">Preferred Topics</p>
            <p className="text-xs text-gray-400 mt-1">
              {profile?.user?.topic_preferences?.join(', ') || 'None selected'}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <Users className="w-6 h-6 mb-2 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">
              {profile?.profile_completeness}%
            </p>
            <p className="text-gray-500 text-sm">Profile Maturity</p>
            <p className="text-xs text-gray-400 mt-1">Collaborative signals active at 100%</p>
          </div>
        </div>
      </div>

      {/* How personalization works */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> How Your Recommendations Are Generated
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-1">Step 1: Content-Based</p>
            <p className="text-gray-500">TF-IDF embeddings of your reading history are matched against all articles using cosine similarity (S<sub>ij</sub>).</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Step 2: Collaborative</p>
            <p className="text-gray-500">SVD matrix factorization finds users with similar taste and leverages their preferences (P<sub>cf</sub>).</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Step 3: Hybrid Blend</p>
            <p className="text-gray-500 font-mono text-xs">H = α × S<sub>ij</sub> + (1-α) × P<sub>cf</sub><br/>α = {profile?.alpha?.toFixed(2)} currently</p>
          </div>
        </div>
      </div>

      {/* Interaction history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" /> Recent Reading History
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {profile?.history?.length === 0 && (
            <p className="text-gray-400 text-sm p-4">No reading history yet. Start reading to build your profile!</p>
          )}
          {profile?.history?.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <Link to={`/content/${item.content_id}`} className="font-medium text-gray-800 hover:text-blue-700 text-sm truncate block">
                  {item.title}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">{item.category} · {item.type}</p>
              </div>
              <div className="text-right text-xs text-gray-400 ml-4">
                {item.dwell_time > 0 && <p>{Math.round(item.dwell_time / 60)}m read</p>}
                <p>{new Date(item.time).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
