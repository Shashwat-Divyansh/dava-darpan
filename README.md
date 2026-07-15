# Dava Darpan 💊

**The same medicine. Up to 70% cheaper.**

Dava Darpan helps anyone compare a branded medicine with its **Jan Aushadhi (generic) equivalent**, see exactly how much they'd save, build a running savings basket, and find their nearest government pharmacy — all built on real official data.

🔗 **Live app:** [dava-darpan.vercel.app](https://dava-darpan.vercel.app)
🔗 **API:** [dava-darpan-api.onrender.com](https://dava-darpan-api.onrender.com/api/health)

*(The backend is on a free tier and sleeps after inactivity — the first request after a while can take ~30 seconds to wake up.)*

---

## Why I built this

One afternoon the maid who works at our home had brought some of her own medicines with her. I picked one up out of curiosity to see what it was for — and realised it had the *exact same salt composition* as a medicine my own father takes. But the packaging was completely different and cheaper-looking, with a "Government of India" logo on it.

When I asked her about it, she told me it was something the government provides at much lower rates. That particular medicine was around **50–60% cheaper** than the branded version my family was buying.

That stuck with me. I had no idea this existed — and if I didn't know, despite the savings sitting right there, how many people don't? The problem isn't that people don't care about saving money on medicine. It's that the cheaper equivalent is **invisible at the point of purchase.**

Dava Darpan is my attempt to make it visible.

---

## What it does

- **Search by composition or brand** — type "Paracetamol 650mg" (what's actually on a prescription) or a brand you recognise like "Dolo." Brand names resolve to the right composition automatically — searching "Dolo" takes you straight to the Paracetamol 650mg page.
- **See every option, ranked honestly** — the Jan Aushadhi generic on one side, every branded version of that exact composition on the other, ranked by true per-tablet price (not just sticker price, which can be misleading when pack sizes differ).
- **A savings basket, not a bookmark list** — add medicines you actually buy — either a specific brand, or just "the generic" for a composition — and watch the total recalculate live as you tick items on and off. Set quantities for a real monthly estimate. Medicines with no generic equivalent are still included honestly, clearly labelled, never hidden.
- **Find a Jan Aushadhi Kendra** — search **19,380 real government pharmacies** by PIN code or district.
- **Browse without an account** — search, compare, and find kendras freely as a guest. You only need to sign up to save something, and it's explained clearly when you do.

---

## The hardest part — and the part I'm proudest of

The government's Jan Aushadhi product list isn't clean data. Compositions are buried in messy free text like `"Ibuprofen 400mg and Paracetamol 325mg Tablets IP"`, with strength sometimes before the ingredient name and sometimes after, inconsistent separators, and salt-name variants like "Diclofenac Sodium" instead of just "Diclofenac."

So I built a normaliser that strips out the noise, extracts each ingredient and its strength regardless of position, and — critically — sorts multi-ingredient compositions alphabetically, so "Ibuprofen + Paracetamol" and "Paracetamol and Ibuprofen" collapse to the exact same key. That's what lets a brand like Combiflam match its real Jan Aushadhi equivalent even though they're described completely differently. It gets it right on the first pass about **94% of the time** — the few real misses turned out to be honest differences (a genuinely different formulation, a strength the generic simply doesn't stock), not bugs, and I chose not to force those matches just to inflate the number.

I also learned the hard way that comparing raw pack prices can be misleading — a 10-tablet pack at ₹20 looks cheaper than a 15-tablet pack at ₹29, until you check the per-tablet price and find the bigger pack is actually the better deal. Every ranking and every savings figure in the app is based on **true per-tablet price**, with the pack price still shown alongside so the math is always checkable.

And deploying it taught me something I hadn't hit before: an authentication cookie that works perfectly on localhost can silently break once your frontend and backend live on different domains, because browsers block it as a third-party cookie. I ended up switching from a cookie-based session to a Bearer token sent in the request header — same JWT underneath, just a different, cross-domain-safe way of carrying it.

---

## Tech stack

**Frontend:** React (Vite), React Router, Tailwind CSS, shadcn/ui, Axios
**Backend:** Node.js, Express, MongoDB (Mongoose)
**Auth:** JWT (Bearer token), bcrypt password hashing — built from scratch, no third-party auth service
**Deployed on:** Vercel (frontend), Render (backend), MongoDB Atlas (database)

**Data:**
- Jan Aushadhi generics — the official PMBI product list (2,052 products)
- Branded medicines — a hand-curated set of real, publicly-known compositions and typical prices (not scraped, not live-priced — disclosed honestly below)
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
│       └── lib/           # axios instance, currency/formatting helpers
│
└── server/          # Express backend
    ├── models/            # User, Medicine, Brand, Favorite, Kendra
    ├── routes/            # auth, medicines, kendras, favorites
    ├── middleware/        # requireAuth (JWT verification)
    ├── services/          # comparison.js — shared comparison-building logic
    ├── utils/             # composition.js (the normaliser), pricing.js (per-unit math)
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
# fill in MONGO_URI and a JWT_SECRET
```

Put the source data files in `server/data/`, seed the database, and run:
```bash
npm run seed     # imports medicines, brands, and kendras
npm run dev      # client on :5173, server on :5001
```

---

## What I'd add next

- Grow the curated branded-medicine dataset — the matching and ranking logic is fully built and proven; it just needs more real brand entries to show its full value on more searches
- A synonym-mapping layer (e.g. aspirin ↔ acetylsalicylic acid) to recover a few known honest non-matches
- Email verification and a password-reset flow
- Prescription upload that reads medicine names automatically (OCR)
- Real geolocation for "nearest kendra" (the current government dataset has no coordinates, only PIN/district)
- Quantity presets for recurring monthly purchases

---

## A note on the data

This uses **real official government data** (the Jan Aushadhi product list and the kendra directory) alongside a **hand-curated** set of common branded medicines and their publicly-known compositions and typical prices. The branded data is curated by hand, not scraped from any pharmacy and not pulled from a live pricing feed — every savings figure is shown with the underlying pack price so it can be checked, and compositions with no listed generic equivalent are stated honestly rather than hidden or faked.

---

**Built by Shashwat · 2026**
