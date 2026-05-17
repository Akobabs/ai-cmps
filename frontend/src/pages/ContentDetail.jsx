import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { content as contentApi, interactions as interactionsApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Eye, Star, Tag, ArrowLeft, Bookmark, ThumbsUp } from 'lucide-react'

const CATEGORY_COLORS = {
  'Artificial Intelligence': 'bg-purple-100 text-purple-800 border-purple-200',
  'Web Development': 'bg-blue-100 text-blue-800 border-blue-200',
  'Business & Entrepreneurship': 'bg-green-100 text-green-800 border-green-200',
  'Health & Wellness': 'bg-rose-100 text-rose-800 border-rose-200',
  'Finance & Investing': 'bg-amber-100 text-amber-800 border-amber-200',
  'Education & Learning': 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

export default function ContentDetail() {
  const { id } = useParams()
  const { user, refreshUser } = useAuth()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [interactionLogged, setInteractionLogged] = useState(false)
  const startTimeRef = useRef(Date.now())
  const navigate = useNavigate()

  useEffect(() => {
    startTimeRef.current = Date.now()
    contentApi.get(id)
      .then(res => setArticle(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))

    // Log view interaction on load
    interactionsApi.log({ content_id: parseInt(id), interaction_type: 'view', dwell_time: 0, scroll_depth: 0 })
      .catch(() => {})

    return () => {
      // Log read interaction with dwell time on unmount
      const dwell = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (dwell > 5 && !interactionLogged) {
        interactionsApi.log({
          content_id: parseInt(id),
          interaction_type: 'read',
          dwell_time: dwell,
          scroll_depth: 0.8,
        }).then(() => refreshUser()).catch(() => {})
      }
    }
  }, [id])

  const submitRating = async (r) => {
    if (ratingSubmitted) return
    setRating(r)
    try {
      await interactionsApi.log({ content_id: parseInt(id), interaction_type: 'rate', dwell_time: 0, scroll_depth: 0, rating: r })
      setRatingSubmitted(true)
      await refreshUser()
      // Refresh article to show updated avg rating
      const res = await contentApi.get(id)
      setArticle(res.data)
    } catch (e) {}
  }

  const handleBookmark = async () => {
    if (bookmarked) return
    try {
      await interactionsApi.log({ content_id: parseInt(id), interaction_type: 'bookmark', dwell_time: 0, scroll_depth: 0 })
      setBookmarked(true)
      await refreshUser()
    } catch (e) {}
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
        </div>
      </div>
    )
  }

  if (!article) return null

  const catColor = CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-800 border-gray-200'
  const bodyParagraphs = article.body.split('\n\n').filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      {/* Article header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-sm font-medium px-3 py-1 rounded-full border ${catColor}`}>
            {article.category}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" /> {article.reading_time} min read
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Eye className="w-4 h-4" /> {article.view_count} views
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">{article.title}</h1>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-gray-500">
            By <span className="font-medium text-gray-700">{article.author}</span> ·{' '}
            {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {article.tags?.slice(0, 5).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200 mb-8" />

      {/* Body */}
      <article className="text-gray-700 text-base leading-relaxed space-y-5">
        {bodyParagraphs.map((para, i) => (
          <p key={i}>{para.trim()}</p>
        ))}
      </article>

      {/* Interaction bar */}
      <div className="mt-10 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-blue-600" />
            Your feedback trains your personalization profile
          </p>

          <div className="flex flex-wrap items-center gap-6">
            {/* Star rating */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Rate this article</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => submitRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={ratingSubmitted}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        s <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {ratingSubmitted && (
                  <span className="ml-2 text-xs text-green-600 font-medium">Saved!</span>
                )}
              </div>
            </div>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookmarked
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-white' : ''}`} />
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>

            {/* Current avg */}
            {article.rating_count > 0 && (
              <div className="text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <strong>{article.avg_rating.toFixed(1)}</strong>
                  <span>({article.rating_count} ratings)</span>
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Reading time tracked automatically · Interaction strength updates your profile in real-time
          </p>
        </div>
      </div>
    </div>
  )
}
