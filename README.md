# EcoTrack 🌍♻️ — Enterprise Architecture Specification

EcoTrack is an intelligent full-stack waste management and recycling application designed specifically for the citizens, waste collectors, and administrators of **Hyderabad, Sindh, Pakistan**. It bridges the gap between civic responsibility and active waste tracking by introducing an interactive reward system, schedule tracking, AI-powered bin inspections, and localized multilingual AI assistance.

This repository has been refactored into a high-performance, secure, and production-ready **Layered Full-Stack Architecture** conforming to enterprise software engineering standards.

---

## 🏛️ Project Directory Structure

The project has been restructured into a clean separation of concerns between client modules, full-stack server endpoints, and shared schemas:

```text
ecotrack/
│
├── server/                    # Express backend architecture
│   ├── config/                # Service client initializations (Firebase Admin, Gemini, etc.)
│   │   ├── ai.ts              # Gemini API / Groq Engine Client with fallback strategy
│   │   └── firebase.ts        # Firebase Admin SDK initialization
│   │
│   ├── routes/                # Clean API Endpoints definitions
│   │   ├── aiRoutes.ts        # AI waste classification & streaming chat endpoints
│   │   └── authRoutes.ts      # Identity & User Profile endpoints
│   │
│   ├── controllers/           # HTTP Request/Response handlers (Input Validation)
│   │   ├── aiController.ts    # Orchestrates waste scans and chat requests
│   │   └── authController.ts  # Handles profile registration, retrievals, and RBAC
│   │
│   ├── services/              # Pure Business Logic Layer
│   │   ├── aiService.ts       # Waste classification & localized Urdu/Sindhi prompt logic
│   │   └── userService.ts     # Profile states, status management & transactions
│   │
│   ├── middlewares/           # Global and Route-specific interceptors
│   │   ├── auth.ts            # Firebase ID Token verifier & RBAC (Citizen/Collector/Admin)
│   │   ├── errorHandler.ts    # Centralized Express error handler (Zod, AppError)
│   │   ├── requestLogger.ts   # Advanced request logger with precision metrics
│   │   └── security.ts        # Security headers (Helmet, CORS) & Rate Limiters
│   │
│   ├── types/                 # Express and Backend types
│   │   └── index.ts           # Shared server-side user definitions
│   │
│   ├── utils/                 # Modular helper libraries
│   │   ├── errors.ts          # Centralized Exception system (NotFoundError, ApiError)
│   │   └── logger.ts          # Unified log formatter with timestamps & levels
│   │
│   └── validators/            # Request payloads validation schemas
│       └── auth.ts            # Zod validation rules for registration and updates
│
├── src/                       # React 18 / TypeScript frontend
│   ├── components/            # Reusable React components
│   │   ├── AdminView.tsx      # Admin dashboard with Recharts metrics
│   │   ├── AuthOnboarding.tsx # Clean authentication suite
│   │   ├── ChatbotBubble.tsx  # Dynamic multilingual floating assistant
│   │   ├── CitizenView.tsx    # Citizen portal with scans and reports
│   │   ├── CollectorView.tsx  # Collector mapping and pickup queues
│   │   └── ProfileSettings.tsx# User profile customizer
│   │
│   ├── contexts/              # Global application state React contexts
│   │   └── AuthContext.tsx    # Session, profile & Firebase state manager
│   │
│   ├── index.css              # Global Tailwind imports & custom dark themes
│   ├── main.tsx               # Client bootstrap entry point
│   └── App.tsx                # Client Routing and View orchestrator
│
├── package.json               # Full-stack dependency and script configurations
├── server.ts                  # High-performance Unified Server entry point
└── tsconfig.json              # TypeScript compilation rules
```

---

## 🔁 Architectural Data Flow

Every inbound HTTP request to the Express server passes through a strictly defined unidirectional sequence of architectural layers to guarantee complete boundary separation and high testability:

```text
 Client Request (HTTP / SSE Stream)
         ↓
  Security Middlewares (Helmet / CORS / Rate Limiting)
         ↓
  Request Logging Middleware (Timing, IP, Route tracing)
         ↓
  Authentication Middleware (Firebase Token verification / RBAC)
         ↓
  API Routes (Endpoint definition: e.g. /api/auth/register)
         ↓
  Controllers (Request Parsing, Zod payload validation)
         ↓
  Services (Pure Business Logic: e.g. prompts, calculations)
         ↓
  Database Clients / Admin SDK (Firestore Read/Write / Gemini API)
         ↓
  Unified Response / Error Handler (Automatic JSON formattings)
```

