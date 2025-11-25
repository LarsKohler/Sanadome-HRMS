import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, Server, Clock, Users, FileText, 
  MessageSquare, ShieldCheck, RefreshCw, AlertCircle, 
  CheckCircle2, HardDrive, GitCommit, Tag, User, AlertTriangle, Plus
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { api, isLive } from '../utils/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SystemUpdateLog, Employee } from '../types';
import { Modal } from './Modal';

interface SystemStatusPageProps {
    currentUser: Employee | null;
}

const SystemStatusPage: React.FC<SystemStatusPageProps> = ({ currentUser }) => {
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
  const [updateLogs, setUpdateLogs] = useState<SystemUpdateLog[]>([]);
  
  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState({
      version: 'v',
      type: 'Feature' as 'Feature' | 'Bugfix' | 'Maintenance' | 'Security',
      impact: 'Low' as 'High' | 'Medium' | 'Low',
      description: ''
  });

  const fetchStats = async () => {
    setLoading(true);
    const start = performance.now();
    
    try {
      // Parallel fetching for speed
      let empCount = 0, newsCount = 0, notifCount = 0, survCount = 0;

      if (isLive && supabase) {
          const [emp, news, notif, surv] = await Promise.all([
            supabase.from('employees').select('*', { count: 'exact', head: true }),
            supabase.from('news').select('*', { count: 'exact', head: true }),
            supabase.from('notifications').select('*', { count: 'exact', head: true }),
            supabase.from('surveys').select('*', { count: 'exact', head: true }),
          ]);
          empCount = emp.count || 0;
          newsCount = news.count || 0;
          notifCount = notif.count || 0;
          survCount = surv.count || 0;
      } else {
          // Mock latency if offline
          await new Promise(resolve => setTimeout(resolve, 100)); 
      }

      // Fetch logs
      const logs = await api.getSystemLogs();
      setUpdateLogs(logs.sort((a, b) => new Date(b.date + ' ' + b.timestamp).getTime() - new Date(a.date + ' ' + a.timestamp).getTime()));

      const end = performance.now();
      const latency = Math.round(end - start);

      setStats({
        employees: empCount,
        news: newsCount,
        notifications: notifCount,
        surveys: survCount,
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
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'Operational') return 'bg-green-500';
    if (status === 'Slow') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleAddLog = async (e: React.FormEvent) => {
      e.preventDefault();
      const logEntry: SystemUpdateLog = {
          id: Math.random().toString(36).substr(2, 9),
          version: newLog.version,
          type: newLog.type,
          impact: newLog.impact,
          description: newLog.description,
          author: currentUser ? currentUser.name : 'System Admin',
          date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' }),
          timestamp: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
          status: 'Success'
      };

      await api.saveSystemLog(logEntry);
      setIsLogModalOpen(false);
      fetchStats(); // Refresh list
      setNewLog({ version: 'v', type: 'Feature', impact: 'Low', description: '' });
  };

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[2400px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <Activity className="text-teal-600" size={32} />
             Systeemstatus & Updates
           </h1>
           <p className="text-slate-500 mt-1">Real-time monitoring en change log van het platform.</p>
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
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Totaal Records</h3>
               </div>
               <div className="text-3xl font-bold text-slate-900">{stats.employees + stats.news + stats.notifications + stats.surveys}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <GitCommit size={64} />
               </div>
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><GitCommit size={20}/></div>
                   <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Laatste Update</h3>
               </div>
               <div className="text-3xl font-bold text-slate-900">{updateLogs[0]?.version || 'v1.0'}</div>
               <p className="text-xs text-slate-500 mt-1">{updateLogs[0]?.date || '-'}</p>
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
          
          {/* System Change Log */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <GitCommit size={20} className="text-slate-400"/>
                      System Update Log
                  </h3>
                  <button 
                    onClick={() => setIsLogModalOpen(true)}
                    className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                  >
                      + Registreer Update
                  </button>
              </div>
              
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                              <th className="px-6 py-4">Versie & Datum</th>
                              <th className="px-6 py-4">Type</th>
                              <th className="px-6 py-4">Impact</th>
                              <th className="px-6 py-4">Beschrijving</th>
                              <th className="px-6 py-4 text-right">Auteur</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                          {updateLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900">{log.version}</div>
                                      <div className="text-xs text-slate-500">{log.date} • {log.timestamp}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
                                          log.type === 'Feature' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                          log.type === 'Bugfix' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                          log.type === 'Security' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                          'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                          {log.type}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${
                                              log.impact === 'High' ? 'bg-red-500' :
                                              log.impact === 'Medium' ? 'bg-amber-500' :
                                              'bg-green-500'
                                          }`}></div>
                                          <span className="text-slate-600 font-medium">{log.impact}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <p className="text-slate-700 line-clamp-2">{log.description}</p>
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-500 font-medium">
                                      {log.author}
                                  </td>
                              </tr>
                          ))}
                          {updateLogs.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                                      Nog geen updates geregistreerd.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Latency Chart */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
              <h3 className="font-bold text-slate-900 mb-6">Database Responsiveness</h3>
              <div className="flex-1 w-full">
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
      </div>

      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Registreer Systeem Update"
      >
          <form onSubmit={handleAddLog} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Versie</label>
                      <input 
                        type="text" 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={newLog.version}
                        onChange={(e) => setNewLog({...newLog, version: e.target.value})}
                        placeholder="v1.x.x"
                        required
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type Update</label>
                      <select 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                        value={newLog.type}
                        onChange={(e) => setNewLog({...newLog, type: e.target.value as any})}
                      >
                          <option value="Feature">Feature</option>
                          <option value="Bugfix">Bugfix</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Security">Security</option>
                      </select>
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Impact Level</label>
                  <div className="flex gap-2">
                      {(['Low', 'Medium', 'High'] as const).map((impact) => (
                          <button
                            key={impact}
                            type="button"
                            onClick={() => setNewLog({...newLog, impact})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                                newLog.impact === impact 
                                ? (impact === 'High' ? 'bg-red-100 text-red-700 border-red-300' : impact === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-green-100 text-green-700 border-green-300')
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                              {impact}
                          </button>
                      ))}
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beschrijving</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    placeholder="Wat is er veranderd in deze update?"
                    value={newLog.description}
                    onChange={(e) => setNewLog({...newLog, description: e.target.value})}
                    required
                  />
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
                  Registreer in Database
              </button>
          </form>
      </Modal>
    </div>
  );
}

export default SystemStatusPage;