# Morning Ritual

Version: 1.1.0

Morning Ritual is a full-stack habit and progress tracker for fitness check-ins, diet tracking, learning plans, eye-care breaks, social challenges, and real-time multiplayer leaderboard games.

## Stack

- Backend: Node.js, Express, Sequelize, SQLite by default
- Optional databases: MySQL or PostgreSQL through Sequelize config
- Realtime: Socket.IO
- Frontend: React 18, Vite, React Router, TanStack Query, Framer Motion, Tailwind CSS
- Auth: JWT login with hashed passwords and a back-office reset-token flow

## Core Features

- Login, registration, forgot password, and reset password
- Logged-in user badge in the top bar
- Mobile-friendly sidebar navigation
- Daily fitness check-in and weekly fitness dashboard
- Diet logging with goals and weekly views
- Learning plans, courses, exams, and learning settings
- 20-20-20 eye-care route
- Profile settings with name, email, bio, goals, privacy, avatar color, and game handle
- Leaderboard and challenges
- Realtime multiplayer arcade with:
  - Target Rush
  - Brain Blitz
  - Memory Ladder

## Security Notes

- Passwords are hashed with the app security helper.
- Password reset tokens are cryptographically random, hashed before storage, single-use, and expire after 15 minutes.
- Forgot-password responses use generic messaging for unknown usernames when the back-office token is valid.
- JWT is required for protected API routes and Socket.IO connections.
- The global back-office reset token only issues short-lived reset tokens; it is not used directly as the user's reset credential.

## Environment Variables

Create a `.env` file in the project root when you need to override defaults:

```bash
PORT=3001
JWT_SECRET=MORNING_SECRET
UPDATE_TOKEN=BACKOFFICE2025
RESET_GLOBAL_TOKEN=RESET2025
CORS_ORIGIN=*

# SQLite default
DB_DIALECT=sqlite
DB_PATH=./morning-ritual.db

# Optional: MySQL/Postgres
# DB_DIALECT=postgres
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_NAME=morning_ritual
# DB_USER=morning_user
# DB_PASSWORD=secret
# DB_URL=
```

## Setup

Use Node 18 or newer.

```bash
npm install

cd client
npm install
npm run build
cd ..

npm start
```

Open:

```text
http://localhost:3001
```

Default login:

```text
admin / morning2025
```

## Development

Run backend:

```bash
npm run dev
```

Run frontend with Vite:

```bash
cd client
npm run dev
```

The frontend dev server proxies `/api` to `http://localhost:3001`. Socket.IO connects to `VITE_API_URL` or `http://localhost:3001`.

## Password Reset Flow

1. Go to the Forgot tab.
2. Enter the username and the back-office reset token.
3. If valid, the app issues a short-lived reset token.
4. Go to the Reset tab.
5. Enter username, issued reset token, new password, and confirmation.
6. The token is cleared after successful reset.

Default back-office reset token:

```text
RESET2025
```

Change it in production.

## Database Portability

SQLite is the default database. Sequelize models are centralized in `backend/models.js`, and database connection settings come from `backend/config.js`.

To move to MySQL or PostgreSQL:

1. Install/use the included driver dependency.
2. Set `DB_DIALECT`.
3. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, or use `DB_URL`.
4. Start the server; Sequelize syncs the schema.

## Version History

- 1.1.0: Added visible logged-in user badge, websocket multiplayer arcade, hardened reset-token flow, README, and regeneration prompt.
- 1.0.0: Initial Morning Ritual tracker with check-ins, dashboards, diet, learning, profile, leaderboard, and Docker support.
