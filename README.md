# Electronics Quiz — Setup Guide

## Prerequisites
- Docker Desktop (running)
- Node.js 18+

---

## Step 1 — Copy your images

Copy your circuit diagram images into:
```
backend/images/
```

Your 3 existing images (Slide1.JPG, Slide2.JPG, Slide3.JPG) go here.
Placeholder questions reference placeholder_q4.jpg through placeholder_q10.jpg —
replace those with real images and update seed.js accordingly.

---

## Step 2 — Start the database

Open a terminal in the `electronics-quiz` root folder (where docker-compose.yml is).

```bash
docker compose up -d
```

This downloads PostgreSQL and starts it in the background.
First run takes ~1 minute. Subsequent runs are instant.

To verify it's running:
```bash
docker compose ps
```
You should see a container with status "running".

---

## Step 3 — Install backend dependencies and seed the database

```bash
cd backend
npm install
node seed.js
```

You should see:
```
Tables created.
Seeded 10 questions.
```

---

## Step 4 — Start the backend

Still inside the `backend` folder:
```bash
npm run dev
```

You should see:
```
Backend running on http://localhost:4000
```

Leave this terminal open.

---

## Step 5 — Install frontend dependencies and start it

Open a NEW terminal, navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm start
```

This opens http://localhost:3000 in your browser automatically.

---

## Folder structure

```
electronics-quiz/
├── docker-compose.yml
├── backend/
│   ├── images/          ← PUT YOUR IMAGES HERE
│   ├── index.js
│   ├── db.js
│   ├── seed.js
│   └── routes/
│       ├── session.js
│       └── response.js
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── QuizStart.jsx
            ├── QuestionCard.jsx
            └── Results.jsx
```

---

## Adding more questions

Edit `backend/seed.js` — add entries to the `questions` array.
Each entry needs:
- `image_filename` — the filename in backend/images/
- `option_a` through `option_e` — the 5 answer choices
- `correct_option` — 'A', 'B', 'C', 'D', or 'E'

Then re-run:
```bash
node seed.js
```

---

## Stopping everything

```bash
docker compose down
```

Your data is preserved in a Docker volume. To wipe all data:
```bash
docker compose down -v
```