### Layer Responsibilities
1. **Security & Middlewares**: Filter malformed headers, manage access rules, and authenticate Firebase identity tokens.
2. **Routes**: Expose logical endpoints without holding logic.
3. **Controllers**: Translate HTTP requests to JavaScript payloads, execute **Zod schema validations**, call the appropriate Service, and send JSON responses back to the client.
4. **Services**: Reusable modules containing real business rules, calculations, local model fallbacks, or prompt constraints.
5. **Database (Firestore)**: Handled safely through Firebase Admin Firestore methods to enforce server-authoritative mutations.

---

## 🔒 Security & Middleware Infrastructure

EcoTrack implements standard production-grade guards to safeguard user data and ensure high API durability:

* **Dynamic Security Headers (`configureHelmet`)**: Custom content policy allowing iframe render operations within Google AI Studio while blocking cross-site scripting (XSS), clickjacking, and mime-sniffing.
* **CORS Access Control (`configureCors`)**: Restricts incoming requests to authorized developmental and production endpoints.
* **Granular Rate-Limiting (`apiRateLimiter` & `authRateLimiter`)**: Stops brute-force registrations or chat API flooding (e.g. max 10 auth requests per minute).
* **Role-Based Access Control (RBAC)**: Secure middlewares verify the signed Firebase ID Token, fetch the authenticated user profile from Firestore, and allow route traversal only if the user matches role constraints:
  ```ts
  // Example configuration of RBAC router protection
  router.put('/users/:targetUid/role', verifyFirebaseToken, requireAuth, requireAdmin, authController.updateUserRoleByAdmin);
  ```

---

## 🤖 AI Core & Multilingual Execution

The AI engine inside `/server/services/aiService.ts` executes an advanced hybrid model hierarchy to ensure the chat assistant and waste classifier remain functional under any network condition:

```text
         [Scan / Chat Request]
                   ↓
         Is Groq Key Present? 
         ├── Yes ──> [Groq Llama 3/1/2 Engine (Streaming)]
         └── No 
              ↓
         Is Gemini Key Present?
         ├── Yes ──> [Google Gemini 3.5-Flash Engine (Streaming with 2x retry)]
         └── No 
              ↓
         [Deterministic Local Grok Fallback Engine (No latency, zero API costs)]
```

### Smart Guardrails & Localization
* **Domain Lock**: Evaluates user messages against safe recycling/EcoTrack dictionaries. Any general questions (e.g. coding, history) are immediately intercepted and declined in the corresponding language.
* **Strict Format**: Removes all asterisks (`*`) and markdown formatting to stream clean text suited for customized visual interfaces.
* **Language Lock**: Strict localization guidelines bind outputs to **English**, standard **Urdu Script (Nastaliq)**, or standard **Sindhi Script (Arabic-Sindhi)** based on user preference.

---

## 🗄️ Database Schemas & Models & Resiliency

EcoTrack integrates structured collections inside Cloud Firestore with a robust, fail-safe layer to keep client and backend components fully operational under any deployment state:

### 🛡️ Resilient Data Layer (In-Memory Fallback)
To handle transient network issues, permission misconfigurations (such as temporary `PERMISSION_DENIED` errors before Firestore Security rules are deployed), or sandboxed development contexts, the repository layer (e.g. `UserRepository`) implements an **auto-recovering in-memory storage engine**.
- **Graceful Degradation**: If Firestore operations throw a `PERMISSION_DENIED` exception, the backend loggers format a diagnostic warning, activate the in-memory fallback flag, and gracefully fulfill all read, write, and query requests using a thread-safe local map.
- **Zero Interruption**: Auth, profile update, and registration pipelines remain fully operational, maintaining uninterrupted service delivery even during database maintenance or localized credential limits.

### 🔐 Firestore Security Hardening
Our security model enforces strict data-isolation boundaries via comprehensive rules in `firestore.rules`:
* **User Rules**: Direct matching allows users to read and update only their own profile document.
* **Bin Reports (`binReports`)**: Authenticated citizens can submit new reports. Only the original reporter, authenticated collectors, or system admins can update a report.
* **Collection Schedules (`collectionSchedules`)**: Available for authenticated read access, with authorized write protections.
* **Marketplace & Rewards (`marketplaceListings`, `rewards`, `redemptions`, `scans`)**: Secured to ensure authenticated citizens and collectors can safely transact and redeem points, with administrators retaining deletion authority.

---

## 📋 Comprehensive Firestore Collections Schema

