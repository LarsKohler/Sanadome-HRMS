
import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

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
      }, 3000); // Auto hide after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-4 flex items-center gap-3 min-w-[300px]">
        <div className="bg-green-100 text-green-600 p-1.5 rounded-full">
          <CheckCircle2 size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-800">Succes</h4>
          <p className="text-xs text-slate-600">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};