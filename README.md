# Stropro Strategy Builder (AI-enabled)

- Builder loads at `/` and `/embed`
- Objectives include **Tax-Effective**
- AI idea cards (JSON) + Chat + "Refine ideas" + "Price this strategy"

## Run locally
cp .env.example .env.local
# set OPENAI_API_KEY (required for AI)
# set ARTICLE_BASE (e.g., https://www.stropro.com/investments-solutions)
npm i
npm run dev
# open http://localhost:3000  (or /embed)

## Deploy (GitHub + Vercel)
# Push to GitHub, then import the repo in Vercel.
# Set these on Vercel → Project → Settings → Environment Variables (Production/Preview):
OPENAI_API_KEY=...
ARTICLE_BASE=https://www.stropro.com/investments-solutions
# optional for email pricing handoff
RECIPIENT_EMAIL=pricing@stropro.com
FROM_EMAIL=no-reply@stropro.com
SENDGRID_API_KEY=...
# optional platform catalog
STROPRO_API_BASE=https://portal.stropro.com/api
STROPRO_API_KEY=Bearer <your-platform-token>

## Embed
<iframe src="https://YOUR-APP.vercel.app/embed" style="width:100%;min-height:900px;border:0;border-radius:12px" loading="lazy"></iframe>
