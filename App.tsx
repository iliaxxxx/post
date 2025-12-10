
import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, TextSize, TextAlign } from './types';
import { 
  Sparkles, Download, Share2, Plus, Copy, Trash2, 
  Type, Image as ImageIcon, Palette, Layers, 
  ChevronLeft, ChevronRight, Wand2, RefreshCw, Upload, AlignLeft, AlignCenter, AlignRight, Check
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  const [username, setUsername] = useState<string>('@username');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selection & Navigation
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'background'>('text');
  const [showGenerator, setShowGenerator] = useState(true); // Toggle between Generator Wizard and Editor

  // Editing State (Per-slide overrides)
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});

  // Individual Loading States
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  // Apply default styles when slides are created
  useEffect(() => {
    if (slides.length > 0) {
      // Ensure we have styles for all slides
      const newStyles = { ...slideStyles };
      let changed = false;
      slides.forEach(s => {
        if (!newStyles[s.number]) {
          newStyles[s.number] = { ...DEFAULT_STYLE };
          changed = true;
        }
      });
      if (changed) setSlideStyles(newStyles);
    }
  }, [slides]);

  // --- HANDLERS ---

  const handleGenerate = async () => {
    if (!config.topic.trim()) return;
    setIsLoading(true);
    setError(null);
    setSlides([]);
    setSlideStyles({});
    setActiveSlideIndex(0);
    
    try {
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, config.tone);
      setSlides(generatedSlides);
      setShowGenerator(false); // Move to Editor view
    } catch (err: any) {
      setError(err.message || "Ошибка генерации.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSlide = async (index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const updated = await regenerateSlideContent(config.topic, slide, slides.length, config.tone);
      setSlides(prev => {
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };

  const handleSlideUpdate = (field: keyof SlideData, value: string) => {
    setSlides(prev => {
      const copy = [...prev];
      copy[activeSlideIndex] = { ...copy[activeSlideIndex], [field]: value };
      return copy;
    });
  };

  const updateSlideStyle = (updates: Partial<SlideStyle>) => {
    const slideNum = slides[activeSlideIndex]?.number;
    if (!slideNum) return;
    setSlideStyles(prev => ({
      ...prev,
      [slideNum]: { ...(prev[slideNum] || DEFAULT_STYLE), ...updates }
    }));
  };

  const handleApplyStyleToAll = () => {
    const currentStyle = slideStyles[slides[activeSlideIndex]?.number];
    if (!currentStyle) return;

    const newStyles = { ...slideStyles };
    slides.forEach(slide => {
      newStyles[slide.number] = { ...currentStyle };
    });
    setSlideStyles(newStyles);
  };

  const handleExport = async () => {
    if (slides.length === 0 || !exportRef.current) return;
    
    setIsExporting(true);
    const zip = new JSZip();
    
    try {
      // Small delay to ensure render
      await new Promise(resolve => setTimeout(resolve, 100));

      const slideElements = exportRef.current.children;
      
      for (let i = 0; i < slideElements.length; i++) {
        const element = slideElements[i] as HTMLElement;
        const dataUrl = await toPng(element, { 
          pixelRatio: 2.7, // 400px * 2.7 = 1080px width
          quality: 1.0,
          cacheBust: true,
        });
        
        // Remove header from base64
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`slide-${i + 1}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `carousel-${config.topic.substring(0, 15) || 'kit'}.zip`);
      
    } catch (err) {
      console.error("Export failed:", err);
      alert("Не удалось экспортировать слайды. Попробуйте еще раз.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- SLIDE MANAGEMENT ---

  const addSlide = () => {
    setSlides(prev => {
      const newSlide: SlideData = {
        number: prev.length + 1,
        title: "Новый слайд",
        content: "Введите текст...",
        highlight: ""
      };
      return [...prev, newSlide];
    });
    // Style init handled by useEffect
    setTimeout(() => setActiveSlideIndex(slides.length), 50);
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index).map((s, i) => ({ ...s, number: i + 1 }));
    setSlides(newSlides);
    
    // Shift styles
    const newStyles: Record<number, SlideStyle> = {};
    newSlides.forEach(s => {
      newStyles[s.number] = slideStyles[index + 1] || DEFAULT_STYLE; 
    });
    setSlideStyles(newStyles);
    
    if (activeSlideIndex >= newSlides.length) setActiveSlideIndex(newSlides.length - 1);
  };

  const duplicateSlide = (index: number) => {
    const slideToCopy = slides[index];
    const newSlide = { ...slideToCopy, number: slides.length + 1 };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, newSlide);
    // Reindex
    const reindexed = newSlides.map((s, i) => ({ ...s, number: i + 1 }));
    setSlides(reindexed);
    
    // Copy style
    const currentStyle = slideStyles[slideToCopy.number] || DEFAULT_STYLE;
    setSlideStyles(prev => ({
      ...prev,
      [index + 2]: { ...currentStyle } // index+2 because 1-based number
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSlideStyle({ backgroundType: 'image', backgroundValue: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- RENDER HELPERS ---

  const renderColorSwatch = (color: string, type: 'text' | 'title') => (
    <button
      onClick={() => updateSlideStyle(type === 'text' ? { textColor: color } : { titleColor: color })}
      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
        (type === 'text' 
          ? slideStyles[slides[activeSlideIndex]?.number]?.textColor === color 
          : slideStyles[slides[activeSlideIndex]?.number]?.titleColor === color
        ) 
          ? 'border-purple-600 scale-110' 
          : 'border-transparent'
      }`}
      style={{ backgroundColor: color }}
    />
  );

  const renderGradientSwatch = (gradient: string) => (
    <button
      onClick={() => updateSlideStyle({ backgroundType: 'gradient', backgroundValue: gradient })}
      className={`w-full aspect-square rounded-lg shadow-sm hover:shadow-md transition-all ${
        (slideStyles[slides[activeSlideIndex]?.number]?.backgroundValue === gradient) ? 'ring-2 ring-purple-600' : ''
      }`}
      style={{ background: gradient }}
    />
  );

  // --- UI CONSTANTS ---
  const COLORS = ['#FFFFFF', '#000000', '#F87171', '#FBBF24', '#34D399', '#60A5FA', '#818CF8', '#A78BFA', '#F472B6', '#FB7185'];
  const GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
    'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(to right, #434343 0%, black 100%)',
    'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
    'linear-gradient(to top, #a8edea 0%, #fed6e3 100%)',
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* GLOBAL BACKGROUND MESH */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-80 z-0 pointer-events-none"></div>

      {/* --- HIDDEN EXPORT CONTAINER --- */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
        <div ref={exportRef}>
          {slides.map((slide) => (
            <div 
              key={slide.number} 
              style={{ width: 400, height: 500 }} // 4:5 Aspect Ratio base
            >
              <SlideCard
                data={slide}
                theme={config.theme}
                totalSlides={slides.length}
                username={username}
                onSlideChange={() => {}} // No-op
                readOnly={true}
                customStyle={slideStyles[slide.number]}
                // Ensure no spinner overlay
                isRegenerating={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- HEADER --- */}
      <header className="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <Sparkles size={20} />
          </div>
          <div>
             <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600">CarouselKit</h1>
             <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Editor Suite</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!showGenerator && (
            <button 
              onClick={() => setShowGenerator(true)} 
              className="px-4 py-2 rounded-full bg-white/50 text-slate-600 font-medium text-sm hover:bg-white hover:shadow transition-all flex items-center gap-2"
            >
              <Wand2 size={16} /> <span className="hidden sm:inline">New Carousel</span>
            </button>
          )}
          <button className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white hover:shadow transition-all text-slate-700">
            <Share2 size={18} />
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting || slides.length === 0}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="flex w-full h-full pt-20 relative z-10">
        
        {/* 1. LEFT SIDEBAR (SLIDES) */}
        <aside className="w-[320px] h-full flex flex-col bg-white/40 backdrop-blur-xl border-r border-white/30">
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Слайды</h2>
            <button 
              onClick={addSlide}
              className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
            {slides.length === 0 && !isLoading && (
              <div className="p-6 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                Нет слайдов. Создайте новую карусель.
              </div>
            )}
            
            {slides.map((slide, idx) => (
              <div 
                key={slide.number}
                onClick={() => setActiveSlideIndex(idx)}
                className={`group relative p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                  idx === activeSlideIndex 
                    ? 'bg-white border-purple-500 shadow-xl shadow-purple-500/10 scale-[1.02]' 
                    : 'bg-white/40 border-transparent hover:bg-white/80'
                }`}
              >
                <div className="flex items-start gap-3">
                   {/* Mini Preview */}
                   <div className="w-16 h-20 bg-slate-100 rounded-lg overflow-hidden relative shadow-inner">
                      <div className="w-[400%] h-[400%] origin-top-left scale-[0.25]">
                         <SlideCard 
                           data={slide} 
                           theme={config.theme} 
                           totalSlides={slides.length} 
                           username={username}
                           onSlideChange={() => {}}
                           readOnly={true}
                           customStyle={slideStyles[slide.number]}
                         />
                      </div>
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Слайд {slide.number}</span>
                        {/* Hover Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => {e.stopPropagation(); duplicateSlide(idx)}} className="p-1 hover:text-purple-600"><Copy size={12} /></button>
                           <button onClick={(e) => {e.stopPropagation(); deleteSlide(idx)}} className="p-1 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{slide.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-1">{slide.content}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t border-white/50">
            <div className="flex gap-2 text-purple-800 text-xs font-medium">
               <span className="text-lg">💡</span>
               <p>Совет: 10 слайдов работают лучше для охватов.</p>
            </div>
          </div>
        </aside>

        {/* 2. CENTER PREVIEW */}
        <main className="flex-1 h-full relative flex flex-col items-center justify-center p-8 overflow-hidden">
           {/* Generator Overlay */}
           {showGenerator && (
             <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
                <div className="w-full max-w-lg space-y-8">
                   <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/40 mb-6">
                        <Sparkles size={32} />
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900">AI Генератор</h2>
                      <p className="text-slate-500">Создайте структуру и контент за секунды</p>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тема поста</label>
                        <input 
                          autoFocus
                          type="text" 
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-lg font-medium shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          placeholder="Например: 5 способов выучить английский..."
                          value={config.topic}
                          onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Слайдов: {config.slideCount}</label>
                           <input type="range" min="3" max="10" value={config.slideCount} onChange={(e) => setConfig({ ...config, slideCount: parseInt(e.target.value) })} className="w-full accent-purple-600" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тональность</label>
                            <select 
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                              value={config.tone}
                              onChange={(e) => setConfig({ ...config, tone: e.target.value as Tone })}
                            >
                               <option value={Tone.EXPERT}>Эксперт</option>
                               <option value={Tone.PROVOCATIVE}>Провокатор</option>
                               <option value={Tone.VIRAL}>Хайп</option>
                               <option value={Tone.FUNNY}>Юмор</option>
                            </select>
                         </div>
                      </div>
                      
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Стиль</label>
                         <div className="flex gap-2">
                           {[Theme.DARK_MODERN, Theme.MINIMAL_LIGHT, Theme.RETRO_PAPER, Theme.BOLD_NEON].map(t => (
                             <button key={t} onClick={() => setConfig({ ...config, theme: t })} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${config.theme === t ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                               {t.replace('_', ' ')}
                             </button>
                           ))}
                         </div>
                      </div>

                      <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !config.topic}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                         {isLoading ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                         {isLoading ? 'Генерирую...' : 'Создать магию'}
                      </button>
                   </div>
                   <button onClick={() => setShowGenerator(false)} className="w-full text-center text-sm text-slate-400 hover:text-slate-600">Отмена</button>
                </div>
             </div>
           )}

           {/* Phone Preview */}
           {slides.length > 0 ? (
             <div className="relative z-10 scale-[0.85] xl:scale-100 transition-transform duration-500">
               <PhoneFrame username={username} isDark={true}>
                 <SlideCard 
                    data={slides[activeSlideIndex]}
                    theme={config.theme}
                    totalSlides={slides.length}
                    username={username}
                    onSlideChange={(f, v) => handleSlideUpdate(f, v)}
                    onRegenerate={() => handleRegenerateSlide(activeSlideIndex)}
                    isRegenerating={loadingSlides[slides[activeSlideIndex].number]}
                    customStyle={slideStyles[slides[activeSlideIndex].number]}
                    readOnly={false}
                 />
               </PhoneFrame>

               {/* Navigation Buttons */}
               <button 
                 onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                 className="absolute top-1/2 -left-20 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-xl transition-all disabled:opacity-0"
                 disabled={activeSlideIndex === 0}
               >
                 <ChevronLeft size={24} />
               </button>
               <button 
                 onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
                 className="absolute top-1/2 -right-20 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-xl transition-all disabled:opacity-0"
                 disabled={activeSlideIndex === slides.length - 1}
               >
                 <ChevronRight size={24} />
               </button>

               {/* Slide Indicator Badge */}
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-lg text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  Слайд {activeSlideIndex + 1} из {slides.length}
               </div>
             </div>
           ) : (
             <div className="text-center opacity-40">
                <div className="w-32 h-48 bg-slate-200 rounded-2xl mx-auto mb-4 border-4 border-slate-300 border-dashed"></div>
                <p>Нет контента</p>
             </div>
           )}
        </main>

        {/* 3. RIGHT SIDEBAR (EDITOR) */}
        <aside className="w-[380px] h-full flex flex-col bg-white/60 backdrop-blur-xl border-l border-white/30 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
           {/* Tabs */}
           <div className="flex p-2 gap-1 border-b border-white/20">
             {(['text', 'image', 'background'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                   activeTab === tab ? 'bg-white shadow-md text-purple-600' : 'text-slate-500 hover:bg-white/40'
                 }`}
               >
                 {tab === 'text' && <Type size={16} />}
                 {tab === 'image' && <ImageIcon size={16} />}
                 {tab === 'background' && <Palette size={16} />}
                 <span className="capitalize">{tab}</span>
               </button>
             ))}
           </div>

           {/* Editor Content */}
           <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
             
             {/* --- TEXT TAB --- */}
             {activeTab === 'text' && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">Настройки текста</h3>
                     <button onClick={handleApplyStyleToAll} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                       <Check size={12} /> Применить ко всем
                     </button>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Никнейм</label>
                     <input 
                       type="text" 
                       value={username} 
                       onChange={(e) => setUsername(e.target.value)} 
                       className="w-full p-3 bg-white/60 rounded-xl border border-white/40 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Размер текста</label>
                     <div className="grid grid-cols-2 gap-2">
                        {(['small', 'medium', 'large', 'extra'] as TextSize[]).map(s => (
                          <button 
                            key={s}
                            onClick={() => updateSlideStyle({ fontSize: s })}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                              slideStyles[slides[activeSlideIndex]?.number]?.fontSize === s 
                                ? 'bg-purple-100 border-purple-500 text-purple-700' 
                                : 'bg-white/60 border-slate-200 text-slate-500'
                            }`}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Выравнивание</label>
                     <div className="flex gap-2">
                        {(['left', 'center', 'right'] as TextAlign[]).map(a => (
                           <button 
                             key={a}
                             onClick={() => updateSlideStyle({ textAlign: a })}
                             className={`flex-1 py-2 rounded-lg flex items-center justify-center border transition-all ${
                              slideStyles[slides[activeSlideIndex]?.number]?.textAlign === a
                                ? 'bg-purple-100 border-purple-500 text-purple-700' 
                                : 'bg-white/60 border-slate-200 text-slate-500'
                             }`}
                           >
                              {a === 'left' && <AlignLeft size={16} />}
                              {a === 'center' && <AlignCenter size={16} />}
                              {a === 'right' && <AlignRight size={16} />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Цвет заголовка</label>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => renderColorSwatch(c, 'title'))}
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-full overflow-hidden border-0 cursor-pointer"
                          onChange={(e) => updateSlideStyle({ titleColor: e.target.value })}
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Цвет текста (основной)</label>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => renderColorSwatch(c, 'text'))}
                        <input 
                          type="color" 
                          className="w-8 h-8 rounded-full overflow-hidden border-0 cursor-pointer"
                          onChange={(e) => updateSlideStyle({ textColor: e.target.value })}
                        />
                     </div>
                  </div>
               </div>
             )}

             {/* --- IMAGE TAB --- */}
             {activeTab === 'image' && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full h-48 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 hover:border-purple-500 transition-all group"
                 >
                    <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                       <Upload size={24} />
                    </div>
                    <span className="text-sm font-bold text-purple-900">Загрузить фото (текущий слайд)</span>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                 </div>

                 {slideStyles[slides[activeSlideIndex]?.number]?.backgroundType === 'image' && (
                   <div className="relative rounded-xl overflow-hidden shadow-md group">
                      <img src={slideStyles[slides[activeSlideIndex]?.number]?.backgroundValue} className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => updateSlideStyle({ backgroundType: 'solid', backgroundValue: '' })} className="px-4 py-2 bg-white rounded-full text-red-500 text-xs font-bold">Удалить</button>
                      </div>
                   </div>
                 )}

                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                    <span className="text-xl">📸</span>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Используйте вертикальные фото (9:16) высокого качества для лучшего результата. Фото применяется только к выбранному слайду.
                    </p>
                 </div>
               </div>
             )}

             {/* --- BACKGROUND TAB --- */}
             {activeTab === 'background' && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">Фон слайда</h3>
                     <button onClick={handleApplyStyleToAll} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                       <Check size={12} /> Применить ко всем
                     </button>
                  </div>
                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                       <Sparkles size={12} /> Градиенты
                     </label>
                     <div className="grid grid-cols-3 gap-3">
                        {GRADIENTS.map(g => renderGradientSwatch(g))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Сплошной цвет</label>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateSlideStyle({ backgroundType: 'solid', backgroundValue: c })}
                            className="w-10 h-10 rounded-xl shadow-sm border border-slate-100"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                          <input 
                            type="color" 
                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                            onChange={(e) => updateSlideStyle({ backgroundType: 'solid', backgroundValue: e.target.value })}
                          />
                        </div>
                     </div>
                  </div>
               </div>
             )}

           </div>

           {/* Footer Tip */}
           <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-white/50">
              <div className="flex gap-2 items-start text-indigo-900 text-xs">
                 <Layers size={14} className="mt-0.5 shrink-0" />
                 <p>Слои: Текст находится поверх изображения. Вы можете настроить прозрачность в будущих обновлениях.</p>
              </div>
           </div>
        </aside>

      </div>
    </div>
  );
};

export default App;
