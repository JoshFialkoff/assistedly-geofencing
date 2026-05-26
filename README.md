# MassFence Ad Studio — Geofencing App

A full-stack geofencing tool for targeting Massachusetts assisted-living facilities with programmatic display ads.

## Architecture

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Vite + React + Tailwind | 5173 |
| Backend | Node.js + Express | 3001 |
| Geocoding | [Geoapify](https://www.geoapify.com/) | — |

The Vite dev server proxies every `/api/*` request to the Express backend automatically — no CORS configuration needed in your browser.

---

## Quick Start

### 1 — Clone

```bash
git clone https://github.com/JoshFialkoff/assistedly-geofencing.git geofence
cd geofence
```

### 2 — Install all dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 3 — Add your Geoapify API key

Get a **free** key (up to 3 000 requests/day) at <https://myprojects.geoapify.com/>.

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your key:
# GEOAPIFY_API_KEY=your_actual_key_here
```

### 4 — Run frontend + backend together

```bash
npm run dev:all
```

Then open <http://localhost:5173> in your browser.

---

## API Endpoints (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/facilities` | List all facilities |
| POST | `/api/facilities` | Create facility (geocodes address) |
| PATCH | `/api/facilities/:id` | Update radius / activeCampaigns |
| DELETE | `/api/facilities/:id` | Remove facility |

### POST body example

```json
{
  "name": "Sunrise Senior Living Newton",
  "address": "157 Herrick Rd Newton Centre, MA 02459",
  "radiusMeters": 400
}
```

The backend calls Geoapify, resolves the address to lat/lon, and returns the full facility object including coordinates.

---

## Running separately (advanced)

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
npm run dev
```