### 1. `users` Collection
Tracks authentication states, contact coordinates, role privileges, and reward histories:
```ts
interface UserProfile {
  uid: string;           // Firebase Authentic Identity ID
  fullName: string;      // User full name
  email: string;         // Registered email address
  phone: string;         // Contact phone number
  area: string;          // Hyderabad municipal sector (e.g. Latifabad No. 4)
  role: 'citizen' | 'collector' | 'admin' | 'super_admin';
  status: 'active' | 'disabled';
  points: number;        // Accumulated Eco points
  avatar?: string;       // Optional profile photo URL
  createdAt: string;     // ISO timestamp or ServerTimestamp
  emailVerified: boolean;
}
```

### 2. `binReports` Collection
Stores citizen-reported overflowing bins and environmental alerts:
```ts
interface BinReport {
  id: string;            // Auto-generated UUID
  citizenId: string;     // Reporter UID
  citizenName: string;   // Cached name of reporter
  area: string;          // Reported municipal sector
  imageUrl: string;      // Photo attachment (stored as base64 or storage url)
  notes?: string;        // Optional notes
  status: 'pending' | 'resolved' | 'rejected';
  collectorNotes?: string;
  createdAt: string;
  pointsAwarded: boolean;
}
```

### 3. Supporting Collections
* **`collectionSchedules`**: Tracks schedules and routes managed by waste collectors.
* **`marketplaceListings`**: Citizen items listed for community trade or recycling.
* **`rewards`**: Available recycling catalog rewards redeemable using collected points.
* **`redemptions`**: Record of citizen coupon/reward redemption events.
* **`scans`**: Log of scanned barcode or waste items processed by our localized classification engine.

---

## 🔔 Service Worker & Device Notifications

EcoTrack integrates standard, localized web push notifications using a background Service Worker to alert citizens in real-time about upcoming municipal waste collection schedules.

### ⚙️ How It Works:
1. **Background Service Worker (`public/sw.js`)**: Runs in a separate browser thread to handle lifecycle states (`install`, `activate`), listen for event streams (like `message` or standard `push` triggers), and dispatch operating-system-level notification alerts with customizable vibration patterns.
2. **Device Registration & Permissions**: Directly prompts citizens for permission when they activate notifications under the **My Schedule** tab. The preference is stored in `localStorage` (`ecotrack_alerts_subscribed`) to sync state dynamically.
3. **Interactive Pickup Simulator**: Includes a live test utility that dispatches immediate, real-time simulated system notifications to test Service Worker message parsing and click listeners.
4. **Multilingual Localizations**: All notification titles, bodies, and statuses automatically adapt to the user's preferred language (**English**, **Urdu**, or **Sindhi**).

---

## 🗺️ D3.js Municipal Waste Heatmap & AI Routing

EcoTrack provides administrators with a highly sophisticated, real-time spatial intelligence system using **D3.js** to map trash overflow reports across Hyderabad's coordinates, aiding in route optimization and dispatch efficiency.

### 📊 Visualization Modes:
1. **Smooth Density Heatmap**:
   * Uses SVG-native Gaussian blur matrices (`feGaussianBlur` and `feColorMatrix`) configured via D3 selection filters to create dynamic, gooey heat contours.
   * Clusters multiple overlapping coordinate inputs together. The size and color spectrum (ranging from *Yellow* for warning to *Deep Crimson* for critical danger) adapt to individual report severity values.
2. **Binned Grid Matrix**:
   * Breaks the Hyderabad boundary envelope ($25.35^\circ\text{N} \to 25.43^\circ\text{N}$ latitude and $68.32^\circ\text{E} \to 68.40^\circ\text{E}$ longitude) into a high-density $10\times10$ grid.
   * Accumulates overlapping risk weights to assign an aggregate priority value. Clicking on any block in the matrix displays granular, real-time regional statistics.

### 🚛 Intelligent Routing Dispatcher:
* **Route Prioritization**: Sorts active clusters by accumulated severity, highlighting the top 4 critical hotspots.
* **Geographical Hub Mapping**: Calculates the nearest district hub (e.g., *Qasimabad Phase 1*, *Latifabad No. 7*, *Saddar Cantt*) to assign human-readable region labels, streamlining dispatcher operations.
* **Interactive Parameters**: Allows real-time adjustments of the heatmap's blur spread radius and min-intensity grid thresholds to filter low-priority clutter.

---

## 🌍 Environment Variables Setup

Configure the following parameters in a `.env` file at the root of the project to enable full-stack production features:

