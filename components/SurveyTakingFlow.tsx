
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Check, Sparkles, Star, Circle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Survey, SurveyQuestion, SurveyResponse } from '../types';

interface SurveyTakingFlowProps {
  survey: Survey;
  employeeId: string;
  onComplete: (response: SurveyResponse) => void;
  onClose: () => void;
}

const SurveyTakingFlow: React.FC<SurveyTakingFlowProps> = ({ survey, employeeId, onComplete, onClose }) => {
  const [step, setStep] = useState(-1); // -1 = Welcome, 0..N = Questions, N+1 = Success
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isExiting, setIsExiting] = useState(false);

  const questions = survey.questions;
  const totalSteps = questions.length;

  const handleAnswer = (questionId: string, value: string | number) => {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const nextStep = () => {
      if (step < totalSteps) {
          setIsExiting(true);
          setTimeout(() => {
              setStep(prev => prev + 1);
              setIsExiting(false);
          }, 400);
      } else {
          // Finish
          const response: SurveyResponse = {
              id: Math.random().toString(36).substr(2, 9),
              surveyId: survey.id,
              employeeId: employeeId,
              answers: answers,
              completedAt: new Date().toLocaleDateString('nl-NL')
          };
          onComplete(response);
      }
  };

  // Determine which image should be active based on step
  const activeImageSrc = useMemo(() => {
      if (step === -1) return survey.coverImage || "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80";
      if (step >= totalSteps) return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1920&q=80";
      
      // Per question image
      if (questions[step].image) return questions[step].image;

      // Fallback logic if no specific image
      const imgs = [
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1604328727766-a151d1045ab4?auto=format&fit=crop&w=1920&q=80",
          "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1920&q=80"
      ];
      return imgs[step % imgs.length];
  }, [step, questions, survey.coverImage, totalSteps]);

  // Preload images list (basic deduplication)
  const allPossibleImages = useMemo(() => {
      const set = new Set<string>();
      if (survey.coverImage) set.add(survey.coverImage);
      set.add("https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80");
      set.add("https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1920&q=80");
      
      questions.forEach(q => {
          if (q.image) set.add(q.image);
      });
      
      // Fallbacks
      set.add("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80");
      set.add("https://images.unsplash.com/photo-1604328727766-a151d1045ab4?auto=format&fit=crop&w=1920&q=80");
      set.add("https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1920&q=80");

      return Array.from(set);
  }, [survey, questions]);

  return (
    <div className="fixed inset-0 z-[60] flex bg-slate-900 font-sans overflow-hidden">
      {/* Custom Animation Styles */}
      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        .animate-kenburns {
          animation: kenburns 20s ease-out infinite alternate;
        }
      `}</style>

      {/* LEFT PANEL: Visuals with Stacked Cross-Fade */}
      <div className="hidden lg:block w-[45%] relative overflow-hidden bg-black">
         
         {/* Image Stack */}
         {allPossibleImages.map((src) => (
             <div 
                key={src}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${activeImageSrc === src ? 'opacity-70 z-10' : 'opacity-0 z-0'}`}
             >
                 <img 
                    src={src} 
                    alt="Visual"
                    className="w-full h-full object-cover animate-kenburns"
                 />
             </div>
         ))}

         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-90 z-20"></div>
         
         <div className="absolute bottom-0 left-0 p-12 z-30">
            <h2 className="text-4xl font-serif text-white italic drop-shadow-lg mb-4 animate-in slide-in-from-bottom-2 fade-in duration-700">
                {step === -1 ? '"Jouw mening telt."' : 
                 step >= totalSteps ? '"Bedankt voor je input."' : 
                 '"Samen maken we het verschil."'}
            </h2>
            <div className="h-1 w-24 bg-blue-500 rounded-full"></div>
         </div>
      </div>

      {/* RIGHT PANEL: Content */}
      <div className="w-full lg:w-[55%] bg-slate-50 relative flex flex-col">
          
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
             <div className="flex gap-2">
                 {Array.from({ length: totalSteps + 1 }).map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step + 1 > i ? 'w-8 bg-slate-800' : 'w-2 bg-slate-200'}`}></div>
                 ))}
             </div>
             <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                 Sluiten
             </button>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex items-center justify-center p-8 md:p-20 overflow-y-auto">
             <div className={`max-w-lg w-full transition-all duration-500 ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                
                {/* STEP -1: WELCOME */}
                {step === -1 && (
                    <div className="text-center lg:text-left space-y-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm mx-auto lg:mx-0">
                            <Sparkles size={32} />
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-slate-900 leading-tight">{survey.title}</h1>
                        <p className="text-lg text-slate-600 leading-relaxed">{survey.description}</p>
                        <div className="pt-6">
                            <button 
                                onClick={nextStep}
                                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto lg:mx-0"
                            >
                                Start Survey <ArrowRight size={20}/>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEPS 0..N: QUESTIONS */}
                {step >= 0 && step < totalSteps && (
                    <div className="space-y-8">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Vraag {step + 1} van {totalSteps}</span>
                        <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight">
                            {questions[step].text}
                        </h2>

                        <div className="space-y-4 pt-4">
                            {/* RATING INPUT (1-5) */}
                            {questions[step].type === 'Rating' && (
                                <div className="flex justify-between items-center max-w-md">
                                    {[1, 2, 3, 4, 5].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAnswer(questions[step].id, val)}
                                            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all
                                                ${answers[questions[step].id] === val 
                                                    ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'}
                                            `}
                                        >
                                            <span className="font-bold text-lg">{val}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* SCALE 1-10 INPUT */}
                            {questions[step].type === 'Scale10' && (
                                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAnswer(questions[step].id, val)}
                                            className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all text-sm
                                                ${answers[questions[step].id] === val 
                                                    ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'}
                                            `}
                                        >
                                            <span className="font-bold">{val}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* YES / NO INPUT */}
                            {questions[step].type === 'YesNo' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleAnswer(questions[step].id, 'Yes')}
                                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                                            ${answers[questions[step].id] === 'Yes'
                                                ? 'bg-green-50 border-green-500 text-green-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-600'}
                                        `}
                                    >
                                        <ThumbsUp size={32} />
                                        <span className="font-bold">Ja</span>
                                    </button>
                                    <button
                                        onClick={() => handleAnswer(questions[step].id, 'No')}
                                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                                            ${answers[questions[step].id] === 'No'
                                                ? 'bg-red-50 border-red-500 text-red-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600'}
                                        `}
                                    >
                                        <ThumbsDown size={32} />
                                        <span className="font-bold">Nee</span>
                                    </button>
                                </div>
                            )}

                            {/* MULTIPLE CHOICE INPUT */}
                            {questions[step].type === 'Choice' && (
                                <div className="space-y-3">
                                    {questions[step].options?.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => handleAnswer(questions[step].id, opt)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between
                                                ${answers[questions[step].id] === opt
                                                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}
                                            `}
                                        >
                                            <span className="font-medium">{opt}</span>
                                            {answers[questions[step].id] === opt && <Check size={20} className="text-blue-600"/>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* TEXT INPUT */}
                            {questions[step].type === 'Text' && (
                                <textarea
                                    rows={4}
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:outline-none text-slate-800 transition-colors"
                                    placeholder="Typ hier uw antwoord..."
                                    value={answers[questions[step].id] || ''}
                                    onChange={(e) => handleAnswer(questions[step].id, e.target.value)}
                                />
                            )}
                        </div>

                        <div className="pt-8 flex justify-end">
                            <button 
                                onClick={nextStep}
                                disabled={!answers[questions[step].id] && questions[step].type !== 'Text'} // Text optional? Let's say required for now unless typed
                                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold shadow-md hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {step === totalSteps - 1 ? 'Afronden' : 'Volgende'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP N+1: SUCCESS */}
                {step >= totalSteps && (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
                            <Check size={40} strokeWidth={4} />
                        </div>
                        <h2 className="text-4xl font-serif font-bold text-slate-900">Bedankt!</h2>
                        <p className="text-lg text-slate-600">Je antwoorden zijn succesvol verzonden.</p>
                        <div className="pt-8">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold shadow-md hover:bg-slate-800 transition-all"
                            >
                                Terug naar Dashboard
                            </button>
                        </div>
                    </div>
                )}

             </div>
          </div>
      </div>
    </div>
  );
};

export default SurveyTakingFlow;
