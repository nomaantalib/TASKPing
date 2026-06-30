# ⚡ TASKping (TaskPilot AI) ⚡

<p align="center">
  <a href="https://blockseblock.com/hackathon_details/Vibe2Ship" target="_blank">
    <img src="https://img.shields.io/badge/Vibe2Ship-Hackathon--Submission-FF4500?style=for-the-badge&logo=rocket" alt="Vibe2Ship Submission"/>
  </a>
  <img src="https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge&logo=mongodb" alt="MERN Stack"/>
  <img src="https://img.shields.io/badge/AI-Gemini%20API-indigo?style=for-the-badge&logo=google-gemini" alt="Gemini Powered"/>
  <a href="https://taskping-104u.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=render" alt="Live Demo"/>
  </a>
</p>

---

## 🔗 Deployed Application
* **Live Deployment URL**: [https://taskping-104u.onrender.com](https://taskping-104u.onrender.com)
* **Vibe2Ship Hackathon Submission Page**: [Vibe2Ship Details](https://blockseblock.com/hackathon_details/Vibe2Ship)

---

## 🚀 About the Project
**TASKping** is a MERN-stack task scheduler and proactive reminder application built as a flagship submission for the **Vibe2Ship Hackathon**. It shifts the burden of task planning from the user to a server-side Gemini intelligence loop. 

Unlike traditional static checklists, TASKping parses natural language (or speech dictation), ranks task urgency against effort, and maps daily timelines to peak focus energy windows. All task storage, search, and details are managed and queried directly within MongoDB.

---

## 🗺️ System Architecture

```mermaid
graph TD
    classDef client fill:#4f46e5,stroke:#312e81,stroke-width:2px,color:#ffffff;
    classDef server fill:#1e1b4b,stroke:#4338ca,stroke-width:2px,color:#ffffff;
    classDef db fill:#064e3b,stroke:#065f46,stroke-width:2px,color:#ffffff;
    classDef ai fill:#78350f,stroke:#92400e,stroke-width:2px,color:#ffffff;

    subgraph "Frontend Client (React)"
        C[Dashboard & Planner UI]:::client
        WS[SpeechRecognition API]:::client
        CH[Recharts Bubble Graph]:::client
    end

    subgraph "Backend API (Express.js)"
        S[API Gateway & Router]:::server
        M[JWT Auth Middleware]:::server
    end

    subgraph "Database (MongoDB)"
        D[(User, Task & Schedule Docs)]:::db
    end

    subgraph "AI Engine (Gemini API)"
        G[Gemini Key Rotation & Model Fallback]:::ai
    end

    C -->|Requests / JWT| S
    WS -->|Voice text| C
    S -->|Queries / Inserts| D
    S -->|Schedule & Nudge Requests| G
    G -->|Rotates keys & fallback models| S
    CH -->|Urgency vs Effort data| C
```

---

## 🔄 AI Scheduling & Input Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React UI (Speech API)
    participant API as Express API
    participant Gemini as Gemini Rotation Engine
    participant DB as MongoDB Atlas

    User->>App: Input task via Voice/Text ("Submit report tomorrow")
    App->>API: POST /api/tasks/nl-add { text }
    API->>Gemini: Parse Natural Language into Fields
    Gemini-->>API: { title, category, effort, deadline }
    API->>DB: Save Task Document (Title, Description, Category, Deadline, Effort)
    DB-->>API: Task Saved
    
    API->>DB: Fetch user's pending tasks
    API->>Gemini: Generate energy-aware Daily Schedule (tasks + energy window)
    Gemini-->>API: Hour blocks (09:00 - 18:00)
    API->>DB: Save daily Schedule blocks
    API-->>App: Display timeline & task bubble chart
    App-->>User: Show today's optimized schedule
```

---

## ✨ Features

- 👤 **Custom JWT Authentication**: Secure user login and registration with hashed password cookies.
- 🔄 **Gemini API Key Rotation**: Automatically toggles between `GEMINI_KEY_1` and `GEMINI_KEY_2` when encountering quota limits (503 Service Unavailable or 429 Too Many Requests), or prioritizes the user's custom API key.
- ⚡ **Energy-Aware Scheduling**: Dynamically schedules heavy-effort tasks during your peak energy window (Morning, Afternoon, or Evening Focus).
- 🎙️ **Speech-to-Text Input**: Dictate tasks directly using browser-native `SpeechRecognition` API.
- 📉 **Priority Score Visualization**: Plots pending tasks on an Urgency vs. Effort grid using a responsive Recharts scatter-bubble layout.
- 🧠 **MongoDB Native Queries**: Perform standard, efficient database searches on task titles and descriptions using MongoDB regex filters, ensuring no external embeddings cost.
- 🚨 **Auto-Reprioritization**: Automatically detects overdue tasks on dashboard load and updates focus priorities.

---

## 🛠️ Local Development

### 1. Configure Environments
Create `backend/.env` in the backend folder:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_uri
JWT_SECRET=your_jwt_signing_secret
GEMINI_KEY_1=your_primary_gemini_api_key
GEMINI_KEY_2=your_fallback_gemini_api_key
```

### 2. Install dependencies
```bash
npm run install-all
```

### 3. Run Development Servers
```bash
npm run dev
```

---

## 🚀 Unified Render Deployment

TASKping is fully optimized for **Render Blueprints**, bundling the backend API and static frontend assets under a single unified web service.

1. Push your code to your GitHub fork (`nomaantalib/TASKPing`).
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** ➔ **Blueprint**.
4. Link your repository.
5. Render will read [render.yaml](file:///c:/Users/mohdn/OneDrive/Desktop/TASLping/render.yaml) and automatically deploy your application on their Free Tier, prompting you for credentials during setup.
