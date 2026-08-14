import React, { useState, useEffect } from 'react'
import {
  Package, ScanBarcode, TrendingUp, Pencil, Trash2, Plus,
  BarChart2, PieChart as PieIcon, Search, X, Users
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import AppShell from '../components/AppShell.jsx'
import { ADMIN_STATS, PRODUCTS as FALLBACK_PRODUCTS, scoreLabel } from '../data/mockData'
import {
  fetchAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../services/api'
const TABS = ['Overview', 'Products']
const PIE_COLORS = ['#173C2C', '#2C7C51', '#4CAE7A', '#7FCB9F', '#E3A23D', '#D9534F']

function Stat({ icon: Icon, label, value, sub, color = '#4CAE7A' }) {
  return (
    <div className="glass-panel p-5 flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18`, color }}>
        <Icon size={19} />
      </div>
      <div>
        <p className="data-num text-2xl font-bold text-ink dark:text-white leading-none">{value}</p>
        <p className="text-xs font-semibold text-ink/40 dark:text-white/35 mt-1 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-[11px] text-ink/30 dark:text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('Overview')
  const [productSearch, setProductSearch] = useState('')
  const [productsList, setProductsList] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null) // null if adding
  const [formData, setFormData] = useState({
    name: '', brand: '', category: 'Snacks & Biscuits', price: 50, healthScore: 70,
    barcode: '', image: '🥣', calories: 200, protein: 5, sugar: 5, fat: 5, fiber: 2, sodium: 100,
    servingSize: '100 g', insight: ''
  })

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const data = await fetchAllProducts()
      if (data && data.length > 0) {
        setProductsList(data)
      } else {
        setProductsList(FALLBACK_PRODUCTS)
      }
    } catch (e) {
      setProductsList(FALLBACK_PRODUCTS)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenAdd = () => {
    setEditProduct(null)
    setFormData({
      name: '', brand: '', category: 'Snacks & Biscuits', price: 50, healthScore: 70,
      barcode: String(Math.floor(1000000000000 + Math.random() * 9000000000000)),
      image: '🥣', calories: 200, protein: 5, sugar: 5, fat: 5, fiber: 2, sodium: 100,
      servingSize: '100 g', insight: 'Good balance of ingredients.'
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditProduct(p)
    setFormData({
      name: p.name || '',
      brand: p.brand || '',
      category: p.category || 'Snacks & Biscuits',
      price: p.price || 0,
      healthScore: p.healthScore || 50,
      barcode: p.barcode || '',
      image: p.image || '🥣',
      calories: p.calories || 0,
      protein: p.protein || 0,
      sugar: p.sugar || 0,
      fat: p.fat || 0,
      fiber: p.fiber || 0,
      sodium: p.sodium || 0,
      servingSize: p.servingSize || '100 g',
      insight: p.insight || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id)
        setProductsList((prev) => prev.filter((p) => (p.id !== id && p.firestoreId !== id)))
      } catch (err) {
        alert('Failed to delete product from Firestore.')
      }
    }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    try {
      if (editProduct) {
        const id = editProduct.firestoreId || editProduct.id
        await updateProduct(id, formData)
        setProductsList((prev) =>
          prev.map((p) => (p.firestoreId === id || p.id === id ? { ...p, ...formData } : p))
        )
      } else {
        const created = await createProduct({
          ...formData,
          ingredients: ['Natural ingredients'],
          allergens: [],
          concerningIngredients: [],
          tags: ['Scanned', 'New']
        })
        setProductsList((prev) => [created, ...prev])
      }
      setModalOpen(false)
    } catch (err) {
      alert('Error saving product to Firestore.')
    }
  }
  const filteredProducts = productsList.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand?.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <AppShell title="Admin Dashboard">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-moss-50 dark:bg-white/5 rounded-xl mb-6 max-w-sm fade-in-up">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
              tab === t
                ? 'bg-white dark:bg-white/10 text-ink dark:text-white shadow-sm'
                : 'text-ink/50 dark:text-white/40 hover:text-ink/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────── */}
      {tab === 'Overview' && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger-children">
            <Stat icon={Users}      label="Total Users"     value={ADMIN_STATS.totalUsers.toLocaleString()} sub="+247 this month" color="#4CAE7A" />
            <Stat icon={Package}    label="Total Products"  value={productsList.length.toLocaleString()} sub="in database" color="#3E7CB1" />
            <Stat icon={ScanBarcode} label="Total Scans"    value={ADMIN_STATS.totalScans.toLocaleString()} sub="all time" color="#E3A23D" />
            <Stat icon={TrendingUp} label="Avg Health Score" value={`${ADMIN_STATS.avgHealthScore}/100`} sub="across all products" color="#2C7C51" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* Scans by day */}
            <div className="glass-panel p-5 sm:p-6">
              <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-1 flex items-center gap-2">
                <BarChart2 size={17} className="text-leaf" /> Scans This Week
              </h2>
              <p className="text-xs text-ink/40 dark:text-white/40 mb-4">Daily scan activity</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ADMIN_STATS.scansByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E1EEE5', fontSize: 12 }} />
                  <Bar dataKey="scans" fill="#2C7C51" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown pie */}
            <div className="glass-panel p-5 sm:p-6">
              <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-1 flex items-center gap-2">
                <PieIcon size={17} className="text-leaf" /> Category Breakdown
              </h2>
              <p className="text-xs text-ink/40 dark:text-white/40 mb-4">Scans by product category</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={ADMIN_STATS.categoryBreakdown}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                  >
                    {ADMIN_STATS.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E1EEE5', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── PRODUCTS ───────────────────────────────────────── */}
      {tab === 'Products' && (
        <div className="glass-panel overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-moss-100/70 dark:border-white/10">
            <div className="flex items-center gap-2 bg-mint-tint dark:bg-white/5 rounded-xl px-3.5 py-2 flex-1 max-w-xs">
              <Search size={15} className="text-ink/30" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="bg-transparent outline-none text-sm flex-1 text-ink dark:text-white"
              />
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-moss-700 hover:bg-moss-600 text-white text-sm font-semibold px-4 py-2 rounded-xl focus-ring transition-colors"
            >
              <Plus size={15} /> Add Product
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-ink/40 dark:text-white/40 border-b border-moss-100/70 dark:border-white/8">
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">Score</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const { label, color, bg } = scoreLabel(p.healthScore || 50)
                  const targetId = p.firestoreId || p.id
                  return (
                    <tr key={targetId} className="border-b border-moss-50 dark:border-white/5 last:border-0 hover:bg-mint-tint/50 dark:hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.image || '🥣'}</span>
                          <div>
                            <p className="font-semibold text-ink dark:text-white/90">{p.name}</p>
                            <p className="text-[11px] text-ink/40 dark:text-white/35">{p.brand} · {p.barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink/60 dark:text-white/50">{p.category}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: bg }}>
                          {p.healthScore} · {label}
                        </span>
                      </td>
                      <td className="px-5 py-3 data-num font-semibold text-ink/70 dark:text-white/60">₹{p.price}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-ink/40 hover:text-moss-700 dark:hover:text-leaf-light focus-ring rounded-lg transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(targetId)} className="p-1.5 text-ink/40 hover:text-clay focus-ring rounded-lg transition-colors"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
