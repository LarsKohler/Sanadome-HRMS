
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        document.body.style.overflow = 'unset';
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  // Determine if this is a confirmation dialog based on title keywords
  const isConfirmation = /verwijder|zeker|confirm|delete|remove|intrekken|stopzetten|aannemen|afwijzen|herstel/i.test(title);

  if (isConfirmation) {
      return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing || !isOpen ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 border border-transparent dark:border-slate-700 ${isClosing || !isOpen ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}>
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className="p-6 text-slate-600 dark:text-slate-300">
                    {children}
                </div>
            </div>
        </div>
      );
  }

  // STANDARD SIDE DRAWER FOR FORMS
  return (
    <div className={`fixed inset-0 z-[100] flex justify-end transition-opacity duration-300 ${isClosing || !isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-2xl bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-transparent dark:border-slate-700 ${isClosing || !isOpen ? 'translate-x-full' : 'translate-x-0'}`}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 flex-shrink-0">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="text-slate-700 dark:text-slate-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
