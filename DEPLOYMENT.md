# Deployment Guide

## Files added for deployment
- [render.yaml](render.yaml) for backend service defaults on Render
- [netlify.toml](netlify.toml) for frontend deployment on Netlify
- [frontend/public/_redirects](frontend/public/_redirects) for React Router refresh support on Netlify
- [backend/.env.example](backend/.env.example) backend env template
- [frontend/.env.example](frontend/.env.example) frontend env template

## Where to put the Neon URL
Do not commit the real Neon URL into the repo.

Put it in your backend host environment settings:
- Render → your backend service → Environment → add `DATABASE_URL`
- Value = your full Neon connection string

Example:
```env
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require&channel_binding=require
```

## Backend deploy on Render
Create a new Web Service and point it at this repo.

Use these settings:
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Add these environment variables in Render:
- `DATABASE_URL` = your Neon URL
- `NODE_ENV` = `production`
- `PORT` = `5001`
- `JWT_SECRET` = new strong random secret
- `JWT_EXPIRES_IN` = `7d`
- `FRONTEND_URL` = your Netlify or Vercel URL
- plus any provider keys you want enabled

Test after deploy:
- `https://<your-render-service>.onrender.com/api/health`

## Frontend deploy on Netlify
This repo already includes [netlify.toml](netlify.toml), so Netlify can build from the repo root.

Set this environment variable in Netlify:
- `REACT_APP_API_URL` = `https://<your-render-service>.onrender.com/api`

Then deploy.

## Frontend deploy on Vercel
If using Vercel instead of Netlify:
- Root Directory: `frontend`
- Build Command: `npm run build`
- Environment variable: `REACT_APP_API_URL=https://<your-render-service>.onrender.com/api`

## Final connection step
After frontend is live, update backend `FRONTEND_URL` in Render to your real frontend domain and redeploy the backend.

## Security
Rotate any secrets that were shared previously:
- Neon database password / `DATABASE_URL`
- `JWT_SECRET`
- `AI_API_KEY`
- `ADMIN_PASSWORD`
- `ADMIN2_PASSWORD`
