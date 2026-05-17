import { useEffect, useState } from 'react'
import { recommendations as recApi, content as contentApi } from '../api/client'
import ContentCard from '../components/ContentCard'
import { useAuth } from '../contexts/AuthContext'
import { Zap, Users, BookOpen, RefreshCw, Filter, Sparkles, Clock } from 'lucide-react'

function AlphaIndicator({ alpha, interactionCount }) {
  const pct = Math.round((1 - alpha) * 100)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">Personalization Engine Status</span>
        </div>
        <span className="text-xs text-gray-500">{interactionCount} interactions logged</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-orange-600 font-medium w-28">Content-Based</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-orange-400 via-blue-500 to-green-500"
            style={{ width: '100%' }}
          />
          <div
            className="absolute top-0 right-0 h-3 bg-gray-100 transition-all duration-700"
            style={{ width: `${alpha * 100}%` }}
          />
        </div>
        <span className="text-xs text-green-600 font-medium w-28 text-right">Collaborative</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>α = {alpha?.toFixed(2)} (cold start range)</span>
        <span>
          {alpha > 0.7
            ? 'Pure content-based (new user)'
            : alpha > 0.3
            ? `Hybrid blend (${pct}% collaborative)`
            : 'Mostly collaborative filtering'
          }
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [recs, setRecs] = useState([])
  const [alpha, setAlpha] = useState(1.0)
  const [latency, setLatency] = useState(null)
  const [interactionCount, setInteractionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allContent, setAllContent] = useState([])
  const [activeFilter, setActiveFilter] = useState('recommended')
  const [categories, setCategories] = useState([])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const res = await recApi.get(12)
      setRecs(res.data.recommendations)
      setAlpha(res.data.alpha)
      setLatency(res.data.latency_ms)
      setInteractionCount(res.data.user_interaction_count)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadAll = async (category) => {
    setLoading(true)
    try {
      const params = category && category !== 'all' ? { category } : {}
      const res = await contentApi.list(params)
      setAllContent(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
    contentApi.categories().then(r => setCategories(r.data)).catch(() => {})
  }, [])

  const handleFilterChange = (f) => {
    setActiveFilter(f)
    if (f === 'recommended') {
      loadRecommendations()
    } else {
      loadAll(f === 'all' ? null : f)
    }
  }

  const displayItems = activeFilter === 'recommended' ? recs : allContent.map(c => ({ content: c }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-blue-700">{user?.username}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Your AI-curated content feed — personalized in real-time
          </p>
        </div>
        <button
          onClick={loadRecommendations}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Alpha indicator */}
      <AlphaIndicator alpha={alpha} interactionCount={interactionCount} />

      {/* Latency badge */}
      {latency && (
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> API latency: <strong className="text-green-600">{latency}ms</strong>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" /> {recs.length} recommendations generated
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => handleFilterChange('recommended')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'recommended'
              ? 'bg-blue-700 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> For You
        </button>
        <button
          onClick={() => handleFilterChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-blue-700 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
          }`}
        >
          All Content
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleFilterChange(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === cat
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {cat.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse">
              <div className="h-1 bg-gray-200 rounded-full" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No content available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayItems.map((item, idx) => (
            <ContentCard
              key={item.content?.id || idx}
              content={item.content}
              score={item.score}
              reason={item.reason}
              alpha={item.alpha}
            />
          ))}
        </div>
      )}
    </div>
  )
}
