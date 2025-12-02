
import React, { useEffect } from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Increased slightly to 4s for errors
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !message) return null;

  // Determine if this is an error message
  const isError = /fout|error|mislukt|niet\s+lezen|ongeldig/i.test(message);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`border shadow-lg rounded-lg p-4 flex items-center gap-3 min-w-[300px] max-w-md ${isError ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className={`p-1.5 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
          {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${isError ? 'text-red-900' : 'text-slate-800'}`}>
            {isError ? 'Let op' : 'Succes'}
          </h4>
          <p className={`text-xs ${isError ? 'text-red-700' : 'text-slate-600'}`}>{message}</p>
        </div>
        <button 
          onClick={onClose}
          className={`${isError ? 'text-red-400 hover:text-red-600' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
