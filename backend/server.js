import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || '';

app.use(cors());
app.use(express.json());

// In-memory facility store (seeded with example MA facilities)
const facilities = [
  {
    id: '1',
    name: 'Boston Assisted Living Center',
    address: 'Boston, MA',
    radiusMeters: 500,
    activeCampaigns: 2,
    lat: 42.3601,
    lon: -71.0589,
  },
  {
    id: '2',
    name: 'Worcester Senior Care',
    address: 'Worcester, MA',
    radiusMeters: 300,
    activeCampaigns: 1,
    lat: 42.2626,
    lon: -71.8023,
  },
  {
    id: '3',
    name: 'Springfield Retirement Community',
    address: 'Springfield, MA',
    radiusMeters: 400,
    activeCampaigns: 0,
    lat: 42.1015,
    lon: -72.5898,
  },
];

// Geocode an address string using the Geoapify API
async function geocode(address) {
  if (!GEOAPIFY_API_KEY) {
    console.warn('GEOAPIFY_API_KEY not set — skipping geocode, coordinates will be null');
    return { lat: null, lon: null };
  }

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&filter=countrycode:us&bias=proximity:-71.0589,42.3601&apiKey=${GEOAPIFY_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geoapify returned ${res.status}`);
  }
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error(`No geocode results for: ${address}`);
  }
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lon };
}

// GET /api/facilities — list all facilities
app.get('/api/facilities', (_req, res) => {
  res.json(facilities);
});

// POST /api/facilities — create a new facility, geocoding its address
app.post('/api/facilities', async (req, res) => {
  const { name, address, radiusMeters } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'name and address are required' });
  }

  try {
    const { lat, lon } = await geocode(address);
    const facility = {
      id: randomUUID(),
      name,
      address,
      radiusMeters: Number(radiusMeters) || 500,
      activeCampaigns: 0,
      lat,
      lon,
    };
    facilities.push(facility);
    res.status(201).json(facility);
  } catch (err) {
    console.error('Geocode error:', err.message);
    res.status(502).json({ error: `Geocoding failed: ${err.message}` });
  }
});

// PATCH /api/facilities/:id — update activeCampaigns or radius
app.patch('/api/facilities/:id', (req, res) => {
  const facility = facilities.find(f => f.id === req.params.id);
  if (!facility) return res.status(404).json({ error: 'Not found' });

  const { activeCampaigns, radiusMeters } = req.body;
  if (activeCampaigns !== undefined) facility.activeCampaigns = Number(activeCampaigns);
  if (radiusMeters !== undefined) facility.radiusMeters = Number(radiusMeters);
  res.json(facility);
});

// DELETE /api/facilities/:id — remove a facility
app.delete('/api/facilities/:id', (req, res) => {
  const idx = facilities.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  facilities.splice(idx, 1);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Geofencing backend running on http://localhost:${PORT}`);
  if (!GEOAPIFY_API_KEY) {
    console.warn('  ⚠  GEOAPIFY_API_KEY is not set. Copy backend/.env.example → backend/.env and add your key.');
  }
});
