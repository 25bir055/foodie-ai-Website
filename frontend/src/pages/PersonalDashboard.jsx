import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { Droplets, Flame, Beef, Candy, TrendingUp, Target, Calendar } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import HealthScoreRing from '../components/HealthScoreRing.jsx'
import { WEEKLY_NUTRITION, MACROS_TODAY } from '../data/mockData'
import { useApp } from '../store.jsx'

const WATER_DATA = [
  { time: '8am', ml: 250 }, { time: '10am', ml: 200 }, { time: '12pm', ml: 350 },
  { time: '2pm', ml: 150 }, { time: '4pm', ml: 300 }, { time: '6pm', ml: 200 }, { time: '8pm', ml: 150 }
]

function StatCard({ icon: Icon, label, value, goal, color, progress }) {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20`, color }}>
          <Icon size={19} />
        </div>
        <span className="text-[11px] font-semibold text-ink/40 dark:text-white/35 uppercase tracking-wide">{label}</span>
      </div>
      <p className="data-num text-2xl font-bold text-ink dark:text-white leading-none">{value}</p>
      <p className="text-[11px] text-ink/40 dark:text-white/35 mt-1">{goal}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-moss-50 dark:bg-white/5 overflow-hidden">
          <div className="h-full rounded-full progress-animated" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-[#1A2E22] border border-moss-100 dark:border-white/10 rounded-xl p-3 shadow-soft text-xs">
      <p className="font-semibold text-ink dark:text-white mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-ink/60 dark:text-white/50" style={{ color: entry.color }}>
          {entry.name}: {entry.value}{entry.name === 'score' ? '' : ' kcal'}
        </p>
      ))}
    </div>
  )
}

export default function PersonalDashboard() {
  const { profile } = useApp()

  return (
    <AppShell title="My Nutrition Dashboard">
      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger-children fade-in-up">
        <StatCard icon={Flame}    label="Calories"       value="1,840" goal={`of ${profile.calorieGoal} kcal goal`}  color="#E3A23D" progress={(1840/profile.calorieGoal)*100} />
        <StatCard icon={Beef}     label="Protein"        value="62g"   goal="of 90g target"                          color="#4CAE7A" progress={(62/90)*100} />
        <StatCard icon={Candy}    label="Sugar"          value="38g"   goal="of 50g daily limit"                     color="#D9534F" progress={(38/50)*100} />
        <StatCard icon={Droplets} label="Water"          value="1.6L"  goal="of 2.5L target"                        color="#3E7CB1" progress={(1.6/2.5)*100} />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Weekly score area chart */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-6 fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-medium text-ink dark:text-white flex items-center gap-2">
                <TrendingUp size={17} className="text-leaf" /> Weekly Health Score
              </h2>
              <p className="text-xs text-ink/40 dark:text-white/40 mt-0.5">Based on scanned products and logged meals</p>
            </div>
            <div className="text-right">
              <p className="data-num text-2xl font-bold text-leaf-dark dark:text-leaf-light">74</p>
              <p className="text-[11px] text-ink/40 dark:text-white/35">avg this week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={WEEKLY_NUTRITION}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4CAE7A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4CAE7A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#2C7C51" strokeWidth={2.5} fill="url(#scoreFill)" dot={{ fill: '#2C7C51', r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Score ring */}
        <div className="glass-panel p-5 sm:p-6 flex flex-col items-center justify-center gap-4 fade-in-up">
          <HealthScoreRing score={74} size={140} />
          <div className="text-center">
            <p className="text-sm font-semibold text-ink dark:text-white/90">Week of Aug 7–13</p>
            <p className="text-xs text-ink/50 dark:text-white/40 mt-1 leading-relaxed">Trending up from last week's average of 68. Keep it up!</p>
          </div>
          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-mint-tint dark:bg-white/5 rounded-xl p-2">
              <p className="data-num font-bold text-leaf-dark dark:text-leaf-light">+6</p>
              <p className="text-ink/40 dark:text-white/35">pts vs last week</p>
            </div>
            <div className="bg-mint-tint dark:bg-white/5 rounded-xl p-2">
              <p className="data-num font-bold text-moss-700 dark:text-white">5</p>
              <p className="text-ink/40 dark:text-white/35">days tracked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Calories vs target bar */}
        <div className="glass-panel p-5 sm:p-6 fade-in-up">
          <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-1 flex items-center gap-2">
            <Target size={17} className="text-leaf" /> Calories vs Target
          </h2>
          <p className="text-xs text-ink/40 dark:text-white/40 mb-4">This week</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY_NUTRITION} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calories" fill="#173C2C" radius={[6,6,0,0]} name="calories" />
              <Bar dataKey="target"   fill="#D2E6DA" radius={[6,6,0,0]} name="target"   />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Nutrition progress */}
        <div className="glass-panel p-5 sm:p-6 fade-in-up">
          <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-1 flex items-center gap-2">
            <Calendar size={17} className="text-leaf" /> Today's Nutrition
          </h2>
          <p className="text-xs text-ink/40 dark:text-white/40 mb-4">Progress toward daily goals</p>
          <div className="flex flex-col gap-4">
            {MACROS_TODAY.map((m) => (
              <div key={m.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-semibold text-ink/70 dark:text-white/60">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="data-num text-ink/40 dark:text-white/40 text-xs">{m.value}{m.unit} / {m.goal}{m.unit}</span>
                    <span className="data-num text-xs font-bold" style={{ color: m.color }}>
                      {Math.round((m.value / m.goal) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-moss-50 dark:bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full progress-animated"
                    style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Water intake bar */}
      <div className="glass-panel p-5 sm:p-6 fade-in-up">
        <h2 className="font-display text-lg font-medium text-ink dark:text-white mb-1 flex items-center gap-2">
          <Droplets size={17} className="text-[#3E7CB1]" /> Water Intake Today
        </h2>
        <p className="text-xs text-ink/40 dark:text-white/40 mb-4">1,600 ml of 2,500 ml goal</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={WATER_DATA}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#7A8C82' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E1EEE5', fontSize: 12 }} formatter={(v) => [`${v} ml`, 'Water']} />
            <Bar dataKey="ml" fill="#3E7CB1" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppShell>
  )
}
