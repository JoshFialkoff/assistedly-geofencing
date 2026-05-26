import React, { useState, useEffect } from 'react';
import { MapPin, Target, Layers, Users, Building, Plus, Play, Trash2, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  address: string;
  radiusMeters: number;
  activeCampaigns: number;
  lat: number | null;
  lon: number | null;
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingFacilityId, setUpdatingFacilityId] = useState<string | null>(null);
  const [deployingCampaign, setDeployingCampaign] = useState(false);

  const [newFacility, setNewFacility] = useState({ name: '', address: '', radius: 500 });
  const navigationItems = [
    { id: 'new-facility', label: 'New Facility' },
    { id: 'fenced-facilities', label: 'Fenced Facilities' },
    { id: 'campaign-controls', label: 'Campaign Controls' },
    { id: 'map-overview', label: 'Map Overview' },
  ];

  // Fetch facilities from backend on mount
  useEffect(() => {
    fetch('/api/facilities')
      .then(r => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((data: Facility[]) => {
        setFacilities(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
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

    const facilitiesNeedingActivation = facilities.filter(f => f.activeCampaigns === 0);
    if (facilitiesNeedingActivation.length === 0) {
      setStatusMessage('Campaign already live for all fenced facilities.');
      return;
    }

    setDeployingCampaign(true);
    setError(null);
    setStatusMessage(null);
    try {
      const updatedFacilities = await Promise.all(
        facilitiesNeedingActivation.map(async (facility) => {
          const res = await fetch(`/api/facilities/${facility.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeCampaigns: 1 }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Server error: ${res.status}`);
          }
          return res.json() as Promise<Facility>;
        }),
      );

      const updatedById = new Map(updatedFacilities.map(f => [f.id, f]));
      setFacilities(prev => prev.map(f => updatedById.get(f.id) ?? f));
      setStatusMessage(`Campaign deployed to ${updatedFacilities.length} facility${updatedFacilities.length === 1 ? '' : 'ies'}.`);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleNavigateToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar Controls */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 flex flex-col justify-between">
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
          <nav aria-label="Primary" className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Navigation</p>
            <div className="grid grid-cols-2 gap-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateToSection(item.id)}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:border-indigo-500 hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Error Banner */}
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

          {/* Add New Geofence Section */}
          <div id="new-facility" className="mb-8 scroll-mt-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Target New Facility
            </h2>
            <form onSubmit={handleAddFacility} className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g., Sunrise Senior Living"
                  value={newFacility.name}
                  onChange={e => setNewFacility({...newFacility, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Address / City, MA</label>
                  <input
                    type="text"
                    placeholder="e.g., Newton, MA"
                    value={newFacility.address}
                    onChange={e => setNewFacility({...newFacility, address: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Radius (meters)</label>
                  <input
                    type="number"
                    value={newFacility.radius}
                    onChange={e => setNewFacility({...newFacility, radius: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Geocoding…' : 'Create Fence Radius'}
              </button>
            </form>
          </div>

          {/* Active Fenced Locations */}
          <div id="fenced-facilities" className="scroll-mt-6">
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
                      <button
                        onClick={() => handleDeleteFacility(facility.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400"
                        title="Remove facility"
                      >
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
                      <div className="mt-1 text-[10px] text-slate-500 font-mono">
                        {facility.lat.toFixed(5)}, {facility.lon.toFixed(5)}
                      </div>
                    )}
                    <div className="mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${facility.activeCampaigns > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {facility.activeCampaigns} Active Ads
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetActiveCampaigns(facility.id, facility.activeCampaigns - 1)}
                        disabled={updatingFacilityId === facility.id || facility.activeCampaigns <= 0}
                        className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
                        title="Decrease active ads"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetActiveCampaigns(facility.id, facility.activeCampaigns + 1)}
                        disabled={updatingFacilityId === facility.id}
                        className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-40"
                        title="Increase active ads"
                      >
                        +
                      </button>
                      {updatingFacilityId === facility.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Campaign Health Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>DSP Ad Server Connected</span>
          </div>
          <span>MA Target Layer v1.2</span>
        </div>
      </div>

      {/* Main Map / Operations Panel */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Analytics Bar */}
        <div id="campaign-controls" className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between z-10 scroll-mt-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Layer: <strong>Massachusetts Assisted Living Registry</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Estimated Daily Impressions: <strong>42,500/day</strong></span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeployCampaign}
            disabled={deployingCampaign}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {deployingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Deploy Live Campaign
          </button>
        </div>

        {/* Map Placeholder Viewport */}
        <div id="map-overview" className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden scroll-mt-6">
          {/* Mock Map Background Grid */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#4f4f4f_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

          {/* Central Visualization Elements */}
          <div className="text-center max-w-md z-10 px-4">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Layers className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Interactive Map Simulation</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Geofences are mapped directly against localized latitude/longitude coordinates via Geoapify to push programmatic display mobile ads to devices inside the radius.
            </p>
            <div className="inline-flex gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-200 font-medium">Geoapify Geocoding</span>
              <span className="px-2 py-1">Polygon Mode Enabled</span>
            </div>
            {/* Live coordinate list from geocoded facilities */}
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

          {/* Floating Map Nodes */}
          <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-ping [animation-duration:3s]"></div>
          <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg"></div>

          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center animate-ping [animation-duration:4s]"></div>
          <div className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}