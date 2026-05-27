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

// Dify API Key for AI Ad Creation
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// Function to classify facility price tier based on name/address (simplistic example)
function classifyPriceTier(facilityName) {
  const lowerName = facilityName.toLowerCase();
  if (lowerName.includes('luxury') || lowerName.includes(' premier ') || lowerName.includes(' estates') || lowerName.includes(' manors')) {
    return 'luxury';
  } else if (lowerName.includes('senior care') || lowerName.includes('assisted living') || lowerName.includes('community')) {
    return 'middle-class';
  } else {
    return 'low-income'; // Default assumption
  }
}

// Function to determine banner size based on target audience/price tier
function getBannerSize(priceTier) {
  switch (priceTier) {
    case 'luxury':
      return '300x250'; // Medium Rectangle
    case 'middle-class':
      return '728x90';  // Leaderboard
    case 'low-income':
      return '160x600'; // Wide Skyscraper
    default:
      return '300x250';
  }
}

// Function to generate ad creatives using Dify API
async function generateAdCreatives(facility, adsToGenerate = 3) {
  if (!DIFY_API_KEY) {
    console.warn('DIFY_API_KEY not set. Falling back to local ad generation.');
    // Fallback: Generate simpler ads locally
    const priceTier = classifyPriceTier(facility.name);
    const bannerSize = getBannerSize(priceTier);
    const generatedAds = [];
    for (let i = 0; i < adsToGenerate; i++) {
      generatedAds.push({
        id: randomUUID(),
        facilityId: facility.id,
        name: `${facility.name} Ad ${i + 1} (${priceTier})`,
        headline: `Discover ${facility.name}`,
        body: `Experience comfortable living at ${facility.name}. ${priceTier} options available.`,
        cta: 'Learn More',
        status: 'draft',
        budget: priceTier === 'luxury' ? 100 : priceTier === 'middle-class' ? 70 : 40,
        impressions: priceTier === 'luxury' ? 2000 : priceTier === 'middle-class' ? 1500 : 1000,
        createdAt: new Date().toISOString(),
        bannerSize: bannerSize, // Include banner size in local fallback
      });
    }
    return generatedAds;
  }

  console.log(`Generating ${adsToGenerate} ads for facility: ${facility.name} using Dify API`);
  const priceTier = classifyPriceTier(facility.name);
  const bannerSize = getBannerSize(priceTier);
  const prompt = `
    Generate ${adsToGenerate} ad creatives for a senior assisted living facility.
    Facility Name: ${facility.name}
    Address: ${facility.address}
    Price Tier: ${priceTier} (e.g., luxury, middle-class, low-income)
    Target Audience: Families looking for senior care, primarily women in their 50s.
    Key Selling Points: Emphasize compassionate care, community, safety, amenities, and location benefits.
    Desired Output Format: JSON array of objects, each with:
      - name: A concise ad name (e.g., "Spring Special - Lexington")
      - headline: Engaging headline (max 60 chars)
      - body: Descriptive text (max 120 chars)
      - cta: Call to action text (e.g., "Schedule Tour", "Learn More")
      - status: Set to "draft"
      - budget: Estimated daily budget ($), adjust based on price tier (luxury: 80-120, middle-class: 50-90, low-income: 30-70)
      - impressions: Estimated daily impressions, adjust based on price tier (luxury: 1500-2500, middle-class: 1000-2000, low-income: 800-1500)
      - bannerSize: Specify the banner size based on price tier: "300x250" for luxury, "728x90" for middle-class, "160x600" for low-income.
      - NOTE: Do not include the media library from Dropbox. Focus solely on text content and banner size.
  `;

  try {
    const response = await fetch('https://api.dify.ai/v1/workflow/run/clw8t5vj40002g801x8w7f2wz', { // Replace with your actual Dify workflow endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: { prompt },
      }),
    });

    if (!response.ok) {
      throw new Error(`Dify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Assuming Dify returns a JSON array under a specific key, adjust 'data.outputs.generated_ads' as needed
    let generatedAdsData = data.outputs?.generated_ads || data.results?.[0]?.text; 

    if (!generatedAdsData) {
        console.error("Dify response did not contain expected ad data. Raw response:", data);
        throw new Error("Failed to parse generated ads from Dify response.");
    }

    // Attempt to parse if it's a stringified JSON
    if (typeof generatedAdsData === 'string') {
      try {
        generatedAdsData = JSON.parse(generatedAdsData);
      } catch (parseError) {
        console.error("Failed to parse Dify JSON output:", parseError);
        throw new Error("Dify returned malformed JSON for ads.");
      }
    }

    // Validate and format the generated ads
    if (!Array.isArray(generatedAdsData)) {
        console.error("Dify response data is not an array. Data:", generatedAdsData);
        throw new Error("Dify response is not a list of ads.");
    }

    return generatedAdsData.map((adData: any) => ({
      id: randomUUID(),
      facilityId: facility.id,
      name: adData.name || `${facility.name} Ad (${priceTier})`,
      headline: adData.headline || `Discover ${facility.name}`,
      body: adData.body || `Experience ${priceTier} living at ${facility.name}.`,
      cta: adData.cta || 'Learn More',
      status: 'draft', // Always start as draft
      budget: Number(adData.budget) || (priceTier === 'luxury' ? 100 : priceTier === 'middle-class' ? 70 : 40),
      impressions: Number(adData.impressions) || (priceTier === 'luxury' ? 2000 : priceTier === 'middle-class' ? 1500 : 1000),
      createdAt: new Date().toISOString(),
      bannerSize: adData.bannerSize || bannerSize, // Use Dify's size or fallback
    }));

  } catch (err) {
    console.error('Error calling Dify API:', err.message);
    // Fallback logic is handled above, but log the error if Dify call fails specifically
    throw err; // Re-throw to be caught by the main handler
  }
}

// POST /api/deploy-campaign — generate ads and activate them
app.post('/api/deploy-campaign', async (req, res) => {
  const { facilityId } = req.body;

  if (!facilityId) {
    return res.status(400).json({ error: 'facilityId is required' });
  }

  const facility = facilities.find(f => f.id === facilityId);
  if (!facility) {
    return res.status(404).json({ error: 'Facility not found' });
  }

  try {
    const generatedAds = await generateAdCreatives(facility);

    // Update facility's activeCampaigns to 1 (if not already)
    if (facility.activeCampaigns === 0) {
      facility.activeCampaigns = 1;
      // In a real app, this would be a DB update. Here, it's just in-memory.
    }

    // Add newly generated ads to the store
    ads.push(...generatedAds);

    // Respond with success and the generated ads
    res.status(201).json({
      message: `Campaign deployed and ${generatedAds.length} ads created for ${facility.name}.`,
      generatedAds,
      updatedFacility: facility,
    });

  } catch (err) {
    console.error('Campaign deployment failed:', err.message);
    // If Dify failed but local fallback worked, we might still have ads.
    // However, if *even fallback failed*, err.message will reflect that.
    res.status(500).json({ error: `Campaign deployment failed: ${err.message}` });
  }
});


// GET /api/facilities — list all facilities
app.get('/api/facilities', (_req, res) => {
  res.json(facilities);
});

// GET /api/ads — list all ads (optionally filter by facilityId)
app.get('/api/ads', (req, res) => {
  const { facilityId } = req.query;
  if (facilityId) {
    return res.json(ads.filter(a => a.facilityId === facilityId));
  }
  res.json(ads);
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
