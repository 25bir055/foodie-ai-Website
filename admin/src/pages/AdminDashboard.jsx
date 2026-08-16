import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Package, ScanBarcode, TrendingUp,
  LogOut, Leaf, RefreshCw, Loader2,
  Clock, ShieldCheck, BarChart2, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return '—' }
}

function scoreColor(score) {
  if (score >= 75) return '#2C7C51'
  if (score >= 50) return '#E3A23D'
  return '#D9534F'
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#2C7C51', loading }) {
  return (
    <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={22} />
      </div>
      <div>
        {loading
          ? <div style={{ width: 60, height: 28, background: 'rgba(23,60,44,0.08)', borderRadius: 8, marginBottom: 6 }} />
          : <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>{value}</p>}
        <p style={{ fontSize: 11, fontWeight: 600, color: '#7A8C82', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#A8BDB5', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const u = localStorage.getItem('foodie_admin_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch all stats from backend MongoDB
  const fetchStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('foodie_admin_token')
      const res = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!res.ok) {
        throw new Error('Failed to fetch statistics from backend')
      }

      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load statistics. Ensure the backend server is running.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleLogout = () => {
    localStorage.removeItem('foodie_admin_token')
    localStorage.removeItem('foodie_admin_user')
    navigate('/admin-login', { replace: true })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Nav ─────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(23,60,44,0.08)',
        padding: '0 32px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#173C2C',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Leaf size={18} color="#4CAE7A" />
          </div>
          <div>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 16, color: '#173C2C' }}>Foodie AI</p>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7A8C82' }}>MongoDB Admin</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(23,60,44,0.06)', border: '1px solid rgba(23,60,44,0.1)',
              borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#173C2C'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #173C2C, #2C7C51)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>
              {adminUser?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#173C2C' }}>
                {adminUser?.displayName || adminUser?.email?.split('@')[0] || 'Admin'}
              </p>
              <p style={{ fontSize: 11, color: '#7A8C82', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={10} /> Administrator
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'rgba(217,83,79,0.08)', border: '1px solid rgba(217,83,79,0.15)',
              borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--clay)'
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(217,83,79,0.08)', border: '1px solid rgba(217,83,79,0.2)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            color: 'var(--clay)', fontSize: 13
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
            <button
              onClick={() => fetchStats()}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clay)', fontWeight: 600, fontSize: 13 }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1.6rem', fontWeight: 700, color: '#173C2C' }}>
            Dashboard Overview
          </h1>
          <p style={{ fontSize: 13, color: '#7A8C82', marginTop: 4 }}>
            Live data from MongoDB Database
          </p>
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: 'rgba(23,60,44,0.04)', padding: 6, borderRadius: 14, width: 'fit-content' }}>
          {[
            { id: 'overview', icon: BarChart2, label: 'Overview' },
            { id: 'scans', icon: ScanBarcode, label: 'Recent Scans' },
            { id: 'products', icon: Package, label: 'Recent Products' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#173C2C' : '#7A8C82',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(23,60,44,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="fade-up">
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard icon={Users} label="Total Users" value={stats?.totalUsers?.toLocaleString() ?? '—'} sub="Registered accounts" color="#2C7C51" loading={loading} />
              <StatCard icon={Package} label="Total Products" value={stats?.totalProducts?.toLocaleString() ?? '—'} sub="In MongoDB database" color="#3E7CB1" loading={loading} />
              <StatCard icon={ScanBarcode} label="Total Scans" value={stats?.totalScans?.toLocaleString() ?? '—'} sub="Successful scan records" color="#E3A23D" loading={loading} />
              <StatCard icon={TrendingUp} label="Avg Health Score" value={stats ? `${stats.avgHealthScore}/100` : '—'} sub="Across all scored products" color="#8B5CF6" loading={loading} />
            </div>

            {/* Category Bar Chart */}
            {!loading && stats?.categoryData?.length > 0 && (
              <div className="card" style={{ padding: '24px', marginBottom: 28 }}>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1rem', fontWeight: 700, marginBottom: 4, color: '#173C2C', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={17} color="#2C7C51" /> Product Categories
                </h2>
                <p style={{ fontSize: 12, color: '#7A8C82', marginBottom: 20 }}>Top categories in the products database</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.categoryData} margin={{ top: 5, right: 5, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(23,60,44,0.06)" />
                    <XAxis dataKey="cat" tick={{ fontSize: 11, fill: '#7A8C82' }} angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(23,60,44,0.1)', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#2C7C51" radius={[6, 6, 0, 0]} name="Products" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: '#7A8C82' }}>
                <Loader2 size={24} className="spin" />
                <span style={{ fontSize: 14 }}>Loading statistics from MongoDB…</span>
              </div>
            )}
          </div>
        )}

        {/* ── RECENT SCANS TAB ──────────────────────────────── */}
        {activeTab === 'scans' && (
          <div className="fade-up card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(23,60,44,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScanBarcode size={18} color="#2C7C51" />
              <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: '1rem', color: '#173C2C' }}>
                Recent Scans
              </h2>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7A8C82' }}>
                {stats?.totalScans ?? 0} total scans
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: '#7A8C82' }}>
                <Loader2 size={20} className="spin" /> Loading scans…
              </div>
            ) : !stats?.recentScans?.length ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#7A8C82' }}>
                <ScanBarcode size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No scans yet. Scans are recorded when users view product details.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7A8C82' }}>
                      <th>Product Name</th>
                      <th>Barcode</th>
                      <th>Health Score</th>
                      <th>User ID</th>
                      <th style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentScans.map(scan => (
                      <tr key={scan.id || scan._id} style={{ fontSize: 13 }}>
                        <td style={{ fontWeight: 600, color: '#173C2C' }}>
                          {scan.productName || '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#7A8C82' }}>
                          {scan.barcode || '—'}
                        </td>
                        <td>
                          {scan.healthScore !== null && scan.healthScore !== undefined ? (
                            <span style={{
                              display: 'inline-block', padding: '2px 10px',
                              borderRadius: 99, fontSize: 12, fontWeight: 600,
                              background: `${scoreColor(scan.healthScore)}18`,
                              color: scoreColor(scan.healthScore)
                            }}>
                              {scan.healthScore}/100
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#A8BDB5', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scan.userId || '—'}
                        </td>
                        <td style={{ fontSize: 12, color: '#7A8C82' }}>
                          {formatTimestamp(scan.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── RECENT PRODUCTS TAB ───────────────────────────── */}
        {activeTab === 'products' && (
          <div className="fade-up card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(23,60,44,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} color="#2C7C51" />
              <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: '1rem', color: '#173C2C' }}>
                Recent Products
              </h2>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7A8C82' }}>
                {stats?.totalProducts ?? 0} total products
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: '#7A8C82' }}>
                <Loader2 size={20} className="spin" /> Loading products…
              </div>
            ) : !stats?.recentProducts?.length ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#7A8C82' }}>
                <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No products found. Run the seed script to import your CSV dataset into MongoDB.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7A8C82' }}>
                      <th>Product</th>
                      <th>Barcode</th>
                      <th>Category</th>
                      <th>Health Score</th>
                      <th>Nutri-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentProducts.map((p, i) => {
                      const hs = p.healthScore
                      const ng = (p.nutriscore_grade || p.nutriScore || '').toUpperCase()
                      return (
                        <tr key={p.id || p._id || i} style={{ fontSize: 13 }}>
                          <td>
                            <div>
                              <p style={{ fontWeight: 600, color: '#173C2C' }}>{p.name || p.product_name || '—'}</p>
                              <p style={{ fontSize: 11, color: '#7A8C82', marginTop: 2 }}>{p.brand || p.brands || ''}</p>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#7A8C82' }}>
                            {p.barcode || '—'}
                          </td>
                          <td style={{ fontSize: 12, color: '#7A8C82', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(p.category || p.categories || '—').split(',')[0].trim()}
                          </td>
                          <td>
                            {hs !== null && hs !== undefined ? (
                              <span style={{
                                display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                                fontSize: 12, fontWeight: 600,
                                background: `${scoreColor(hs)}18`, color: scoreColor(hs)
                              }}>
                                {hs}/100
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            {ng ? (
                              <span style={{
                                display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                                fontSize: 12, fontWeight: 700,
                                background: '#173C2C', color: '#fff'
                              }}>
                                {ng}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
