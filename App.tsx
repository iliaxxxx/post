
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateSlideImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, SavedCarousel } from './types';
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Type, Palette, Download, Layers, RefreshCw, AtSign, ImagePlus, X, Library, Save, Plus, AlertCircle, Hash, Sun, Moon } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const DEMO_SLIDES: SlideData[] = [
  { number: 1, title: "CAROUSEL KIT", content: "" },
  { number: 2, title: "НЕБОЛЬШОЙ ЗАГОЛОВОК", content: "Мы исправили размер заголовка на обложке, чтобы он выглядел аккуратно и премиально." },
  { number: 3, title: "TONE OF VOICE", content: "Вернули полноценный выбор тональности. Выбирайте стиль от Экспертного до Юмористического." }
];

const INITIAL_FONTS = [
  { name: 'Inter', label: 'Inter' },
  { name: 'Golos Text', label: 'Golos' },
  { name: 'Manrope', label: 'Manrope' },
  { name: 'Unbounded', label: 'Unbounded' },
  { name: 'Bebas Neue', label: 'Bebas' },
  { name: 'Oswald', label: 'Oswald' },
  { name: 'Anton', label: 'Anton' },
  { name: 'Russo One', label: 'Russo' },
];

const COLOR_PRESETS = ['#000000', '#FFFFFF', '#F43F5E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];
const GRADIENT_PRESETS = [
  { name: 'Deep', value: 'linear-gradient(135deg, #18181b, #020202)' },
  { name: 'Creme', value: 'linear-gradient(135deg, #F5EDE2, #FFFDF9)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #2772A0, #CCDDEA)' },
  { name: 'Sage', value: 'linear-gradient(135deg, #ABC8A2, #1A2417)' },
];

const App: React.FC = () => {
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  const [toneValue, setToneValue] = useState<number>(0);
  const [username, setUsername] = useState<string>('@my_blog');
  const [slides, setSlides] = useState<SlideData[]>(DEMO_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedCarousels, setSavedCarousels] = useState<SavedCarousel[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'editor' | 'library'>('editor');
  const [activeMobileTab, setActiveMobileTab] = useState<'generator' | 'design' | null>(null);
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const carouselScrollRef = useRef<HTMLDivElement>(null);
  
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('carousel_library');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSavedCarousels(parsed);
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }
  }, []);

  useEffect(() => {
    if (carouselScrollRef.current && !isScrollingRef.current) {
      const container = carouselScrollRef.current;
      const targetScroll = activeSlideIndex * container.offsetWidth;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [activeSlideIndex]);

  const handleScroll = useCallback(() => {
    if (carouselScrollRef.current) {
      const container = carouselScrollRef.current;
      
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
      
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 150) as unknown as number;

      const index = Math.round(container.scrollLeft / container.offsetWidth);
      if (index !== activeSlideIndex && index >= 0 && index < slides.length) {
        setActiveSlideIndex(index);
      }
    }
  }, [activeSlideIndex, slides.length]);

  const saveToLibrary = (topic: string, slides: SlideData[], styles: Record<number, SlideStyle>) => {
    const newItem: SavedCarousel = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      topic,
      slides,
      styles,
      username,
      config
    };
    const updated = [newItem, ...savedCarousels].slice(0, 20);
    setSavedCarousels(updated);
    localStorage.setItem('carousel_library', JSON.stringify(updated));
  };

  const getToneFromValue = (val: number): Tone => {
    if (val < 20) return Tone.EXPERT;
    if (val < 40) return Tone.EMPATHETIC;
    if (val < 60) return Tone.VIRAL;
    if (val < 80) return Tone.PROVOCATIVE;
    return Tone.FUNNY;
  };

  const getToneLabel = (val: number) => {
    if (val < 20) return { label: 'Экспертный', emoji: '🤓' };
    if (val < 40) return { label: 'Эмпатичный', emoji: '🥰' };
    if (val < 60) return { label: 'Виральный', emoji: '🚀' };
    if (val < 80) return { label: 'Провокационный', emoji: '😈' };
    return { label: 'Юмористический', emoji: '😜' };
  };

  const handleGenerate = async () => {
    if (!config.topic) return alert("Введите тему");
    setIsGenerating(true);
    try {
      const tone = getToneFromValue(toneValue);
      const magnet = "Подпишись на блог";
      const generated = await generateCarouselContent(config.topic, config.slideCount, tone, magnet);
      
      setSlides(generated);
      setActiveSlideIndex(0);
      setSlideStyles({});
      
      if (carouselScrollRef.current) {
        carouselScrollRef.current.scrollLeft = 0;
      }
      
      saveToLibrary(config.topic, generated, {});
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadFromHistory = (item: SavedCarousel) => {
    setSlides(item.slides);
    setSlideStyles(item.styles || {});
    setUsername(item.username);
    setConfig(item.config);
    setActiveSlideIndex(0);
    if (carouselScrollRef.current) {
        carouselScrollRef.current.scrollLeft = 0;
    }
    setActiveSidebarTab('editor');
  };

  const handleGenerateSlideImage = async (index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const imageUrl = await generateSlideImage(slide.title);
      updateSlideStyle(index, { backgroundType: 'image', backgroundValue: imageUrl, overlayOpacity: 0.4 });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };

  const handleRegenerateSlide = async (index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const tone = getToneFromValue(toneValue);
      const updated = await regenerateSlideContent(config.topic || "Topic", slide, slides.length, tone);
      setSlides(prev => {
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      });
    } catch (e) {
      alert("Ошибка обновления");
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };
  
  const handleContentChange = (index: number, field: keyof SlideData, value: string) => {
    setSlides(prev => {
      const newSlides = [...prev];
      if (newSlides[index]) {
        newSlides[index] = { ...newSlides[index], [field]: value };
      }
      return newSlides;
    });
  };

  const updateSlideStyle = (index: number, updates: Partial<SlideStyle>) => {
    const slide = slides[index];
    if (!slide) return;
    const slideNum = slide.number;
    setSlideStyles(prev => ({
      ...prev,
      [slideNum]: { ...(prev[slideNum] || DEFAULT_STYLE), ...updates }
    }));
  };

  const updateGlobalStyle = (updates: Partial<SlideStyle>) => {
    const newStyles = { ...slideStyles };
    slides.forEach(slide => {
      newStyles[slide.number] = { ...(newStyles[slide.number] || DEFAULT_STYLE), ...updates };
    });
    setSlideStyles(newStyles);
  };

  const handleExport = async () => {
    if (!exportRef.current || slides.length === 0) return;
    try {
      const zip = new JSZip();
      const element = exportRef.current;
      element.style.opacity = '1';
      const children = Array.from(element.children) as HTMLElement[];
      for (let i = 0; i < children.length; i++) {
        const dataUrl = await toPng(children[i], { pixelRatio: 3, width: 360, height: 450 });
        zip.file(`slide-${i + 1}.png`, dataUrl.split(',')[1], { base64: true });
      }
      element.style.opacity = '0';
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'carousel.zip');
    } catch (err) {
      alert("Ошибка экспорта");
    }
  };

  const toneInfo = getToneLabel(toneValue);
  const currentSlide = slides[activeSlideIndex];
  const currentSlideStyle = currentSlide ? (slideStyles[currentSlide.number] || DEFAULT_STYLE) : DEFAULT_STYLE;

  const renderGeneratorControls = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Hash size={12} /> Контент
          </div>
          <input 
            type="text" 
            value={config.topic}
            onChange={e => setConfig(prev => ({ ...prev, topic: e.target.value }))}
            placeholder="О чем пишем?"
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
          <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><AtSign size={14} /></div>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
          </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Sparkles size={12} /> Тональность (5 этапов)
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">{toneInfo.emoji} {toneInfo.label}</span>
                <span className="text-slate-400 font-medium">Слайдов: {config.slideCount}</span>
             </div>
             <input 
               type="range" min="0" max="100" value={toneValue}
               onChange={e => setToneValue(parseInt(e.target.value))}
               className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
             />
             <div className="flex justify-between text-[8px] text-slate-300 font-black uppercase tracking-tighter">
                <span>Эксперт</span>
                <span>Эмпат</span>
                <span>Вирал</span>
                <span>Хайп</span>
                <span>Юмор</span>
             </div>
          </div>
          
          <div className="pt-2 border-t border-slate-50 mt-4">
            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-2">Количество слайдов</div>
            <input 
              type="range" min="3" max="10" value={config.slideCount} 
              onChange={e => setConfig(prev => ({ ...prev, slideCount: parseInt(e.target.value) }))} 
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-400" 
            />
          </div>
      </div>

      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
      >
        {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
        <span>{isGenerating ? "Нейросеть думает..." : "Сгенерировать карусель"}</span>
      </button>
    </div>
  );

  const renderDesignControls = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><Type size={12} /> Дизайн текста</div>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Размер заголовка</span>
                <span className="text-indigo-600 font-black">{currentSlideStyle.titleFontSize}px</span>
            </div>
            <input 
              type="range" min="12" max="64" step="1"
              value={currentSlideStyle.titleFontSize || 28}
              onChange={(e) => updateSlideStyle(activeSlideIndex, { titleFontSize: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-slate-50 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select 
            value={currentSlideStyle.titleFontFamily || ''}
            onChange={(e) => updateGlobalStyle({ titleFontFamily: e.target.value })} 
            className="w-full bg-slate-50 rounded-lg px-2 py-2 text-xs border border-slate-100 font-medium"
          >
            <option value="">Шрифт</option>
            {INITIAL_FONTS.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
          </select>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
             {COLOR_PRESETS.map((c, i) => (
                <button 
                  key={i} 
                  className={`w-6 h-6 rounded-full border shrink-0 transition-transform hover:scale-110 ${currentSlideStyle.titleColor === c ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-black/5'}`} 
                  style={{ backgroundColor: c }} 
                  onClick={() => updateGlobalStyle({ titleColor: c })} 
                />
             ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-50">
           <span className="text-[10px] font-bold text-slate-400 uppercase">Эффект свечения</span>
           <button 
             onClick={() => updateSlideStyle(activeSlideIndex, { titleGlow: !currentSlideStyle.titleGlow })}
             className={`w-12 h-6 rounded-full relative transition-colors ${currentSlideStyle.titleGlow ? 'bg-indigo-600' : 'bg-slate-200'}`}
           >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentSlideStyle.titleGlow ? 'left-7' : 'left-1'}`} />
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><ImagePlus size={12} /> Визуальный фон</div>
         
         <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                <span>Затемнение фона</span>
                <span className="text-indigo-600 font-black">{Math.round((currentSlideStyle.overlayOpacity ?? 0) * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01"
              value={currentSlideStyle.overlayOpacity ?? 0}
              onChange={(e) => updateSlideStyle(activeSlideIndex, { overlayOpacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-50 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
         </div>

         <div className="grid grid-cols-4 gap-2">
            {GRADIENT_PRESETS.map((g, i) => (
              <button key={i} className="w-full aspect-square rounded-xl shadow-inner border border-black/5 hover:scale-105 transition-transform" style={{ background: g.value }} onClick={() => updateSlideStyle(activeSlideIndex, { backgroundType: 'gradient', backgroundValue: g.value })} />
            ))}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 text-[10px] font-bold text-slate-500 bg-slate-50 rounded-xl border border-slate-100 uppercase tracking-[0.2em] hover:bg-white transition-colors">Загрузить фото</button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                  const reader = new FileReader();
                  reader.onload = () => updateSlideStyle(activeSlideIndex, { backgroundType: 'image', backgroundValue: reader.result as string, overlayOpacity: 0.3 });
                  reader.readAsDataURL(file);
              }
          }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="hidden lg:flex w-[380px] flex-col border-r border-slate-200 bg-white h-screen sticky top-0 z-20 overflow-y-auto no-scrollbar">
        <div className="p-6">
          <div className="flex items-center gap-2 font-black text-2xl tracking-tighter mb-8 text-indigo-950">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100"><Layers size={20} /></div>
            CarouselAI
          </div>
          <div className="flex border-b border-slate-100 mb-6">
            <button onClick={() => setActiveSidebarTab('editor')} className={`pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeSidebarTab === 'editor' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>Редактор</button>
            <button onClick={() => setActiveSidebarTab('library')} className={`pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeSidebarTab === 'library' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>История</button>
          </div>
          {activeSidebarTab === 'editor' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-2">{renderGeneratorControls()}{renderDesignControls()}</div>
          ) : (
            <div className="space-y-3">
              {savedCarousels.length > 0 ? savedCarousels.map(c => (
                <div key={c.id} onClick={() => loadFromHistory(c)} className="p-4 border border-slate-50 rounded-xl cursor-pointer hover:bg-slate-50 transition-all font-medium text-sm text-slate-700 flex justify-between items-center group">
                  <span className="truncate pr-4">{c.topic}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )) : <div className="text-center py-20 text-slate-300 text-[10px] uppercase font-bold tracking-widest">История пуста</div>}
            </div>
          )}
        </div>
        <div className="mt-auto p-6 border-t border-slate-100 bg-white">
          <button onClick={handleExport} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
            <Download size={18} /> Скачать ZIP
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 relative min-h-screen">
        {slides.length > 0 && (
          <div className="relative flex items-center gap-4 group">
            
            {/* Left Control - Desktop Side Arrow */}
            <div className="hidden lg:block absolute -left-20 top-1/2 -translate-y-1/2 z-50">
               <button 
                  onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))} 
                  className="p-4 bg-white shadow-xl border border-slate-100 rounded-full transition-all hover:scale-110 active:scale-95 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:scale-100"
                  disabled={activeSlideIndex === 0}
                >
                  <ChevronLeft size={32} strokeWidth={2.5}/>
               </button>
            </div>

            {/* Mockup Frame */}
            <div className="w-full max-w-[360px] relative">
              <PhoneFrame username={username} isDark={true}>
                <div 
                  ref={carouselScrollRef}
                  onScroll={handleScroll}
                  className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {slides.map((slide, idx) => (
                    <div key={`${slide.number}-${idx}`} className="w-full h-full shrink-0 snap-start">
                      <SlideCard 
                        data={slide}
                        theme={config.theme}
                        totalSlides={slides.length}
                        username={username}
                        onSlideChange={(field, val) => handleContentChange(idx, field, val)}
                        onUsernameChange={setUsername}
                        onRegenerate={() => handleRegenerateSlide(idx)}
                        onUploadBg={() => fileInputRef.current?.click()}
                        onGenerateBg={() => handleGenerateSlideImage(idx)}
                        isRegenerating={loadingSlides[slide.number]}
                        isGeneratingBg={loadingSlides[slide.number]}
                        customStyle={slideStyles[slide.number]}
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              </PhoneFrame>

              {/* Progress Dot Overlay (Mobile Visible) */}
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                 {slides.map((_, i) => (
                    <div key={i} className={`h-1.5 transition-all duration-300 rounded-full ${i === activeSlideIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} />
                 ))}
              </div>
            </div>

            {/* Right Control - Desktop Side Arrow */}
            <div className="hidden lg:block absolute -right-20 top-1/2 -translate-y-1/2 z-50">
               <button 
                  onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))} 
                  className="p-4 bg-white shadow-xl border border-slate-100 rounded-full transition-all hover:scale-110 active:scale-95 text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:scale-100"
                  disabled={activeSlideIndex === slides.length - 1}
                >
                  <ChevronRight size={32} strokeWidth={2.5}/>
               </button>
            </div>

            {/* Counter Badge (Floating Top Mobile) */}
            <div className="lg:hidden absolute -top-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeSlideIndex + 1} / {slides.length}</span>
            </div>
          </div>
        )}

        {/* Hidden Export Container */}
        <div ref={exportRef} className="fixed left-[-9999px] top-0 flex flex-col pointer-events-none opacity-0">
          {slides.map(slide => (
            <SlideCard key={`export-${slide.number}`} data={slide} theme={config.theme} totalSlides={slides.length} username={username} onSlideChange={() => {}} readOnly={true} customStyle={slideStyles[slide.number]} className="w-[360px] h-[450px] shrink-0" />
          ))}
        </div>
      </div>
      
      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around z-30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveMobileTab('generator')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'generator' ? 'text-indigo-600' : 'text-slate-300'}`}><Sparkles size={20} /><span className="text-[10px] font-bold">СОЗДАТЬ</span></button>
        <button onClick={() => setActiveMobileTab('design')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'design' ? 'text-indigo-600' : 'text-slate-300'}`}><Palette size={20} /><span className="text-[10px] font-bold">ДИЗАЙН</span></button>
        <button onClick={handleExport} className="flex flex-col items-center gap-1 text-slate-400"><Download size={20} /><span className="text-[10px] font-bold">ZIP</span></button>
      </div>

      {(activeMobileTab === 'generator' || activeMobileTab === 'design') && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-50 flex flex-col justify-end" onClick={() => setActiveMobileTab(null)}>
          <div className="bg-white rounded-t-[2.5rem] p-8 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            {activeMobileTab === 'generator' ? renderGeneratorControls() : renderDesignControls()}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
