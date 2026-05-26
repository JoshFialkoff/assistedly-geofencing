import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const GEOAPIFY_API_KEY = '1b3f322763ae4130b42cda53d75aed18';
const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1KFtnF7L8rylYCr9Fg58qmf43dC-cSpGkzuHE5cShKEk/edit?usp=sharing';

interface GeocodedRow {
  [key: string]: string;
  latitude: string;
  longitude: string;
  geocode_status: string;
}

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function csvExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  return lines.map(line => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    return cols;
  });
}

function toCSVString(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h] ?? '')).join(',')),
  ];
  return lines.join('\r\n');
}

function downloadCSVFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function geocodeAddress(address: string): Promise<{ lat: string; lon: string } | null> {
  const params = new URLSearchParams({
    text: address,
    format: 'json',
    apiKey: GEOAPIFY_API_KEY,
  });
  const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data?.results?.[0];
  if (!first) return null;
  return { lat: String(first.lat), lon: String(first.lon) };
}

export default function GeosheetImporter() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'geocoding' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<GeocodedRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRun = async () => {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      setErrorMsg('Could not extract Sheet ID from URL. Please paste the full Google Sheets URL.');
      setStatus('error');
      return;
    }

    setStatus('fetching');
    setErrorMsg('');
    setResults([]);

    let csvText: string;
    try {
      const res = await fetch(csvExportUrl(sheetId));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csvText = await res.text();
    } catch (e) {
      setErrorMsg(`Failed to fetch Google Sheet: ${(e as Error).message}`);
      setStatus('error');
      return;
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      setErrorMsg('Sheet appears to be empty or has no data rows.');
      setStatus('error');
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Detect the address column heuristically
    const addressColIdx = headers.findIndex(h =>
      /address/i.test(h)
    );

    setStatus('geocoding');
    setProgress({ current: 0, total: dataRows.length });

    const geocoded: GeocodedRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx] ?? '';
      });

      // Build address string: use detected address column, or join all columns
      let addressText = '';
      if (addressColIdx >= 0) {
        addressText = row[addressColIdx] ?? '';
      } else {
        // Fallback: join all non-empty cells
        addressText = row.filter(Boolean).join(', ');
      }

      let lat = '';
      let lon = '';
      let geocodeStatus = 'not_found';

      if (addressText.trim()) {
        try {
          const result = await geocodeAddress(addressText);
          if (result) {
            lat = result.lat;
            lon = result.lon;
            geocodeStatus = 'ok';
          }
        } catch {
          geocodeStatus = 'error';
        }
      }

      geocoded.push({
        ...rowObj,
        latitude: lat,
        longitude: lon,
        geocode_status: geocodeStatus,
      } as GeocodedRow);

      setProgress({ current: i + 1, total: dataRows.length });
    }

    setResults(geocoded);
    setStatus('done');
  };

  const handleDownload = () => {
    downloadCSVFile(toCSVString(results), 'geocoded_facilities.csv');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <FileSpreadsheet className="w-3.5 h-3.5" /> Import &amp; Geocode from Google Sheet
      </h2>

      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Google Sheets URL</label>
          <input
            type="text"
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
          />
        </div>

        <button
          onClick={handleRun}
          disabled={status === 'fetching' || status === 'geocoding'}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {(status === 'fetching' || status === 'geocoding') ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {status === 'fetching' ? 'Fetching sheet…' : `Geocoding ${progress.current}/${progress.total}…`}
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" /> Fetch &amp; Geocode Addresses
            </>
          )}
        </button>

        {status === 'geocoding' && progress.total > 0 && (
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>
                Geocoded {results.filter(r => r.geocode_status === 'ok').length} of {results.length} addresses successfully.
              </span>
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>
        )}
      </div>

      {status === 'done' && results.length > 0 && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-700 text-xs text-slate-400 font-medium">
            Preview ({Math.min(results.length, 5)} of {results.length} rows)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-700">
                  {Object.keys(results[0]).map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[150px] truncate">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
