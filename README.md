# Sentinel AI - Intelligence with Purpose
### A Gemma-Powered Offline-First Disaster Response & Emergency Survival Assistant

Sentinel AI is an offline-first, highly accessible emergency companion app designed to save lives before, during, and after natural disasters. By combining local, zero-network rule-based AI expert systems with online Google Generative AI (Gemma/Gemini models), the application provides localized disaster response guidance even when infrastructure is down.

---

## 🚀 Key Features

1. **Smart Disaster Detection Dashboard**: Dynamic hazard mapping, risk assessments, and battery telemetry tracking.
2. **AI Risk Analysis**: Evaluates parameters (household size, kids, pets, vehicle availability, battery levels) to compute an emergency threat level.
3. **Safe Escape Route Navigator**: Powered by Leaflet mapping, providing paths to avoid known roadblock hazards.
4. **Distress SOS Beacon**: Visual screen strobe, dynamically generated audio whistles (using Web Audio API), Morse code generators, and medical profile QR codes.
5. **Offline Emergency Mode**: PWA configuration caching application shells and static Leaflet CDN assets.
6. **Supply Kit Planner**: Computes daily food/water needs and allows custom survival list tracking.
7. **First Aid Assistant**: Step-by-step CPR and injury guides with text-to-speech audio support.
8. **AI Damage Scanner**: Simulates structural integrity analysis utilizing device cameras.

---

## 🛠️ Technology Stack

- **Frontend Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v4 (Glassmorphism & animations)
- **Offline Storage**: IndexedDB via Dexie.js
- **Distress Sound**: HTML5 Web Audio API Synth
- **Mapping**: Leaflet.js (Offline tile support ready)
- **AI Engine**: Google AI SDK (`@google/generative-ai`) with offline fallback mappings.

---

## 📦 Getting Started

### 1. Installation
Clone the project, then install dependencies:
```bash
npm install
```

### 2. Add API Credentials
To utilize online Gemma/Gemini assessments, set up your API Key in the **Settings** view inside the browser, or declare it in your `.env` configuration:
```env
VITE_GEMINI_KEY=your_gemini_api_key_here
```
*Note: If no API key is specified or you are offline, Sentinel AI automatically switches to the offline expert rule engine.*

### 3. Run Locally
Start the development server:
```bash
npm run dev
```

### 4. Build Production Bundle
Build static PWA ready assets:
```bash
npm run build
```
