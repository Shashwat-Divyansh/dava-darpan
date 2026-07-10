# Dava Darpan 💊

**Find the generic. Save on every prescription.**

Dava Darpan helps anyone compare a branded medicine with its **Jan Aushadhi (generic) equivalent**, see exactly how much they'd save, keep a running "savings basket," and find their nearest Jan Aushadhi Kendra — all built on real government data.

---

## Why I built this

One afternoon the maid who works at our home had brought some of her own medicines with her. I picked one up out of curiosity to see what it was for — and realised it had the *exact same salt composition* as a medicine my own father takes. But the packaging was completely different and cheaper-looking, with a "Government of India" logo on it.

When I asked her about it, she told me it was something the government provides at much lower rates. That particular medicine was around **50–60% cheaper** than the branded version my family was buying.

That stuck with me. I had no idea this existed — and if I didn't know, despite the savings sitting right there, how many people don't? My family had probably overpaid for years simply because nobody told us the cheaper, chemically identical option was available. The problem isn't that people don't care about saving money on medicine. It's that the cheaper equivalent is **invisible at the point of purchase.**

Dava Darpan is my attempt to make it visible.

---

## What it does

- **Search any branded medicine** — type "Dolo" or "Combiflam" and get instant suggestions.
- **See the generic equivalent and the savings** — a clear branded-vs-generic comparison with honest per-tablet and per-pack pricing.
- **Build a savings basket** — add the medicines you actually buy and watch your total savings update live as you tick items on and off.
- **Find a Jan Aushadhi Kendra** — search 19,380 real government stores by PIN code or district to find where to actually buy the generics.
- **Accounts + guest mode** — browse and compare freely without signing up; you only need an account to *save* to your basket.

---

## The part I'm most proud of (and that was hardest)

The tricky bit was matching a brand to its generic. The government's medicine list isn't clean — it has messy free-text names like `"Ibuprofen 400mg and Paracetamol 325mg Tablets IP"`, while a brand like Combiflam needs to be matched by what it's *made of*, not what it's called.

So I wrote a normaliser that takes any of these messy strings, strips out the noise (Tablet, IP, Capsule, etc.), normalises the strengths, splits multi-ingredient drugs, and sorts the ingredients alphabetically — turning both the brand and the generic into the same canonical "key" like `ibuprofen|400mg+paracetamol|325mg`. That way "A + B" matches "B + A", and "Paracetamol Tablets IP 650 mg" matches "Dolo 650" even though they look nothing alike. It matches about 94% of the curated brands to a real generic.

I also made sure the savings are **honest**. Brand and generic packs are different sizes (20 tablets vs 10, say), so comparing pack prices directly would be misleading. Everything is calculated **per tablet**, and the app always shows the pack price too, so the maths is verifiable. When there's genuinely no generic equivalent, it says so instead of faking a match.

---

## Tech stack

**Frontend:** React (Vite), React Router, Tailwind CSS, shadcn/ui
**Backend:** Node.js, Express, MongoDB (Mongoose)
**Auth:** JWT in httpOnly cookies, bcrypt password hashing (built from scratch, no third-party auth service)

**Data:**
- Jan Aushadhi generics — the official PMBI product list (~2,052 products)
- Branded medicines — a hand-curated set of ~53 common medicines and their (publicly known) compositions and typical prices
- Kendra locations — the official PMBJP kendra directory (19,380 stores)

---

## Project structure

```
dava-darpan/
├── client/          # React frontend
│   └── src/
│       ├── pages/         # Home, Compare, Favorites, Kendras, Login, Signup
│       ├── components/    # SearchBar, FavoriteButton, AppHeader, ui/
│       ├── context/       # AuthContext, FavoritesContext
│       └── lib/           # axios, formatting helpers
│
└── server/          # Express backend
    ├── models/            # User, Medicine, Brand, Favorite, Kendra
    ├── routes/            # auth, medicines, kendras, favorites
    ├── middleware/        # requireAuth (JWT)
    ├── services/          # shared comparison logic
    ├── utils/             # composition normaliser, per-unit pricing
    └── scripts/           # data seed scripts
```

---

## Running it locally

**Prerequisites:** Node.js (v18+) and MongoDB running locally (or a MongoDB Atlas URI).

```bash
git clone https://github.com/Shashwat-Divyansh/dava-darpan.git
cd dava-darpan
npm run install:all
```

Set up your environment:
```bash
cp server/.env.example server/.env
# then fill in MONGO_URI and a JWT_SECRET
```

Put the source data files in `server/data/`, seed the database, and run:
```bash
npm run seed     # imports medicines, brands, and kendras
npm run dev      # client on :5173, server on :5001
```

---

## What I'd add next

- Email verification and a password-reset flow
- Prescription upload that reads the medicine names automatically (OCR)
- Auto-syncing the Jan Aushadhi list from the official source
- "Nearest kendra" using your actual location
- Setting quantities in the basket (how many packs you buy a month)

---

## A note on the data

This uses **real official government data** (the Jan Aushadhi product list and the kendra directory) alongside a **hand-curated** set of common branded medicines and their publicly-known compositions and typical prices. The branded data is curated by hand, not scraped from any pharmacy, and every savings figure is shown with the underlying pack prices so it can be checked.

---

**Built by Shashwat · 2026**
test git contribution
