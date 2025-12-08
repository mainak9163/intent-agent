

# 🚀 **Intent Classification Service**

The **Intent Classification Service** converts natural-language monitoring requests into structured machine-readable *Intent Objects* using **Google Gemini 2.5 Pro**.

It serves as the **Intent Agent** in our AI-powered multi-agent observability pipeline:

```
User Prompt → Intent Agent → Data Agent → Analysis Agent → Report Agent
```

This service is built with:

* **Node.js + Express**
* **TypeScript**
* **Google Gemini 2.5 Pro**
* **Strict JSON-mode prompting**
* **Error-safe output cleaning & validation**

---

# 📁 **Project Structure**

```
api/
├── app.ts                     → Express App
├── index.ts                   → app.listen entry point
│
├── config/
│   └── gemini-client.ts        → Gemini API client setup
│
├── controllers/
│   └── intent.controller.ts   → Handles classify requests
│
├── services/
│   └── intent-service.ts       → Gemini-powered classification logic
│
├── constants/
│   └── intent-schema.ts        → Full taxonomy (6 classes + subclasses)
│
├── middlewares/
│   ├── error-handler.ts
│   └── request-logger.ts
│
└── types/
    └── intent.types.ts        → TS interfaces for request & response
```

---

# ⚙️ **Setup**

### 1. Install dependencies

```sh
npm install
```

### 2. Add environment variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_google_api_key_here
PORT=3000
```

### 3. Start the server

```sh
npm run dev
```

Server runs at:

```
http://localhost:3000
```

---

# 🔌 **API Endpoints**

## **GET /**

Root check.

**Response:**

```json
{
  "message": "Intent-Agent API running",
  "endpoints": {
    "health": "/health",
    "classify": "/v1/intent/classify"
  }
}
```

---

## **GET /health**

**Response:**

```json
{ "status": "ok" }
```

---

## **POST /v1/intent/classify**

The main endpoint that produces a structured *Intent Object*.

### **Request Body**

```json
{
  "prompt": "Monitor for brute-force login attempts.",
  "mode": "online",
  "locale": "en",
  "organizationContext": {
    "orgType": "enterprise",
    "environment": "prod",
    "logSources": ["vpn", "auth", "firewall"]
  }
}
```

### Request Fields:

| Field                 | Type                 | Required | Description                         |
| --------------------- | -------------------- | -------- | ----------------------------------- |
| `prompt`              | string               | ✔        | Natural-language monitoring request |
| `mode`                | "online" | "offline" | ❌        | Default: "online"                   |
| `locale`              | string               | ❌        | Language hint                       |
| `organizationContext` | object               | ❌        | Helps refine classification         |

---

# 📄 **Intent Response Format**

Example response:

```json
{
  "success": true,
  "timestamp": "2025-02-15T12:34:56.000Z",
  "data": {
    "intent_class_id": "security",
    "intent_class_label": "Security Intent",
    "candidate_subclasses": ["Brute Force Attack Detection"],
    "confidence": 0.92,

    "analysis_goals": [
      "Detect repeated authentication failures",
      "Identify high-risk login attempts"
    ],

    "suggested_filters": {
      "time_window": "last 1h",
      "entities": ["ip", "user"],
      "log_sources": ["auth", "vpn"]
    },

    "metrics_of_interest": [
      "failed_login_count",
      "unique_failed_sources"
    ],

    "analysis_techniques": [
      "Anomaly Detection",
      "Correlation Analysis"
    ],

    "mode": "online",

    "reporting": {
      "summary_scale": ["Good", "Warning", "Bad"],
      "priority": "High",
      "notes_for_report_agent": "Escalate if failure events exceed threshold"
    },

    "reasoning": "Multiple login failures imply brute force patterns."
  }
}
```

---

# 🧠 **How the Model Works**

The service uses:

```
gemini-2.5-pro
```

with **strict JSON-only output**:

```ts
generationConfig: {
  response_mime_type: "application/json",
  temperature: 0.2
}
```

It also:

* Removes ``` fences
* Removes markdown
* Validates JSON
* Throws clean errors

---

# 🧩 **Intent Taxonomy Overview**

Your taxonomy includes 6 major intent classes:

1. **Security Intent**
2. **Performance Intent**
3. **Availability & Reliability Intent**
4. **Compliance & Audit Intent**
5. **Usage & Analytics Intent**
6. **Operational & Infrastructure Intent**

Each class contains 8–20+ deeply detailed subclasses (from your classification research PDF).

---

# 🧪 **Example Prompts**

### Security:

> “Alert when multiple failed logins occur from the same IP.”

### Performance:

> “Detect spikes in API latency beyond 500ms.”

### Compliance:

> “Monitor unauthorized access to PHI records.”

### Operational:

> “Identify Kubernetes pods entering CrashLoopBackoff.”

---

# ❗ Error Handling

Errors return structured JSON:

```json
{
  "success": false,
  "message": "Gemini returned invalid JSON. Check logs for raw output."
}
```

This happens if:

* Gemini outputs markdown
* JSON is malformed
* Model API returns 4xx or 5xx

Your service logs the *raw Gemini output* for debugging.

---

# ❤️ Contributing

Feel free to submit issues or enhancements:

* Optimization of intent prompts
* Expansion of taxonomy
* Additional agents (data / analysis / report)
* Streaming model support

---

# 📜 License

MIT License — free for personal and commercial use.

---

