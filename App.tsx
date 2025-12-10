import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone } from './types';
import { 
  Wand2, Layout, Palette, Layers, Download, AlertCircle, Loader2, Sparkles, 
  Trash2, Plus, Mic2, Image as ImageIcon, AtSign, ChevronRight, ChevronLeft,
  Settings, Type, Smartphone, RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  const [username, setUsername] = useState<string>('@username');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track individual slide loading states
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});
  
  // Backgrounds
  const [globalBgImage, setGlobalBgImage] = useState<string | null>(null);
  const [slideBackgrounds, setSlideBackgrounds] = useState<Record<number, string>>({});
  
  // Selection State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');

  // Refs
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!config.topic.trim()) {
      setError("Пожалуйста, введите тему.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSlides([]); 
    setSlideBackgrounds({});
    setActiveSlideIndex(0);
    
    try {
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, config.tone);
      setSlides(generatedSlides);
      setActiveTab('edit'); // Switch to edit tab after generation
    } catch (err: any) {
      setError(err.message || "Ошибка генерации.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSlide = async (slideIndex: number) => {
    const slideToRegen = slides[slideIndex];
    if (!slideToRegen) return;
    setLoadingSlides(prev => ({ ...prev, [slideToRegen.number]: true }));
    setError(null);
    try {
      const updatedSlide = await regenerateSlideContent(config.topic, slideToRegen, slides.length, config.tone);
      setSlides(prev => {
        const newSlides = [...prev];
        newSlides[slideIndex] = updatedSlide;
        return newSlides;
      });
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slideToRegen.number]: false }));
    }
  };

  const handleSlideUpdate = (slideIndex: number, field: keyof SlideData, value: string) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[slideIndex] = { ...newSlides[slideIndex], [field]: value };
      return newSlides;
    });
  };

  // --- Slide Management ---

  const reindexSlides = (list: SlideData[]) => list.map((s, idx) => ({ ...s, number: idx + 1 }));

  const handleAddSlide = () => {
    setSlides(prev => {
      const newSlide: SlideData = {
        number: prev.length + 1,
        title: "Новый слайд",
        content: "Введите текст...",
        highlight: ""
      };
      const newList = [...prev, newSlide];
      setActiveSlideIndex(newList.length - 1);
      return newList;
    });
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    setSlides(prev => {
      const newSlides = reindexSlides(prev.filter((_, i) => i !== index));
      if (activeSlideIndex >= newSlides.length) setActiveSlideIndex(newSlides.length - 1);
      return newSlides;
    });
  };

  // --- Image Upload ---

  const handleGlobalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setGlobalBgImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const slideNum = slides[activeSlideIndex]?.number;
        if (slideNum) setSlideBackgrounds(prev => ({ ...prev, [slideNum]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Constants ---

  const themes = [
    { id: Theme.MINIMAL_LIGHT, name: 'Minimal Light' },
    { id: Theme.MINIMAL_DARK, name: 'Minimal Dark' },
    { id: Theme.RETRO_PAPER, name: 'Retro Paper' },
    { id: Theme.BOLD_NEON, name: 'Bold Neon' },
    { id: Theme.DARK_MODERN, name: 'Dark Modern' },
  ];

  const tones = [
    { id: Tone.EXPERT, name: 'Эксперт' },
    { id: Tone.PROVOCATIVE, name: 'Провокатор' },
    { id: Tone.VIRAL, name: 'Хайп' },
    { id: Tone.EMPATHETIC, name: 'Забота' },
    { id: Tone.FUNNY, name: 'Юмор' },
  ];

  // --- Render ---

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-zinc-900 overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR: SLIDE MANAGER */}
      <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-fuchsia-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <Sparkles size={16} />
          </div>
          <span className="font-bold text-lg tracking-tight">CarouselKit</span>
        </div>

        {/* Slides List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <div className="flex justify-between items-center px-2 mb-2">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Слайды</span>
             <button onClick={handleAddSlide} className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
               <Plus size={16} />
             </button>
          </div>

          {slides.length === 0 && (
             <div className="text-center py-10 px-4 text-gray-400 text-sm">
                Слайдов пока нет. <br/> Создайте карусель справа!
             </div>
          )}

          {slides.map((slide, index) => (
            <div 
              key={slide.number}
              onClick={() => setActiveSlideIndex(index)}
              className={`
                group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border
                ${activeSlideIndex === index 
                  ? 'bg-purple-50 border-purple-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }
              `}
            >
              {/* Thumbnail Mini */}
              <div className="w-12 h-16 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden relative shadow-sm">
                 <div className={`w-full h-full transform scale-[0.25] origin-top-left absolute top-0 left-0 w-[400%] h-[400%]`}>
                    <SlideCard 
                      data={slide}
                      theme={config.theme}
                      totalSlides={slides.length}
                      username={username}
                      onSlideChange={() => {}}
                      onUploadBg={() => {}}
                      onRegenerate={() => {}}
                      isRegenerating={false}
                      readOnly={true}
                      globalBackground={globalBgImage}
                      customBackground={slideBackgrounds[slide.number]}
                    />
                 </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-500 mb-0.5">Слайд {slide.number}</div>
                <div className="text-sm font-medium truncate text-gray-800">{slide.title || 'Без заголовка'}</div>
              </div>

              {/* Delete Button (Hover) */}
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteSlide(index); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. CENTER: CANVAS / PHONE PREVIEW */}
      <main className="flex-1 relative flex flex-col bg-gray-50/50">
        {/* Top Toolbar */}
        <header className="h-16 px-8 flex justify-between items-center border-b border-gray-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
           <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Smartphone size={16} />
              <span>iPhone 14 Pro Preview</span>
           </div>
           <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 flex items-center gap-2">
                 <Download size={16} /> Экспорт
              </button>
              <button onClick={() => setActiveTab('create')} className="md:hidden px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">
                 Редактор
              </button>
           </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center min-h-0">
           {slides.length > 0 ? (
             <div className="relative group">
               {/* Phone Mockup */}
               <PhoneFrame username={username} isDark={config.theme === Theme.DARK_MODERN || config.theme === Theme.BOLD_NEON}>
                  {/* The Active Slide */}
                  <div className="w-full h-full">
                    <SlideCard 
                      data={slides[activeSlideIndex]}
                      theme={config.theme}
                      totalSlides={slides.length}
                      globalBackground={globalBgImage}
                      customBackground={slideBackgrounds[slides[activeSlideIndex].number]}
                      onUploadBg={() => slideFileInputRef.current?.click()}
                      onRegenerate={() => handleRegenerateSlide(activeSlideIndex)}
                      isRegenerating={!!loadingSlides[slides[activeSlideIndex].number]}
                      username={username}
                      onSlideChange={(field, val) => handleSlideUpdate(activeSlideIndex, field, val)}
                      readOnly={false}
                      className="w-full h-full"
                    />
                  </div>
               </PhoneFrame>

               {/* External Navigation Arrows (Desktop) */}
               <button 
                 onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                 disabled={activeSlideIndex === 0}
                 className="absolute top-1/2 -left-16 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg text-gray-600 disabled:opacity-30 hover:scale-110 transition-transform hidden md:block"
               >
                 <ChevronLeft size={24} />
               </button>
               <button 
                 onClick={() => setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                 disabled={activeSlideIndex === slides.length - 1}
                 className="absolute top-1/2 -right-16 -translate-y-1/2 p-3 rounded-full bg-white shadow-lg text-gray-600 disabled:opacity-30 hover:scale-110 transition-transform hidden md:block"
               >
                 <ChevronRight size={24} />
               </button>
               
               {/* Pagination Dots */}
               <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-2">
                  {slides.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all ${idx === activeSlideIndex ? 'bg-purple-600 w-4' : 'bg-gray-300'}`}
                    />
                  ))}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center text-center max-w-md opacity-50">
                <div className="w-24 h-24 bg-gray-200 rounded-3xl mb-6 animate-pulse"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Начните создание</h2>
                <p className="text-gray-500">Заполните параметры справа и нажмите "Сгенерировать", чтобы увидеть результат.</p>
             </div>
           )}
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR: INSPECTOR / EDITOR */}
      <aside className="w-[360px] bg-white border-l border-gray-200 flex flex-col z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
           <button 
             onClick={() => setActiveTab('create')}
             className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'create' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
             <Wand2 size={16} /> Генератор
           </button>
           <button 
             onClick={() => setActiveTab('edit')}
             className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'edit' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
             <Settings size={16} /> Настройки
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
           
           {/* === TAB: CREATE === */}
           {activeTab === 'create' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* Topic */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Тема поста</label>
                  <textarea
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all text-sm min-h-[100px] resize-none"
                    placeholder="О чем будем писать сегодня?"
                    value={config.topic}
                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  />
                </div>

                {/* Theme Grid */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Стиль оформления</label>
                  <div className="grid grid-cols-2 gap-3">
                    {themes.map((t) => (
                      <div 
                        key={t.id}
                        onClick={() => setConfig({ ...config, theme: t.id })}
                        className={`
                          p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2
                          ${config.theme === t.id ? 'border-purple-600 bg-purple-50' : 'border-gray-100 bg-white hover:border-gray-200'}
                        `}
                      >
                         <div className={`w-4 h-4 rounded-full border ${config.theme === t.id ? 'bg-purple-600 border-purple-600' : 'bg-gray-200 border-transparent'}`}></div>
                         <span className={`text-xs font-bold ${config.theme === t.id ? 'text-purple-700' : 'text-gray-600'}`}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tone Chips */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tone of Voice</label>
                  <div className="flex flex-wrap gap-2">
                    {tones.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setConfig({ ...config, tone: t.id })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          config.tone === t.id 
                            ? 'bg-zinc-800 text-white border-zinc-800' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slide Count */}
                <div className="space-y-3">
                   <div className="flex justify-between">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Количество слайдов</label>
                      <span className="text-xs font-bold text-purple-600">{config.slideCount}</span>
                   </div>
                   <input
                    type="range" min="3" max="10"
                    value={config.slideCount}
                    onChange={(e) => setConfig({ ...config, slideCount: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className={`
                    w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-500/20
                    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  <span>{isLoading ? 'Генерирую...' : 'Сгенерировать'}</span>
                </button>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5" />
                    {error}
                  </div>
                )}
             </div>
           )}

           {/* === TAB: EDIT === */}
           {activeTab === 'edit' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {slides.length === 0 ? (
                   <div className="text-center text-gray-400 text-sm mt-10">
                     Сначала сгенерируйте слайды
                   </div>
                ) : (
                  <>
                    {/* Username Input */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <AtSign size={14} /> Никнейм
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>

                    {/* Global Background */}
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                         <ImageIcon size={14} /> Общий фон
                       </label>
                       {!globalBgImage ? (
                          <div onClick={() => globalFileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                             <span className="text-xs text-gray-500 font-bold">Загрузить фото</span>
                          </div>
                       ) : (
                          <div className="relative h-24 rounded-xl overflow-hidden group">
                             <img src={globalBgImage} className="w-full h-full object-cover" />
                             <button onClick={() => { setGlobalBgImage(null); if(globalFileInputRef.current) globalFileInputRef.current.value = ''; }} className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500"><Trash2 size={12} /></button>
                          </div>
                       )}
                       <input type="file" ref={globalFileInputRef} onChange={handleGlobalImageUpload} accept="image/*" className="hidden" />
                    </div>

                    <div className="h-px bg-gray-100 my-4"></div>

                    {/* Current Slide Settings */}
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-purple-600 uppercase tracking-wider">Слайд {slides[activeSlideIndex].number}</label>
                          <div className="flex gap-2">
                             <button onClick={() => handleRegenerateSlide(activeSlideIndex)} className="text-xs text-gray-500 hover:text-purple-600 underline flex items-center gap-1">
                               <RefreshCw size={12} /> Переписать
                             </button>
                          </div>
                       </div>
                       
                       <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                          <p className="text-xs text-purple-800 leading-relaxed">
                            💡 Нажмите на текст прямо на телефоне (в центре), чтобы изменить его. Выделите текст, чтобы покрасить в цвет.
                          </p>
                       </div>

                       {/* Slide Specific Background */}
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                             Фон этого слайда
                          </label>
                          <button 
                             onClick={() => slideFileInputRef.current?.click()} 
                             className="w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                          >
                             {slideBackgrounds[slides[activeSlideIndex].number] ? 'Изменить фото' : 'Загрузить фото'}
                          </button>
                          <input type="file" ref={slideFileInputRef} onChange={handleSlideImageUpload} accept="image/*" className="hidden" />
                       </div>
                    </div>
                  </>
                )}
             </div>
           )}
        </div>
      </aside>
    </div>
  );
};

export default App;