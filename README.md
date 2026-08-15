# Ledger — Double-Entry Accounting App

A free, self-hosted accounting web app: chart of accounts, journal entries, general ledger,
trial balance, P&L and balance sheet. Data is saved in the browser's storage (per device/browser).

## Run it locally first (optional)
```
npm install
npm run dev
```
Opens at http://localhost:5173

## Deploy free — easiest option: Netlify

1. Go to https://app.netlify.com and sign up free (GitHub, GitLab, or email).
2. Click "Add new site" → "Deploy manually".
3. Run `npm install && npm run build` in this folder — it creates a `dist` folder.
4. Drag the `dist` folder onto the Netlify upload box.
5. Your app is live at a netlify.app URL immediately.
6. To use your own domain: Site settings → Domain management → Add a domain →
   follow the DNS instructions (you'll add an A record or CNAME at your domain registrar,
   e.g. GoDaddy, Namecheap, wherever you bought simplyelectrify.store or your other domain).
   Netlify gives you free SSL (https) automatically.

## Deploy free — alternative: Vercel

1. Go to https://vercel.com, sign up free.
2. Install Vercel CLI: `npm i -g vercel`
3. In this folder, run: `vercel`
4. Follow prompts (it auto-detects Vite).
5. Add your custom domain under Project Settings → Domains — same DNS-record process as Netlify.

## Deploy free — alternative: Cloudflare Pages

1. Go to https://pages.cloudflare.com, sign up free.
2. Connect a GitHub repo (push this folder to GitHub first) or use direct upload.
3. Build command: `npm run build`, output directory: `dist`.
4. Add your custom domain under the project's Custom Domains tab — if your domain's
   nameservers are already on Cloudflare this is a one-click connect.

## Important: about your data

This version stores data in the browser's `localStorage` — meaning:
- Data lives on whichever device/browser you use it from, not on a server.
- Clearing browser data/cache will erase it — export/backup periodically if this matters.
- If you need the data accessible from multiple devices (phone + laptop), you'd need a real
  backend (e.g. free tier of Supabase or Firebase) instead of localStorage — happy to build
  that version if you need multi-device sync.

## Files
- `src/App.jsx` — the entire app (all views, logic, styling)
- `src/main.jsx` — entry point + storage setup
- `index.html` — page shell
