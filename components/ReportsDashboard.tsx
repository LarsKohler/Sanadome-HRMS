
import React, { useState } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie 
} from 'recharts';
import { ChevronLeft, MoreHorizontal, Filter } from 'lucide-react';

const ReportsDashboard: React.FC = () => {
  const [filterActive, setFilterActive] = useState(false);

  const fullData = [
    { name: 'Mar 22', hires: 0, terms: 0, count: 18 },
    { name: 'Apr 22', hires: 1, terms: 1, count: 18 },
    { name: 'May 22', hires: 0, terms: 0, count: 18 },
    { name: 'Jun 22', hires: 0, terms: 0, count: 18 },
    { name: 'Jul 22', hires: 0, terms: 0, count: 18 },
    { name: 'Aug 22', hires: 0, terms: 0, count: 18 },
    { name: 'Sep 22', hires: 2, terms: 0, count: 20 },
    { name: 'Oct 22', hires: 0, terms: 1, count: 19 },
    { name: 'Nov 22', hires: 0, terms: 0, count: 19 },
    { name: 'Dec 22', hires: 0, terms: 0, count: 19 },
    { name: 'Jan 23', hires: 1, terms: 1, count: 19 },
    { name: 'Feb 23', hires: 0, terms: 1, count: 18 },
    { name: 'Mar 23', hires: 1, terms: 0, count: 19 },
    { name: 'Apr 23', hires: 0, terms: 0, count: 19 },
    { name: 'May 23', hires: 0, terms: 0, count: 19 },
    { name: 'Jun 23', hires: 1, terms: 0, count: 20 },
    { name: 'Jul 23', hires: 0, terms: 0, count: 20 },
    { name: 'Aug 23', hires: 0, terms: 0, count: 20 },
    { name: 'Sep 23', hires: 0, terms: 0, count: 20 },
    { name: 'Oct 23', hires: 0, terms: 0, count: 20 },
  ];

  const recentData = fullData.slice(10); 
  const data = filterActive ? recentData : fullData;

  const pieDataDivisions = [
    { name: 'Engineering', value: 400, color: '#0f172a' }, // Slate 900
    { name: 'Sales', value: 300, color: '#0d9488' }, // Teal 600
    { name: 'Marketing', value: 300, color: '#94a3b8' }, // Slate 400
  ];

  const pieDataLocations = [
    { name: 'London', value: 200, color: '#0d9488' },
    { name: 'New York', value: 300, color: '#0f172a' },
    { name: 'Remote', value: 100, color: '#cbd5e1' },
  ];

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#64748b" fontSize={10} transform="rotate(-45)">
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Rapportages</h1>
           <p className="text-slate-500 mt-1">Inzicht in personeelsdata.</p>
        </div>
        
        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors self-end sm:self-auto">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="mb-8">
        <button 
          onClick={() => setFilterActive(!filterActive)}
          className={`inline-flex items-center px-5 py-2.5 border rounded-xl shadow-sm text-sm font-bold transition-all ${
            filterActive 
              ? 'bg-teal-50 border-teal-200 text-teal-700' 
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Filter size={16} className={`mr-2 ${filterActive ? 'text-teal-500' : 'text-slate-400'}`} />
          Filter ({filterActive ? '2023' : 'Alles'})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-8">Personeelsverloop & Aannames</h2>
          
          <div className="h-[300px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={<CustomXAxisTick />} 
                  interval={0}
                  height={60}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#64748b" 
                  tick={{fontSize: 10}} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#64748b" 
                  tick={{fontSize: 10}} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[17, 22]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Inter' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="hires" name="Nieuwe aannames" fill="#0d9488" barSize={8} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="terms" name="Vertrek" fill="#ef4444" barSize={8} radius={[4, 4, 0, 0]} />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="count" 
                  name="Totaal" 
                  stroke="#0f172a" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#fff', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-6 text-sm">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-teal-600"></div>
               <span className="text-slate-600 font-medium">Aannames</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-red-500"></div>
               <span className="text-slate-600 font-medium">Vertrek</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full border-2 border-slate-900 bg-white"></div>
               <span className="text-slate-600 font-medium">Totaal personeel</span>
             </div>
          </div>
        </div>

        {/* Side Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Verloop</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-slate-900">15.7%</span>
            </div>
            <div className="text-sm text-slate-500">Afgelopen 12 maanden</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center">
             <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Groei</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-slate-900">0.3%</span>
            </div>
            <div className="text-sm text-slate-500">Netto toename</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 h-96">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Verdeling Afdelingen</h2>
          <div className="h-64 w-full flex items-end justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataDivisions}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  cornerRadius={4}
                >
                  {pieDataDivisions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 h-96">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Verdeling Locaties</h2>
          <div className="h-64 w-full flex items-end justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataLocations}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  cornerRadius={4}
                >
                  {pieDataLocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;