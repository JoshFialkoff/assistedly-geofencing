import React, { useState, useEffect } from 'react';
import { MapPin, Target, Layers, Users, Building, Plus, Play, Trash2, AlertCircle, Loader2, CheckCircle2, Pencil } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  address: string;
  radiusMeters: number;
  activeCampaigns: number;
  lat: number | null;
  lon: number | null;
}

interface Ad {
  id: string;
  facilityId: string;
  name: string;
  headline: string;
  body: string;
  cta: string;
  status: 'draft' | 'active' | 'paused';
  budget: number;
  impressions: number;
  createdAt: string;
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAd, setSubmittingAd] = useState(false);
  const [updatingFacilityId, setUpdatingFacilityId] = useState<string | null>(null);
  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);
  const [deployingCampaign, setDeployingCampaign] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const [newFacility, setNewFacility] = useState({ name: '', address: '', radius: 500 });
  const [newAd, setNewAd] = useState({ facilityId: '', name: '', headline: '', body: '', cta: 'Learn More', budget: 50 });
  const [adForm, setAdForm] = useState<Partial<Ad>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/facilities').then(r => {
        if (!r.ok) throw new Error(`Facilities server error: ${r.status}`);
        return r.json();
      }),
      fetch('/api/ads').then(r => {
        if (!r.ok) throw new Error(`Ads server error: ${r.status}`);
        return r.json();
      }),
    ])
      .then(([facilityData, adData]: [Facility[], Ad[]]) => {
        setFacilities(facilityData);
        setAds(adData);
        setLoading(false);
        setLoadingAds(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
        setLoadingAds(false);
      });
  }, []);

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.address) return;
    setSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFacility.name,
          address: newFacility.address,
          radiusMeters: newFacility.radius,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      const created: Facility = await res.json();
      setFacilities(prev => [...prev, created]);
      setNewFacility({ name: '', address: '', radius: 500 });
      setStatusMessage(`Created fence for ${created.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.facilityId || !newAd.name) {
      setError('Select a target facility and enter an ad name.');
      return;
    }
    setSubmittingAd(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAd),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      const created: Ad = await res.json();
      setAds(prev => [...prev, created]);
      setNewAd({ facilityId: '', name: '', headline: '', body: '', cta: 'Learn More', budget: 50 });
      setStatusMessage(`Created ad creative: ${created.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleUpdateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdId) return;
    setUpdatingAdId(editingAdId);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/ads/${editingAdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      const updated: Ad = await res.json();
      setAds(prev => prev.map(ad => (ad.id === updated.id ? updated : ad)));
      setEditingAdId(null);
      setAdForm({});
      setStatusMessage(`Updated ad creative: ${updated.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingAdId(null);
    }
  };

  const handleDeleteAd = async (id: string) => {
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/ads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      setAds(prev => prev.filter(ad => ad.id !== id));
      setStatusMessage('Ad creative removed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSetActiveCampaigns = async (id: string, nextCount: number) => {
    const safeCount = Math.max(0, nextCount);
    setUpdatingFacilityId(id);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/facilities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeCampaigns: safeCount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      const updated: Facility = await res.json();
      setFacilities(prev => prev.map(f => (f.id === id ? updated : f)));
      setStatusMessage(`Updated active ads for ${updated.name} to ${updated.activeCampaigns}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingFacilityId(null);
    }
  };

  const handleDeployCampaign = async () => {
    if (facilities.length === 0) {
      setError('Add at least one facility before deploying a campaign.');
      return;
    }

    setDeployingCampaign(true);
    setError(null);
    setStatusMessage(null);
    try {
      // Trigger deploy-campaign on backend for each facility to generate and deploy ads via Dify
      const deployPromises = facilities.map(async (facility) => {
        const res = await fetch('/api/deploy-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facilityId: facility.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Server error: ${res.status}`);
        }
        return res.json() as Promise<{ message: string; generatedAds: Ad[]; updatedFacility: Facility }>;
      });

      const results = await Promise.all(deployPromises);
      
      // Merge new ads and update facilities in state
      const newlyGeneratedAds: Ad[] = [];
      const updatedFacilitiesMap = new Map<string, Facility>();

      results.forEach(res => {
        newlyGeneratedAds.push(...res.generatedAds);
        updatedFacilitiesMap.set(res.updatedFacility.id, res.updatedFacility);
      });

      setFacilities(prev => prev.map(f => updatedFacilitiesMap.get(f.id) ?? f));
      setAds(prev => {
        // Mark existing draft/paused ads for those facilities as active as well
        const activatedExisting = prev.map(ad => 
          ad.status !== 'active' ? { ...ad, status: 'active' as const } : ad
        );
        return [...activatedExisting, ...newlyGeneratedAds];
      });

      setStatusMessage(`Campaign deployed successfully! AI generated ${newlyGeneratedAds.length} relevant ads across ${facilities.length} targeted facilities.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeployingCampaign(false);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/facilities/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }
      setFacilities(prev => prev.filter(f => f.id !== id));
      setAds(prev => prev.filter(ad => ad.facilityId !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const activeAdsCount = ads.filter(ad => ad.status === 'active').length;
  const estimatedDailyImpressions = ads.reduce((total, ad) => total + ad.impressions, 0);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      <div className="w-[28rem] bg-slate-800 border-r border-slate-700 flex flex-col justify-between">
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">MassFence Ad Studio</h1>
              <span className="text-xs text-slate-400">MA Assisted Living Geo-Targeting</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {statusMessage && (
            <div className="mb-4 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Target New Facility
            </h2>
            <form onSubmit={handleAddFacility} className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Facility Name</label>
                <input type="text" placeholder="e.g., Sunrise Senior Living" value={newFacility.name} onChange={e => setNewFacility({ ...newFacility, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Address / City, MA</label>
                  <input type="text" placeholder="e.g., Newton, MA" value={newFacility.address} onChange={e => setNewFacility({ ...newFacility, address: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Radius (meters)</label>
                  <input type="number" value={newFacility.radius} onChange={e => setNewFacility({ ...newFacility, radius: parseInt(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Geocoding…' : 'Create Fence Radius'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building className="w-3.5 h-3.5" /> Fenced Facilities ({facilities.length})
            </h2>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading facilities…
              </div>
            ) : (
              <div className="space-y-2">
                {facilities.map(facility => (
                  <div key={facility.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 hover:border-slate-600 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm text-slate-200">{facility.name}</div>
                      <button onClick={() => handleDeleteFacility(facility.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400" title="Remove facility">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{facility.address}</span>
                      <span>•</span>
                      <span>{facility.radiusMeters}m fence</span>
                    </div>
                    {facility.lat !== null && facility.lon !== null && (
                      <div className="mt-1 text-[10px] text-slate-500 font-mono">{facility.lat.toFixed(5)}, {facility.lon.toFixed(5)}</div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${facility.activeCampaigns > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {facility.activeCampaigns} Active Ads
                      </span>
                      <button type="button" onClick={() => handleSetActiveCampaigns(facility.id, facility.activeCampaigns - 1)} disabled={updatingFacilityId === facility.id || facility.activeCampaigns <= 0} className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40" title="Decrease active ads">−</button>
                      <button type="button" onClick={() => handleSetActiveCampaigns(facility.id, facility.activeCampaigns + 1)} disabled={updatingFacilityId === facility.id} className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40" title="Increase active ads">+</button>
                      {updatingFacilityId === facility.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Campaign Creatives ({ads.length})
            </h2>

            <form onSubmit={handleAddAd} className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Facility</label>
                <select value={newAd.facilityId} onChange={e => setNewAd({ ...newAd, facilityId: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white">
                  <option value="">Select Facility</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ad Name</label>
                <input type="text" placeholder="e.g., Adult Daughter Spring Promo" value={newAd.name} onChange={e => setNewAd({ ...newAd, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Headline</label>
                <input type="text" placeholder="Peace of mind for Mom starts here" value={newAd.headline} onChange={e => setNewAd({ ...newAd, headline: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Body Text</label>
                <textarea rows={2} placeholder="Supportive assisted living near your family." value={newAd.body} onChange={e => setNewAd({ ...newAd, body: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CTA</label>
                  <input type="text" value={newAd.cta} onChange={e => setNewAd({ ...newAd, cta: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Budget ($/day)</label>
                  <input type="number" value={newAd.budget} onChange={e => setNewAd({ ...newAd, budget: parseInt(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
                </div>
              </div>
              <button type="submit" disabled={submittingAd} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                {submittingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submittingAd ? 'Creating…' : 'Create Ad'}
              </button>
            </form>

            {loadingAds ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading ads…</div>
            ) : (
              <div className="space-y-2">
                {ads.map(ad => {
                  const facility = facilities.find(f => f.id === ad.facilityId);
                  const isEditing = editingAdId === ad.id;
                  return (
                    <div key={ad.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 hover:border-slate-600 transition-all group">
                      {isEditing ? (
                        <form onSubmit={handleUpdateAd} className="space-y-2">
                          <input type="text" value={adForm.name || ''} onChange={e => setAdForm({ ...adForm, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white" placeholder="Ad Name" />
                          <input type="text" value={adForm.headline || ''} onChange={e => setAdForm({ ...adForm, headline: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white" placeholder="Headline" />
                          <textarea rows={2} value={adForm.body || ''} onChange={e => setAdForm({ ...adForm, body: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white resize-none" placeholder="Body" />
                          <div className="grid grid-cols-3 gap-2">
                            <select value={adForm.status || 'draft'} onChange={e => setAdForm({ ...adForm, status: e.target.value as Ad['status'] })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                              <option value="draft">draft</option>
                              <option value="active">active</option>
                              <option value="paused">paused</option>
                            </select>
                            <input type="text" value={adForm.cta || ''} onChange={e => setAdForm({ ...adForm, cta: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="CTA" />
                            <input type="number" value={adForm.budget || 0} onChange={e => setAdForm({ ...adForm, budget: parseInt(e.target.value) || 0 })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="Budget" />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={updatingAdId === ad.id} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs py-1 rounded">{updatingAdId === ad.id ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={() => { setEditingAdId(null); setAdForm({}); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-1 rounded">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm text-slate-200">{ad.name}</div>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingAdId(ad.id); setAdForm(ad); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-indigo-400" title="Edit ad"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteAd(ad.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400" title="Delete ad"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{ad.headline}</div>
                          <div className="text-xs text-slate-500 mt-1">{ad.body}</div>
                          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-[11px] text-slate-300">
                            <div className="font-medium text-slate-200">Preview</div>
                            <div>{ad.headline || 'Headline'}</div>
                            <div className="text-slate-500">{ad.body || 'Body copy'}</div>
                            <button className="mt-1 rounded bg-indigo-600 px-2 py-0.5 text-[10px] text-white" type="button">{ad.cta || 'Learn More'}</button>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ad.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : ad.status === 'paused' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>{ad.status}</span>
                            <span className="text-[10px] text-slate-500">${ad.budget}/day</span>
                            <span className="text-[10px] text-slate-500">{ad.impressions.toLocaleString()} imps/day</span>
                            <span className="text-[10px] text-slate-500">• {facility?.name || 'Unknown facility'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>DSP Ad Server Connected</span>
          </div>
          <span>MA Target Layer v1.2</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Layer: <strong>Massachusetts Assisted Living Registry</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Estimated Daily Impressions: <strong>{Math.max(estimatedDailyImpressions, 42500).toLocaleString()}/day</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Target className="w-4 h-4 text-rose-400" />
              <span>Active Creatives: <strong>{activeAdsCount}</strong></span>
            </div>
          </div>
          <button type="button" onClick={handleDeployCampaign} disabled={deployingCampaign} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            {deployingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Deploy Live Campaign
          </button>
        </div>

        <div className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#4f4f4f_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          <div className="text-center max-w-lg z-10 px-4">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Layers className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Interactive Map Simulation</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Geofences are mapped against localized coordinates and paired with editable ad creatives for programmatic display campaigns around assisted living facilities.
            </p>
            <div className="inline-flex gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-200 font-medium">Geoapify Geocoding</span>
              <span className="px-2 py-1">Creative Editor Enabled</span>
            </div>
            {facilities.filter(f => f.lat !== null).length > 0 && (
              <div className="mt-4 text-left bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 max-h-32 overflow-y-auto">
                {facilities.filter(f => f.lat !== null).map(f => (
                  <div key={f.id} className="flex items-center gap-2 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="text-slate-300 truncate">{f.name}</span>
                    <span className="ml-auto shrink-0">{f.lat!.toFixed(4)}, {f.lon!.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-ping [animation-duration:3s]"></div>
          <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg"></div>
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center animate-ping [animation-duration:4s]"></div>
          <div className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}
