# EcoTrack Backend AI Prototype

AI-powered Smart Waste Management backend. Classifies waste images and recommends proper disposal methods.

**Stack:** FastAPI · SQLite · YOLO · OpenCV · Gemini · Groq (Llama 3.1)

---

## How It Works (AI Pipeline)

1. **Upload** a waste image via `POST /api/v1/ai/classify`
2. **OpenCV** preprocesses the image (resize, denoise, enhance contrast)
3. **YOLO** detects objects and bounding boxes — runs fully locally
4. **AI Reasoning** — classifies recyclability, hazard level, and disposal instructions:
   - Tries **Gemini** first (if `GEMINI_API_KEY` is set)
   - Falls back to **Groq / Llama 3.1** (if `GROQ_API_KEY` is set)
   - Falls back to a safe default response if neither is configured
5. **Business Rules** enforce safety overrides (e.g., batteries → Hazardous E-Waste)
6. Result is **saved to SQLite** and returned as JSON

---

## AI Providers

| Provider | Key | Model | Speed | Notes |
|---|---|---|---|---|
| **Gemini** | `GEMINI_API_KEY` | `gemini-2.5-flash` | Fast | Primary provider |
| **Groq** | `GROQ_API_KEY` | `llama-3.1-8b-instant` | ⚡ Very fast | Fallback provider |

The system tries **Gemini first**, then **Groq** if Gemini fails or is unavailable. You can configure one or both.

- Get a free Gemini key → https://aistudio.google.com/app/apikey
- Get a free Groq key → https://console.groq.com

---

## Folder Structure

```text
ai_prototype/
├── app/
│   ├── ai/
│   │   ├── detectors/       # YOLO wrapper
│   │   ├── services/        # Classification workflow (Gemini + Groq logic)
│   │   ├── prompts/         # Shared LLM prompt templates
│   │   ├── business_rules/  # Deterministic safety overrides
│   │   ├── routers/         # FastAPI endpoints
│   │   ├── schemas/         # Pydantic v2 models
│   │   └── utils/           # OpenCV image processing
│   ├── config/              # Settings (pydantic-settings)
│   ├── database/            # Async SQLAlchemy engine (SQLite)
│   ├── models/              # SQLAlchemy ORM table definitions
│   ├── repositories/        # Database CRUD layer
│   └── main.py              # FastAPI entry point (auto-creates DB on startup)
├── uploads/                 # Saved uploaded images
├── ecotrack_ai.db           # SQLite database (auto-created on first run)
├── requirements.txt
└── README.md
```

---

## Quick Start (Windows PowerShell)

### 1. Navigate to the project

```powershell
cd e:\ecotrack\ai_prototype
```

### 2. Create and activate virtual environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure API Keys

The app reads keys from `e:\ecotrack\.env` or `e:\ecotrack\ai_prototype\.env`.

Minimum `.env` content (at least one AI provider required):

```env
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```

| Key | Where to get it | Required? |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | One of the two |
| `GROQ_API_KEY` | https://console.groq.com | One of the two |

### 5. Run the AI Backend

```powershell
uvicorn app.main:app --reload
```

The SQLite database is created automatically — **no migrations needed**.

---

## Running the Full EcoTrack Project (Frontend + AI Backend)

Run each service in its own terminal.

### Terminal 1 — AI Backend (FastAPI)

```powershell
cd e:\ecotrack\ai_prototype
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

| | URL |
|---|---|
| 📖 Swagger UI | http://localhost:8000/docs |
| ❤️ Health Check | http://localhost:8000/health |

### Terminal 2 — Frontend (React + Vite)

```powershell
cd e:\ecotrack
npm run dev
```

| | URL |
|---|---|
| 🖥️ Frontend | http://localhost:3000 |

---

## Test via Swagger UI

Open **http://localhost:8000/docs** and use the interactive API explorer.

### Available Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/classify` | Upload image → get AI classification |
| `GET` | `/api/v1/ai/history` | View all past classifications |
| `DELETE` | `/api/v1/ai/history/{id}` | Delete a classification record |
| `GET` | `/health` | Health check |

### How to test classify

1. Click `POST /api/v1/ai/classify`
2. Click **"Try it out"**
3. Upload any waste image (bottle, can, cardboard, food waste, etc.)
4. Click **Execute**

**Example response:**
```json
{
  "category": "Plastic",
  "subcategory": "Plastic Bottle",
  "recyclable": true,
  "hazard_level": "Low",
  "recommended_bin": "Blue Recycling Bin",
  "disposal_method": "Rinse and place in recycling bin.",
  "recycling_tip": "Remove the cap before recycling."
}
```

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Missing key inputs argument` | Add `GEMINI_API_KEY` or `GROQ_API_KEY` to your `.env` file |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` with `.venv` active |
| `Address already in use` | Port 8000 is taken. Use `uvicorn app.main:app --reload --port 8001` |
| `aiosqlite` not found | Run `pip install aiosqlite` in the `.venv` |
| `groq` not found | Run `pip install groq` in the `.venv` |
| Server shows "⚠️ No AI provider" | Set at least one of `GEMINI_API_KEY` or `GROQ_API_KEY` |
