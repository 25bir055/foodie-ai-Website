# 🥗 Foodie AI — Nutrition Scanner & Food Intelligence App

Foodie AI is a full-stack web app that lets users scan product barcodes, explore nutrition details, compare foods, manage a shopping list, and track their dietary habits — all powered by MongoDB and Express REST API.

---

## 🚀 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React (Vite), TailwindCSS / CSS     |
| Backend   | Node.js + Express + Mongoose        |
| Database  | MongoDB (Local / Atlas)             |
| Auth      | JWT (JSON Web Tokens) & Bcrypt      |

---

## 📁 Project Structure

```
project/
├── frontend/        # React + Vite frontend user app
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # App pages (Dashboard, Scanner, Search, etc.)
│       ├── services/     # REST API, Auth logic
│       ├── data/         # Fallback data
│       └── hooks/        # Custom React hooks
├── admin/           # Admin Dashboard Portal
│   └── src/
│       ├── pages/        # Admin Login & Analytics Dashboard
│       └── App.jsx
└── backend/         # Express REST API & MongoDB Models
    ├── models/       # Mongoose Schemas (Product, User, Scan)
    ├── routes/       # Auth, Products, Scans, Admin routes
    ├── middleware/   # JWT Auth middleware
    ├── seed.js       # CSV to MongoDB seeder
    └── server.js     # Express server entry point
```

---

## ⚙️ Setup & Installation

### 1. Configure Backend

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foodie-ai
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAIL=admin@foodie.ai
```

### 2. Configure Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Backend

```bash
cd backend
npm install
node server.js
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Run Admin Portal

```bash
cd admin
npm install
npm run dev
```

---

## 🌱 Seeding the Database

To populate MongoDB with product data from CSV:

```bash
cd backend
node seed.js
```

---

## 📄 License

MIT
