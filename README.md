# Dava Darpan 💊

**Helping Indians find affordable generic medicines.**

Dava Darpan is a full-stack web application that lets anyone compare a branded medicine against its **Jan Aushadhi (generic) equivalent**, see exactly how much they would save, track a personalised "savings basket," and find their nearest Jan Aushadhi Kendra — all backed by real government data.

> Branded medicines in India often cost several times more than chemically identical generics sold under the government's Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP). The problem isn't that people don't care — it's that the cheaper equivalent is invisible at the point of purchase. Dava Darpan makes that saving visible.

---

## ✨ Features

- **Smart autocomplete search** — start typing a brand (e.g. "Dolo", "Combiflam") and get instant suggestions. No AI, just fast prefix/substring matching over the medicine database.
- **Branded vs generic comparison** — pick a medicine and see a clear side-by-side of the branded product and its Jan Aushadhi equivalent, with **honest per-tablet and per-pack pricing** and the savings highlighted.
- **Composition-based matching** — brands are matched to generics by their *active composition*, not their name, using a normalised "composition key" that handles messy free-text drug names, mixed separators, salt variations, and multi-ingredient formulations.
- **Savings basket** — save medicines you buy and watch a live total update as you select/deselect items: total branded cost, total Jan Aushadhi cost, and overall savings. Medicines with no generic equivalent are included honestly at branded price and clearly labelled.
- **Kendra finder** — search **19,380 real Jan Aushadhi Kendras** by PIN code or state/district to find where to actually buy the generics.
- **Authentication from scratch** — secure signup/login built with JWT (httpOnly cookies) and bcrypt password hashing. No third-party auth service.
- **Guest mode** — browse, search, and compare freely without an account; logging in is required only to *save* to your basket. A friendly prompt explains why.

---

## 🧱 Tech Stack

**Frontend**
- React (Vite)
- React Router
- Tailwind CSS + shadcn/ui
- Axios

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JSON Web Tokens (`jsonwebtoken`) for auth, stored in httpOnly cookies
- `bcryptjs` for password hashing
- `csv-parser` for data import

**Data**
- Jan Aushadhi generics — imported from the official **PMBI product list** (CSV): ~2,052 products with composition, pack size, MRP, and group.
- Branded medicines — a curated dataset of ~53 common Indian medicines mapped to their (publicly known) compositions and typical market prices.
- Kendra locations — imported from the official **PMBJP Kendra directory**: 19,380 stores with name, address, district, state, and PIN.

---

## 🏗️ Architecture

The project is a single repository with two parts:

```
dava-darpan/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/         # Home, Compare, Favorites, Kendras, Login, Signup
│       ├── components/    # SearchBar, FavoriteButton, AppHeader, ui/ (shadcn)
│       ├── context/       # AuthContext, FavoritesContext
│       └── lib/           # axios instance, currency/format helpers
│
└── server/          # Express + MongoDB backend
    ├── models/            # User, Medicine, Brand, Favorite, Kendra
    ├── routes/            # auth, medicines, kendras, favorites
    ├── middleware/        # requireAuth (JWT verification)
    ├── services/          # comparison logic (shared by /match and /favorites)
    ├── utils/             # composition normaliser, pricing (per-unit) helpers
    ├── scripts/           # CSV/JSON seed scripts
    └── data/              # source CSV/JSON (gitignored)
```

**How matching works (the core idea):** Jan Aushadhi generics are listed as messy free-text like `"Ibuprofen 400mg and Paracetamol 325mg Tablets IP"`. A `normalizeComposition()` utility strips dosage-form words (Tablet, IP, etc.), normalises strengths and separators, splits multi-ingredient drugs, and sorts ingredients alphabetically to produce a canonical key like `ibuprofen|400mg+paracetamol|325mg`. Both generics and curated brands are reduced to the same key shape, so a brand matches its generic regardless of wording or ingredient order.

**Pricing honesty:** brand and generic pack sizes differ (e.g. 20 tablets vs 10), so all savings are computed **per unit** (per tablet/capsule) and the UI transparently shows both the per-pack price and the per-unit price, so the comparison is always verifiable.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Clone and install
```bash
git clone https://github.com/Shashwat-Divyansh/dava-darpan.git
cd dava-darpan
npm run install:all      # installs root, server, and client dependencies
```

### 2. Configure environment
Copy the example env file and fill in values:
```bash
cp server/.env.example server/.env
```
`server/.env`:
```
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/dava-darpan
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
```

### 3. Seed the database
Place the source data files in `server/data/` (the Jan Aushadhi product CSV, the curated brand JSON, and the kendra CSV), then:
```bash
npm run seed       # imports medicines + brands + kendras
```

### 4. Run
```bash
npm run dev        # runs client (http://localhost:5173) and server (http://localhost:5001) together
```

---

## 🔌 API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | Public | Create account, set httpOnly JWT cookie |
| POST | `/api/auth/login` | Public | Log in, set cookie |
| POST | `/api/auth/logout` | Public | Clear cookie |
| GET | `/api/auth/me` | Protected | Current user (session check) |
| GET | `/api/medicines/search?q=` | Public | Autocomplete brand search |
| GET | `/api/medicines/match/:brandId` | Public | Brand → generic comparison + per-unit savings |
| GET | `/api/medicines/stats` | Public | Aggregate counts (generics, brands, kendras) |
| GET | `/api/kendras/search?pin=` or `?state=&district=` | Public | Find kendras |
| GET | `/api/kendras/states` / `/districts` | Public | Dropdown data |
| GET | `/api/favorites` | Protected | User's saved basket (with comparison data) |
| POST | `/api/favorites` | Protected | Add a medicine to basket |
| DELETE | `/api/favorites/:brandId` | Protected | Remove from basket |

---

## 🔭 Future Scope

Planned enhancements (deliberately out of the current scope):

- **Email verification (OTP)** and a password-reset flow
- **Prescription upload with OCR** — extract medicine names from an uploaded prescription automatically
- **Real-time / scheduled data refresh** — auto-sync the Jan Aushadhi product list from the official source
- **Geolocation-based "nearest kendra"** — distance sorting using the device's location
- **Quantity in the basket** — set how many packs of each medicine you buy per month
- **A marketing landing page** describing the app before login

---

## 📝 Notes on Data

This project uses **real official government data** (the Jan Aushadhi product list and the PMBJP kendra directory) combined with a **curated dataset** of common branded medicines and their publicly-known compositions and typical prices. The branded data is hand-curated, not scraped from any pharmacy. All savings figures are computed on a per-unit basis and the underlying pack prices are always shown for transparency.

---

## 👤 Author

**Shashwat** — built as a full-stack project demonstrating the MERN stack, authentication from scratch, real-world data integration, and applied product thinking.

*2026*
