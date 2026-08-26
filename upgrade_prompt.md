# Foodie AI Assistant V2 – Existing Project Upgrade Prompt

This is an EXISTING Foodie AI Assistant project. DO NOT create a new project, DO NOT rename folders, and DO NOT change the current architecture.

## Existing Project Structure (Use Only These Files)

Backend:

- backend/server.js
- backend/models/User.js
- backend/models/Product.js
- backend/models/Scan.js
- backend/routes/auth.js
- backend/routes/products.js
- backend/routes/scans.js
- backend/routes/chat.js
- backend/routes/ocr.js
- backend/routes/ml.js
- backend/routes/admin.js

Frontend:

- frontend/src/App.jsx
- frontend/src/store.jsx
- frontend/src/firebase.js
- frontend/src/pages/\*
- frontend/src/components/\*

Admin:

- admin/src/pages/AdminDashboard.jsx
- admin/src/pages/AdminLogin.jsx

Reuse all existing components and APIs wherever possible.

---

# GLOBAL RULES

1. Do not delete existing functionality.
2. Keep Login, Scanner, Product Details, AI Assistant, Dashboard, Search, Favorites and Shopping List working.
3. Extend existing pages instead of replacing them.
4. Use MongoDB models instead of creating duplicate collections.
5. Keep React Router configuration inside frontend/src/App.jsx.
6. Follow existing UI theme (green + white modern design).

---

# FEATURE 1 — Upgrade AI Assistant (AIAssistant.jsx + backend/routes/chat.js)

Modify existing AI Assistant.

Add:

- Voice Recognition.
- Microphone button.
- Speech-to-text.
- Tamil + English voice input.
- Chat history stored in MongoDB.
- Suggested prompt chips.
- AI uses user profile + scanned product context.

Files to modify:\
frontend/src/pages/AIAssistant.jsx\
backend/routes/chat.js\
backend/models/User.js

Do not create a second chatbot page.

---

# FEATURE 2 — Automatic Product Database Update

Modify product lookup.

If barcode is not found:

- Fetch from OpenFoodFacts.
- Save inside Product collection.
- Return product immediately.
- Avoid duplicates using barcode.

Files:\
backend/routes/products.js\
backend/models/Product.js\
backend/fetch-indian-products.js

---

# FEATURE 3 — Scanner Improvements

Modify existing Scanner.jsx.

Requirements:

- Scan only ONE product.
- Freeze camera after success.
- Redirect to ProductDetails.jsx.
- Add "Scan Another Product".
- Store scan history.
- Prevent duplicate scan popup.

Files:\
frontend/src/pages/Scanner.jsx\
backend/routes/scans.js\
backend/models/Scan.js

---

# FEATURE 4 — Product Comparison Upgrade

Upgrade Compare.jsx.

Add:

- Compare nutrition values.
- Compare health score.
- Compare NOVA score.
- Disease based comparison.
- Category comparison.
- Better alternative card.

Diseases:\
Diabetes\
Blood Pressure\
Cholesterol\
Heart Disease\
Kidney Disease\
Obesity

Files:\
frontend/src/pages/Compare.jsx\
backend/routes/ml.js\
backend/routes/products.js

---

# FEATURE 5 — Expand User Profile

Upgrade SetupProfile.jsx and Profile.jsx.

Add fields:

Personal:

- Name
- Age
- Gender
- DOB

Body:

- Height
- Weight
- BMI auto calculation

Lifestyle:

- Activity Level
- Water Goal
- Sleep Hours

Health:

- Diseases
- Allergies
- Food Preference
- Dietary Goal

Location:

- Country
- State
- Preferred Language

Save all fields in User.js.

Files:\
frontend/src/pages/SetupProfile.jsx\
frontend/src/pages/Profile.jsx\
backend/models/User.js\
backend/routes/auth.js

---

# FEATURE 6 — Doctor Prescription Module

Create NEW page.

frontend/src/pages/Prescription.jsx

Backend:\
backend/routes/prescription.js\
backend/models/Prescription.js

Features:

- Upload image/PDF.
- OCR extraction.
- Medicine list.
- AI explanation.
- Food interaction warning.
- Save prescription history.

Register route in App.jsx and server.js.

---

# FEATURE 7 — Automatic Calorie Tracker

Upgrade PersonalDashboard.jsx.

Automatically:

- Add calories after scan.
- Breakfast/Lunch/Dinner/Snacks.
- Daily calorie progress.
- Weekly calorie chart.
- Water intake tracker.

Files:\
frontend/src/pages/PersonalDashboard.jsx\
backend/models/User.js\
backend/routes/scans.js

---

# FEATURE 8 — AI Recommendation Engine

Upgrade Dashboard.jsx.

AI generates:

- Healthy alternatives.
- Avoid foods.
- Meal suggestions.
- Weekly meal plan.
- Disease recommendations.

Use Gemini through chat.js.

Files:\
frontend/src/pages/Dashboard.jsx\
backend/routes/chat.js

---

# FEATURE 9 — India Focused Food Database

Upgrade products.

Include:

- Indian packaged foods.
- South Indian packaged foods.
- Snacks.
- Dairy.
- Drinks.
- Biscuits.
- Chocolates.
- Instant foods.

Add Indian disease dietary guidance.

Files:\
backend/fetch-indian-products.js\
backend/seed.js

---

# FEATURE 10 — Family Members Module

Create Family Profiles.

New frontend pages:

frontend/src/pages/Family.jsx\
frontend/src/components/FamilyCard.jsx

Backend:

backend/models/FamilyMember.js\
backend/routes/family.js

Features:

- Father.
- Mother.
- Son.
- Daughter.
- Grandparents.

Each member has:

- BMI
- Calories
- Diseases
- Allergies
- Recommendations
- Scan History

Link under users.

---

# FEATURE 11 — Multi Language Support

Create translation system.

Languages:\
English\
Tamil\
Hindi\
Telugu\
Malayalam\
Kannada

Files:\
frontend/src/context/LanguageContext.jsx\
frontend/src/locales/\*\
frontend/src/pages/Settings.jsx

Requirements:

- Entire UI changes language.
- Chatbot answers in selected language.
- Persist language in local storage and MongoDB.

---

# FEATURE 12 — Settings Page Upgrade

Create Settings.jsx.

Options:

- Language.
- Voice Language.
- Dark Mode.
- Notifications.
- Privacy.
- Logout.

Add route.

---

# FEATURE 13 — Admin Dashboard Upgrade

Upgrade existing AdminDashboard.jsx.

Add cards:

- Total Users.
- Total Products.
- Total Scans.
- Average Health Score.
- Disease Statistics.
- Top Scanned Products.
- Daily Scan Chart.
- Recently Added Products.

Backend:\
backend/routes/admin.js

---

# FEATURE 14 — MongoDB Models

Add new models only if missing.

Models:\
Prescription.js\
FamilyMember.js\
MealHistory.js\
ChatHistory.js

Register relationships with User.

---

# FEATURE 15 — API Routes

Register new routes inside server.js

/api/family\
/api/prescription\
/api/recommendations\
/api/meals\
/api/settings

Keep existing routes unchanged.

---

# FEATURE 16 — Navigation Update

Modify:\
Header.jsx\
Sidebar.jsx\
BottomNav.jsx

Add menu items:

- Family
- Prescription
- Meal Tracker
- Settings

Do not remove existing navigation.

---

# FINAL REQUIREMENT

After completing coding:

1. Update frontend/src/App.jsx routes.
2. Update backend/server.js routes.
3. Update MongoDB models.
4. Keep project buildable.
5. Do not generate duplicate folders.
6. Return modified files with comments showing what changed.
