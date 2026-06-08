# Momentum — Progress Tracker

## Original Problem Statement
Personal progress tracker website with per-day pages (Mon–Sun), weekly + monthly + yearly progress, calendar with events and percent completed, goals (one per page) with claimable rewards between tasks/goals, section-wise tracking parameters, recurring task auto-replication, user login, mobile + laptop sync.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). Single `server.py` with JWT auth + REST endpoints.
- **Frontend**: React + Tailwind + Shadcn UI. Light minimal theme (warm off-white, amber accent, Fraunces serif + Manrope body).
- **Auth**: JWT (Bearer token in localStorage).

## Personas
- Solo individual tracking personal habits, goals, and rewards across devices.

## Core Requirements (static)
1. Day-wise pages (Mon–Sun) with heading, task, optional time range, done checkbox.
2. Weekly + monthly + yearly + section-wise progress.
3. Calendar with day/date and goal percent + events.
4. Goal pages, one goal per card, claimable rewards.
5. Recurring (weekly) and one-off tasks per user choice.
6. Multi-device sync via user login.

## Implemented (v1 — 2026-02-08)
- JWT auth (register/login/logout/me).
- Sections, Tasks (weekly / one-off), Completions, Events, Goals, Rewards CRUD.
- Week view (7 day tabs, per-day progress, grouped by section, add/check/delete).
- Progress view: Today / Week / Month / Year + last 12 weeks trend bars.
- Goals view: target/current progress, add claimable rewards inline.
- Calendar view: heat-map style modifiers, day summary, events.

## Backlog
- P1: Drag-reorder rewards, edit task dialog, dark mode toggle.
- P2: Streaks, badges, export CSV, push reminders.
- P2: Shared goals / accountability partners.

## Next Action Items
- Add task editing (currently delete-only).
- Polish reward placement between tasks (currently grouped by goal).
- Optional: email reminders.
