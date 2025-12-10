
import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateBackgroundImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { ThemePreview } from './components/ThemePreview';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, TextSize, TextAlign } from './types';
import { 
  Sparkles, Download, Share2, Plus, Copy, Trash2, 
  Type, Image as ImageIcon, Palette, Layers, 
  ChevronLeft, ChevronRight, Wand2, RefreshCw, Upload, AlignLeft, AlignCenter, AlignRight, Check,
  RotateCw, LayoutGrid, Zap, Smile, Briefcase, Type as FontIcon, Droplets, Sun, Moon
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const PREVIEW_DATA: SlideData = {
  number: 1,
  title: "Ваш Заголовок",
  content: "Это предпросмотр выбранного стиля. Сгенерированный контент появится здесь.",
  highlight: "Акцент",
  cta: "Призыв к действию"
};

// Helper for Tone Slider
const TONE_MAP = [
  { val: 0, tone: Tone.EXPERT, label: "Экспертный", icon: "🎓", desc: "Строгий, профессиональный" },
  { val: 25, tone: Tone.EMPATHETIC, label: "Заботливый", icon: "🤗", desc: "Мягкий, с поддержкой" },
  { val: 50, tone: Tone.VIRAL, label: "Вирусный", icon: "⚡", desc: "Коротко, хайпово" },
  { val: 75, tone: Tone.PROVOCATIVE, label: "Дерзкий", icon: "🔥", desc: "С вызовом, триггеры" },
  { val: 100, tone: Tone.FUNNY, label: "С юмором", icon: "🤪", desc: "Ирония и шутки" },
];

const FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif", label: "Modern Sans" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", label: "Geometric" },
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", label: "Display Bold" },
  { name: 'Playfair Display', family: "'Playfair Display', serif", label: "Elegant Serif" },
  { name: 'Merriweather', family: "'Merriweather', serif", label: "Readable Serif" },
  { name: 'Roboto Slab', family: "'Roboto Slab', serif", label: "Strong Slab" },
];

const getToneFromValue = (value: number): Tone => {
  // Find closest
  const closest = TONE_MAP.reduce((prev, curr) => {
    return (Math.abs(curr.val - value) < Math.abs(prev.val - value) ? curr : prev);
  });
  return closest.tone;
};

