# 🥗 Foodie AI — Nutrition Scanner & Food Intelligence App

Foodie AI is a full-stack web app that lets users scan product barcodes, explore nutrition details, compare foods, manage a shopping list, and track their dietary habits — all powered by Firebase.

---

## 🚀 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React (Vite), Vanilla CSS           |
| Backend   | Node.js + Express                   |
| Database  | Firebase Firestore                  |
| Auth      | Firebase Authentication             |

---

## 📁 Project Structure

```
project/
├── frontend/        # React + Vite frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # App pages (Dashboard, Scanner, Search, etc.)
│       ├── services/     # Firestore, API, Auth logic
│       ├── data/         # Mock/fallback data
│       └── hooks/        # Custom React hooks
└── backend/         # Express REST API
    ├── routes/       # Product API routes
    └── server.js     # Entry point
```

---

## ⚙️ Setup & Installation

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd project
```

### 2. Configure Firebase

Create `frontend/.env` based on `frontend/.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:5000/api
```

### 3. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Install & Run Backend

```bash
cd backend
npm install
node server.js
```

---

## ✨ Features

- 📷 **Barcode Scanner** — Scan product barcodes via camera or manual entry
- 🔍 **Product Search** — Search & filter products by name, brand, category, and health score
- 📊 **Dashboard** — Nutrition overview, scan history, and daily macros
- ⚖️ **Compare** — Side-by-side nutrition comparison of two products
- 🛒 **Shopping List** — Add and track items with purchase status
- ❤️ **Favorites** — Save and revisit preferred products
- 👤 **Profile** — Set dietary goals, preferences, and calorie targets
- 🌙 **Dark Mode** — Full dark/light theme support
- 🔐 **Auth** — Email/password and Google sign-in via Firebase

---

## 🌱 Seeding the Database

To populate Firestore with product data from the CSV:

```bash
cd backend
node seed.js
```

---

## 📄 License

MIT
