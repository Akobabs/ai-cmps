import { Link } from 'react-router-dom'
import { Clock, Eye, Star, Tag, Zap, Users, BookOpen } from 'lucide-react'

const CATEGORY_COLORS = {
  'Artificial Intelligence': 'bg-purple-100 text-purple-800',
  'Web Development': 'bg-blue-100 text-blue-800',
  'Business & Entrepreneurship': 'bg-green-100 text-green-800',
  'Health & Wellness': 'bg-rose-100 text-rose-800',
  'Finance & Investing': 'bg-amber-100 text-amber-800',
  'Education & Learning': 'bg-cyan-100 text-cyan-800',
  'General': 'bg-gray-100 text-gray-800',
}

function AlphaBadge({ alpha }) {
  if (alpha === undefined) return null
  const isContentBased = alpha > 0.7
  const isHybrid = alpha > 0.3 && alpha <= 0.7
  if (isContentBased) {
    return (
      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
        <BookOpen className="w-3 h-3" /> Content-Based
      </span>
    )
  } else if (isHybrid) {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
        <Zap className="w-3 h-3" /> Hybrid
      </span>
    )
  } else {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
        <Users className="w-3 h-3" /> Collaborative
      </span>
    )
  }
}

export default function ContentCard({ content, score, reason, alpha }) {
  const categoryColor = CATEGORY_COLORS[content.category] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Score bar */}
      {score !== undefined && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            style={{ width: `${Math.max(10, Math.min(100, score * 100))}%` }}
          />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColor}`}>
            {content.category}
          </span>
          {alpha !== undefined && <AlphaBadge alpha={alpha} />}
        </div>

        {/* Title */}
        <Link to={`/content/${content.id}`}>
          <h3 className="font-semibold text-gray-900 text-lg leading-snug mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
            {content.title}
          </h3>
        </Link>

        {/* Summary */}
        <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2">
          {content.summary || content.body?.slice(0, 120) + '...'}
        </p>

        {/* Reason */}
        {reason && (
          <p className="text-xs text-indigo-600 font-medium mb-3 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {reason}
          </p>
        )}

        {/* Tags */}
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {content.reading_time}m read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {content.view_count}
            </span>
            {content.avg_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                {content.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
          {score !== undefined && (
            <span className="text-indigo-500 font-medium">
              {(score * 100).toFixed(0)}% match
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
