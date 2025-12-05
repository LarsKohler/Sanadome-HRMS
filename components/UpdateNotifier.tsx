import React, { useEffect, useState } from 'react';
import { RefreshCw, GitCommit, X } from 'lucide-react';
import { api } from '../utils/api';

const UpdateNotifier: React.FC = () => {
  const [currentSha, setCurrentSha] = useState<string | null>(null);
  const [latestSha, setLatestSha] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Get initial baseline commit when app loads
    const init = async () => {
      const sha = await api.getLatestCommitSha();
      if (sha) {
        setCurrentSha(sha);
      }
    };
    init();

    // 2. Poll for updates every 60 seconds
    const interval = setInterval(async () => {
      const sha = await api.getLatestCommitSha();
      if (sha) {
        setLatestSha(sha);
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, []);

  // 3. Compare and show popup
  useEffect(() => {
    if (currentSha && latestSha && currentSha !== latestSha) {
      setIsVisible(true);
    }
  }, [latestSha, currentSha]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-6 fade-in duration-500">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center gap-4 border border-slate-700 max-w-sm">
        <div className="bg-teal-500/20 p-2 rounded-lg text-teal-400">
          <GitCommit size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Update Beschikbaar</h4>
          <p className="text-xs text-slate-400 mt-0.5">Er is een nieuwe versie van de applicatie beschikbaar.</p>
        </div>
        <div className="flex flex-col gap-2">
            <button 
                onClick={() => window.location.reload()}
                className="bg-teal-500 hover:bg-teal-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
            >
                <RefreshCw size={12} /> Ververs
            </button>
            <button 
                onClick={() => setIsVisible(false)}
                className="text-slate-500 hover:text-white text-xs font-medium transition-colors"
            >
                Negeer
            </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotifier;