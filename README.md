# ⚡ TASKping (TaskPilot AI) ⚡

<p align="center">
  <a href="https://blockseblock.com/hackathon_details/Vibe2Ship" target="_blank">
    <img src="https://img.shields.io/badge/Vibe2Ship-Hackathon--Submission-FF4500?style=for-the-badge&logo=rocket" alt="Vibe2Ship Submission"/>
  </a>
   <a href="https://taskping-104u.onrender.com" target="_blank">
    <img src="https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=render" alt="Live Demo"/>
  </a>
   <a href="https://nodejs.org/en">
    <img src="https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge&logo=mongodb" alt="MERN Stack"/>
  </a>
   <a href="https://aistudio.google.com/api-keys">
    <img src="https://img.shields.io/badge/AI-Gemini%20API-indigo?style=for-the-badge&logo=google-gemini" alt="Gemini Powered"/>
  </a>
</p>

---

## 🚀 About the Project
**TASKping** is a premium MERN-stack task scheduler and proactive reminder application built as a flagship submission for the **Vibe2Ship Hackathon**. It shifts the burden of task planning from the user to a server-side Gemini intelligence loop. 

Unlike traditional static checklists, TASKping parses natural language (or speech dictation) to schedule or edit tasks, checks date/time parameters dynamically, ranks task urgency, maps daily timelines to peak focus energy windows, and visually plots tasks on an interactive Urgency vs. Effort grid.

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
        RS[Right AI Copilot Sidebar]:::client
        TG[Touch Gestures System]:::client
        WS[SpeechRecognition API]:::client
        CH[Recharts Bubble Graph]:::client
        RD[Reminder Daemon]:::client
    end

    subgraph "Backend API (Express.js)"
        S[API Gateway & Router]:::server
        M[JWT Auth Middleware]:::server
        C_T[Task Controllers]:::server
    end

    subgraph "Database (MongoDB)"
        D[(User, Task & Schedule Docs)]:::db
    end

    subgraph "AI Engine (Gemini API)"
        G[Gemini Key Rotation & Model Fallback]:::ai
    end

    C -->|Requests / JWT| S
    TG -->|Swipe gestures| RS
    WS -->|Voice text| C
    S -->|Queries / Inserts| D
    S -->|Command Parse & Schedule| G
    G -->|Rotates keys & fallback models| S
    CH -->|Urgency vs Effort data| C
    RD -->|Alarm triggers| C
```

---

## 🔄 AI Command & Scheduling Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React UI (Gestures & Speech)
    participant API as Express API
    participant Gemini as Gemini Rotation Engine
    participant DB as MongoDB Atlas

    User->>App: Input Command ("Reschedule Layout task to tomorrow at 5 PM")
    App->>API: POST /api/tasks/nl-add { text }
    API->>DB: Fetch user's pending tasks
    API->>Gemini: Pass text + pending tasks list
    Note over Gemini: Enforces mandatory due date/time on creation. Matches text to pending tasks on update.
    
    alt Missing due date & time on creation
        Gemini-->>API: Return validation error
        API-->>App: HTTP 400 Validation Message
        App-->>User: Pop-up alert requesting date & time
    else Successful match & command parse
        Gemini-->>API: { type: 'update' | 'create', data: { ... } }
        API->>DB: Save or Update Task Document
        DB-->>API: Done
        API-->>App: Return updated task payload
        App-->>User: Display updated timelines & chart
    end
```

---

## ✨ Features

- 👤 **Custom JWT Authentication**: Secure user login and registration with hashed password cookies.
- 🔄 **Gemini API Key Rotation**: Automatically toggles between `GEMINI_KEY_1` and `GEMINI_KEY_2` when encountering quota limits (`429 Too Many Requests`), or prioritizes the user's custom API key.
- ⚡ **Energy-Aware Scheduling**: Dynamically schedules heavy-effort tasks during your peak energy window (Morning, Afternoon, or Evening Focus).
- 🎙️ **Speech-to-Text Input**: Dictate tasks directly using browser-native `SpeechRecognition` API.
- 📉 **Priority Score & Click Focus**: Plots pending tasks on an Urgency vs. Effort grid using a responsive Recharts scatter-bubble layout. Clicking any point focuses and displays complete task details, schedule start, and deadline below.
- ⚙️ **Task Editing Modals & commands**: Edit tasks manually via form modals or by speaking/writing commands to the AI.
- 🚨 **Proactive Reminder system**: Alarm manager checks schedules every 15 seconds. Reminds users 2 hours, 1 hour, and 30 minutes before task time, automatically backing off reminders based on remaining time (e.g. every 2 minutes for imminent tasks).
- 📱 **Swipeable Right AI Sidebar**: Sidebar displaying workspace health and today's schedule. Swipe left from the right edge of the screen to open; swipe right to close.
- 🛡️ **Android Chrome Fallback**: Handles browser notification TypeErrors gracefully by falling back to Service Worker notification builders.

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
5. Render will read `render.yaml` and automatically deploy your application on their Free Tier, prompting you for credentials during setup.
