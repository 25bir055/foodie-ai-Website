import React from 'react'
import { ScanBarcode, Brain, Sparkles, Database, Leaf, ArrowRight, CheckCircle2 } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'

const SECTIONS = [
  {
    icon: ScanBarcode,
    title: 'How barcode scanning works',
    color: '#2C7C51',
    bg: '#EAF3EE',
    steps: [
      'Point your camera at any packaged food barcode',
      'Foodie AI reads the code instantly using the device camera',
      'The barcode is matched against a database of hundreds of thousands of products',
      'Manual entry is always available as a fallback'
    ],
    body: 'Foodie AI reads the barcode instantly and matches it against a product database covering hundreds of thousands of packaged foods — no typing required.'
  },
  {
    icon: Database,
    title: 'How nutrition analysis works',
    color: '#3E7CB1',
    bg: '#E8F0F8',
    steps: [
      'Full nutrition panel is retrieved from Open Food Facts',
      'Ingredient list is parsed and additives are flagged',
      'Allergens are automatically detected and highlighted',
      'Data is compared against WHO daily-value guidelines'
    ],
    body: 'Once a product is identified, we pull its nutrition panel, full ingredient list, and additive data, then check it against allergen categories and standard daily-value guidelines.'
  },
  {
    icon: Brain,
    title: 'How the health score works',
    color: '#E3A23D',
    bg: '#FBF3E4',
    steps: [
      'Sugar, sodium and saturated fat are penalised',
      'Protein, fibre and micronutrient density add points',
      'Additive load and ingredient quality are factored in',
      'Score is normalised to 0–100 (higher is better)'
    ],
    body: 'Every product gets a 0–100 score weighing sugar, sodium, saturated fat, fibre, protein and additive content against public health guidelines.'
  },
  {
    icon: Sparkles,
    title: 'How AI recommendations work',
    color: '#7C3CBF',
    bg: '#F0E8F8',
    steps: [
      'Foodie AI reads the full product nutritional profile',
      'Your personal goals and dietary preferences are applied',
      'Key health positives and concerns are explained plainly',
      'Better alternatives in the same category are suggested'
    ],
    body: 'Foodie AI reads the product\'s full profile — and your nutrition goals — to explain what matters most about it in plain language, and to suggest genuinely better alternatives.'
  }
]

const TEAM_FEATURES = [
  { icon: '🔒', title: 'Privacy First',     desc: 'Your scan history and profile data stay on your device.' },
  { icon: '⚡', title: 'Instant Results',   desc: 'Product data loads in under 2 seconds on any connection.' },
  { icon: '🌍', title: 'Open Data',         desc: 'Powered by Open Food Facts — the Wikipedia of food.' },
  { icon: '🤖', title: 'AI-Powered',        desc: 'Google Gemini AI explains nutrition in plain language.' },
  { icon: '📱', title: 'Works Everywhere',  desc: 'Responsive design works on phones, tablets and desktops.' },
  { icon: '🌙', title: 'Dark Mode',         desc: 'Easy on the eyes with full dark mode support.' }
]

export default function About() {
  return (
    <AppShell title="About Foodie AI">
      {/* Hero */}
      <div className="glass-panel p-7 sm:p-10 text-center relative overflow-hidden mb-8 fade-in-up">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="barcode-rule h-full w-full" style={{ backgroundSize: '8px 100%' }} />
        </div>
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-leaf/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="h-14 w-14 rounded-xl2 bg-moss-700 flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Leaf size={26} className="text-leaf-light" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink dark:text-white">Foodie AI</h1>
          <p className="text-ink/50 dark:text-white/40 mt-1 font-semibold text-sm uppercase tracking-widest">Smart Food Product Scanner</p>
          <p className="text-sm text-ink/60 dark:text-white/50 mt-5 leading-relaxed max-w-xl mx-auto">
            Foodie AI helps you understand packaged food the moment you pick it up. Scan a barcode and get an instant, plain-language read on the nutrition, ingredients, allergens and healthier alternatives — so the decision gets made in the aisle, not after you're home.
          </p>
        </div>
      </div>

      {/* How it works */}
      <h2 className="font-display text-xl font-medium text-ink dark:text-white mb-4">How it works</h2>
      <div className="flex flex-col gap-4 mb-8 stagger-children">
        {SECTIONS.map(({ icon: Icon, title, body, steps, color, bg }) => (
          <div key={title} className="glass-panel p-5 sm:p-6 fade-in-up">
            <div className="flex gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg, color }}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-ink dark:text-white">{title}</h3>
                <p className="text-sm text-ink/50 dark:text-white/40 mt-1 leading-relaxed">{body}</p>
                <div className="mt-4 grid sm:grid-cols-2 gap-2">
                  {steps.map((step) => (
                    <div key={step} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color }} />
                      <span className="text-xs text-ink/60 dark:text-white/50 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <h2 className="font-display text-xl font-medium text-ink dark:text-white mb-4">Why Foodie AI</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {TEAM_FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="glass-panel p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-sm text-ink dark:text-white">{title}</p>
              <p className="text-xs text-ink/50 dark:text-white/40 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink/30 dark:text-white/25 leading-relaxed">
        Product data referenced from <a href="https://world.openfoodfacts.org" className="underline hover:text-ink/60">Open Food Facts</a> (ODbL licence). Health scores and AI insights are guidance, not medical advice. Always consult a qualified healthcare professional for dietary decisions.
      </p>
    </AppShell>
  )
}