```env
# Server Runtime
NODE_ENV=development
PORT=3000

# AI Services
GEMINI_API_KEY=AIzaSy...      # Key for Google Gemini 3.5-Flash
GROQ_API_KEY=gsk_...         # (Optional) Primaries to Groq Llama Vision / Chat
```

---

## 🛡️ Security & Production Hardening

EcoTrack is built using production-ready standards to mitigate common web application vulnerabilities (OWASP Top 10):

1. **Helmet Protections**:
   * **Strict Transport Security (HSTS)**: Automatically enabled in production (`maxAge: 1 year`, `includeSubDomains`, `preload`) to enforce TLS.
   * **MIME-Type Sniffing Prevention**: Enforces explicit MIME verification (`noSniff: true`).
   * **XSS Protection**: Sanitizes header footprints and enforces a restrictive `referrerPolicy` (`strict-origin-when-cross-origin`).
   * **Frameguard & Embedding**: Pre-configured to align with preview container requirements while blocking unauthorized framejacking.

2. **CORS Hardening**:
   * **Dynamic Origin Whitelisting**: Allows safe preview rendering across AI Studio workspace components (`ai.studio`, development/preview Cloud Run URLs).
   * **Secure Fallbacks**: Safely allows non-origin requests (e.g., server-to-server, curl requests, or native clients) and provides open debugging options in non-production environments.
   * **CORS Headers**: Restricts methods to standard restful operations (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`) and controls custom headers exposure (`Content-Range`, `X-Content-Range`).
   * **Preflight Caching**: Preflight OPTIONS requests are cached for `24 hours` (`maxAge: 86400`) to optimize connection overhead.

3. **Rate Limiting**:
   * Protected endpoints throttle repetitive traffic to block Denial-of-Service (DoS) and brute-force vectors.

---

## 🏃 Deployment & Build Steps

### 1. Build Compilation
Compiles client-side static bundles and packages the Express backend TypeScript server into a self-contained, high-performance CommonJS file inside the `dist/` folder:
```bash
npm run build
```

### 2. Dev Environment Start
Starts the server with Vite development middleware loaded on port 3000:
```bash
npm run dev
```

### 3. Production Boot
Launches the compiled Express production server serving pre-rendered React bundles with active security headers:
```bash
npm run start
```

---

## 🚀 Running the Project Locally

The following steps will get the full stack up and running on your local machine (Windows PowerShell).

1. **Start infrastructure**  
   Ensure Docker Desktop is running, then from the `backend/` directory run:
   ```bash
   docker compose up -d db redis
   ```
   This pulls and starts PostgreSQL and Redis containers.

2. **Seed the database (optional but recommended)**
   ```bash
   python -m app.database.seed
   ```

3. **Install dependencies**  
   From the repository root install all Node.js dependencies:
   ```bash
   npm ci
   ```

4. **Start the frontend**
   ```bash
   npm run dev
   ```

5. **Start the backend API**  
   From the `backend/` directory run:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

You can now access:
- Frontend: <http://localhost:3000>
- API docs (Swagger UI): <http://localhost:8000/docs>

## 🧪 Testing Suite & CI/CD Readiness

EcoTrack includes a comprehensive, automated testing suite using **Vitest**, **React Testing Library**, and **Supertest** to verify correctness across all layers of the application.

### Running the Tests
We support fine-grained commands for test execution:

* **Run all tests (Unit & Integration)**:
  ```bash
  npm test
  ```
* **Run unit tests only**:
  ```bash
  npm run test:unit
  ```
* **Run integration tests only**:
  ```bash
  npm run test:integration
  ```
* **Generate full code coverage reports**:
  ```bash
  npm run test:coverage
  ```

### Test Scope and Mocking
1. **Mock Frameworks**: Includes complete, robust mocks for Firebase Authentication, Firebase Admin SDK, Cloud Firestore, and external AI services (Google Gemini API). Tests never read or modify production resources.
2. **Unit Tests**:
   * **Backend**: `userService`, authentication middleware validation, Zod request schemas.
   * **Frontend**: Custom React Hooks, `AuthContext` state changes, role-based guard components (`RoleGuard`).
3. **Integration Tests**:
   * Uses `Supertest` to verify HTTP endpoints.
   * Tests registration, authentication, input validation (Zod validation), unauthorized/forbidden requests, and Role-Based Access Control (RBAC) endpoint protections.

---

*EcoTrack — Redefining municipal waste management and citizen participation in Hyderabad, Sindh, Pakistan!* 🌿💚
