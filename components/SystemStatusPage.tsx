
import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, Server, Clock, Users, FileText, 
  MessageSquare, ShieldCheck, RefreshCw, AlertCircle, 
  CheckCircle2, HardDrive
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function SystemStatusPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    employees: 0,
    news: 0,
    notifications: 0,
    surveys: 0,
    dbLatency: 0,
    lastChecked: new Date().toLocaleTimeString(),
    status: 'Operational'
  });

  const [latencyHistory, setLatencyHistory] = useState<{time: string, latency: number}[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    const start = performance.now();
    
    try {
      if (!supabase) throw new Error("Supabase not connected");

      // Parallel fetching for speed
      const [emp, news, notif, surv] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('surveys').select('*', { count: 'exact', head: true }),
      ]);

      const end = performance.now();
      const latency = Math.round(end - start);

      setStats({
        employees: emp.count || 0,
        news: news.count || 0,
        notifications: notif.count || 0,
        surveys: surv.count || 0,
        dbLatency: latency,
        lastChecked: new Date().toLocaleTimeString(),
        status: latency > 500 ? 'Slow' : 'Operational'
      });

      setLatencyHistory(prev => {
        const newData = [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' }), latency }];
        return newData.slice(-10); // Keep last 10 points
      });

    } catch (e) {
      console.error(e);
      setStats(prev => ({ ...prev, status: 'Error', dbLatency: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'Operational') return 'bg-green-500';
    if (status === 'Slow') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Activity className="text-teal-600" size={32} />
             Systeemstatus & Analyse
           </h1>
           <p className="text-slate-500 mt-1">Real-time monitoring van database prestaties en data integriteit.</p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                <span className={`w-3 h-3 rounded-full ${getStatusColor(stats.status)} animate-pulse`}></span>
                <span className="text-sm font-bold text-slate-700">{stats.status}</span>
             </div>
             <button 
               onClick={fetchStats}
               disabled={loading}
               className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
             >
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Server size={64} />
               </div>
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Database size={20}/></div>
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Database Latency</h3>
               </div>
               <div className="flex items-end gap-2">
                   <span className="text-3xl font-bold text-slate-900">{stats.dbLatency}ms</span>
                   <span className={`text-xs font-bold mb-1 ${stats.dbLatency < 300 ? 'text-green-600' : 'text-amber-600'}`}>
                       {stats.dbLatency < 300 ? 'Uitstekend' : 'Vertraging'}
                   </span>
               </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Users size={64} />
               </div>
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Users size={20}/></div>
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Totaal Medewerkers</h3>
               </div>
               <div className="text-3xl font-bold text-slate-900">{stats.employees}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <HardDrive size={64} />
               </div>
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><HardDrive size={20}/></div>
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Storage Records</h3>
               </div>
               <div className="text-3xl font-bold text-slate-900">{stats.employees + stats.news + stats.notifications + stats.surveys}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Clock size={64} />
               </div>
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Clock size={20}/></div>
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Laatste Check</h3>
               </div>
               <div className="text-3xl font-bold text-slate-900">{stats.lastChecked}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Database Responsiveness (Real-time)</h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={latencyHistory}>
                          <defs>
                              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="time" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Area type="monotone" dataKey="latency" stroke="#0d9488" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Data Distributie</h3>
              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                              <FileText size={18} />
                          </div>
                          <div>
                              <div className="font-bold text-slate-900">Nieuws Artikelen</div>
                              <div className="text-xs text-slate-500">Gepubliceerde posts</div>
                          </div>
                      </div>
                      <span className="font-bold text-slate-900">{stats.news}</span>
                  </div>

                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                              <AlertCircle size={18} />
                          </div>
                          <div>
                              <div className="font-bold text-slate-900">Notificaties</div>
                              <div className="text-xs text-slate-500">Totaal verstuurd</div>
                          </div>
                      </div>
                      <span className="font-bold text-slate-900">{stats.notifications}</span>
                  </div>

                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                              <MessageSquare size={18} />
                          </div>
                          <div>
                              <div className="font-bold text-slate-900">Surveys</div>
                              <div className="text-xs text-slate-500">Actieve vragenlijsten</div>
                          </div>
                      </div>
                      <span className="font-bold text-slate-900">{stats.surveys}</span>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 mt-4">
                      <div className="flex items-center gap-2 text-sm text-green-600 font-bold bg-green-50 p-3 rounded-lg justify-center">
                          <CheckCircle2 size={16} />
                          Alle systemen operationeel
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
