# Test Credentials

## Test User
- Email: `demo@momentum.app`
- Password: `demo1234`

## API Endpoints (all under `/api`)
Auth:
- POST `/api/auth/register` { email, password, name }
- POST `/api/auth/login` { email, password }
- POST `/api/auth/logout`
- GET `/api/auth/me`

Data:
- GET/POST/DELETE `/api/sections`
- GET/POST/PATCH/DELETE `/api/tasks`
- GET/POST `/api/completions` (POST body: { task_id, date YYYY-MM-DD, completed boolean })
- GET/POST/DELETE `/api/events`
- GET/POST/PATCH/DELETE `/api/goals`
- GET/POST/DELETE `/api/rewards`, POST `/api/rewards/{id}/claim`

Authorization: Bearer token (returned in login/register `token` field)
