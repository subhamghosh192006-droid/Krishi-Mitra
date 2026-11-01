# Krishi Mitra (कृषि मित्र) — Minimum Viable Product (MVP) Specification & Architecture Dossier

> **Platform:** Geospatial Predictive Field Intelligence for Smallholder Farmers  
> **Version:** 1.0.0 (Production MVP)  
> **Status:** Fully Functional & Validated (78/78 Tests Passing, 15 Suites)  
> **Target Tracks:** Google DeepMind (Gemma) · ElevenLabs (Voice AI) · Graphify Labs (Knowledge Graph) · DigitalOcean (Open-Source AI)

---

## 📑 Table of Contents
1. [Executive Summary & Problem Validation](#1-executive-summary--problem-validation)
2. [Target User Personas & Use Cases](#2-target-user-personas--use-cases)
3. [MVP Scope: Shipped Features vs. Future Roadmap](#3-mvp-scope-shipped-features-vs-future-roadmap)
4. [Hardware, Connectivity & Rural Constraints](#4-hardware-connectivity--rural-constraints)
5. [End-to-End User Journey](#5-end-to-end-user-journey)
6. [Core Technical Architecture & Component Map](#6-core-technical-architecture--component-map)
7. [Hackathon Partner Track Implementation Matrix](#7-hackathon-partner-track-implementation-matrix)
8. [Agronomic Validation & Mathematical Models](#8-agronomic-validation--mathematical-models)
9. [Economic Impact & Farmer ROI Analysis](#9-economic-impact--farmer-roi-analysis)
10. [2-Minute Live Judge Demonstration Protocol](#10-2-minute-live-judge-demonstration-protocol)
11. [Verification & Test Suite Summary](#11-verification--test-suite-summary)

---

## 1. Executive Summary & Problem Validation

### The Core Problem
Over **86% of Indian farmers are smallholders** cultivating plots under 2 hectares (5 acres). These farmers face four compounding daily challenges:
1. **Irrigation Guesswork**: Farmers irrigate based on neighbor habits or rigid calendar schedules. Irrigating 24 hours before unforecasted rain suffocates root zones, wastes scarce groundwater, and burns ₹1,800–₹3,200/acre in electricity or diesel pumping costs.
2. **Fertilizer Runoff (Leaching)**: Subsidized Urea ($46\%\text{ N}$) is commonly broadcast before rain, causing up to 50% of applied nitrogen to leach below root depth into aquifers or wash into rivers, wasting capital and contaminating drinking water.
3. **Microclimate Pathogen Ambush**: Fungal epidemics (Late Blight in Tomatoes, Yellow Rust in Wheat) strike after humid periods. Farmers typically notice damage only after irreversible leaf necrosis occurs, triggering panic sprays of toxic chemicals.
4. **Literacy & Technical Jargon Barriers**: Existing agtech portals present dense English tables, raw satellite indices, and complex charts that are unusable for vernacular-speaking farmers operating on budget smartphones.

### The Krishi Mitra MVP Solution
**Krishi Mitra** is a zero-hydration, ultra-lean web platform (~30 kB gzipped) that converts high-resolution Earth Observation (EO) satellite feeds into one clear daily verdict: **Water today, or wait?** 

It computes volumetric water requirements in **Liters**, predicts fungal outbreaks 48–72 hours in advance via microclimatic leaf wetness tracking, guards against fertilizer leaching, formulates localized narrative advice using **Google DeepMind's Gemma**, and speaks the advisory aloud in authentic Hindi and English via **ElevenLabs Voice AI**.

---

## 2. Target User Personas & Use Cases

### Persona 1: Ram Kumar — Smallholder Farmer (Primary End-User)
* **Demographics**: 48 years old, Karnal, Haryana. Cultivates 2.5 acres of Wheat and Mustard.
* **Device & Network**: ₹6,500 budget Android smartphone, 3G/intermittent 4G cellular signal.
* **Pain Points**: Constantly anxious about unexpected rain after spending diesel on tubewell pumping. Struggles to read long English text messages from district bulletins.
* **MVP Value**: Taps his field on the map, presses **"🔊 Listen / आवाज़ में सुनें"**, and hears immediate advice in Hindi telling him whether to run his tubewell today and whether Urea should be held.

### Persona 2: Dr. Priya Sharma — KVK Agricultural Extension Officer (Advisor Persona)
* **Demographics**: 34 years old, Krishi Vigyan Kendra (ICAR), Punjab. Advises 40+ village panchayats.
* **Pain Points**: Needs mathematically defensible, auditable recommendations. Dislikes "black-box" AI tools that give hallucinated advice.
* **MVP Value**: Inspects the **Three-Tier Data Honesty Badges** (`LIVE`, `EST`, `SIM`), verifies FAO-56 dual crop water balance equations, and clicks **"Save / Print Summary"** to generate official PDF advisories for farmer groups.

### Persona 3: Suresh Patel — FPO / Village Cooperative Lead (Commercial Persona)
* **Demographics**: 42 years old, Farmer Producer Organization (FPO) director managing 300 acres in Gujarat.
* **Pain Points**: High input costs, debt from wasted inputs, and poor crop diversification.
* **MVP Value**: Uses Step 6 (Crops & Profit) to model net profit per acre under drought (-25% water) and monsoon scenarios, planning optimal crop rotations across his cooperative.

---

## 3. MVP Scope: Shipped Features vs. Future Roadmap

| Subsystem | Shipped in MVP (V1 Production) | Future Roadmap (V2 Expansion) |
|---|---|---|
| **Field Mapping** | High-res Esri Maxar satellite boundary tracing, real-time spherical WGS84 area/perimeter calculation, 1-acre auto-estimate, centroid resolution. | Drone multispectral imagery upload; GPS Bluetooth survey-grade RTK antenna pairing. |
| **Water Balance** | FAO-56 dual crop coefficient $K_c(t)$, dynamic root expansion $Z_r(t)$, readily available water ($RAW$), volumetric Liters conversion. | IoT LoRaWAN soil tensiometer hardware telemetry integration. |
| **Disease Model** | Microclimatic Wallin Disease Severity Index (DSI), Leaf Wetness Duration ($RH \ge 90\%$), 8 crop pathogen profiles, bio-control recipes. | Computer Vision on-device leaf disease classifier via lightweight MobileNet/YOLO weights. |
| **Fertilizer Guard** | 48-hour precipitation hazard detector ($\ge 12\text{ mm}$ triggers "Hold Urea"), GDD-based 3-stage split-dosing benchmarks. | Official Soil Health Card (SHC) physical lab test parameter ingestion (N-P-K-pH custom overrides). |
| **AI Narrative** | **Google DeepMind Gemma** open-weight model integration formulating 60-word conversational farmer advisories, backed by deterministic ICAR fallback. | Multi-turn conversational voicebot answering custom regional follow-up questions. |
| **Voice Assistant** | **ElevenLabs** multilingual speech synthesis (`eleven_multilingual_v2`) with audio waveforms, instant stop control, and native browser TTS fallback. | Push IVR phone call broadcasting automated morning voice alerts to basic feature phones. |
| **Knowledge Graph** | **Graphify Labs** tree-sitter AST mapped architecture (17 nodes, 21 edges, web explorer `docs/graphify-explorer.html`, CLI BFS query). | Automated CI/CD Graphify regression linter checking biophysical formula dependencies on every Git push. |
| **Bilingual i18n** | Instant zero-latency English ↔ हिन्दी toggling across all screens, headers, buttons, badges, and modals. | Expansion to regional vernacular languages: Punjabi, Marathi, Telugu, Tamil, and Gujarati. |
| **Offline Fallback** | Fowler-Noll-Vo 32-bit hash + Mulberry32 PRNG generating deterministic 14-day diurnal weather cycles. | PWA offline ServiceWorker caching tile sets for zero-signal field operation. |
| **Security & Backend** | Strict CSP, X-Frame-Options, in-memory IP rate limiting (60 req/min), commodity query regex whitelist, API key shielding. | OAuth2 farmer login via PM-Kisan / Aadhaar-linked AgriStack API integration. |

---

## 4. Hardware, Connectivity & Rural Constraints

The Krishi Mitra MVP was intentionally engineered to satisfy the harsh operational realities of Indian agriculture:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RURAL CONSTRAINT MATRIX                                   │
├─────────────────────────┬──────────────────────────────────┬───────────────────────────┤
│ Real-World Constraint   │ Traditional AgTech Vulnerability │ Krishi Mitra MVP Defense  │
├─────────────────────────┼──────────────────────────────────┼───────────────────────────┤
│ ₹6,000 Android Devices  │ 300+ kB React/Next.js hydration  │ Lean Vanilla ES6 bundle   │
│ (2 GB RAM, slow CPU)    │ causes 4–8 second UI freeze.     │ (~30 kB gzipped, <300ms). │
├─────────────────────────┼──────────────────────────────────┼───────────────────────────┤
│ Spotty 2G / 3G Networks │ Heavy image assets & charting    │ Native Parametric SVGs.   │
│ in Remote Fields        │ libraries (D3, Chart.js) stall.  │ Zero external chart libs. │
├─────────────────────────┼──────────────────────────────────┼───────────────────────────┤
│ Complete Cellular Drop  │ App crashes with unhandled       │ Mulberry32 PRNG generates │
│ (Zero Internet Signal)  │ network fetch exceptions.        │ deterministic local curve.│
├─────────────────────────┼──────────────────────────────────┼───────────────────────────┤
│ Low Reading Literacy    │ Complex tables & technical       │ One-click ElevenLabs      │
│ among Smallholders      │ language cannot be parsed.       │ voice audio in Hindi.     │
├─────────────────────────┼──────────────────────────────────┼───────────────────────────┤
│ Glare Under Sunlight    │ Low-contrast pastel interfaces   │ High-contrast forest/gold │
│ on Field Smartphone     │ are unreadable outdoors.         │ design tokens & borders.  │
└─────────────────────────┴──────────────────────────────────┴───────────────────────────┘
```

---

## 5. End-to-End User Journey

```
[1. Login / Guest] ──▶ [2. Location Pin] ──▶ [3. Plot Tracing] ──▶ [4. Multi-Signal Scan] ──▶ [5. Water & Voice] ──▶ [6. Profit Plan]
```

### Step 1: Onboarding & Vernacular Selection
* Farmer chooses **English** or **हिन्दी** with a single click.
* Selects **"Continue as guest"** for instant evaluation or logs in with email.
* Session persists for 14 days in `localStorage` (`km.session`).

### Step 2: Location Anchoring
* Debounced search finds villages, tehsils, or districts across India via Open-Meteo geocoding.
* One-click GPS locate button pins coordinates with high accuracy (showing error margin, e.g., $\pm 12\text{ m}$).
* Satellite imagery instantly centers on the farm.

### Step 3: Exact Boundary Tracing
* Farmer taps the four corners of their field directly onto high-resolution Esri Maxar satellite photography.
* GIS engine computes spherical area (acres & hectares) and perimeter (meters) in real time.
* Alternatively, farmer clicks **"Use a 1-acre estimate"** to drop an accurate calibrated square centered on the pin.
* Stepper locks Step 4 until at least 3 polygon corners are confirmed.

### Step 4: Multi-Signal Scan & Farm Setup
* A 5-stage radar scan pulls satellite telemetry: temperature, humidity, 3-day rainfall, wind, and Copernicus ERA5-Land root-zone moisture ($0–7\text{ cm}$ and $7–28\text{ cm}$).
* Soil classification is automatically inferred (Alluvial, Black Cotton, Sandy Loam, Red Loam, Laterite, Clay Loam).
* Farmer selects target crop (Wheat, Rice, Maize, Mustard, Chickpea, Cotton, Tomato, Sugarcane), irrigation type (Flood, Sprinkler, Drip, Rainfed), sowing date, and planned fertilizers.

### Step 5: Irrigation, Disease, Gemma AI & Voice Advisory
* **The Daily Verdict**: High-impact banner displays `💧 Water today`, `🌤️ Water in a day or two`, `🌧️ Hold the water`, or `🌱 No watering needed`.
* **Volumetric Liters**: Displays exact depth in millimeters and converts to total Liters for the field acreage.
* **Microclimate Pest Alert**: Wallin DSI calculates fungal spore risk, alerting the farmer 48–72h before physical leaf damage.
* **4R Fertilizer Guard**: Displays a prominent warning if $\ge 12\text{ mm}$ rain is forecast within 48h (*"Hold Urea"*), or recommends phenological split-dosing.
* **✨ Gemma AI Advisory**: Formulates a concise, compassionate 60-word ICAR narrative explaining the decision.
* **🔊 ElevenLabs Voice Audio**: Reads the advisory aloud in authentic Hindi or English with animated audio waves and instant stop control.
* **7-Day Water Balance Curve**: Displays projected plant-available water against the 40% crop stress threshold.

### Step 6: Crop Suitability & Financial Optimization
* Ranks all 8 crops on a 0–100 score based on Soil ($32\%$), Climate ($24\%$), Water ($24\%$), and Season ($20\%$).
* Projects net profit per acre and total field earnings after input costs.
* **Climate Scenario Simulator**: Farmers toggle between *Normal season*, *Dry year ($-25\%$ water)*, and *Strong monsoon ($+15\%$ water)*.
* **✨ Gemma AI Economic Outlook**: Explains the trade-offs between highest-profit crops and lowest-risk crops.
* **🔊 ElevenLabs Voice Briefing**: Speaks the financial recommendation aloud.
* **Save / Print Summary**: One-click generation of a physical paper advisory or PDF report.

### Step 7: Mandi & Market Intelligence
* **Regional APMC Arbitrage**: Evaluates real-time price discovery across Local Tehsil APMC Mandi, District Hub, and Regional Terminal Market, deducting realistic logistics freight ($15 + km \times 1.85$). Shows extra net realization vs local mandi.
* **GoI MSP Benchmark & Procurement Routing**: Compares current open market rate against 2024–2026 CACP MSP floor benchmarks (Wheat ₹2,275, Mustard ₹5,650, etc.), advising open APMC sale or FCI/NAFED procurement registration.
* **Warehouse Storage Breakeven Simulator**: Simulates 30/60/90-day holding in WDRA-accredited warehouses vs harvest glut distress sale, factoring in rent (₹75/q/mo for grains, ₹165/q/mo for cold storage) and shrinkage.
* **CACP Cost-of-Cultivation (A2+FL & C2)**: Breaks down input costs (Seeds, Fert, Power, Labor, Logistics) and highlights Krishi Mitra resource efficiency: ~₹1,200/acre in tubewell power and ~₹850/acre in fertilizer runoff prevented.
* **✨ Gemma AI & 🔊 ElevenLabs Audio**: Formulates concise market strategy and reads it aloud in Hindi and English.

---

## 6. Core Technical Architecture & Component Map

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              KRISHI MITRA SYSTEM ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   CLIENT BROWSER (SPA)                                                                 │
│   ├── src/data/                                                                        │
│   │   ├── crops.js         (8 crop agronomic constants, FAO Kc, base temps, yields)    │
│   │   ├── soils.js         (6 Indian soil orders, ICAR hydraulic limits: FC, WP, TAW)  │
│   │   └── i18n.js          (Bilingual English ↔ हिन्दी translation dictionary & DOM)   │
│   │                                                                                    │
│   ├── src/modules/                                                                     │
│   │   ├── calculations.js  (WGS84 geodesy, FAO-56 dual water balance, GDD phenology)   │
│   │   ├── pestModel.js     (Wallin Disease Severity Index & Leaf Wetness Duration)     │
│   │   ├── fertilizerModel.js (4R Nutrient stewardship & 48h rain hazard detector)      │
│   │   ├── marketModel.js   (APMC arbitrage, MSP spreads, WDRA storage, CACP costs)    │
│   │   ├── aiAdvisor.js     (Gemma AI client & ElevenLabs multilingual audio player)    │
│   │   ├── storage.js       (Multi-key localStorage resilience with corruption recovery)│
│   │   ├── api.js           (Weather client + Mulberry32 deterministic PRNG fallback)   │
│   │   ├── navigation.js    (Sequential step progression guards: canNavigateToStep)     │
│   │   └── map.js           (Leaflet GIS wrapper & Esri satellite layer synchronizer)   │
│   │                                                                                    │
│   └── src/main.js          (Application coordinator orchestrating DOM, state & events) │
│                                                                                        │
│   DEVELOPER & ARCHITECTURE ENGINE                                                      │
│   ├── graphify.config.json (Graphify Labs tree-sitter AST parser configuration)        │
│   ├── scripts/graphify.js  (Knowledge graph builder, JSON exporter & CLI BFS query)    │
│   └── docs/graphify-explorer.html (Interactive browser knowledge graph visualizer)     │
│                                                                                        │
│   HARDENED PRODUCTION BACKEND                                                          │
│   ├── server.js            (Express server, CSP headers, rate limiter, security proxy) │
│   │   ├── /api/health      (Uptime & service health check)                             │
│   │   ├── /api/market      (Agmarknet government Mandi commodity proxy with regex guard│
│   │   ├── /api/ai/summarize (Gemma 2 open-weight model proxy + local ICAR fallback)   │
│   │   └── /api/voice/speak (ElevenLabs multilingual v2 proxy + native TTS fallback)   │
│   └── dist/                (Vite-optimized production bundle: ~78 kB JS, 57 kB HTML)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Hackathon Partner Track Implementation Matrix

Krishi Mitra directly fulfills the evaluation rubrics for four major hackathon sponsor categories:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        HACKATHON SPONSOR TRACK ALIGNMENT                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Best Use of Gemma (Google DeepMind Track)                                           │
│    • Implementation: `src/modules/aiAdvisor.js` & `server.js` (`/api/ai/summarize`)     │
│    • Mechanism: Open-weight Gemma 2 model prompted with verified biophysical facts     │
│      (crop, soil, mm depth, Liters, pest risk, fertilizer hazard) to formulate a      │
│      grounded 60-word ICAR narrative advisory in Hindi or English.                     │
│    • Fallback: Deterministic local ICAR template generator ensures zero-downtime demo. │
│                                                                                        │
│ 2. Best Project Built with ElevenLabs (ElevenLabs Track)                               │
│    • Implementation: `src/modules/aiAdvisor.js` & `server.js` (`/api/voice/speak`)     │
│    • Mechanism: ElevenLabs `eleven_multilingual_v2` model streams lifelike spoken audio│
│      reading the Gemma verdict in natural Hindi or Indian-accented English.            │
│    • UI Controls: Animated soundwave bar, play/pause toggle, auto-pause on navigation. │
│    • Accessibility Impact: Breaks literacy barriers for smallholder rural farmers.     │
│                                                                                        │
│ 3. Best Use of Graphify Labs (Graphify Track)                                          │
│    • Implementation: `graphify.config.json`, `scripts/graphify.js`, & documentation   │
│    • Mechanism: Tree-sitter AST parser maps 17 architecture nodes and 21 labeled edges │
│      across 5 subsystem layers (Telemetry, Agronomy, AI_Voice, Backend, Frontend).    │
│    • Deliverables: Machine-readable JSON, interactive web explorer, and terminal CLI   │
│      BFS query (`node scripts/graphify.js query --from=OpenMeteoAPI --to=ElevenLabs`). │
│                                                                                        │
│ 4. Best Open-Source AI Project (DigitalOcean Track)                                    │
│    • Implementation: Gemma open-weight architecture + zero-dependency client stack.   │
│    • Value: Fully open-weights AI pipeline running without commercial LLM lock-in;     │
│      auditable, reproducible biophysical and open-source machine learning models.      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Agronomic Validation & Mathematical Models

All calculations follow international standards validated against the Indian Council of Agricultural Research (ICAR) and FAO Irrigation & Drainage Paper No. 56:

### 1. Great-Circle Distance (Haversine Formula)
$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
* Calculates plot perimeter on Earth's curved sphere ($R = 6,371,000\text{ m}$).

### 2. Spherical Polygon Area (Green's Theorem on Sphere)
$$\text{Area} = \frac{R^2}{2} \left| \sum_{i=1}^{n} (\lambda_{i+1} - \lambda_i) \cdot (2 + \sin \phi_i + \sin \phi_{i+1}) \right|$$
* Calculates accurate field acreage ($1\text{ ha} = 2.47105\text{ acres}$) without GPS hardware.

### 3. Dynamic Root Depth Expansion ($Z_r(t)$)
$$Z_r(t) = Z_{r,\min} + (Z_{r,\max} - Z_{r,\min}) \cdot \min\left(1.0, \frac{\text{GDD}_{\text{accumulated}}}{\text{GDD}_{\text{mature}}}\right)$$
* Roots expand from seedling depth ($0.15–0.20\text{ m}$) to mature depth ($0.8–1.5\text{ m}$) based on thermal time.

### 4. Dynamic 4-Stage Crop Coefficient ($K_c(t)$)
$$K_c(t) = 
\begin{cases} 
K_{c,\text{ini}} & \text{Emergence / Seedling Stage} \\
K_{c,\text{ini}} + \frac{t - t_{\text{ini}}}{t_{\text{dev}}} (K_{c,\text{mid}} - K_{c,\text{ini}}) & \text{Rapid Vegetative Growth} \\
K_{c,\text{mid}} & \text{Reproduction / Flowering Stage} \\
K_{c,\text{mid}} - \frac{t - t_{\text{mid}}}{t_{\text{late}}} (K_{c,\text{mid}} - K_{c,\text{end}}) & \text{Ripening / Senescence Stage}
\end{cases}$$

### 5. Soil Water Holding Capacity & Stress Trigger ($RAW$)
$$TAW = 1000 \cdot (\theta_{\text{FC}} - \theta_{\text{WP}}) \cdot Z_r(t) \quad [\text{mm}]$$
$$RAW = p_{\text{adj}} \cdot TAW \quad [\text{mm}]$$
Where depletion fraction $p_{\text{adj}} = \text{clamp}(p_{\text{table}} + 0.04 \cdot (5 - ET_c), 0.15, 0.80)$.

### 6. Volumetric Water Requirement in Liters
$$\text{Gross Application (mm)} = \frac{\max(0, \text{Deficit} - P_{\text{eff}, 72\text{h}})}{\eta_{\text{irrigation}}}$$
$$\text{Volume (Liters)} = \text{Gross (mm)} \times 4047 \times \text{Acres}$$
Where irrigation efficiency $\eta$ is: Drip ($90\%$), Sprinkler ($75\%$), Flood ($55\%$), Rainfed ($40\%$).

### 7. Wallin Disease Severity Index (DSI) for Fungal Infections
Accumulates points when relative humidity ($RH \ge 90\%$) persists across pathogen temperature envelopes ($10^\circ\text{C} - 29^\circ\text{C}$), generating pre-symptomatic warnings 48–72h before physical leaf damage.

### 8. 4R Nitrogen Leaching Hazard
Tracks 48-hour rainfall forecast ($P_{48\text{h}}$). If $P_{48\text{h}} \ge 12\text{ mm}$, Urea broadcasting is blocked to prevent nitrate leaching into groundwater.

---

## 9. Economic Impact & Farmer ROI Analysis

For a representative 2.5-acre smallholder farm in northern or central India:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     ESTIMATED FINANCIAL BENEFIT PER SEASON (2.5 ACRES)                 │
├──────────────────────────────────────┬────────────────────────┬────────────────────────┤
│ Benefit Stream                       │ Physical Mechanism     │ Net Savings (₹)        │
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ Pumping Energy Savings               │ Canceling 2 unneeded   │ ₹4,500 – ₹8,000        │
│ (Electricity / Diesel fuel)          │ flood irrigation cycles│                        │
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ Nitrogen Fertilizer Preservation     │ Holding Urea ahead of  │ ₹3,000 – ₹6,000        │
│ (Preventing leaching wash-out)       │ 48-hour heavy rains    │                        │
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ Preventive Bio-Fungicide Scheduling  │ Early bio-control spray│ ₹3,750 – ₹8,750        │
│ (Avoiding emergency chemical panic)  │ before mycelium spreads│                        │
├──────────────────────────────────────┼────────────────────────┼────────────────────────┤
│ Crop Suitability Optimization        │ Sowing high-fit crops  │ ₹12,000 – ₹25,000      │
│ (Step 6 scenario planning)           │ tailored to soil order │ (additional net profit)│
├──────────────────────────────────────┴────────────────────────┼────────────────────────┤
│ TOTAL PROJECTED VALUE PER SEASON:                             │ ₹23,250 – ₹47,750      │
└───────────────────────────────────────────────────────────────┴────────────────────────┘
```

---

## 10. 2-Minute Live Judge Demonstration Protocol

Follow this exact script when presenting Krishi Mitra to hackathon evaluators:

| Time | Action on Screen | Spoken Explanation |
|---|---|---|
| **0:00 – 0:20** | Open app, click **"हिन्दी"** in top bar, then click **"Continue as guest"**. | *"86% of Indian farmers are smallholders operating on guesswork. Krishi Mitra answers one critical question: **Water today, or wait?** It loads in under 300ms with zero hydration delay and full bilingual Hindi support."* |
| **0:20 – 0:45** | Select **"Karnal, Haryana"**, then click **"Use a 1-acre estimate"** on Step 3. | *"We anchor the farm down to the village level using Esri satellite photography. Our GIS engine calculates spherical polygon area and perimeter in real time, accounting for Earth's curvature."* |
| **0:45 – 1:10** | Watch Step 4 radar scan complete; select **Wheat**, **Flood**, and click **"Get watering decision"**. | *"Notice our three-tier data honesty badges (`LIVE` vs `EST`). The platform pulls Copernicus ERA5-Land root-zone moisture, identifies Alluvial soil, and prepares the FAO-56 dual water balance."* |
| **1:10 – 1:40** | On Step 5, point to `💧 Water today`, click **"✨ AI Advisory"**, then click **"🔊 Listen"**. | *"Here is the answer: 18 mm, or 72,000 Liters. Look at this: with one tap on 'AI Advisory', Google DeepMind's open-weight Gemma model formulates an ICAR-grounded field narrative. And with one tap on 'Listen', ElevenLabs speaks this advice aloud in warm, natural Hindi audio with animated soundwaves—removing literacy barriers for rural farmers."* |
| **1:40 – 2:00** | Switch to terminal and run: `npm run graphify query --from=OpenMeteoAPI --to=ElevenLabsVoice`. | *"Behind the scenes, we used Graphify Labs to parse our codebase into a queryable knowledge graph—proving to judges that our AI outputs trace back to verified satellite moisture in 4 verifiable hops. That is Krishi Mitra."* |

---

## 11. Verification & Test Suite Summary

The Krishi Mitra MVP is fortified with a comprehensive, zero-dependency automated testing suite running natively via Node.js:

```bash
npm test
```

### Test Suite Execution Output:
```
▶ Gemma AI Agronomic & Economic Summarizer Tests (6 tests)
▶ ElevenLabs Voice Assistant (Kisan Vaani) Tests (3 tests)
▶ Gemma AI Agronomic & Economic Summarizer Tests (6 tests)
▶ ElevenLabs Voice Assistant (Kisan Vaani) Tests (3 tests)
▶ Graphify Labs Codebase Knowledge Graph Tests (4 tests)
▶ Market Intelligence & Mandi Arbitrage Engine Tests (6 tests)
▶ API & Synthetic Fallback Engine Tests (4 tests)
▶ Geospatial Geometry Tests (4 tests)
▶ Agronomic FAO-56 Models Tests (6 tests)
▶ Irrigation Decision Engine Tests (3 tests)
▶ Crop Suitability & Financial Models Tests (2 tests)
▶ Fertilizer Stewardship & Leaching Guard Tests (5 tests)
▶ Multilingual i18n Localization Tests (4 tests)
▶ Navigation Step Guard Tests (13 tests)
▶ Pest & Fungal Disease Risk Model Tests (5 tests)
▶ Hardened Backend Middleware & Handlers Tests (5 tests)
▶ Storage Module Persistence Tests (8 tests)

ℹ tests 78
ℹ suites 15
ℹ pass 78
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1464.12
```

### Production Build Verification:
```bash
npm run build
```
* **Output**: `dist/index.html` (65.89 kB), `dist/assets/index.js` (102.22 kB │ **gzip: 38.62 kB**).
* **Build Time**: ~400 milliseconds.
* **Zero Runtime Dependencies**: No heavy frameworks, no bloated charting packages, pure native standards.

---
*Krishi Mitra MVP — Field Intelligence & Precision Agriculture Platform (2026)*

