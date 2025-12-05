
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

  // Determine if this is likely a confirmation dialog (delete/warning) based on title keywords
  // Confirmation dialogs stay minimal and centered. Forms become drawers.
  const isConfirmation = /verwijder|zeker|confirm|delete|remove/i.test(title);

  if (isConfirmation) {
      return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing || !isOpen ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 ${isClosing || !isOpen ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
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
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isClosing || !isOpen ? 'translate-x-full' : 'translate-x-0'}`}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 flex-shrink-0">
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          {children}
        </div>
      </div>
    </div>
  );
};
