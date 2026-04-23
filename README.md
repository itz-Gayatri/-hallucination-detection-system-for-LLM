# TruthGuard AI – Hallucination Detection System

> An AI-powered system that verifies AI-generated responses against trusted sources and detects hallucinations in real time.

---

## Project Overview

TruthGuard AI takes any AI-generated response and verifies it against trusted knowledge sources like Wikipedia and WHO. It returns an **Accuracy Score**, **Hallucination Level**, **Confidence Score**, and the **Correct Answer with source link** — all inline, without any extra clicks.

Built to improve trust in AI systems by making hallucination detection fast, transparent, and multilingual.

---

## Features

- **AI Response Verification** — Paste any AI response and verify it instantly
- **Accuracy Level (%)** — How closely the response matches verified sources
- **Hallucination Detection (%)** — Percentage of content not found in trusted sources
- **Confidence Score (%)** — How confident the system is in its verdict
- **Correct Answer with Source** — Shows the verified answer with a clickable Wikipedia link
- **Multi-language Support** — Works with English, Hindi, and Marathi
- **Math Verification** — Verifies mathematical expressions using SymPy
- **Chat History** — Saves all verifications per session (requires login)
- **Browser Extension** — Adds a "Verify" button directly on ChatGPT

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express 5, Mongoose, JWT Auth |
| Python Service | Flask, sentence-transformers (all-MiniLM-L6-v2), SymPy, NumPy |
| Database | MongoDB Atlas |
| APIs | Wikipedia REST API, WHO GHO API, MyMemory Translation API |
| Extension | Chrome Extension (Manifest V3) |

---

## How It Works

```
User Input (AI Response)
        ↓
Language Detection (English / Hindi / Marathi)
        ↓
Translation to English (if needed)
        ↓
Keyword Extraction
        ↓
Wikipedia Search & Fetch
        ↓
Semantic Similarity (all-MiniLM-L6-v2)
        ↓
Score Generation (Accuracy · Hallucination · Confidence)
        ↓
Translate Answer back to User's Language
        ↓
Display Result with Source Link
```

**Scoring Formula:**
```
Accuracy = (Semantic Similarity × 0.7) + (Keyword Match × 0.3)
Hallucination = 100 - Accuracy
```

---

## Project Structure

```
truthguard-ai/
├── frontend/          # React + Vite UI
├── backend/           # Node.js + Express API
├── python-service/    # Flask NLP microservice
├── extension/         # Chrome browser extension
└── README.md
```

---

## How to Run

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (or local MongoDB)

### 1. Backend
```bash
cd backend
npm install
# Create backend/.env with your MongoDB URI and JWT secret
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Python Service
```bash
cd python-service
pip install -r requirements.txt
python app.py
```

### 4. Chrome Extension
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

---

## Environment Variables

### `backend/.env`
```
PORT=5000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
PYTHON_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### `frontend/.env`
```
VITE_API_URL=http://localhost:5000/api
```

---

## Screenshots

> _Screenshots coming soon_

---

## Use Cases

- **Detect incorrect AI answers** — Catch hallucinations before they spread
- **Fact-check AI responses** — Verify claims against Wikipedia in real time
- **Multilingual verification** — Works for Hindi and Marathi content
- **Math checking** — Verify arithmetic and algebraic expressions
- **Improve AI trust** — Give users confidence in AI-generated content

---

## License

MIT License — free to use, modify, and distribute.
