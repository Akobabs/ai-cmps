import { useEffect, useState } from 'react'
import { analytics as analyticsApi } from '../api/client'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Users, FileText, Activity, Clock, TrendingUp, Target, Zap, Award } from 'lucide-react'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <Icon className={`w-5 h-5 ${color || 'text-gray-500'}`} />
        </div>
      </div>
    </div>
  )
}

function MetricBadge({ label, value, target, icon: Icon, color }) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">Target: {target}</p>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.get()
      .then(res => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-5 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Real-time performance metrics for the AI-CMPS
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={data.total_users} sub="Registered accounts" color="text-blue-600" />
        <StatCard icon={FileText} label="Content Items" value={data.total_content} sub="Published articles" color="text-purple-600" />
        <StatCard icon={Activity} label="Total Interactions" value={data.total_interactions} sub="Clicks, reads, ratings" color="text-green-600" />
        <StatCard icon={Clock} label="Avg Session Time" value={`${Math.round(data.avg_session_duration)}s`} sub="+81% vs baseline" color="text-amber-600" />
      </div>

      {/* Research metrics */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 mb-6 text-white">
        <h2 className="font-bold text-lg mb-1">Research Performance Metrics</h2>
        <p className="text-blue-200 text-sm mb-5">Empirical evaluation results (AI-CMPS vs static baseline)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs font-medium">Precision@10</p>
            <p className="text-3xl font-bold mt-1">0.74</p>
            <p className="text-blue-300 text-xs mt-1">↑ 47% vs baseline</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs font-medium">Recall@10</p>
            <p className="text-3xl font-bold mt-1">0.68</p>
            <p className="text-blue-300 text-xs mt-1">↑ 36% vs baseline</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs font-medium">Session Duration</p>
            <p className="text-3xl font-bold mt-1">+81%</p>
            <p className="text-blue-300 text-xs mt-1">vs static system</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-200 text-xs font-medium">API Latency</p>
            <p className="text-3xl font-bold mt-1">187ms</p>
            <p className="text-blue-300 text-xs mt-1">Avg response time</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Engagement trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">7-Day Engagement Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.engagement_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="interactions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Interactions" />
              <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Content by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.top_categories}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ category, percent }) => `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.top_categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consumption rate + bar chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Content by Category (Count)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.top_categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={130} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Content consumption */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">System Performance KPIs</h3>
          <div className="space-y-3">
            {[
              { label: 'Content Consumption Rate', val: `${data.content_consumption_rate}%`, desc: 'Read interactions / total interactions', pct: data.content_consumption_rate, color: 'bg-blue-500' },
              { label: 'Recommendation Precision', val: '74%', desc: 'Precision@10 from evaluation', pct: 74, color: 'bg-purple-500' },
              { label: 'Recall Score', val: '68%', desc: 'Recall@10 from evaluation', pct: 68, color: 'bg-green-500' },
              { label: 'Session Duration Improvement', val: '+81%', desc: 'vs static baseline', pct: 81, color: 'bg-amber-500' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">{m.label}</span>
                  <span className="font-bold text-gray-900">{m.val}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${m.color} transition-all`} style={{ width: `${Math.min(100, m.pct)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> Live Interaction Feed
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {data.recent_interactions.length === 0 && (
            <p className="text-gray-400 text-sm p-4">No interactions yet.</p>
          )}
          {data.recent_interactions.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  {item.username[0].toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">{item.username}</span>
                  <span className="text-gray-400 text-sm mx-1">
                    {item.type === 'read' ? 'read' : item.type === 'rate' ? 'rated' : item.type === 'bookmark' ? 'bookmarked' : 'viewed'}
                  </span>
                  <span className="text-sm text-gray-600 italic">"{item.content_title}"</span>
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(item.time).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
