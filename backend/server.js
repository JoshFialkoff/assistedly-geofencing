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

// In-memory ad store
const ads = [
  {
    id: randomUUID(),
    facilityId: '1',
    name: 'Senior Care Special - Boston',
    headline: 'Compassionate Care for Your Loved Ones',
    body: 'Experience world-class assisted living with personalized care plans.',
    cta: 'Schedule a Tour',
    status: 'active',
    budget: 50,
    impressions: 1200,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    facilityId: '1',
    name: 'Family Visit Weekend - Boston',
    headline: 'Special Family Weekend Rates',
    body: 'Bring your family for a weekend visit at our discounted rates.',
    cta: 'Book Now',
    status: 'draft',
    budget: 30,
    impressions: 800,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    facilityId: '2',
    name: 'Worcester Wellness Program',
    headline: 'Holistic Health & Wellness Programs',
    body: 'Join our comprehensive wellness programs designed for seniors.',
    cta: 'Learn More',
    status: 'active',
    budget: 40,
    impressions: 950,
    createdAt: new Date().toISOString(),
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

// GET /api/ads — list all ads (optionally filter by facilityId)
app.get('/api/ads', (req, res) => {
  const { facilityId } = req.query;
  if (facilityId) {
    return res.json(ads.filter(a => a.facilityId === facilityId));
  }
  res.json(ads);
});

// POST /api/ads — create a new ad for a facility
app.post('/api/ads', (req, res) => {
  const { facilityId, name, headline, body, cta, budget } = req.body;
  if (!facilityId || !name) {
    return res.status(400).json({ error: 'facilityId and name are required' });
  }
  if (!facilities.find(f => f.id === facilityId)) {
    return res.status(404).json({ error: 'Facility not found' });
  }
  const ad = {
    id: randomUUID(),
    facilityId,
    name,
    headline: headline || '',
    body: body || '',
    cta: cta || 'Learn More',
    status: 'draft',
    budget: Number(budget) || 0,
    impressions: 0,
    createdAt: new Date().toISOString(),
  };
  ads.push(ad);
  res.status(201).json(ad);
});

// PATCH /api/ads/:id — update ad fields
app.patch('/api/ads/:id', (req, res) => {
  const ad = ads.find(a => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'Ad not found' });

  const { name, headline, body, cta, status, budget } = req.body;
  if (name !== undefined) ad.name = name;
  if (headline !== undefined) ad.headline = headline;
  if (body !== undefined) ad.body = body;
  if (cta !== undefined) ad.cta = cta;
  if (status !== undefined) ad.status = status;
  if (budget !== undefined) ad.budget = Number(budget);
  res.json(ad);
});

// DELETE /api/ads/:id — remove an ad
app.delete('/api/ads/:id', (req, res) => {
  const idx = ads.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ad not found' });
  ads.splice(idx, 1);
  res.status(204).end();
});

// PATCH /api/ads/:id/deploy — activate a draft/paused ad
app.patch('/api/ads/:id/deploy', (req, res) => {
  const ad = ads.find(a => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'Ad not found' });
  ad.status = 'active';
  res.json(ad);
});

app.listen(PORT, () => {
  console.log(`Geofencing backend running on http://localhost:${PORT}`);
  if (!GEOAPIFY_API_KEY) {
    console.warn('  ⚠  GEOAPIFY_API_KEY is not set. Copy backend/.env.example → backend/.env and add your key.');
  }
});
