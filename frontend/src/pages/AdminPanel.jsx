import { useEffect, useState } from 'react'
import { content as contentApi } from '../api/client'
import { Plus, Trash2, Tag, Clock, Eye, Sparkles, AlertCircle, CheckCircle, Loader } from 'lucide-react'

const CATEGORIES = [
  'Artificial Intelligence', 'Web Development', 'Business & Entrepreneurship',
  'Health & Wellness', 'Finance & Investing', 'Education & Learning', 'General'
]

function NLPPreview({ tags, category, sentiment, readingTime }) {
  if (!tags) return null
  return (
    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
      <p className="font-semibold text-indigo-900 mb-2 flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" /> NLP Analysis Preview
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Auto Category:</span>
          <span className="ml-1 font-medium text-indigo-800">{category}</span>
        </div>
        <div>
          <span className="text-gray-500">Sentiment:</span>
          <span className={`ml-1 font-medium ${sentiment > 0.2 ? 'text-green-700' : sentiment < -0.1 ? 'text-red-700' : 'text-gray-700'}`}>
            {sentiment > 0.2 ? 'Positive' : sentiment < -0.1 ? 'Critical' : 'Neutral'} ({sentiment.toFixed(2)})
          </span>
        </div>
        <div>
          <span className="text-gray-500">Reading time:</span>
          <span className="ml-1 font-medium">{readingTime} min</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Auto-tags:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map(t => (
              <span key={t} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '', category: 'General', author: 'Admin' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [nlpPreview, setNlpPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const load = () => {
    setLoading(true)
    contentApi.list().then(r => setArticles(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Simulated client-side NLP preview (mirrors backend logic)
  const previewNLP = () => {
    if (!form.body || form.body.length < 50) return
    setAnalyzing(true)
    setTimeout(() => {
      const wordCount = form.body.split(/\s+/).length
      const readingTime = Math.max(1, Math.round(wordCount / 200))
      const words = form.body.toLowerCase().split(/\W+/)
      const positiveWords = ['excellent', 'great', 'good', 'best', 'amazing', 'powerful', 'improve', 'benefit', 'success', 'effective', 'innovative', 'advanced', 'robust', 'significant', 'enhance']
      const negativeWords = ['problem', 'issue', 'fail', 'poor', 'bad', 'difficult', 'challenge', 'risk', 'error', 'limitation', 'concern', 'danger']
      const pos = words.filter(w => positiveWords.includes(w)).length
      const neg = words.filter(w => negativeWords.includes(w)).length
      const sentiment = pos + neg > 0 ? (pos - neg) / (pos + neg) : 0

      const categoryKw = {
        'Artificial Intelligence': ['machine learning', 'neural', 'deep learning', 'ai', 'nlp', 'bert', 'model', 'algorithm', 'recommendation', 'transformer'],
        'Web Development': ['react', 'javascript', 'api', 'frontend', 'backend', 'css', 'database', 'web', 'programming', 'code'],
        'Business & Entrepreneurship': ['startup', 'business', 'marketing', 'customer', 'revenue', 'growth', 'product', 'market', 'strategy'],
        'Health & Wellness': ['health', 'wellness', 'fitness', 'mental', 'sleep', 'nutrition', 'exercise', 'mindfulness'],
        'Finance & Investing': ['finance', 'investing', 'money', 'stocks', 'portfolio', 'budget', 'savings', 'fund'],
        'Education & Learning': ['learning', 'education', 'study', 'student', 'knowledge', 'skill', 'course'],
      }
      const text = `${form.title} ${form.body}`.toLowerCase()
      let bestCat = 'General', bestScore = 0
      Object.entries(categoryKw).forEach(([cat, kws]) => {
        const score = kws.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0)
        if (score > bestScore) { bestScore = score; bestCat = cat }
      })

      // Extract keywords
      const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'this', 'that', 'it', 'with', 'from', 'as', 'by', 'be', 'been', 'have', 'has'])
      const freq = {}
      words.filter(w => w.length > 3 && !stopWords.has(w)).forEach(w => freq[w] = (freq[w] || 0) + 1)
      const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w)

      setNlpPreview({ tags, category: bestCat, sentiment: parseFloat(sentiment.toFixed(3)), readingTime })
      setAnalyzing(false)
    }, 600)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.body) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await contentApi.create(form)
      setSuccess('Article published! NLP tagging and TF-IDF vectorization complete.')
      setForm({ title: '', body: '', category: 'General', author: 'Admin' })
      setNlpPreview(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this article?')) return
    await contentApi.delete(id)
    load()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Management Panel</h1>
        <p className="text-gray-500 text-sm mt-1">
          Add content — the NLP module automatically extracts tags, classifies category, and generates TF-IDF embeddings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Publish New Content
            </h2>

            {success && (
              <div className="flex items-start gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {success}
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="Article title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (or auto-detect)</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="General">Auto-detect from content</option>
                  {CATEGORIES.filter(c => c !== 'General').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Body *</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                  rows={8}
                  placeholder="Write your article content here..."
                  required
                />
              </div>

              {/* NLP Preview button */}
              <button
                type="button"
                onClick={previewNLP}
                disabled={analyzing || form.body.length < 50}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                {analyzing ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Preview NLP Analysis'}
              </button>

              {nlpPreview && (
                <NLPPreview
                  tags={nlpPreview.tags}
                  category={nlpPreview.category}
                  sentiment={nlpPreview.sentiment}
                  readingTime={nlpPreview.readingTime}
                />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Publishing...</> : <><Plus className="w-4 h-4" /> Publish Article</>}
              </button>
            </form>
          </div>
        </div>

        {/* Article list */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Content Library</h2>
              <span className="text-sm text-gray-400">{articles.length} articles</span>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {articles.map(a => (
                  <div key={a.id} className="p-4 flex items-start gap-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{a.title}</p>
                      <p className="text-xs text-blue-600 mt-0.5">{a.category}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.reading_time}m</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.view_count}</span>
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{a.tags?.slice(0, 3).join(', ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
