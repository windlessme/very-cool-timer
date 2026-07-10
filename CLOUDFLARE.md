# Cloudflare deployment

This app deploys to Cloudflare Workers with OpenNext and stores timer/message data in Cloudflare D1.

## One-time setup

Install dependencies:

```bash
npm ci
```

Log in to Cloudflare:

```bash
npx wrangler login
```

Create the D1 database:

```bash
npx wrangler d1 create very-cool-timer
```

Copy the returned `database_id` into `wrangler.jsonc` under `d1_databases[0].database_id`.

Apply remote D1 migrations:

```bash
npm run db:migrate:remote
```

## Preview locally

Build the Worker bundle:

```bash
npm run build:cloudflare
```

Apply local D1 migrations:

```bash
npm run db:migrate:local
```

Start a local Worker preview:

```bash
npm run preview:cloudflare
```

The local preview runs at:

```txt
http://localhost:8787
```

## Deploy

After the D1 database id is configured and migrations are applied:

```bash
npm run deploy:cloudflare
```

## Notes

- GitHub Pages is not a good fit for the full app because the app uses API routes and a database.
- Local Next.js development still uses Prisma with SQLite.
- Cloudflare Workers use the `DB` D1 binding defined in `wrangler.jsonc`.
