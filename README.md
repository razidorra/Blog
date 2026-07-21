# Raaji Baluch Blog

A community blog built with a Vite frontend, an Express API, Clerk authentication, and JSON file storage.

## Requirements

- Node.js 22
- A Clerk application
- Two terminal windows for local development

## Local setup

Install the dependencies:

```bash
cd backend
npm install
cd ../frontend-new
npm install
cd ..
```

Copy the environment templates:

```bash
cp backend/.env.example backend/.env
cp frontend-new/.env.example frontend-new/.env
```

Enter the real Clerk keys and admin user ID in `backend/.env`:

```env
CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_SECRET_KEY=sk_test_replace_me
ADMIN_USER_ID=user_replace_me
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=
PORT=3000
```

Enter the public Clerk key in `frontend-new/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
VITE_API_URL=http://localhost:3000/api
```

Never put `CLERK_SECRET_KEY` in a frontend variable or commit either `.env` file.

Start the backend in the first terminal:

```bash
cd backend
npm run dev
```

Start the frontend in the second terminal:

```bash
cd frontend-new
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/Blog/`.

## Storage

Local posts, comments, and videos are stored in `backend/data/blog.json`. `DATA_FILE` can point to a different location, such as a persistent disk mounted by a production host.

## Security

The API includes:

- Clerk session verification and authorized-party checking
- server-side owner and admin authorization
- strict CORS origin checking
- general and write-specific rate limits
- Helmet security headers
- a 20 KB JSON request limit
- server-derived author names instead of trusting browser-supplied names
- length and YouTube URL validation
- escaped user content in the frontend

Run dependency audits with:

```bash
cd backend && npm audit
cd ../frontend-new && npm audit
```

## Deploy the backend

GitHub Pages cannot execute Express. Deploy the backend first so the live frontend has an HTTPS API.

The repository contains `render.yaml` for Render:

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from `razidorra/Blog`.
3. Enter these secret values when Render requests them:
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `ADMIN_USER_ID`
4. Wait for `/api/health` to return a successful response.
5. Copy the Render URL and add `/api`, for example `https://raaji-blog-api.onrender.com/api`.

Render's default filesystem is temporary. For reliable user-generated content, attach a persistent disk and set `DATA_FILE` to a file on that disk. Without a persistent disk, posts and videos added after deployment can disappear after a restart or redeployment.

## Deploy the frontend to GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml` and the Vite base path is already configured as `/Blog/`.

In the GitHub repository:

1. Open **Settings → Secrets and variables → Actions → Variables**.
2. Add `VITE_API_URL` with the public Render API URL ending in `/api`.
3. Add `VITE_CLERK_PUBLISHABLE_KEY` with the public Clerk production key.
4. Open **Settings → Pages**.
5. Select **GitHub Actions** as the deployment source.
6. Push to the `main` branch or manually run **Deploy frontend to GitHub Pages** under Actions.

The expected site URL is:

```text
https://razidorra.github.io/Blog/
```

## Clerk production setup

Use Clerk production keys for the public deployment. In the Clerk dashboard, add the GitHub Pages URL as an allowed application/redirect origin:

```text
https://razidorra.github.io/Blog/
```

Use the matching production keys in both Render and the GitHub repository variable. The secret key belongs only in Render.

## Production build

```bash
cd frontend-new
npm run build
npm run preview
```

The deployable files are generated in `frontend-new/dist`.

## API health check

Local:

```text
http://localhost:3000/api/health
```

Production:

```text
https://your-backend.example/api/health
```
