# 💊 Dava Darpan

> Compare branded medicines with their **Jan Aushadhi (generic)** equivalents and find nearby Jan Aushadhi kendras — so you always know the cheaper, equally-effective option.

Dava Darpan ("medicine mirror") is a MERN-stack web app. Search a branded medicine like _Dolo 650_, instantly see its composition (Paracetamol 650mg), every other brand with the same composition and their MRPs, and the Jan Aushadhi generic price — with your savings highlighted.

---

## ✨ Features

- 🔐 **Authentication from scratch** — signup, login, JWT, protected routes, bcrypt password hashing (no third-party auth).
- 🔎 **Smart autocomplete search** — filters medicines as you type (no AI, pure client/server filtering).
- 💊 **Medicine comparison** — composition, same-composition brands + MRPs, and the Jan Aushadhi generic with savings highlighted.
- 📍 **Kendra finder** — search Jan Aushadhi kendras by PIN code or city with address and contact.
- ❤️ **Favorites & history** — save medicines and revisit your search history (per-user, protected).
- 🎨 **Polished, professional UI** throughout.

> **Build status:** Phase 1 (project skeleton) ✅ — features above are built in later phases.

---

## 🛠 Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React (Vite), React Router, Tailwind CSS v4, shadcn/ui, Axios |
| Backend  | Node.js, Express, Mongoose, JWT, bcryptjs, dotenv, cors, csv-parser |
| Database | MongoDB |

---

## 📁 Project Structure

```
dava-darpan/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/ui/   # shadcn/ui components (Button, …)
│   │   ├── lib/utils.js     # cn() helper for class merging
│   │   ├── App.jsx          # Placeholder homepage
│   │   ├── main.jsx         # App entry (BrowserRouter)
│   │   └── index.css        # Tailwind v4 + theme variables
│   ├── components.json      # shadcn/ui config
│   └── vite.config.js       # Vite + Tailwind plugin + API proxy
│
├── server/                 # Express + MongoDB backend
│   ├── config/db.js         # MongoDB connection
│   ├── routes/health.js     # GET /api/health
│   ├── data/                # Jan Aushadhi CSV (gitignored; imported via seed)
│   ├── .env.example         # Template for environment variables
│   └── server.js            # Express entry point
│
├── package.json            # Root: runs client + server together (concurrently)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** running locally (or a MongoDB Atlas connection string)

### 1. Install dependencies

From the project root, install everything (root, server, and client):

```bash
npm run install:all
```

### 2. Configure environment variables

Copy the example env file and adjust values if needed:

```bash
cp server/.env.example server/.env
```

See [Environment Variables](#-environment-variables) below for what each one does.

### 3. Run the app (client + server together)

```bash
npm run dev
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:5001
- Health check → http://localhost:5001/api/health

You can also run them individually: `npm run dev:server` or `npm run dev:client`.

---

## 🔑 Environment Variables

Set these in `server/.env` (template in `server/.env.example`):

| Variable         | Description                                  | Example |
| ---------------- | -------------------------------------------- | ------- |
| `PORT`           | Port the Express API listens on (5000 is taken by AirPlay on macOS) | `5001` |
| `MONGO_URI`      | MongoDB connection string                    | `mongodb://127.0.0.1:27017/dava-darpan` |
| `JWT_SECRET`     | Secret for signing JWT auth tokens (Phase 2) | a long random string |
| `JWT_EXPIRES_IN` | How long issued JWTs stay valid              | `7d` |

> `server/.env` is gitignored — never commit real secrets.

---

## 🌱 Data

- **Jan Aushadhi products** — official CSV imported into MongoDB once via a seed script (Phase later). The CSV lives in `server/data/` and is gitignored.
- **Branded medicines** — a hand-curated `brand-medicines.json` (40–60 popular Indian medicines) mapping brand → composition → typical MRP.
- **Kendras** — list of Jan Aushadhi kendras with address and contact.

---

## 📸 Screenshots

_Coming soon — add screenshots of the homepage, search, comparison page, and kendra finder here._

---

## 📄 License

Student project — for educational use.
