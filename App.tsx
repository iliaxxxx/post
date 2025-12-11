import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateBackgroundImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { ThemePreview } from './components/ThemePreview';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE } from './types';
import { ChevronLeft, ChevronRight, Upload, Sparkles, Wand2, Type, Palette, Image as ImageIcon, Download, Layers, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Initial Demo Data
const DEMO_SLIDES: SlideData[] = [
  {
    number: 1,
    title: "CarouselKit",
    content: "Создавайте вирусные карусели для Instagram за считанные секунды с помощью AI.",
    highlight: "AI Power"
  },
  {
    number: 2,
    title: "Настройки Слева",
    content: "Управляйте темой, шрифтами и настроением контента в единой панели.",
    highlight: "Удобство"
  },
  {
    number: 3,
    title: "Результат Справа",
    content: "Смотрите превью в реальном времени на мокапе iPhone.",
    cta: "Попробуй сейчас"
  }
];

const FONTS = [
  { name: 'Inter', label: 'Inter (System)' },
  { name: 'Montserrat', label: 'Montserrat (Modern)' },
  { name: 'Playfair Display', label: 'Playfair (Elegant)' },
  { name: 'Bebas Neue', label: 'Bebas (Bold)' },
  { name: 'Merriweather', label: 'Merriweather (Serif)' },
  { name: 'Courier Prime', label: 'Courier (Retro)' },
  { name: 'Anton', label: 'Anton (Heavy)' },
];

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  // UI State for Sliders
  const [toneValue, setToneValue] = useState<number>(0); // 0-100
  const [username, setUsername] = useState<string>('@my_blog');
  const [slides, setSlides] = useState<SlideData[]>(DEMO_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editing State (Per-slide overrides)
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  
  // Apply default styles when slides change
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
  }, [slides.length]);

  // --- LOGIC ---

  const mapSliderToTone = (val: number): Tone => {
    if (val < 20) return Tone.EXPERT;
    if (val < 40) return Tone.EMPATHETIC;
    if (val < 60) return Tone.VIRAL;
    if (val < 80) return Tone.PROVOCATIVE;
    return Tone.FUNNY;
  };

  const getToneLabel = (val: number) => {
    if (val < 20) return { label: 'Экспертный', desc: 'Строгий, по делу', emoji: '🤓' };
    if (val < 40) return { label: 'Эмпатичный', desc: 'Мягкий, заботливый', emoji: '🥰' };
    if (val < 60) return { label: 'Виральный', desc: 'Коротко, хайпово', emoji: '🚀' };
    if (val < 80) return { label: 'Провокационный', desc: 'С вызовом', emoji: '😈' };
    return { label: 'Юмористический', desc: 'Ирония и шутки', emoji: '🤪' };
  };

  const handleGenerate = async () => {
    if (!config.topic) return alert("Введите тему");
    setIsGenerating(true);
    try {
      const tone = mapSliderToTone(toneValue);
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, tone);
      setSlides(generatedSlides);
      setActiveSlideIndex(0);
      setSlideStyles({}); // Reset styles for new content
      setConfig(prev => ({ ...prev, tone }));
    } catch (error) {
      alert("Ошибка генерации. Попробуйте еще раз.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSlide = async (index: number) => {
    const slide = slides[index];
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const updated = await regenerateSlideContent(config.topic, slide, slides.length, mapSliderToTone(toneValue));
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
    setLoadingSlides(prev => ({ ...prev, [slide.number]: true }));
    try {
      const imageUrl = await generateBackgroundImage(config.topic, slide);
      updateSlideStyle({ backgroundType: 'image', backgroundValue: imageUrl }); // Updates current slide
    } catch (err) {
      console.error(err);
      alert("Не удалось сгенерировать изображение.");
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };

  // Helper to update styles for ONE slide
  const updateSlideStyle = (updates: Partial<SlideStyle>) => {
    const slideNum = slides[activeSlideIndex]?.number;
    if (!slideNum) return;
    setSlideStyles(prev => ({
      ...prev,
      [slideNum]: { ...(prev[slideNum] || DEFAULT_STYLE), ...updates }
    }));
  };

  // Helper to update styles for ALL slides
  const updateGlobalStyle = (updates: Partial<SlideStyle>) => {
    setSlideStyles(prev => {
      const newStyles = { ...prev };
      slides.forEach(slide => {
        newStyles[slide.number] = {
          ...(newStyles[slide.number] || DEFAULT_STYLE),
          ...updates
        };
      });
      return newStyles;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      const loadedImages = await Promise.all(Array.from(files).map(readFile));
      setSlideStyles(prev => {
        const newStyles = { ...prev };
        loadedImages.forEach((imgData, i) => {
          const targetIndex = activeSlideIndex + i;
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error("Failed to load images", err);
    }
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const zip = new JSZip();
      const element = exportRef.current;
      const children = Array.from(element.children) as HTMLElement[];

      // Temporarily show export container
      element.style.opacity = '1';
      
      const promises = children.map(async (child, i) => {
        const dataUrl = await toPng(child, { cacheBust: true, pixelRatio: 2 });
        const base64 = dataUrl.split(',')[1];
        zip.file(`slide-${i + 1}.png`, base64, { base64: true });
      });

      await Promise.all(promises);
      
      // Hide again
      element.style.opacity = '0';

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'carousel-kit.zip');
    } catch (err) {
      console.error("Export failed", err);
      alert("Ошибка экспорта. Попробуйте еще раз.");
    }
  };

  const toneInfo = getToneLabel(toneValue);
  const currentSlideData = slides[activeSlideIndex];
  const currentTotal = slides.length;
  const currentStyle = slideStyles[currentSlideData.number] || DEFAULT_STYLE;

  // Swatches for color presets
  const COLOR_PRESETS = [
    '#000000', '#FFFFFF', '#F43F5E', '#8B5CF6', 
    '#3B82F6', '#10B981', '#F59E0B', '#64748B'
  ];

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-x-hidden lg:overflow-hidden">
      
      {/* --- LEFT SIDEBAR (Controls) --- */}
      <div className="order-2 lg:order-1 w-full lg:w-[420px] h-auto lg:h-full bg-white/80 backdrop-blur-2xl border-r border-white/20 flex flex-col shadow-2xl z-20 relative lg:flex-none">
        <div className="p-6 border-b border-gray-100 bg-white/50">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-lg">
               <Sparkles size={18} fill="currentColor" />
             </div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
               CarouselKit
             </h1>
           </div>
           <p className="text-xs text-slate-400 font-medium ml-10">AI-Powered Instagram Generator</p>
        </div>

        <div className="flex-1 lg:overflow-y-auto no-scrollbar p-6 space-y-8">
          
          {/* 1. GENERATOR SECTION */}
          <section className="space-y-5">
             <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
               <Wand2 size={16} className="text-purple-500" />
               Генератор
             </div>
             
             {/* Topic */}
             <div className="space-y-2">
               <label className="text-xs font-semibold text-slate-500 ml-1">Тема карусели</label>
               <input 
                 type="text" 
                 value={config.topic}
                 onChange={e => setConfig(prev => ({ ...prev, topic: e.target.value }))}
                 placeholder="Например: 5 ошибок в дизайне..."
                 className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 transition-all font-medium placeholder:text-slate-400"
               />
             </div>

             {/* Tone Slider */}
             <div className="space-y-3">
               <div className="flex justify-between items-end">
                 <label className="text-xs font-semibold text-slate-500 ml-1">Tone of Voice</label>
                 <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                   {toneInfo.emoji} {toneInfo.label}
                 </span>
               </div>
               <input 
                 type="range" 
                 min="0" max="100" step="1"
                 value={toneValue}
                 onChange={e => setToneValue(parseInt(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
               />
               <p className="text-[10px] text-slate-400 text-center italic">{toneInfo.desc}</p>
             </div>

             {/* Slide Count */}
             <div className="space-y-3">
               <div className="flex justify-between items-end">
                 <label className="text-xs font-semibold text-slate-500 ml-1">Количество слайдов</label>
                 <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                   {config.slideCount} шт.
                 </span>
               </div>
               <input 
                 type="range" 
                 min="3" max="10" step="1"
                 value={config.slideCount}
                 onChange={e => setConfig(prev => ({ ...prev, slideCount: parseInt(e.target.value) }))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
               />
             </div>

             <button 
               onClick={handleGenerate}
               disabled={isGenerating}
               className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               {isGenerating ? (
                 <>
                   <RefreshCw size={18} className="animate-spin" />
                   Генерирую...
                 </>
               ) : (
                 <>
                   <Sparkles size={18} />
                   Сгенерировать
                 </>
               )}
             </button>
          </section>

          <div className="h-px bg-slate-100 w-full"></div>

          {/* 2. CUSTOMIZATION SECTION */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
               <Palette size={16} className="text-pink-500" />
               Дизайн
             </div>

             {/* Font Size */}
             <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <Type size={14} className="text-slate-400" />
                   <label className="text-xs font-semibold text-slate-500">Размер текста</label>
                </div>
                <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl">
                    {(['small', 'medium', 'large', 'extra'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => updateGlobalStyle({ fontSize: size })}
                        className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all uppercase ${
                          (currentStyle.fontSize || 'medium') === size 
                            ? 'bg-white text-purple-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {size === 'small' ? 'S' : size === 'medium' ? 'M' : size === 'large' ? 'L' : 'XL'}
                      </button>
                    ))}
                </div>
             </div>

             {/* Fonts */}
             <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <Type size={14} className="text-slate-400" />
                   <label className="text-xs font-semibold text-slate-500">Шрифт</label>
                </div>
                <select 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
                  value={currentStyle.fontFamily || ''}
                  onChange={(e) => updateGlobalStyle({ fontFamily: e.target.value })}
                >
                  <option value="">По умолчанию</option>
                  {FONTS.map(f => (
                    <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
                  ))}
                </select>
             </div>

             {/* Colors */}
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-500 ml-1">Цвет Заголовка</label>
                   <div className="grid grid-cols-8 gap-2">
                      <button 
                         onClick={() => updateGlobalStyle({ titleColor: '' })}
                         className={`w-8 h-8 rounded-full border border-slate-200 bg-transparent flex items-center justify-center text-[10px] text-slate-400 hover:bg-slate-50 ${!currentStyle.titleColor ? 'ring-2 ring-purple-500' : ''}`}
                         title="Сброс"
                      >
                         A
                      </button>
                      {COLOR_PRESETS.map(color => (
                         <button
                           key={color}
                           onClick={() => updateGlobalStyle({ titleColor: color })}
                           className={`w-8 h-8 rounded-full border border-black/5 shadow-sm transition-transform hover:scale-110 ${currentStyle.titleColor === color ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
                           style={{ backgroundColor: color }}
                         />
                      ))}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-500 ml-1">Цвет Текста</label>
                   <div className="grid grid-cols-8 gap-2">
                      <button 
                         onClick={() => updateGlobalStyle({ textColor: '' })}
                         className={`w-8 h-8 rounded-full border border-slate-200 bg-transparent flex items-center justify-center text-[10px] text-slate-400 hover:bg-slate-50 ${!currentStyle.textColor ? 'ring-2 ring-purple-500' : ''}`}
                         title="Сброс"
                      >
                         A
                      </button>
                      {COLOR_PRESETS.map(color => (
                         <button
                           key={color}
                           onClick={() => updateGlobalStyle({ textColor: color })}
                           className={`w-8 h-8 rounded-full border border-black/5 shadow-sm transition-transform hover:scale-110 ${currentStyle.textColor === color ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
                           style={{ backgroundColor: color }}
                         />
                      ))}
                   </div>
                </div>
             </div>

             {/* Background Opacity */}
             <div className="space-y-3 pt-2">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-center gap-2">
                     <Layers size={14} className="text-slate-400" />
                     <label className="text-xs font-semibold text-slate-500">Затемнение фото</label>
                   </div>
                   <span className="text-xs font-mono text-slate-400">{Math.round((currentStyle.overlayOpacity || 0.2) * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="0.9" step="0.05"
                  value={currentStyle.overlayOpacity !== undefined ? currentStyle.overlayOpacity : 0.2}
                  onChange={(e) => updateGlobalStyle({ overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                />
             </div>
          </section>

          {/* Export Button */}
          <div className="pt-4 pb-10">
             <button 
               onClick={handleExport}
               className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
               <Download size={18} />
               Экспорт в PNG
             </button>
          </div>
        </div>
      </div>

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
            <div key={slide.number} style={{ width: 1080, height: 1350 }}>
              <SlideCard
                data={slide}
                theme={Theme.DARK_MODERN} // Always use Dark Modern as base
                totalSlides={slides.length}
                username={username}
                onSlideChange={() => {}}
                readOnly={true}
                customStyle={slideStyles[slide.number]}
                isRegenerating={false}
                className="w-full h-full text-[2.5em]" // Simple scaling hack for export container
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- RIGHT AREA (PREVIEW) --- */}
      <div className="order-1 lg:order-2 w-full lg:flex-1 h-[600px] lg:h-full relative flex flex-col items-center justify-center overflow-hidden bg-slate-50 lg:bg-transparent shrink-0">
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-0"></div>
         <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none"></div>
         
         <div className="relative z-10 scale-[0.65] sm:scale-[0.85] lg:scale-100 transition-transform duration-500 origin-center">
             <PhoneFrame username={username} isDark={true}>
               <SlideCard 
                  data={currentSlideData}
                  theme={Theme.DARK_MODERN}
                  totalSlides={currentTotal}
                  username={username}
                  onSlideChange={(f, v) => handleSlideUpdate(f, v)}
                  onRegenerate={() => handleRegenerateSlide(activeSlideIndex)}
                  onUploadBg={() => fileInputRef.current?.click()}
                  onGenerateBg={() => handleAiBackgroundGeneration()}
                  isRegenerating={loadingSlides[currentSlideData.number]}
                  customStyle={currentStyle}
               />
             </PhoneFrame>

             {/* Navigation */}
             <button 
                onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                className="absolute top-1/2 -left-12 lg:-left-24 -translate-y-1/2 w-12 h-12 lg:w-16 lg:h-16 bg-white/30 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-slate-700 shadow-xl hover:bg-white hover:scale-110 transition-all disabled:opacity-0 disabled:pointer-events-none"
                disabled={activeSlideIndex === 0}
              >
                <ChevronLeft size={24} className="lg:w-8 lg:h-8" />
              </button>
              <button 
                onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
                className="absolute top-1/2 -right-12 lg:-right-24 -translate-y-1/2 w-12 h-12 lg:w-16 lg:h-16 bg-white/30 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-slate-700 shadow-xl hover:bg-white hover:scale-110 transition-all disabled:opacity-0 disabled:pointer-events-none"
                disabled={activeSlideIndex === slides.length - 1}
              >
                <ChevronRight size={24} className="lg:w-8 lg:h-8" />
              </button>
         </div>

         {/* Badge */}
         <div className="absolute bottom-4 lg:bottom-8 px-6 py-2 bg-white/60 backdrop-blur-md rounded-full shadow-lg text-sm font-bold text-slate-600 border border-white/50">
            Слайд {activeSlideIndex + 1} из {slides.length}
         </div>
      </div>

    </div>
  );
};

export default App;

// Helper function for inline edits
function handleSlideUpdate(field: any, value: any) {
  // Placeholder logic handled within components via props, 
  // but kept for structure consistency if expanded.
}
