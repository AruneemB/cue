# Cue

**Cue** is a Vercel-hosted Next.js application that turns scattered coding activity into a unified habit loop. It integrates live data from GitHub, LeetCode, Roadmap.sh, and Kaggle, delivering hourly personalized nudges and a single dashboard to track your growth as a developer.

## Features

- **Unified Dashboard** — XP bar, streak tracker, activity heatmap, and recent activity feed in one place.
- **Hourly Nudges** — Personalized push notifications every hour to keep you building.
- **GitHub Integration** — Browse repos and recent commits; log coding activity automatically.
- **LeetCode Tracking** — Daily challenge card with problem details pulled from the LeetCode API.
- **Roadmap.sh Skills** — Import your roadmap data and advance through skill nodes with guided micro-tasks.
- **Quant Research** — Generate advanced quant/trading ideas on demand via AI (OpenRouter).
- **Kaggle Competitions** — Track active competitions and generate AI-powered project ideas.
- **Settings** — Configure notification preferences, manage push subscriptions, import roadmap data.
- **PWA Ready** — Installable as a standalone app with service worker and web manifest.

## Tech Stack

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Framework     | Next.js 14 (App Router)             |
| Language      | TypeScript                          |
| Styling       | Tailwind CSS                        |
| UI Components | shadcn/ui, Lucide icons, Recharts   |
| Auth          | NextAuth.js v5 (GitHub OAuth)       |
| Database      | Supabase (PostgreSQL)               |
| Cache         | Upstash Redis                       |
| AI            | OpenRouter (Gemini 2.5 Pro default) |
| Push          | Web Push (VAPID)                    |
| Hosting       | Vercel                              |
| Testing       | Vitest + Testing Library            |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A [Supabase](https://supabase.com) project (free tier)
- A [GitHub OAuth App](https://github.com/settings/developers)
- An [OpenRouter](https://openrouter.ai) API key
- An [Upstash Redis](https://upstash.com) database (free tier)
- VAPID keys for push notifications (`npx web-push generate-vapid-keys`)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-username/cue.git
cd cue

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in all required values in .env.local (see Environment Variables below)

# 4. Run database migrations
# In your Supabase SQL Editor, run these in order:
#   supabase/migrations/20260314000000_initial_schema.sql
#   supabase/migrations/20260315000000_schema_alignment.sql
#   supabase/migrations/20260316000000_updated_at_trigger.sql

# 5. Generate VAPID keys (for push notifications)
npx web-push generate-vapid-keys

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## Environment Variables

| Variable                         | Required | Description                                      |
| -------------------------------- | -------- | ------------------------------------------------ |
| `NEXTAUTH_SECRET`                | Yes      | Random 32-byte hex string for session encryption  |
| `NEXTAUTH_URL`                   | Yes      | App URL (`http://localhost:3000` for dev)          |
| `GITHUB_CLIENT_ID`               | Yes      | GitHub OAuth app client ID                         |
| `GITHUB_CLIENT_SECRET`           | Yes      | GitHub OAuth app client secret                     |
| `OPENROUTER_API_KEY`             | Yes      | OpenRouter API key for AI features                 |
| `OPENROUTER_MODEL`               | No       | Override default model (default: `google/gemini-2.5-pro-preview`) |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes      | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes      | Supabase anonymous/public key                      |
| `SUPABASE_SERVICE_ROLE_KEY`      | Yes      | Supabase service role key (server-side only)       |
| `UPSTASH_REDIS_REST_URL`         | Yes      | Upstash Redis REST endpoint                        |
| `UPSTASH_REDIS_REST_TOKEN`       | Yes      | Upstash Redis REST auth token                      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`   | Yes      | VAPID public key (client-side push subscription)   |
| `VAPID_PUBLIC_KEY`               | Yes      | VAPID public key (server-side push sending)        |
| `VAPID_PRIVATE_KEY`              | Yes      | VAPID private key (server-side push sending)       |
| `CRON_SECRET`                    | Yes      | Secret for authenticating cron job requests         |
| `RESEND_API_KEY`                 | No       | Resend API key (email notifications — not yet implemented) |

## Scripts

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start development server           |
| `npm run build`      | Production build                   |
| `npm start`          | Start production server            |
| `npm run lint`       | Run ESLint                         |
| `npm test`           | Run all tests (Vitest)             |
| `npm run test:watch` | Run tests in watch mode            |
| `npm run test:coverage` | Run tests with coverage report  |

## Project Structure

```
cue/
├── app/
│   ├── (app)/                  # Authenticated app routes
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── github/             # GitHub repos & commits
│   │   ├── kaggle/             # Kaggle competitions & ideas
│   │   ├── leetcode/           # LeetCode daily challenge
│   │   ├── roadmap/            # Roadmap.sh skill tree
│   │   ├── settings/           # User settings page
│   │   └── layout.tsx          # App shell with sidebar
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── github/             # GitHub repos & commits
│   │   ├── habits/             # Habit logging & stats
│   │   ├── kaggle/             # Kaggle competitions & AI ideas
│   │   ├── leetcode/           # LeetCode daily problem
│   │   ├── notify/             # Push notifications & cron trigger
│   │   ├── roadmap/            # Roadmap skill updates
│   │   └── settings/           # User settings CRUD
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/
│   ├── dashboard/              # Dashboard widgets
│   ├── modules/                # Module-specific cards
│   ├── notifications/          # Notification bell & cards
│   ├── providers/              # React context providers
│   ├── settings/               # Settings form components
│   └── ui/                     # Shared UI primitives
├── lib/                        # Server utilities
│   ├── ai.ts                   # OpenRouter AI client
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Supabase client
│   ├── github.ts               # GitHub API helpers
│   ├── leetcode.ts             # LeetCode API helpers
│   ├── notify.ts               # Notification logic
│   ├── push.ts                 # Web Push sending
│   ├── redis.ts                # Upstash Redis client
│   ├── roadmap.ts              # Roadmap data helpers
│   ├── utils.ts                # General utilities
│   └── xp.ts                   # XP & streak calculations
├── types/                      # TypeScript type definitions
├── supabase/migrations/        # SQL migration files
├── public/                     # Static assets & service worker
├── __tests__/                  # Test suite
├── middleware.ts                # Auth middleware
├── vercel.json                 # Vercel cron configuration
└── package.json
```

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add all required environment variables in the Vercel dashboard.
4. Run database migrations in your Supabase SQL Editor.
5. Deploy — Vercel auto-detects Next.js and builds accordingly.
6. The hourly cron job (`/api/notify/trigger`) is configured in `vercel.json`.

> **Note:** Cron jobs in production require Vercel Pro ($20/mo).

## License

MIT
