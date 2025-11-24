
import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, X, PlayCircle, Droplets } from 'lucide-react';

interface TargetCoordinates {
  x: string | number;
  y: string | number;
  radius: number;
}

interface StepData {
  title: string;
  description: string;
  target: TargetCoordinates;
}

interface TutorialOverlayProps {
  currentStep: number;
  totalSteps: number;
  stepData: StepData;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ 
  currentStep, 
  totalSteps, 
  stepData, 
  onNext, 
  onPrev, 
  onClose 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });

  // Helper to convert percentage strings to pixels
  const getPixelValue = (val: string | number, dimension: number) => {
    if (typeof val === 'number') return val;
    if (val.endsWith('%')) return (parseFloat(val) / 100) * dimension;
    if (val.endsWith('px')) return parseFloat(val);
    return 0;
  };

  // Track Mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Canvas Drawing Loop (The "Liquid Steam" Effect)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
        if (!canvas || !ctx) return;

        // Resize if needed
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Reset state on resize: fill with steam
            ctx.fillStyle = 'rgba(230, 240, 255, 0.65)'; // Spa steam color (bluish white)
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 1. Draw Steam (We don't clearRect because we want trails, but for this effect we redraw partial opacity to fade trails or keep them persistent?)
        // To make it feel like "wiping a foggy mirror", we DON'T redraw the fog every frame.
        // We only draw the "eraser" every frame.
        // BUT, if we resize or init, we fill it.
        
        requestRef.current = requestAnimationFrame(animate);
    };

    // Initial Fill
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = 'rgba(240, 248, 255, 0.75)'; // Thick steam
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some "Blur" via CSS to the canvas for extra realism
    canvas.style.backdropFilter = 'blur(8px)';
    
    // Start animation loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };

  }, []); // Run once on mount

  // Effect to handle Clearing (Wiping)
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Use 'destination-out' to erase
      ctx.globalCompositeOperation = 'destination-out';
      
      // 1. Clear Mouse Area (The Wiper)
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 60, 0, Math.PI * 2);
      ctx.fill();

      // 2. Clear Step Target Area (Auto-reveal)
      const targetX = getPixelValue(stepData.target.x, window.innerWidth);
      const targetY = getPixelValue(stepData.target.y, window.innerHeight);
      
      if (stepData.target.radius > 0) {
          ctx.beginPath();
          ctx.arc(targetX, targetY, stepData.target.radius, 0, Math.PI * 2);
          ctx.fill();
      }

      // Reset composite
      ctx.globalCompositeOperation = 'source-over';

      // Optional: Draw "Water Droplets" or condensation ring edges?
      // Keeping it simple for performance: just the clear.

  }, [mousePos, stepData]); // Re-run when mouse moves or step changes

  // Calculate Card Position based on target to avoid covering it
  const targetX = getPixelValue(stepData.target.x, typeof window !== 'undefined' ? window.innerWidth : 1000);
  const isLeft = targetX < (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none">
      
      {/* STEAM CANVAS LAYER */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-auto cursor-none touch-none transition-opacity duration-1000"
        style={{ touchAction: 'none' }}
      />

      {/* Custom Cursor Follower (Droplet) */}
      <div 
        className="fixed pointer-events-none z-[102] w-6 h-6 bg-blue-400/50 rounded-full blur-sm mix-blend-overlay transition-transform duration-75 ease-out"
        style={{ 
            left: mousePos.x, 
            top: mousePos.y,
            transform: 'translate(-50%, -50%)' 
        }}
      ></div>

      {/* HUD CARD - Floating Glass */}
      <div 
        className={`fixed z-[101] pointer-events-auto bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl max-w-md w-full transition-all duration-700 ease-out
            ${isLeft ? 'right-12 bottom-12' : 'left-12 bottom-12'}
        `}
      >
         <div className="absolute -top-6 -left-6 bg-blue-500 text-white p-3 rounded-2xl shadow-lg animate-bounce">
             <Droplets size={24} />
         </div>

         <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                 Rondleiding {currentStep + 1}/{totalSteps}
             </span>
             <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                 <X size={20} />
             </button>
         </div>

         <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3 leading-tight">
             {stepData.title}
         </h2>
         
         <p className="text-slate-600 text-base leading-relaxed mb-8">
             {stepData.description}
         </p>

         <div className="flex items-center justify-between">
            <div className="flex gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-blue-200'}`} />
                ))}
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={onPrev}
                    disabled={currentStep === 0}
                    className="p-3 rounded-full text-slate-500 hover:bg-white/50 disabled:opacity-30 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all transform hover:-translate-y-1"
                >
                    <span className="font-medium">{currentStep === totalSteps - 1 ? 'Klaar' : 'Volgende'}</span>
                    {currentStep === totalSteps - 1 ? <PlayCircle size={18} /> : <ChevronRight size={18} />}
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
