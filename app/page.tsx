'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Thermometer, 
  Gauge, 
  ShieldAlert, 
  Lock, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Initialization ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TypeScript Interface (Updated to accept standard string or specific unions) ---
interface TelemetryData {
  id: any;
  timestamp: string;
  temperature: number;
  voltage: number;
  current: number;
  rpm: number;
  status: string; // Flexible string to avoid TS2322 build errors
}

export default function PyroGridNexus() {
  // Authentication State
  const useStateAuth = useState(false);
  const isAuthenticated = useStateAuth[0];
  const setIsAuthenticated = useStateAuth[1];

  const useStatePasskey = useState('');
  const passkey = useStatePasskey[0];
  const setPasskey = useStatePasskey[1];

  const useStateAuthError = useState('');
  const authError = useStateAuthError[0];
  const setAuthError = useStateAuthError[1];

  // Telemetry & Control State
  const useStateTelemetry = useState<TelemetryData[]>([]);
  const telemetryData = useStateTelemetry[0];
  const setTelemetryData = useStateTelemetry[1];

  const useStateLoading = useState(true);
  const isLoading = useStateLoading[0];
  const setIsLoading = useStateLoading[1];

  // Admin Passkey Verification
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey === 'admin123' || passkey === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Access Key. Access Denied.');
    }
  };

  // Fetch Real-time Telemetry Data from Supabase
  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        setTelemetryData(data);
      } else {
        // Fallback Mock Data with explicit typing
        setTelemetryData([
          { id: 1, timestamp: '12:00:00', temperature: 48.5, voltage: 230, current: 12.4, rpm: 1500, status: 'NORMAL' },
          { id: 2, timestamp: '12:01:00', temperature: 52.1, voltage: 228, current: 12.8, rpm: 1510, status: 'NORMAL' },
          { id: 3, timestamp: '12:02:00', temperature: 68.4, voltage: 222, current: 15.1, rpm: 1580, status: 'WARNING' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const latestRead = telemetryData[0] || {
    temperature: 0,
    voltage: 0,
    current: 0,
    rpm: 0,
    status: 'OFFLINE',
  };

  // --- LOGIN PANEL (Matte Black with Clean Inputs) ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-gray-100 font-sans">
        <div className="w-full max-w-md bg-[#1e1e1e] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-white">PYROGRID NEXUS</h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Thermal Analytics & Control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Operator Passkey
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Passkey"
                  className="w-full bg-[#121212] border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 transition"
                  required
                />
                <Lock className="w-4 h-4 text-gray-500 absolute right-4 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-4 rounded-xl text-sm transition tracking-wider uppercase shadow-lg shadow-yellow-400/10"
            >
              Authenticate System
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest">
            Industrial Power Monitoring System • Secure Terminal
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD PANEL ---
  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans">
      {/* Header Bar */}
      <header className="bg-[#1e1e1e] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/30 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">PYROGRID NEXUS</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Thermal Analytics Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchTelemetry}
              className="p-2.5 bg-[#2a2a2a] hover:bg-[#333333] border border-gray-700 rounded-xl text-gray-300 hover:text-white transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-xs bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-medium transition"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Temperature */}
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thermal Load</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Thermometer className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{latestRead.temperature} °C</div>
            <div className="text-xs text-gray-500">Core Junction Temp</div>
          </div>

          {/* Voltage */}
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Voltage</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{latestRead.voltage} V</div>
            <div className="text-xs text-gray-500">RMS Bus Voltage</div>
          </div>

          {/* Current */}
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Draw</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Activity className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{latestRead.current} A</div>
            <div className="text-xs text-gray-500">Primary Phase Current</div>
          </div>

          {/* RPM / Speed */}
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cooling Fan Speed</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Gauge className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{latestRead.rpm} RPM</div>
            <div className="text-xs text-gray-500">Active Exhaust Fan</div>
          </div>
        </div>

        {/* Real-time Telemetry Table */}
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-md font-bold text-white tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" /> Telemetry Stream Log
            </h2>
            <span className="text-xs text-gray-500">Showing last {telemetryData.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 bg-[#171717] text-xs uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Temperature</th>
                  <th className="py-4 px-6">Voltage</th>
                  <th className="py-4 px-6">Current</th>
                  <th className="py-4 px-6">Speed (RPM)</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {telemetryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#252525] transition">
                    <td className="py-4 px-6 font-mono text-gray-400">{row.timestamp}</td>
                    <td className="py-4 px-6 font-semibold text-white">{row.temperature} °C</td>
                    <td className="py-4 px-6">{row.voltage} V</td>
                    <td className="py-4 px-6">{row.current} A</td>
                    <td className="py-4 px-6">{row.rpm} RPM</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          row.status === 'CRITICAL'
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                            : row.status === 'WARNING'
                            ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {row.status === 'CRITICAL' || row.status === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}