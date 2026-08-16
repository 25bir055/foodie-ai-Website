# Foodie AI — Smart Food Product Scanner & Personalized Nutrition Assistant

A production-structured React front end for an AI-powered food scanning and nutrition app: barcode scanning, product detail + health scoring, an AI nutrition chat, search & filters, side-by-side comparison, shopping list, favorites, a personalized profile/dashboard, and an admin panel.

The UI is fully wired and interactive against realistic **mock data** (`src/data/mockData.js`), so it looks and behaves like a real product before any backend is connected.

## Design system

- **Palette** — moss green (`#173C2C`) primary, leaf green (`#4CAE7A`) accent, warm cream base, with amber/clay/blue used only for nutrient-specific data (sugar, alerts, sodium).
- **Type** — Fraunces (display/headlines), Manrope (UI text), IBM Plex Mono for every nutrition number and data value — numbers always render in mono so "measured data" reads distinctly from editorial copy.
- **Signature element** — the circular "freshness ring" health-score gauge, reused across the dashboard, product cards, product details and comparisons; plus a barcode-stripe texture used as a recurring accent tying back to the core scanning action.
- Full dark mode, glassmorphism cards, rounded corners, and responsive layouts (sidebar nav on desktop, bottom nav on mobile) per the brief.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/     Sidebar, BottomNav, Header, AppShell, ProductCard, HealthScoreRing
  pages/          One file per screen (Login, Dashboard, Scanner, ProductDetails,
                   AIAssistant, Search, Compare, ShoppingList, Favorites, Profile,
                   PersonalDashboard, Admin, About, Settings)
  data/mockData.js  Realistic sample products, recent scans, weekly nutrition, admin stats
  store.jsx       App-wide state (auth, theme, shopping list, favorites, profile) via React Context
  App.jsx         Route table
```

## Connecting real services

The mock layer is intentionally isolated so each piece can be swapped independently:

- **Barcode → product data**: replace `findByBarcode()` in `src/data/mockData.js` with a call to the
  [Open Food Facts API](https://world.openfoodfacts.org/data) (`GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`).
- **Camera scanning**: `src/pages/Scanner.jsx` currently simulates a scan on a button press. Swap in a
  browser-compatible scanner such as `@zxing/browser` or `html5-qrcode` and call the existing `runScan(barcode)`
  function with the decoded value.
- **Authentication**: `src/pages/Login.jsx` connects to backend JWT authentication (`/api/auth/login` and `/api/auth/signup`).
- **Database**: Backend Express connects to MongoDB (`products`, `users`, `scans` collections) via Mongoose.
- **AI**: `generateReply()` in `src/pages/AIAssistant.jsx` and the `insight` field on each product are placeholders
  for the Google Gemini API. Send the product JSON + user question to Gemini and stream the response into the
  same chat state.

## Tech stack

React 18, React Router 6, Tailwind CSS, Framer Motion, Lucide icons, Recharts — matching the brief's technical requirements (backend/DB/auth/AI integrations are stubbed for a backend team to wire in).
