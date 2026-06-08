# Momentum — Personal Progress Tracker

A full‑stack web app to track daily tasks, weekly/monthly/yearly progress, goals with claimable rewards, events, and a calendar that visualises completion. Same data is available on mobile and laptop via user login.

---

## Tech Stack
- **Backend:** FastAPI (Python) + Motor (async MongoDB driver) + PyJWT + bcrypt
- **Frontend:** React 19 + React Router + Tailwind CSS + Shadcn UI + lucide-react + date-fns + axios
- **Database:** MongoDB
- **Auth:** JWT (Bearer token, stored in `localStorage`)

---

## Folder Structure
```
/app
├── backend/
│   ├── server.py            # All API endpoints (auth + CRUD)
│   ├── requirements.txt
│   └── .env                 # MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS
├── frontend/
│   ├── src/
│   │   ├── App.js                       # Routes (login/register/protected)
│   │   ├── index.css                    # Theme + fonts
│   │   ├── lib/
│   │   │   ├── api.js                   # axios instance + auth header
│   │   │   └── dates.js                 # date helpers
│   │   ├── context/
│   │   │   ├── AuthContext.jsx          # login/register/logout state
│   │   │   └── DataContext.jsx          # tasks/sections/etc + API calls
│   │   ├── components/
│   │   │   ├── AddTaskDialog.jsx        # task creation dialog
│   │   │   └── ui/                      # Shadcn primitives
│   │   └── pages/
│   │       ├── Auth.jsx                 # login + register page
│   │       ├── Layout.jsx               # sidebar / mobile header
│   │       ├── Week.jsx                 # Mon–Sun day tabs
│   │       ├── Monthly.jsx              # Today / Week / Month / Year + trend
│   │       ├── Goals.jsx                # goals + rewards
│   │       └── CalendarPage.jsx         # calendar heat-map + events
│   ├── package.json
│   └── .env                              # REACT_APP_BACKEND_URL
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

---

## Features

### 1. Authentication
- Email + password signup / login
- Stateless JWT tokens (30‑day expiry), sent as `Authorization: Bearer <token>`
- Token cached in `localStorage`; `AuthContext` validates on app load via `/api/auth/me`

### 2. Weekly View (`/`)
- Tabs for Monday → Sunday with date + per‑day completion %
- Each task shows: title, optional time range (`HH:MM – HH:MM`), section colour dot, done checkbox, delete
- Add‑task dialog supports:
  - **Recurring weekly** (auto‑appears every week on chosen day)
  - **One‑time** (specific date)
- Week navigation (← / Today / →)

### 3. Progress View (`/monthly`)
- Stat cards for **Today / This Week / This Month / This Year**, each with overall % and a per‑section breakdown
- "Weekly trend" tab shows the last 12 weeks as a bar chart

### 4. Goals (`/goals`)
- One goal per card (title, description, target, current)
- + / − buttons to increment progress (or you can update the target)
- **Rewards** can be added per goal — claim them when achieved
- Delete goal / delete reward

### 5. Calendar (`/calendar`)
- Heat‑map style modifiers on the date grid (high / mid / low completion)
- Click any date to see:
  - Day % completion
  - Scheduled tasks for that day (computed from recurring + one‑off)
  - Events on that day
- Add / delete events (separate from tasks)

### 6. Sections
- Sections act as parameters/categories (Health, Work, Study, etc.) — created on the fly when adding a task
- Progress is computed both overall and per section

---

## Data Model (MongoDB Collections)

| Collection | Fields |
|---|---|
| `users` | id, email, password_hash, name, created_at |
| `sections` | id, user_id, name, color, created_at |
| `tasks` | id, user_id, title, section_id, start_time, end_time, recurrence (`weekly`/`once`), day_of_week (0=Mon..6=Sun), date (YYYY‑MM‑DD), created_at |
| `completions` | id, user_id, task_id, date, completed_at |
| `events` | id, user_id, title, date, time, description, created_at |
| `goals` | id, user_id, title, description, target, current, created_at |
| `rewards` | id, user_id, title, goal_id, order, claimed, claimed_at, created_at |

---

## API Reference (all under `/api`)

### Auth
```
POST   /api/auth/register   { email, password, name? }     → { id, email, name, token }
POST   /api/auth/login      { email, password }            → { id, email, name, token }
POST   /api/auth/logout
GET    /api/auth/me                                        → user
```

### Sections
```
GET    /api/sections
POST   /api/sections         { name, color? }
DELETE /api/sections/{id}
```

### Tasks
```
GET    /api/tasks
POST   /api/tasks            { title, section_id?, start_time?, end_time?,
                               recurrence: "weekly"|"once",
                               day_of_week?, date? }
PATCH  /api/tasks/{id}       any subset of above fields
DELETE /api/tasks/{id}
```

### Completions
```
GET    /api/completions?start=YYYY-MM-DD&end=YYYY-MM-DD
POST   /api/completions      { task_id, date, completed: bool }
```

### Events
```
GET    /api/events
POST   /api/events           { title, date, time?, description? }
DELETE /api/events/{id}
```

### Goals
```
GET    /api/goals
POST   /api/goals            { title, description?, target, current }
PATCH  /api/goals/{id}
DELETE /api/goals/{id}
```

### Rewards
```
GET    /api/rewards
POST   /api/rewards          { title, goal_id?, order? }
POST   /api/rewards/{id}/claim
DELETE /api/rewards/{id}
```

All non‑auth endpoints require `Authorization: Bearer <token>` header.

---

## Environment Variables

### `backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET="<random hex>"
```

### `frontend/.env`
```
REACT_APP_BACKEND_URL=https://<your-host>
```

---

## Running Locally

### Prerequisites
- Python 3.11+, Node 18+, Yarn, MongoDB

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start    # opens http://localhost:3000
```

Make sure `REACT_APP_BACKEND_URL` in `frontend/.env` points to the backend (e.g. `http://localhost:8001`).

---

## How the recurring tasks work
A task is stored once. The `Week.jsx` view computes which tasks belong to a given day at render time:
- `recurrence == "weekly"` → matches when `day_of_week == dayOfWeek(currentDate)` → appears every week
- `recurrence == "once"`   → matches only when `date == currentDate`

Completion records (`completions`) are stored per `(task_id, date)` pair, so checking a recurring task on Mon Jan 6 doesn't affect Mon Jan 13.

---

## Test User
```
email:    demo@momentum.app
password: demo1234
```
(If it doesn't work, simply register a new account.)

---

## Roadmap (Backlog)
- Edit‑task dialog (currently delete‑only)
- Drag‑reorder rewards & task ordering
- Streaks, badges, weekly email summary
- CSV export
- Dark mode toggle
- Push reminders / Web Push notifications

---

## License
Personal use.
