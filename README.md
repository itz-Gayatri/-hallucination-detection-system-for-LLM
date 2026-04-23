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
