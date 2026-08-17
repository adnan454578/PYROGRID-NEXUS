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
  AlertTriangle,
  TrendingUp,
  Building2,
  ChevronDown,
  LogOut,
  KeyRound,
  Cpu
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

// --- Supabase Client Initialization ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdnvpuoxtamymiaoxoma.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbnZwdW94dGFteW1pYW94b21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTM5MTcsImV4cCI6MjEwMjUyOTkxN30.4VnCHpIADdogTwCFNSusaK046x2E5eFBCBuE9br1KtQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TelemetryData {
  id?: any;
  created_at?: string;
  timestamp?: string;
  temperature: number;
  voltage: number;
  current: number;       // Load Current (A)
  max_demand?: number;   // Maximum Demand (kWh)
  rpm: number;
  status: string;
  plant_id?: string;
}

// Power Plant Data
const powerPlants = [
  { id: 'plant-1', name: 'Power Plant 1', capacity: '100 MW', status: 'ACTIVE' },
  { id: 'plant-2', name: 'Power Plant 2', capacity: '110 MW', status: 'ACTIVE' },
  { id: 'plant-3', name: 'Power Plant 3', capacity: '95 MW', status: 'STANDBY' },
];

export default function PyroGridNexus() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [authError, setAuthError] = useState('');

  // Plant & Telemetry State
  const [selectedPlant, setSelectedPlant] = useState(powerPlants[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Local Time Formatting (HH:MM:SS)
  const formatTime = (row: TelemetryData) => {
    const rawTime = row.created_at || row.timestamp;
    if (!rawTime) return new Date().toLocaleTimeString();
    
    if (rawTime.length <= 8 && rawTime.includes(':')) return rawTime;

    const date = new Date(rawTime);
    return isNaN(date.getTime())
      ? rawTime
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey === 'admin123' || passkey === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Access Key. Access Denied.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasskey('');
    setAuthError('');
  };

  // Fetch Telemetry Records from Supabase
  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .order('id', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Supabase Query Error:', error);
      }

      if (data && data.length > 0) {
        setTelemetryData(data as TelemetryData[]);
      } else {
        // Fallback live demo data if database is empty
        const now = new Date();
        setTelemetryData([
          { 
            id: 3, 
            created_at: new Date(now.getTime()).toISOString(), 
            temperature: 48.5, 
            voltage: 230, 
            current: 12.4, 
            max_demand: 285.2,
            rpm: 1500, 
            status: 'NORMAL' 
          },
          { 
            id: 2, 
            created_at: new Date(now.getTime() - 60000).toISOString(), 
            temperature: 52.1, 
            voltage: 228, 
            current: 12.8, 
            max_demand: 291.8,
            rpm: 1510, 
            status: 'NORMAL' 
          },
          { 
            id: 1, 
            created_at: new Date(now.getTime() - 120000).toISOString(), 
            temperature: 68.4, 
            voltage: 222, 
            current: 15.1, 
            max_demand: 335.0,
            rpm: 1580, 
            status: 'WARNING' 
          },
        ]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTelemetry();

      // Subscribe to Real-time Inserts with typed payload
      const channel = supabase
        .channel('schema-db-changes')
        .on<TelemetryData>(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'telemetry' },
          (payload) => {
            if (payload.new) {
              const newRecord = payload.new as TelemetryData;
              setTelemetryData((prev) => [newRecord, ...prev.slice(0, 14)]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const latestRead = telemetryData[0] || {
    temperature: 0,
    voltage: 0,
    current: 0,
    max_demand: 0,
    rpm: 0,
    status: 'OFFLINE',
  };

  // Chart Data Preparation (Chronological Order)
  const chartData = [...telemetryData].reverse().map((item) => ({
    time: formatTime(item),
    temp: item.temperature,
    volts: item.voltage,
  }));

  // --- DEDICATED LOGIN INTERFACE ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 text-gray-100 font-sans relative overflow-hidden">
        {/* Subtle Ambient Background Elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#1e1e1e] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-white">PYROGRID NEXUS</h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Thermal Analytics & Control Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-yellow-400" /> Operator Access Passkey
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Access Key"
                  className="w-full bg-[#121212] border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 transition"
                  required
                />
                <Lock className="w-4 h-4 text-gray-500 absolute right-4 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2 animate-fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-4 rounded-xl text-sm transition tracking-wider uppercase shadow-lg shadow-yellow-400/10 active:scale-[0.99]"
            >
              Authenticate & Access Dashboard
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-widest border-t border-gray-800/60 pt-4">
            Industrial Power Monitoring System • Authorization Required
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD INTERFACE ---
  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-[#1e1e1e] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/30 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">PYROGRID NEXUS</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Thermal Analytics Portal</p>
            </div>
          </div>

          {/* Plant Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#121212] border border-gray-700 hover:border-yellow-400/50 px-4 py-2.5 rounded-xl transition text-left"
            >
              <Building2 className="w-4 h-4 text-yellow-400" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  {selectedPlant.name}
                  <span className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    {selectedPlant.capacity}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">Generation Status</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#1e1e1e] border border-gray-800 rounded-xl shadow-2xl z-50 py-2">
                <div className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  Select Power Station
                </div>
                {powerPlants.map((plant) => (
                  <button
                    key={plant.id}
                    onClick={() => {
                      setSelectedPlant(plant);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#2a2a2a] transition ${
                      selectedPlant.id === plant.id ? 'bg-[#252525] border-l-2 border-yellow-400' : ''
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{plant.name}</div>
                      <div className="text-[10px] text-gray-400">Status: {plant.status}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20">
                      {plant.capacity}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
              onClick={handleLogout}
              className="text-xs bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl font-medium transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Active Station Banner */}
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-300">
              Live Connection Active: <strong className="text-white">{selectedPlant.name}</strong>
            </span>
          </div>
          <div className="text-xs font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-lg">
            Generation Capacity: {selectedPlant.capacity}
          </div>
        </div>

        {/* Telemetry Cards Grid (5 Grid Items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Boiler Temp</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Thermometer className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">{latestRead.temperature} °C</div>
            <div className="text-[11px] text-gray-500">Boiler Core Temp</div>
          </div>

          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gen. Voltage</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">{latestRead.voltage} V</div>
            <div className="text-[11px] text-gray-500">Generating Voltage</div>
          </div>

          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Load Current</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Activity className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">{latestRead.current} A</div>
            <div className="text-[11px] text-gray-500">Phase Load Current</div>
          </div>

          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Demand</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Cpu className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">{latestRead.max_demand ?? (latestRead.current * 20).toFixed(1)} kWh</div>
            <div className="text-[11px] text-gray-500">Maximum Demand</div>
          </div>

          <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Machine Speed</span>
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Gauge className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mb-1">{latestRead.rpm} RPM</div>
            <div className="text-[11px] text-gray-500">Turbine / Shaft Speed</div>
          </div>
        </div>

        {/* Real-time Line Chart */}
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-md font-bold text-white tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" /> Real-Time Thermal Dynamics ({selectedPlant.name})
            </h2>
            <span className="text-xs text-gray-500">Live Telemetry Trend</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="time" stroke="#666666" fontSize={11} />
                <YAxis stroke="#666666" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333333', borderRadius: '12px', color: '#ffffff' }}
                  itemStyle={{ color: '#eab308' }}
                />
                <Area
                  type="monotone"
                  dataKey="temp"
                  stroke="#eab308"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tempGradient)"
                  name="Boiler Temp (°C)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Data Stream Log Table */}
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
                  <th className="py-4 px-6">Boiler Temp</th>
                  <th className="py-4 px-6">Generating Voltage</th>
                  <th className="py-4 px-6">Load Current</th>
                  <th className="py-4 px-6">Max Demand</th>
                  <th className="py-4 px-6">Machine Speed</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {telemetryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#252525] transition">
                    <td className="py-4 px-6 font-mono text-gray-400">{formatTime(row)}</td>
                    <td className="py-4 px-6 font-semibold text-white">{row.temperature} °C</td>
                    <td className="py-4 px-6">{row.voltage} V</td>
                    <td className="py-4 px-6">{row.current} A</td>
                    <td className="py-4 px-6">{row.max_demand ?? (row.current * 20).toFixed(1)} kWh</td>
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