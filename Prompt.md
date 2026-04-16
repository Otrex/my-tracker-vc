# Morning Ritual Regeneration Prompt

Prompt version: 1.1.0
Target app version: 1.1.0

Use this prompt to regenerate the Morning Ritual app from scratch.

## Role

You are a senior full-stack engineer. Build a polished, mobile-first, production-minded wellness and productivity dashboard called Morning Ritual.

## Required Stack

- Backend: Node.js, Express, Sequelize
- Default DB: SQLite
- Portable DB support: MySQL and PostgreSQL through Sequelize config
- Realtime: Socket.IO
- Frontend: React 18, Vite, React Router, TanStack Query, Framer Motion, Tailwind CSS
- Icons: Lucide React
- Auth: JWT stored in localStorage
- Password hashing: secure server-side hashing helper
- Export: SheetJS `xlsx`

## Required Project Structure

```text
morning-ritual/
├── server.js
├── package.json
├── package-lock.json
├── Dockerfile
├── README.md
├── Prompt.md
├── backend/
│   ├── app.js
│   ├── config.js
│   ├── models.js
│   ├── middleware/
│   ├── realtime/
│   │   └── gameSocket.js
│   ├── routes/
│   ├── services/
│   └── utils/
└── client/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── api.js
        ├── realtime.js
        ├── index.css
        ├── main.jsx
        ├── components/
        ├── hooks/
        └── lib/
```

## Product Requirements

The app must include:

- Login screen
- Register screen
- Forgot password screen
- Reset password screen
- Logged-in account badge visible in the top bar at all times
- Sidebar navigation on desktop
- Mobile drawer navigation
- Check-in-first user flow
- Main metrics dashboard
- Fitness page with check-in and weekly stats
- Diet section split into subpages
- Learning section split into subpages
- Eye-care route for the 20-20-20 rule
- Profile page with editable:
  - display name
  - email
  - bio
  - location
  - timezone
  - avatar color
  - fitness goal
  - diet goal
  - learning goal
  - game handle
  - privacy level
  - password change
- Leaderboard page
- Challenge feature
- Realtime multiplayer game page

## Realtime Game Requirements

Use Socket.IO with JWT authentication.

Implement per-user rooms and per-match rooms.

Game matches must persist in the database and include:

- challenger username
- opponent username
- seed
- game type
- status
- challenger score
- opponent score
- winner username
- completed date

Implement three game types:

1. Target Rush
   - 30 seconds
   - tap moving targets
   - live score updates

2. Brain Blitz
   - 45 seconds
   - server-generated arithmetic prompts
   - do not send answers to the client
   - server validates submitted answers

3. Memory Ladder
   - 45 seconds
   - server-generated color sequence
   - user repeats sequence
   - server validates submitted sequence

Completed game points and wins must affect leaderboard scoring.

## Password Reset Requirements

Follow modern reset-flow security guidance:

- Use generic forgot-password responses for unknown accounts.
- Use cryptographically random reset tokens.
- Store only hashed reset tokens.
- Reset tokens must be single-use.
- Reset tokens must expire after 15 minutes.
- Do not use security questions.
- Do not log the user in automatically after reset.
- Require password confirmation on reset.
- Keep the back-office global reset token as the issuance gate, not as the user's final reset credential.

Because this project has no email provider, the Forgot screen may display the issued short-lived reset token after a valid back-office token is supplied. Structure the code so email delivery can be added later without changing the reset-token model.

## Database Requirements

Use Sequelize models. SQLite must work by default, but the config must support:

- `DB_DIALECT=sqlite`
- `DB_DIALECT=mysql`
- `DB_DIALECT=postgres`
- `DB_URL`
- host/port/database/user/password style config

Use schema sync and column backfill helpers for existing SQLite databases.

## UI Requirements

Design direction:

- Developer-friendly font
- No heavy shadows
- Very low border-radius
- Clean dashboard layout
- Desktop and mobile layouts must both feel first-class
- Top bar must show current route context and logged-in account
- Sidebar must stay available on desktop
- Mobile navigation must be a drawer opened from the top bar
- Controls must be at least 44px tall on mobile
- Avoid horizontal overflow except intentional chip rows

## Security Requirements

- JWT on protected routes
- JWT auth on Socket.IO connections
- Password hashing
- Rate limit auth routes
- Security headers
- CORS config through env var
- Do not leak reset-token hashes
- Do not return password hashes in profile responses

## Default Admin

Create default admin on startup:

```text
username: admin
password: morning2025
```

## Setup Instructions To Include

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

## Versioning Rule

Every meaningful generated version must include:

- root `package.json` version
- client `package.json` version
- README version history
- Prompt version

When changing the app behavior, bump the minor version. When fixing only bugs, bump the patch version.
