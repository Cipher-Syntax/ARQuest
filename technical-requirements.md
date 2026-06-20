# ARQuest — Technical Requirements & Tools

---

## 1. Technical Requirements

### Hardware Requirements

#### Developer Machine (for coding & running the system)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 8 GB | 16 GB |
| **Processor** | Intel Core i5 (8th Gen) / AMD Ryzen 5 3000 series | Intel Core i7 (10th Gen+) / AMD Ryzen 7 5000+ |
| **Storage** | 20 GB free SSD space | 50 GB+ SSD |
| **Display** | 1280 × 720 | 1920 × 1080 (dual monitor helpful) |
| **Internet** | Stable broadband | Stable broadband |

> **Why 20 GB?** Node.js `node_modules` (~1–2 GB), Python `venv` (~500 MB), Android SDK if using emulator (~8 GB), project assets (3D models, panoramas), and PostgreSQL data.

#### End-User Device (Android phone running the ARQuest mobile app)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 3 GB | 4 GB+ |
| **Processor** | Snapdragon 660 / MediaTek Helio G85 or equivalent | Snapdragon 700 series+ |
| **Storage** | 200 MB free (app + cached assets) | 500 MB+ |
| **OS** | Android 10 (API Level 29) | Android 12+ |
| **GPS** | Required (built-in GPS sensor) | Required |
| **Camera** | Required (for AR-style camera overlay) | Required |
| **Gyroscope** | Required (for Professional Virtual Tour) | Required |
| **Internet** | Required for initial load and sync | Wi-Fi or 4G LTE |

---

### Software Requirements

#### Developer Environment

| Software | Version | Purpose |
|----------|---------|---------|
| **Windows** | 10 / 11 (64-bit) | Host OS for development |
| **Python** | 3.10+ | Django backend runtime |
| **Node.js** | 18 LTS+ | Expo / React Native / Vite |
| **npm** | 9+ | JavaScript package manager |
| **PostgreSQL** | 14+ | Primary relational database |
| **Expo CLI** | Latest | Mobile app build & dev server |
| **Expo Go** *(phone app)* | Latest | Live testing on physical Android device |
| **Git** | 2.x+ | Version control |

#### Admin Web Dashboard (for Admins)

| Software | Requirement |
|----------|-------------|
| **Google Chrome** | Version 110+ (recommended) |
| **Microsoft Edge** | Version 110+ (compatible) |
| **Firefox** | Version 115+ (compatible) |

> The admin dashboard is a React/Vite web app. Any modern Chromium-based browser works. Internet Explorer is **not supported**.

#### Mobile App (for Students, Accreditors, Visitors)

| Software | Requirement |
|----------|-------------|
| **Android OS** | Android 10 (API 29) minimum |
| **Expo Go** *(during development/testing)* | Latest from Google Play |
| **ARQuest APK** *(production)* | Installed via APK sideload or Play Store |

---

### Network Requirements

#### Developer (during development)

| Scenario | Minimum Speed |
|----------|--------------|
| Installing npm packages (`node_modules`) | 10 Mbps+ |
| Installing Python packages (`pip`) | 5 Mbps+ |
| Expo hot-reload over local Wi-Fi | Stable LAN (same Wi-Fi network as phone) |
| Pushing to GitHub / pulling from GitHub | 5 Mbps+ |
| Uploading 3D models / panoramas to storage | 10 Mbps+ upload |

#### End User (running the mobile app)

| Scenario | Minimum Speed |
|----------|--------------|
| App initial load (building list, assets) | 5 Mbps |
| Loading a 3D building model (.glb) | 5 Mbps (models are cached after first load) |
| Loading panorama walkthrough images | 5 Mbps |
| GPS geofence validation (lightweight API call) | 1 Mbps |
| Offline (after assets cached) | No internet required for cached content |

> **GPS Note:** GPS signal itself does not require internet — it uses satellite signals. However, the backend geofence validation call requires a live network connection.

---

## 2. Tools & Technology

### Languages & Frameworks

| Tool | Version | Role |
|------|---------|------|
| **Python** | 3.10+ | Backend language |
| **Django** | 4.2+ | Web framework for the backend API |
| **Django REST Framework (DRF)** | 3.14+ | RESTful API layer |
| **SimpleJWT** | Latest | JWT authentication (access + refresh tokens) |
| **JavaScript (ES2022+)** | — | Frontend language (mobile + web) |
| **TypeScript** | Partial (strict mode) | Type safety in mobile app |
| **React Native** | 0.73+ (via Expo SDK 51) | Cross-platform mobile app framework |
| **Expo** | SDK 51+ | Managed React Native workflow and device APIs |
| **React** | 19 | Admin web dashboard UI framework |
| **Vite** | 5+ | Admin web build tool and dev server |
| **React Router DOM** | 6+ | Client-side routing in admin dashboard |
| **Three.js** | r160+ | 3D building model rendering inside WebView |
| **Axios** | 1.x | HTTP client for API calls (admin web) |
| **Leaflet / React-Leaflet** | 4.x | Interactive maps in admin dashboard |
| **Expo Location API** | Latest | GPS tracking and geolocation on mobile |
| **Expo Camera API** | Latest | AR-style camera feed on mobile |
| **Expo SecureStore** | Latest | Secure JWT token storage on device |

---

### Database & Cloud

| Tool | Role |
|------|------|
| **PostgreSQL 14+** | Primary relational database — stores users, buildings, geofences, quests, panoramas, progress |
| **Django Media Storage** | Local file storage for 3D models (.glb) and building images during development |
| **Cloudinary** | Cloud-based panorama image hosting and delivery (used for 360° walkthrough images) |
| **psycopg2** | PostgreSQL adapter for Python/Django |

---

### IDEs / Editors

| Tool | Purpose |
|------|---------|
| **Visual Studio Code** | Primary code editor for all layers (backend, mobile, web) |
| **Django Admin** *(browser-based)* | Backend data management interface (built into Django) |
| **Expo Dev Tools** *(browser-based)* | Mobile app diagnostics and QR code launcher |

---

### Dev Utilities

| Tool | Purpose |
|------|---------|
| **Postman** | API endpoint testing and documentation — used for testing all DRF endpoints manually |
| **Git** | Source code version control |
| **GitHub** | Remote repository hosting, branching, and collaboration |
| **Figma** | UI/UX wireframing and design mockups before implementation |
| **pgAdmin 4** | PostgreSQL database GUI for inspecting data and running queries |
| **Expo Go** *(Android app)* | Live physical device testing without building an APK |
| **django-anymail + Brevo (Sendinblue)** | Transactional email delivery for OTP verification |
| **qrcode.react** | QR code generation in the admin dashboard for building QR unlock codes |

---

> **Summary:** ARQuest requires a mid-range developer machine running Windows 10/11, Python 3.10+, Node.js 18+, and PostgreSQL 14+. End users need an Android 10+ phone with GPS and camera. A stable internet connection (minimum 5 Mbps) is required for asset loading; GPS validation only needs ~1 Mbps. All 3D and panorama assets are cached on-device after first load to minimize repeat data usage.
