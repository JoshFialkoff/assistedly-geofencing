import React, { useState } from 'react';
import { MapPin, Target, Layers, Users, Building, Plus, Play, Pause } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  city: string;
  radiusMeters: number;
  activeCampaigns: number;
}

export default function App() {
  const [facilities, setFacilities] = useState<Facility[]>([
    { id: '1', name: 'Boston Assisted Living Center', city: 'Boston', radiusMeters: 500, activeCampaigns: 2 },
    { id: '2', name: 'Worcester Senior Care', city: 'Worcester', radiusMeters: 300, activeCampaigns: 1 },
    { id: '3', name: 'Springfield Retirement Community', city: 'Springfield', radiusMeters: 400, activeCampaigns: 0 },
  ]);

  const [newFacility, setNewFacility] = useState({ name: '', city: '', radius: 500 });

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.city) return;
    
    setFacilities([
      ...facilities,
      {
        id: Date.now().toString(),
        name: newFacility.name,
        city: newFacility.city,
        radiusMeters: newFacility.radius,
        activeCampaigns: 0
      }
    ]);
    setNewFacility({ name: '', city: '', radius: 500 });
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

          {/* Add New Geofence Section */}
          <div className="mb-8">
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
                  <label className="block text-xs text-slate-400 mb-1">MA City</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Newton" 
                    value={newFacility.city}
                    onChange={e => setNewFacility({...newFacility, city: e.target.value})}
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
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                Create Fence Radius
              </button>
            </form>
          </div>

          {/* Active Fenced Locations */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building className="w-3.5 h-3.5" /> Fenced Facilities ({facilities.length})
            </h2>
            <div className="space-y-2">
              {facilities.map(facility => (
                <div key={facility.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex justify-between items-center group">
                  <div>
                    <div className="font-medium text-sm text-slate-200">{facility.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{facility.city}, MA</span>
                      <span>•</span>
                      <span>{facility.radiusMeters}m fence</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${facility.activeCampaigns > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {facility.activeCampaigns} Active Ads
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
        <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between z-10">
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
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            <Play className="w-4 h-4 fill-current" /> Deploy Live Campaign
          </button>
        </div>

        {/* Map Placeholder Viewport */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden">
          {/* Mock Map Background Grid */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#4f4f4f_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          
          {/* Central Visualization Elements */}
          <div className="text-center max-w-md z-10 px-4">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Layers className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Interactive Map Simulation</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Geofences are mapped directly against localized latitude/longitude coordinates to push programmatic display mobile ads to devices inside the radius.
            </p>
            <div className="inline-flex gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span className="px-2 py-1 bg-slate-800 rounded text-slate-200 font-medium">Mapbox Core v3</span>
              <span className="px-2 py-1">Polygon Mode Enabled</span>
            </div>
          </div>

          {/* Floating Map Nodes (Mocking actual coordinate rings) */}
          <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-ping [animation-duration:3s]"></div>
          <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow-lg"></div>
          
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center animate-ping [animation-duration:4s]"></div>
          <div className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}