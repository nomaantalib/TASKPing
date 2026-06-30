# TASKping (TaskPilot AI)

TASKping is a premium MERN-stack task scheduler and reminder application that integrates the Gemini API to help users parse natural language inputs, prioritize tasks based on urgency and effort, schedule their day around peak energy windows, and receive proactive motivational reminders.

---

## Technical Features

1. **Robust Authentication**: Custom JWT session validation with bcrypt-hashed passwords.
2. **Gemini API Key Rotation**: Automatically falls back between `GEMINI_KEY_1` and `GEMINI_KEY_2` on quota errors (status 503/429) or invalid configuration, prioritising a user's custom key if supplied in Settings.
3. **Internal Model Fallback**: Tries `gemini-2.5-flash` first and automatically rolls back to `gemini-1.5-flash` if unavailable.
4. **Lightweight Vector RAG Search**: Computes task embedding vectors on-create/on-update, using a local pure-JS cosine similarity engine to pull relevant task context and limit API token costs.
5. **Speech Input Integration**: Captures voice via the browser's Web Speech API and feeds it to the Gemini NLP parser.
6. **Task Priority Visualizer**: Interactive bubble chart mapping Task Urgency (deadline proximity) vs. Effort (hours), color-coded by AI priority scores.
7. **Timeline Scheduler**: Creates hourly blocks between 09:00 and 18:00, scheduling high-focus items during the user's custom peak energy focus window.

---

## Local Development

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster (a connection URI is pre-configured in `.env`)
- Gemini API key (pre-configured in `.env`)

### 2. Environment Variables (`backend/.env`)
Create `backend/.env` with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_uri
JWT_SECRET=TASKPING_2026_JWT_SUPER_SECRET_KEY
GEMINI_KEY_1=your_first_gemini_api_key
GEMINI_KEY_2=your_second_gemini_api_key
```

### 3. Installation
Install root, backend, and frontend dependencies:
```bash
npm run install-all
```

### 4. Running the App
Run both servers concurrently (Backend on port `5000`, Frontend on port `5173`):
```bash
npm run dev
```

### 5. Running Integration Tests
Test backend database connectivity and Gemini parsing rotation:
```bash
cd backend
node test-gemini.js
```

---

## Google Cloud Run Deployment

Both backend and frontend are pre-configured with Dockerfiles for serverless deployment on Google Cloud Run.

### Step 1: Set Google Cloud Project
Ensure you are authenticated and target your GCP project:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Deploy Backend API
Build the backend container image using Cloud Build and deploy to Cloud Run:
```bash
# Submit build to container registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/taskping-backend ./backend

# Deploy backend to Cloud Run
gcloud run deploy taskping-backend \
  --image gcr.io/YOUR_PROJECT_ID/taskping-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="MONGO_URI=your_mongodb_connection_uri,JWT_SECRET=TASKPING_2026_JWT_SUPER_SECRET_KEY,GEMINI_KEY_1=your_first_gemini_api_key,GEMINI_KEY_2=your_second_gemini_api_key"
```
*Note the deployed URL returned by Cloud Run (e.g. `https://taskping-backend-xxxxxx.a.run.app`).*

### Step 3: Deploy Frontend client
Create a production build of the frontend targeting your deployed backend API URL, build the container, and deploy:
```bash
# Add backend URL to frontend configuration build environment
echo "VITE_API_URL=https://taskping-backend-xxxxxx.a.run.app/api" > ./frontend/.env

# Submit build to container registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/taskping-frontend ./frontend

# Deploy frontend to Cloud Run
gcloud run deploy taskping-frontend \
  --image gcr.io/YOUR_PROJECT_ID/taskping-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```
*Your TASKping app is now live at the URL returned by the frontend deployment!*

---

## Render Deployment (Unified Web Service)

We have configured a `render.yaml` Blueprint file at the root. You can deploy this entire monorepo stack on Render as a single web service (fitting perfectly in their Free Tier) by following these instructions:

### Step 1: Push your code to GitHub
Initialize git and push the files to your repository:
```bash
git init
git add .
git commit -m "Initialize TASKping MERN monorepo"
git remote add origin https://github.com/nomaantalib/TASKPing
git branch -M main
git push -u origin main
```

### Step 2: Deploy Blueprint on Render
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub repository (`nomaantalib/TASKPing`).
4. Render will read the `render.yaml` file, register your service, and automatically load your connection strings (`MONGO_URI`, `GEMINI_KEY_1`, `GEMINI_KEY_2`) and generate a secure `JWT_SECRET`.
5. Click **Approve** to build and start.

Once compiled, your backend will start, bundle and serve the frontend statically, exposing the app under a single Render URL (e.g. `https://taskping.onrender.com`).

