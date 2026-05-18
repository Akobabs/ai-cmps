# Frontend — AI-CMPS

React single-page application for the AI-CMPS content management and personalisation system.

---

## Table of Contents

- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Components](#components)
- [API Client](#api-client)
- [State Management](#state-management)
- [Routing](#routing)
- [Proxy Configuration](#proxy-configuration)
- [Tailwind CSS](#tailwind-css)
- [Build & Deploy](#build--deploy)
- [Dependencies](#dependencies)

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Backend running on port 8000 (see [backend/README.md](../backend/README.md))

### Install & Run

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`, so no environment variables are needed for local development.

---

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js          # Axios instance, auth interceptors
│   ├── components/
│   │   ├── Navbar.jsx          # Top navigation, auth state display
│   │   └── ContentCard.jsx     # Article card used on Home and Profile
│   ├── context/
│   │   └── AuthContext.jsx     # Global auth state, login/logout helpers
│   └── pages/
│       ├── Home.jsx            # Personalised feed + alpha indicator
│       ├── ContentDetail.jsx   # Article reader with dwell tracking
│       ├── Register.jsx        # Registration + topic preference selector
│       ├── Login.jsx           # Login form
│       ├── Profile.jsx         # User stats, history, profile completeness
│       ├── Analytics.jsx       # Research metrics dashboard (Recharts)
│       └── AdminPanel.jsx      # Content management + NLP preview
├── nginx.conf                  # nginx config (Docker only)
├── vite.config.js              # Vite config with dev proxy
├── tailwind.config.js          # Tailwind CSS config
├── package.json
└── Dockerfile                  # Multi-stage: node build → nginx serve
```

---

## Pages

### `Home.jsx` — `/`

The main personalised feed. Requires authentication.

**Features:**
- **Alpha indicator bar** — displays current α value, interaction count, and recommendation mode label (Content-Based → Balanced → Collaborative)
- **Filter tabs** — For You (recommendations), All (browse), and one tab per category
- **Recommendation cards** — each shows score, reason text, and alpha at time of recommendation
- **Latency display** — shows API response time in milliseconds
- **Skeleton loading** — placeholder cards during fetch

When the "For You" tab is selected, the page calls `/api/recommendations`. Other tabs call `/api/content` and filter client-side.

---

### `ContentDetail.jsx` — `/content/:id`

Full article reader with behavioural tracking.

**Dwell time tracking:**
- `startTimeRef` records the timestamp when the page mounts
- On unmount, computes `elapsed = Date.now() - startTimeRef.current`
- Sends a `read` interaction to `/api/interactions` with `dwell_time` and `scroll_depth`

**User actions:**
- **Star rating** (1–5) — sends a `rate` interaction; updates `avg_rating` display
- **Bookmark button** — sends a `bookmark` interaction; toggle state stored locally

All interactions immediately update the user's profile vector on the backend, affecting the next recommendation call.

---

### `Register.jsx` — `/register`

New user registration with cold-start mitigation.

**Topic preference selector:**
- 6 topic buttons (Technology, Business, Science, Health, Education, Entertainment)
- At least 1 must be selected before submitting
- Selected preferences are sent to `/api/auth/register` as `topic_preferences`
- On the backend these are used to synthesise an initial TF-IDF profile vector

After registration, the user is logged in automatically and redirected to Home.

---

### `Login.jsx` — `/login`

Standard email + password login. Sends credentials as OAuth2 form data to `/api/auth/login`. On success, stores the JWT via `AuthContext`.

---

### `Profile.jsx` — `/profile`

User profile dashboard.

**Displays:**
- Current α value and recommendation mode
- Profile completeness percentage (interaction_count / 25 × 100, capped at 100%)
- Top inferred categories (from interaction history)
- Reading history (recent interactions with article titles)
- Registration date and account info

---

### `Analytics.jsx` — `/analytics`

Research metrics dashboard. Admin-only in the nav, but accessible to any authenticated user at the URL.

**Charts (Recharts):**
- **LineChart** — 7-day engagement trend (interactions per day)
- **PieChart** — category distribution of all content
- **BarChart** — content count per category

**Research metric cards:**
- Precision@10 = 0.74
- Recall@10 = 0.68
- Session Duration Improvement = +81%
- Content Consumption Rate = +104%
- Avg API Latency = 187ms

Data fetched from `/api/analytics/overview`, `/api/analytics/engagement`, `/api/analytics/categories`, `/api/analytics/top-content`.

---

### `AdminPanel.jsx` — `/admin`

Content management interface. Redirects non-admin users.

**Article creation form:**
- Title, body, author fields
- **Preview NLP** button — calls `/api/content/preview-nlp` and displays extracted tags, category, sentiment score, and estimated reading time before saving
- Submit — calls `POST /api/content`

**Article list:**
- All articles with category badge, tag pills, and sentiment score
- Delete button per article (calls `DELETE /api/content/:id`)

---

## Components

### `Navbar.jsx`

Top navigation bar present on all pages. Shows:
- App name / home link
- Navigation links (Home, Profile, Analytics, Admin if admin user)
- Logged-in username
- Logout button

Reads auth state from `AuthContext`.

---

### `ContentCard.jsx`

Reusable article card used on Home and in the Admin article list.

Props:
- `content` — article object
- `score` — recommendation score (optional, shown as percentage match)
- `reason` — recommendation reason string (optional)
- `alpha` — current α value (optional)

Clicking navigates to `/content/:id`.

---

## API Client

### `src/api/client.js`

```javascript
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })
```

Using an empty string `baseURL` means all requests use relative URLs (`/api/...`). This works identically in:
- **Dev mode** — Vite proxy intercepts `/api/*` and forwards to `localhost:8000`
- **Docker** — nginx proxy intercepts `/api/` and forwards to `backend:8000`

No environment-specific configuration is needed.

**Request interceptor** — attaches `Authorization: Bearer <token>` from localStorage to every request.

**Response interceptor** — on 401, clears stored token and redirects to `/login`.

---

## State Management

Authentication state is managed via React Context (`AuthContext.jsx`).

**Provided values:**
- `user` — current user object (null if logged out)
- `token` — JWT string
- `login(token, user)` — stores token in localStorage, updates context
- `logout()` — clears localStorage, resets context
- `isAdmin` — boolean derived from `user.is_admin`

All other state is local to each page component. There is no global state library.

---

## Routing

React Router v6. Route definitions in `src/main.jsx` or `src/App.jsx`.

| Path | Component | Auth |
|------|-----------|------|
| `/` | Home | Required |
| `/login` | Login | Redirect if authed |
| `/register` | Register | Redirect if authed |
| `/content/:id` | ContentDetail | Required |
| `/profile` | Profile | Required |
| `/analytics` | Analytics | Required |
| `/admin` | AdminPanel | Admin only |

Unauthenticated access to protected routes redirects to `/login`.

---

## Proxy Configuration

### Development (`vite.config.js`)

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

All requests starting with `/api` are forwarded to the local backend.

### Docker (`nginx.conf`)

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

The SPA fallback (`try_files`) ensures React Router handles all client-side navigation.

---

## Tailwind CSS

Configured in `tailwind.config.js` with content paths covering `./src/**/*.{js,jsx}`.

The project uses Tailwind utility classes throughout — no custom CSS files. Responsive design uses `sm:`, `md:`, `lg:` breakpoints.

---

## Build & Deploy

### Production build

```powershell
npm run build
```

Outputs to `dist/`. The `dist/` folder is served by nginx in Docker.

### Preview production build locally

```powershell
npm run preview
```

Serves the `dist/` folder on http://localhost:4173.

### Docker build (multi-stage)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| react, react-dom | UI framework |
| react-router-dom | Client-side routing |
| axios | HTTP client |
| recharts | Charts (Line, Pie, Bar) |
| lucide-react | Icon set |
| tailwindcss | Utility CSS framework |
| @vitejs/plugin-react | Vite React plugin |
| vite | Build tool + dev server |
