'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Activity,
  Gauge,
  Zap,
  RotateCw,
  Download,
  Thermometer,
  Lock,
  ZapOff,
  RotateCcw
} from 'lucide-react';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdnvpuoxtamymiaoxoma.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbnZwdW94dGFteW1pYW94b21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTM5MTcsImV4cCI6MjEwMjUyOTkxN30.4VnCHpIADdogTwCFNSusaK046x2E5eFBCBuE9br1KtQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TelemetryData {
  id?: string | number;
  timestamp: string;
  temperature: number;
  voltage: number;
  current: number;
  rpm: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export default function PyroGridNexusDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [currentVoltage, setCurrentVoltage] = useState<number>(0);
  const [currentCurrent, setCurrentCurrent] = useState<number>(0);
  const [currentRpm, setCurrentRpm] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Administrative Access Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'admin' && passkey === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Administrative Credentials');
    }
  };

  // Initial Data Fetch
  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('thermal_telemetry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0 && !error) {
        const formattedData: TelemetryData[] = data.map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperature: Number(item.temperature),
          voltage: Number(item.voltage),
          current: Number(item.current),
          rpm: Number(item.rpm || 0),
          status: Number(item.temperature) > 75 ? 'CRITICAL' : Number(item.temperature) > 55 ? 'WARNING' : 'NORMAL'
        })).reverse();

        setTelemetry(formattedData);
        const latest = formattedData[formattedData.length - 1];
        setCurrentTemp(latest.temperature);
        setCurrentVoltage(latest.voltage);
        setCurrentCurrent(latest.current);
        setCurrentRpm(latest.rpm);
      }
    } catch (err) {
      console.error('Failed to fetch initial telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Setup Realtime WebSocket Listener
  useEffect(() => {
    fetchTelemetry();

    // Subscribe to INSERT events on thermal_telemetry table
    const channel = supabase
      .channel('realtime_thermal_telemetry')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'thermal_telemetry',
        },
        (payload) => {
          const newItem = payload.new;
          const formattedEntry: TelemetryData = {
            id: newItem.id,
            timestamp: new Date(newItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            temperature: Number(newItem.temperature),
            voltage: Number(newItem.voltage),
            current: Number(newItem.current),
            rpm: Number(newItem.rpm || 0),
            status: Number(newItem.temperature) > 75 ? 'CRITICAL' : Number(newItem.temperature) > 55 ? 'WARNING' : 'NORMAL'
          };

          // Append new real-time record & keep maximum 20 latest entries
          setTelemetry((prev) => [...prev.slice(-19), formattedEntry]);
          setCurrentTemp(formattedEntry.temperature);
          setCurrentVoltage(formattedEntry.voltage);
          setCurrentCurrent(formattedEntry.current);
          setCurrentRpm(formattedEntry.rpm);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const exportCSV = () => {
    if (telemetry.length === 0) return;
    const headers = 'Timestamp,Temperature (°C),Voltage (V),Current (A),RPM,Status\n';
    const rows = telemetry
      .map(t => `${t.timestamp},${t.temperature},${t.voltage},${t.current},${t.rpm},${t.status}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PyroGrid_Telemetry_${Date.now()}.csv`;
    a.click();
  };

  // Administrative Login Panel
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-[#E0E0E0] flex items-center justify-center p-4">
        <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-[#E5A93C]/10 rounded-full border border-[#E5A93C]/30 mb-3">
              <Zap className="w-8 h-8 text-[#E5A93C]" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-[#FFFFFF] uppercase">PyroGrid Nexus</h1>
            <p className="text-xs text-[#888888] tracking-widest mt-1">POWER PLANT THERMAL ANALYTICS</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-[#888888] mb-1 tracking-wider">
                Admin Username
              </label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="Enter admin ID"
                className="w-full bg-[#0F0F10] border border-[#2A2A2E] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-[#E5A93C] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-[#888888] mb-1 tracking-wider">
                Passkey
              </label>
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter passkey"
                className="w-full bg-[#0F0F10] border border-[#2A2A2E] rounded-lg px-4 py-2.5 text-sm text-[#E0E0E0] focus:outline-none focus:border-[#E5A93C] transition-colors"
                required
              />
            </div>

            {authError && (
              <p className="text-xs text-[#FF5555] bg-[#2A1515] border border-[#552222] p-2.5 rounded-lg text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#E5A93C] hover:bg-[#D4982B] text-[#0F0F10] font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Lock className="w-4 h-4" /> Authenticate Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] text-[#E0E0E0] font-sans">
      <header className="border-b border-[#2A2A2E] bg-[#141416] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E5A93C]/10 rounded-lg border border-[#E5A93C]/30">
            <Zap className="w-6 h-6 text-[#E5A93C]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-[#FFFFFF] uppercase">PyroGrid Nexus</h1>
            <p className="text-xs text-[#888888]">Thermal Telemetry & Power Infrastructure System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTelemetry}
            className="flex items-center gap-2 bg-[#1C1C1F] hover:bg-[#2A2A2E] border border-[#2A2A2E] text-xs px-3 py-2 rounded-lg transition-colors text-[#CCCCCC]"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E5A93C]' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-[#1C1C1F] hover:bg-[#2A2A2E] border border-[#2A2A2E] text-xs px-3 py-2 rounded-lg transition-colors text-[#E5A93C]"
          >
            <Download className="w-3.5 h-3.5" /> Export Logs
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-[#2A1515] hover:bg-[#3D1A1A] text-[#FF5555] border border-[#552222] text-xs px-3 py-2 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold">Thermal State</p>
              <p className="text-2xl font-bold text-[#FFFFFF] mt-1">{currentTemp} °C</p>
            </div>
            <div className="p-3 bg-[#222226] rounded-lg border border-[#2A2A2E]">
              <Thermometer className="w-6 h-6 text-[#E5A93C]" />
            </div>
          </div>

          <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold">Grid Voltage</p>
              <p className="text-2xl font-bold text-[#FFFFFF] mt-1">{currentVoltage} V</p>
            </div>
            <div className="p-3 bg-[#222226] rounded-lg border border-[#2A2A2E]">
              <Zap className="w-6 h-6 text-[#55FF55]" />
            </div>
          </div>

          <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold">Load Current</p>
              <p className="text-2xl font-bold text-[#FFFFFF] mt-1">{currentCurrent} A</p>
            </div>
            <div className="p-3 bg-[#222226] rounded-lg border border-[#2A2A2E]">
              <Gauge className="w-6 h-6 text-[#55AAFF]" />
            </div>
          </div>

          <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold">Motor RPM</p>
              <p className="text-2xl font-bold text-[#FFFFFF] mt-1">{currentRpm} RPM</p>
            </div>
            <div className="p-3 bg-[#222226] rounded-lg border border-[#2A2A2E]">
              <RotateCcw className="w-6 h-6 text-[#E5A93C]" />
            </div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#E0E0E0] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#E5A93C]" /> Real-Time Keypad Telemetry Gradient (°C)
            </h2>
            <span className="text-xs text-[#55FF55] flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#55FF55] animate-ping" /> Realtime Active
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262A" />
                <XAxis dataKey="timestamp" stroke="#666666" fontSize={11} />
                <YAxis stroke="#666666" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141416', borderColor: '#2A2A2E', color: '#E0E0E0' }}
                  itemStyle={{ color: '#E5A93C' }}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#E5A93C"
                  strokeWidth={2}
                  dot={{ fill: '#E5A93C', r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#18181A] border border-[#2A2A2E] rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#E0E0E0] mb-4 flex items-center gap-2">
            <ZapOff className="w-4 h-4 text-[#E5A93C]" /> Keypad Data Logs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2A2A2E] text-[#888888]">
                  <th className="pb-3 font-semibold">TIMESTAMP</th>
                  <th className="pb-3 font-semibold">TEMPERATURE (°C)</th>
                  <th className="pb-3 font-semibold">VOLTAGE (V)</th>
                  <th className="pb-3 font-semibold">CURRENT (A)</th>
                  <th className="pb-3 font-semibold">RPM</th>
                  <th className="pb-3 font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2E] text-[#CCCCCC]">
                {telemetry.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#666666]">
                      Waiting for input from ESP32 keypad...
                    </td>
                  </tr>
                ) : (
                  telemetry.slice().reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#222226] transition-colors">
                      <td className="py-3">{row.timestamp}</td>
                      <td className="py-3 font-mono">{row.temperature}</td>
                      <td className="py-3 font-mono">{row.voltage}</td>
                      <td className="py-3 font-mono">{row.current}</td>
                      <td className="py-3 font-mono">{row.rpm}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'CRITICAL' ? 'bg-[#3D1A1A] text-[#FF5555]' :
                          row.status === 'WARNING' ? 'bg-[#3A2E15] text-[#E5A93C]' :
                          'bg-[#1A3D1A] text-[#55FF55]'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}