const getValueFromTone = (tone: Tone): number => {
  return TONE_MAP.find(t => t.tone === tone)?.val || 0;
};

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });
  
  // Local state for smooth slider visual
  const [toneSliderValue, setToneSliderValue] = useState(0);

  const [username, setUsername] = useState<string>('@username');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selection & Navigation
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'background'>('text');

  // Editing State (Per-slide overrides)
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});

  // Individual Loading States
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    const linkId = 'google-fonts-stylesheet';
    if (!document.getElementById(linkId)) {
      // Added Montserrat, Bebas Neue, Playfair Display, Merriweather, Roboto Slab
      const url = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Courier+Prime:wght@400;700&family=Inter:wght@300;400;600;700&family=Merriweather:wght@300;400;700&family=Montserrat:wght@400;600;800&family=Outfit:wght@300;500;700;900&family=Playfair+Display:wght@400;700&family=Roboto+Slab:wght@400;700&display=swap';
      fetch(url)
        .then(res => res.text())
        .then(css => {
          const style = document.createElement('style');
          style.id = linkId;
          style.textContent = css;
          document.head.appendChild(style);
        })
        .catch(err => console.error("Failed to load fonts", err));
    }
  }, []);

  // Sync internal slider state if config.tone changes externally
  useEffect(() => {
    setToneSliderValue(getValueFromTone(config.tone));
  }, [config.tone]);

  // Apply default styles when slides are created
  useEffect(() => {
    if (slides.length > 0) {
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

  const handleAiBackgroundGeneration = async () => {
    const slide = slides[activeSlideIndex];
    if (!slide) return;
    
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const imageUrl = await generateBackgroundImage(config.topic, slide);
      updateSlideStyle({ backgroundType: 'image', backgroundValue: imageUrl });
    } catch (err) {
      console.error(err);
      alert("Не удалось сгенерировать изображение. Попробуйте снова.");
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
      await new Promise(resolve => setTimeout(resolve, 500));
      const slideElements = exportRef.current.children;
      for (let i = 0; i < slideElements.length; i++) {
        const element = slideElements[i] as HTMLElement;
        const dataUrl = await toPng(element, { pixelRatio: 2.7, quality: 1.0, cacheBust: true });
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`slide-${i + 1}.png`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `carousel-${config.topic.substring(0, 15) || 'kit'}.zip`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Не удалось экспортировать слайды.");
    } finally {
      setIsExporting(false);
    }
  };

  // Improved Image Upload: Handles Multiple Files & Distribution
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Helper to read file to DataURL
    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      // 1. Read all files
      const loadedImages = await Promise.all(Array.from(files).map(readFile));

      // 2. Distribute images starting from active slide
      setSlideStyles(prev => {
        const newStyles = { ...prev };
        
        loadedImages.forEach((imgData, i) => {
          const targetIndex = activeSlideIndex + i;
          
          // Stop if we exceed the number of slides
          if (targetIndex >= slides.length) return;
          
          const slideNum = slides[targetIndex].number;
          newStyles[slideNum] = {
            ...(newStyles[slideNum] || DEFAULT_STYLE),
            backgroundType: 'image',
            backgroundValue: imgData
          };
        });
        
        return newStyles;
      });

      // Clear input so same files can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err) {
      console.error("Failed to load images", err);
      alert("Ошибка загрузки изображений");
    }
  };

  const handleTriggerBgUpload = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

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

  // Tone Slider Change Handler
  const handleToneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setToneSliderValue(val);
    const newTone = getToneFromValue(val);
    if (newTone !== config.tone) {
      setConfig({ ...config, tone: newTone });
    }
  };

  const getCurrentToneInfo = () => {
    // Find nearest for display
    return TONE_MAP.reduce((prev, curr) => {
      return (Math.abs(curr.val - toneSliderValue) < Math.abs(prev.val - toneSliderValue) ? curr : prev);
    });
  };

  const toneInfo = getCurrentToneInfo();

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

  const hasSlides = slides.length > 0;
  const currentSlideData = hasSlides ? slides[activeSlideIndex] : PREVIEW_DATA;
  const currentTotal = hasSlides ? slides.length : config.slideCount;
  const currentStyle = hasSlides ? slideStyles[currentSlideData.number] : undefined;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-80 z-0 pointer-events-none"></div>

      {/* --- HIDDEN INPUTS --- */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleImageUpload} 
        accept="image/*" 
        multiple 
      />

      {/* --- HIDDEN EXPORT CONTAINER --- */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
        <div ref={exportRef}>
          {slides.map((slide) => (
            <div key={slide.number} style={{ width: 400, height: 500 }}>
              <SlideCard
                data={slide}
                theme={config.theme}
                totalSlides={slides.length}
                username={username}
                onSlideChange={() => {}}
                readOnly={true}
                customStyle={slideStyles[slide.number]}
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
          <button className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white hover:shadow transition-all text-slate-700">
            <Share2 size={18} />
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting || !hasSlides}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="flex w-full h-full pt-20 relative z-10">
        
        {/* 1. LEFT SIDEBAR: GENERATOR CONTROLS */}
        <aside className="w-[340px] h-full flex flex-col bg-white/60 backdrop-blur-xl border-r border-white/30 shadow-[10px_0_30px_rgba(0,0,0,0.02)] shrink-0 z-20">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wand2 size={18} className="text-purple-600" />
              AI Генератор
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тема поста</label>
                  <textarea 
                    className="w-full p-4 bg-white/60 rounded-xl border border-white/40 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm resize-none h-28 leading-relaxed"
                    placeholder="Например: 5 способов повысить охваты в Reels..."
                    value={config.topic}
                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  />
              </div>

              {/* SLIDE COUNT SLIDER */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Количество слайдов</label>
                    <span className="text-sm font-bold text-white bg-purple-600 w-8 h-8 rounded-full flex items-center justify-center shadow-md shadow-purple-200">{config.slideCount}</span>
                  </div>
                  <div className="relative pt-1">
                    <input 
                      type="range" 
                      min="3" max="10" 
                      value={config.slideCount} 
                      onChange={(e) => setConfig({ ...config, slideCount: parseInt(e.target.value) })} 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500 transition-all"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1 px-1">
                      <span>3</span>
                      <span>5</span>
                      <span>7</span>
                      <span>10</span>
                    </div>
                  </div>
              </div>

              {/* TONE OF VOICE SLIDER */}
              <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tone of Voice</label>
                  </div>

                  <div className="bg-white/50 p-4 rounded-2xl border border-white/60 shadow-sm transition-all">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl select-none filter drop-shadow-sm">{toneInfo.icon}</div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 leading-none">{toneInfo.label}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-1">{toneInfo.desc}</div>
                        </div>
                     </div>
                     
                     <div className="relative h-6 flex items-center">
                       {/* Custom Slider Track */}
                       <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 rounded-full opacity-50"></div>
                       <input 
                          type="range" 
                          min="0" max="100" step="1"
                          value={toneSliderValue}
                          onChange={handleToneChange}
                          className="w-full absolute z-20 opacity-0 cursor-pointer h-full"
                        />
                        {/* Custom Slider Thumb Visualization */}
                        <div 
                          className="absolute h-5 w-5 bg-white border-2 border-purple-600 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out z-10"
                          style={{ left: `calc(${toneSliderValue}% - 10px)` }}
                        ></div>
                     </div>
                     <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">
                        <span>Эксперт</span>
                        <span>Юмор</span>
                     </div>
                  </div>
              </div>

              <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Выберите Стиль</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[Theme.DARK_MODERN, Theme.MINIMAL_LIGHT, Theme.RETRO_PAPER, Theme.BOLD_NEON].map(t => (
                          <ThemePreview 
                              key={t}
                              theme={t}
                              isSelected={config.theme === t}
                              onClick={() => setConfig({ ...config, theme: t })}
                          />
                      ))}
                    </div>
              </div>
          </div>
          
          <div className="p-6 bg-white/40 border-t border-white/20 backdrop-blur-md">
            <button 
                onClick={handleGenerate}
                disabled={isLoading || !config.topic}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
                {isLoading ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                {isLoading ? 'Генерирую...' : 'Создать Карусель'}
            </button>
            {error && <p className="text-xs text-red-500 mt-3 text-center bg-red-50 p-2 rounded-lg">{error}</p>}
          </div>
        </aside>

        {/* 2. CENTER PREVIEW */}
        <main className="flex-1 h-full relative flex flex-col items-center justify-center p-8 overflow-hidden bg-slate-50/50">
           
           {/* Phone Preview */}
           <div className="relative z-10 scale-[0.85] xl:scale-100 transition-transform duration-500">
             <PhoneFrame username={username} isDark={true}>
               <SlideCard 
                  data={currentSlideData}
                  theme={config.theme}
                  totalSlides={currentTotal}
                  username={username}
                  onSlideChange={(f, v) => hasSlides && handleSlideUpdate(f, v)}
                  onRegenerate={() => hasSlides && handleRegenerateSlide(activeSlideIndex)}
                  onUploadBg={() => hasSlides && handleTriggerBgUpload()}
                  onGenerateBg={() => hasSlides && handleAiBackgroundGeneration()}
                  isRegenerating={hasSlides && loadingSlides[currentSlideData.number]}
                  customStyle={currentStyle}
                  readOnly={!hasSlides}
               />
             </PhoneFrame>

             {/* Navigation Buttons */}
             {hasSlides && (
               <>
                <button 
                  onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                  className="absolute top-1/2 -left-20 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-center text-slate-700 shadow-lg hover:bg-white hover:scale-110 transition-all disabled:opacity-0"
                  disabled={activeSlideIndex === 0}
                >
                  <ChevronLeft size={28} />
                </button>
                <button 
                  onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
                  className="absolute top-1/2 -right-20 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-center text-slate-700 shadow-lg hover:bg-white hover:scale-110 transition-all disabled:opacity-0"
                  disabled={activeSlideIndex === slides.length - 1}
                >
                  <ChevronRight size={28} />
                </button>
               </>
             )}

             {/* Status Badge */}
             <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-lg text-sm font-bold text-slate-700 flex items-center gap-2 border border-white">
                {hasSlides ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    Слайд {activeSlideIndex + 1} из {slides.length}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    Предпросмотр темы
                  </>
                )}
             </div>
           </div>
        </main>

        {/* 3. RIGHT SIDEBAR (EDITOR) */}
        {hasSlides ? (
        <aside className="w-[380px] h-full flex flex-col bg-white/60 backdrop-blur-xl border-l border-white/30 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] shrink-0 transition-all duration-500 translate-x-0 z-20">
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
                 <span className="capitalize">{tab === 'text' ? 'Текст' : tab === 'image' ? 'Фото' : 'Фон'}</span>
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
                  
                  {/* Regenerate Slide Content Button */}
                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">AI Рерайт</span>
                     </div>
                     <button 
                       onClick={() => handleRegenerateSlide(activeSlideIndex)}
                       disabled={loadingSlides[slides[activeSlideIndex]?.number]}
                       className="w-full py-3 bg-white text-purple-600 border border-purple-100 rounded-xl text-sm font-bold hover:bg-purple-600 hover:text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                     >
                       <RefreshCw size={16} className={loadingSlides[slides[activeSlideIndex]?.number] ? 'animate-spin' : ''} />
                       {loadingSlides[slides[activeSlideIndex]?.number] ? 'Переписываю...' : 'Переписать этот слайд'}
                     </button>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Никнейм в карусели</label>
                     <input 
                       type="text" 
                       value={username} 
                       onChange={(e) => setUsername(e.target.value)} 
                       className="w-full p-3 bg-white/60 rounded-xl border border-white/40 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Шрифт</label>
                     <div className="grid grid-cols-2 gap-2">
                        {FONTS.map(f => (
                           <button
                             key={f.name}
                             onClick={() => updateSlideStyle({ fontFamily: f.family })}
                             className={`py-2 px-3 rounded-lg text-xs border text-left transition-all ${
                               slideStyles[slides[activeSlideIndex]?.number]?.fontFamily === f.family
                                 ? 'bg-purple-100 border-purple-500 text-purple-900 ring-1 ring-purple-500'
                                 : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                             }`}
                             style={{ fontFamily: f.family }}
                           >
                             <div className="font-bold">{f.name}</div>
                             <div className="text-[10px] opacity-60 font-sans">{f.label}</div>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Размер шрифта</label>
                     <div className="grid grid-cols-2 gap-2">
                        {(['small', 'medium', 'large', 'extra'] as TextSize[]).map(s => (
                          <button 
                            key={s}
                            onClick={() => updateSlideStyle({ fontSize: s })}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                              slideStyles[slides[activeSlideIndex]?.number]?.fontSize === s 
                                ? 'bg-purple-100 border-purple-500 text-purple-700 ring-1 ring-purple-500' 
                                : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                            }`}
                          >
                            {s === 'small' ? 'S' : s === 'medium' ? 'M' : s === 'large' ? 'L' : 'XL'}
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Выравнивание</label>
                     <div className="flex gap-2 p-1 bg-white/40 rounded-xl border border-white/40">
                        {(['left', 'center', 'right'] as TextAlign[]).map(a => (
                           <button 
                             key={a}
                             onClick={() => updateSlideStyle({ textAlign: a })}
                             className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${
                              slideStyles[slides[activeSlideIndex]?.number]?.textAlign === a
                                ? 'bg-white shadow-sm text-purple-600 font-bold' 
                                : 'text-slate-400 hover:text-slate-600'
                             }`}
                           >
                              {a === 'left' && <AlignLeft size={18} />}
                              {a === 'center' && <AlignCenter size={18} />}
                              {a === 'right' && <AlignRight size={18} />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Цвет заголовка</label>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => renderColorSwatch(c, 'title'))}
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm hover:scale-110 transition-transform">
                          <input 
                            type="color" 
                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                            onChange={(e) => updateSlideStyle({ titleColor: e.target.value })}
                          />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Цвет текста (основной)</label>
                     <div className="flex flex-wrap gap-3">
                        {COLORS.map(c => renderColorSwatch(c, 'text'))}
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm hover:scale-110 transition-transform">
                          <input 
                            type="color" 
                            className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                            onChange={(e) => updateSlideStyle({ textColor: e.target.value })}
                          />
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {/* --- IMAGE TAB --- */}
             {activeTab === 'image' && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Редактирование: Слайд {slides[activeSlideIndex]?.number}</h3>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full h-32 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 hover:border-purple-500 transition-all group"
                   >
                      <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                         <Upload size={20} />
                      </div>
                      <span className="text-xs font-bold text-purple-900 text-center px-2">Загрузить фото</span>
                   </div>

                   <button 
                     onClick={handleAiBackgroundGeneration}
                     disabled={loadingSlides[slides[activeSlideIndex]?.number]}
                     className="w-full h-32 border-2 border-purple-500 bg-purple-600 text-white rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-700 hover:shadow-lg transition-all group relative overflow-hidden"
                   >
                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
                           {loadingSlides[slides[activeSlideIndex]?.number] ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        </div>
                        <span className="text-xs font-bold text-center px-2">
                           {loadingSlides[slides[activeSlideIndex]?.number] ? 'Создаю...' : 'Сгенерировать AI'}
                        </span>
                      </div>
                   </button>
                 </div>

                 {slideStyles[slides[activeSlideIndex]?.number]?.backgroundType === 'image' && (
                   <div className="space-y-6">
                      <div className="relative rounded-xl overflow-hidden shadow-md group">
                          <img src={slideStyles[slides[activeSlideIndex]?.number]?.backgroundValue} className="w-full h-32 object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => updateSlideStyle({ backgroundType: 'solid', backgroundValue: '' })} className="px-4 py-2 bg-white rounded-full text-red-500 text-xs font-bold">Удалить</button>
                          </div>
                      </div>

                      <div className="p-4 bg-white/50 rounded-2xl border border-white/60 shadow-sm space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                 <Droplets size={14} className="text-purple-600" /> Затемнение (Overlay)
                              </label>
                              <span className="text-xs font-bold text-slate-600">{Math.round((slideStyles[slides[activeSlideIndex]?.number]?.overlayOpacity || 0) * 100)}%</span>
                            </div>
                            <input 
                               type="range" 
                               min="0" max="1" step="0.1"
                               value={slideStyles[slides[activeSlideIndex]?.number]?.overlayOpacity ?? 0.2}
                               onChange={(e) => updateSlideStyle({ overlayOpacity: parseFloat(e.target.value) })}
                               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                 <Sun size={14} className="text-orange-500" /> Яркость фото
                              </label>
                              <span className="text-xs font-bold text-slate-600">{Math.round((slideStyles[slides[activeSlideIndex]?.number]?.backgroundBrightness ?? 1) * 100)}%</span>
                            </div>
                            <input 
                               type="range" 
                               min="0.2" max="1.5" step="0.1"
                               value={slideStyles[slides[activeSlideIndex]?.number]?.backgroundBrightness ?? 1}
                               onChange={(e) => updateSlideStyle({ backgroundBrightness: parseFloat(e.target.value) })}
                               className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                          </div>
                      </div>
                   </div>
                 )}
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
                            className="w-10 h-10 rounded-xl shadow-sm border border-slate-100 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:scale-110 transition-transform">
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
        </aside>
        ) : (
          /* Placeholder Right Sidebar when no content */
          <aside className="w-[380px] h-full bg-white/30 backdrop-blur-sm border-l border-white/20 flex flex-col items-center justify-center text-slate-400 p-8 text-center shrink-0 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
              <LayoutGrid size={48} className="mb-4 opacity-30 text-slate-500" />
              <h3 className="font-bold text-lg mb-2 text-slate-600">Здесь будет редактор</h3>
              <p className="text-sm text-slate-500/80">Сгенерируйте слайды, чтобы открыть настройки стиля, текста и фона.</p>
          </aside>
        )}

      </div>
    </div>
  );
};

export default App;
