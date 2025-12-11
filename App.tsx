import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateBackgroundImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, SavedCarousel } from './types';
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Type, Palette, Download, Layers, RefreshCw, AtSign, ImagePlus, Copy, Trash2, X, Library, Save, Clock, Lightbulb, Plus } from 'lucide-react';
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
    content: "Смотрите превью в реальном времени на мокапе iPhone. Кликни на текст, чтобы изменить его.",
    cta: "Попробуй сейчас"
  }
];

const INITIAL_FONTS = [
  { name: 'Inter', label: 'Inter (System)' },
  { name: 'Montserrat', label: 'Montserrat (Modern)' },
  { name: 'Playfair Display', label: 'Playfair (Elegant)' },
  { name: 'Bebas Neue', label: 'Bebas (Bold)' },
  { name: 'Merriweather', label: 'Merriweather (Serif)' },
  { name: 'Courier Prime', label: 'Courier (Retro)' },
  { name: 'Anton', label: 'Anton (Heavy)' },
];

const COLOR_PRESETS = [
  '#000000', '#FFFFFF', '#F43F5E', '#8B5CF6', 
  '#3B82F6', '#10B981', '#F59E0B', '#64748B'
];

type MobileTab = 'generator' | 'design' | 'library' | null;
type SidebarTab = 'editor' | 'library';

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  const [toneValue, setToneValue] = useState<number>(0); // 0-100
  const [username, setUsername] = useState<string>('@my_blog');
  const [slides, setSlides] = useState<SlideData[]>(DEMO_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Font State
  const [availableFonts, setAvailableFonts] = useState(INITIAL_FONTS);
  const [customFontInput, setCustomFontInput] = useState('');

  // Library State
  const [savedCarousels, setSavedCarousels] = useState<SavedCarousel[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('editor');
  
  // Mobile UI State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(null);

  // Swipe State
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // Editing State
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('carousel_library');
    if (saved) {
      try {
        setSavedCarousels(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse library", e);
      }
    }
  }, []);

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

  // --- LOGIC HELPERS ---

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
    setActiveMobileTab(null); // Close drawer on mobile
    setActiveSidebarTab('editor'); // Switch to editor
    try {
      const tone = mapSliderToTone(toneValue);
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, tone);
      setSlides(generatedSlides);
      setActiveSlideIndex(0);
      setSlideStyles({});
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
      updateSlideStyle({ backgroundType: 'image', backgroundValue: imageUrl });
    } catch (err) {
      console.error(err);
      alert("Не удалось сгенерировать изображение.");
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };

  const handleContentChange = (field: keyof SlideData, value: string) => {
    setSlides(prev => {
      const newSlides = [...prev];
      if (newSlides[activeSlideIndex]) {
        newSlides[activeSlideIndex] = {
          ...newSlides[activeSlideIndex],
          [field]: value
        };
      }
      return newSlides;
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

  const handleApplyBgToAll = () => {
    const currentSlideNum = slides[activeSlideIndex].number;
    const currentBg = slideStyles[currentSlideNum]?.backgroundValue;
    if (!currentBg) return;
    setSlideStyles(prev => {
      const newStyles = { ...prev };
      slides.forEach(s => {
        newStyles[s.number] = {
          ...(newStyles[s.number] || DEFAULT_STYLE),
          backgroundType: 'image',
          backgroundValue: currentBg
        };
      });
      return newStyles;
    });
  };

  const handleRemoveBg = () => {
    updateSlideStyle({ backgroundType: 'solid', backgroundValue: '' });
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

  // --- CUSTOM FONT HANDLER ---
  const handleAddCustomFont = () => {
    if (!customFontInput.trim()) return;

    const fontName = customFontInput.trim();
    const formattedName = fontName.replace(/\s+/g, '+');
    const url = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;700;900&display=swap`;

    // Create and append link element
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Add to state
    const newFont = { name: fontName, label: `${fontName} (Custom)` };
    setAvailableFonts(prev => [...prev, newFont]);
    
    // Apply immediately to both for visibility
    updateGlobalStyle({ titleFontFamily: fontName, bodyFontFamily: fontName });
    
    setCustomFontInput('');
    alert(`Шрифт ${fontName} добавлен!`);
  };

  // --- LIBRARY FUNCTIONS ---
  const handleSaveToLibrary = () => {
    const newCarousel: SavedCarousel = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      topic: config.topic || "Untitled Carousel",
      slides: slides,
      styles: slideStyles,
      config: config,
      username: username
    };
    
    const updated = [newCarousel, ...savedCarousels];
    setSavedCarousels(updated);
    localStorage.setItem('carousel_library', JSON.stringify(updated));
    alert("Карусель сохранена в библиотеку!");
  };

  const handleDeleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Удалить эту карусель?")) return;
    
    const updated = savedCarousels.filter(c => c.id !== id);
    setSavedCarousels(updated);
    localStorage.setItem('carousel_library', JSON.stringify(updated));
  };

  const handleLoadFromLibrary = (item: SavedCarousel) => {
    setSlides(item.slides);
    setSlideStyles(item.styles);
    setConfig(item.config);
    setUsername(item.username);
    setActiveSlideIndex(0);
    setActiveSidebarTab('editor');
    setActiveMobileTab(null);
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const zip = new JSZip();
      const element = exportRef.current;
      const children = Array.from(element.children) as HTMLElement[];
      element.style.opacity = '1';
      
      const promises = children.map(async (child, i) => {
        const dataUrl = await toPng(child, { 
          cacheBust: true, pixelRatio: 3, width: 360, height: 450,
          style: { transform: 'none' }
        });
        const base64 = dataUrl.split(',')[1];
        zip.file(`slide-${i + 1}.png`, base64, { base64: true });
      });

      await Promise.all(promises);
      element.style.opacity = '0';
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'carousel-kit.zip');
    } catch (err) {
      console.error("Export failed", err);
      alert("Ошибка экспорта.");
    }
  };

  // --- SWIPE HANDLERS ---
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeSlideIndex < slides.length - 1) {
       setActiveSlideIndex(prev => prev + 1);
    }
    if (isRightSwipe && activeSlideIndex > 0) {
       setActiveSlideIndex(prev => prev - 1);
    }
  };

  const toneInfo = getToneLabel(toneValue);
  const currentSlideData = slides[activeSlideIndex];
  const currentStyle = slideStyles[currentSlideData.number] || DEFAULT_STYLE;

  // --- HELPER FOR RENDERING SLIDE ---
  const renderCurrentSlide = (isMobile: boolean) => (
      <SlideCard 
        data={currentSlideData}
        theme={config.theme}
        totalSlides={slides.length}
        username={username}
        onSlideChange={handleContentChange}
        onRegenerate={() => handleRegenerateSlide(activeSlideIndex)}
        onUploadBg={() => fileInputRef.current?.click()}
        onGenerateBg={() => handleAiBackgroundGeneration()}
        isRegenerating={loadingSlides[currentSlideData.number]}
        customStyle={currentStyle}
        className="w-full h-full"
      />
  );

  // --- SHARED UI COMPONENTS (RENDER FUNCTIONS) ---

  const renderGeneratorControls = () => (
    <section className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
        <Wand2 size={16} className="text-purple-500" />
        Генератор
      </div>
      
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

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs font-semibold text-slate-500 ml-1">Tone of Voice</label>
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1">
            {toneInfo.emoji} {toneInfo.label}
          </span>
        </div>
        <input 
          type="range" min="0" max="100" step="1"
          value={toneValue}
          onChange={e => setToneValue(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <p className="text-[10px] text-slate-400 text-center italic">{toneInfo.desc}</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-xs font-semibold text-slate-500 ml-1">Количество слайдов</label>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
            {config.slideCount} шт.
          </span>
        </div>
        <input 
          type="range" min="3" max="10" step="1"
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

      <button
        onClick={handleSaveToLibrary}
        className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 text-sm"
      >
        <Save size={16} />
        Сохранить в коллекцию
      </button>
    </section>
  );

  const renderDesignControls = () => (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
        <Palette size={16} className="text-pink-500" />
        Дизайн
      </div>

      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <AtSign size={14} className="text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Никнейм</label>
         </div>
         <input 
           type="text" 
           value={username}
           onChange={(e) => setUsername(e.target.value)}
           className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
           placeholder="@username"
         />
      </div>

      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <ImagePlus size={14} className="text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Фон слайда</label>
         </div>
         <div className="flex gap-2">
             <button
                 onClick={() => fileInputRef.current?.click()}
                 className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
             >
                 <ImagePlus size={14} />
                 Загрузить
             </button>
             
             <button
                 onClick={handleAiBackgroundGeneration}
                  className="px-3 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                  title="AI Генерация фона"
             >
                 <Sparkles size={14} />
             </button>
         </div>

         {currentStyle.backgroundType === 'image' && (
             <div className="grid grid-cols-2 gap-2 mt-2">
                 <button
                     onClick={handleApplyBgToAll}
                     className="py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                 >
                     <Copy size={12} />
                     Ко всем
                 </button>
                 <button
                     onClick={handleRemoveBg}
                     className="py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                 >
                     <Trash2 size={12} />
                     Убрать
                 </button>
             </div>
         )}
      </div>

      {/* NEW: Title Glow Toggle */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
         <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-indigo-500" />
            <label className="text-xs font-bold text-slate-700">Неоновое свечение</label>
         </div>
         <button 
           onClick={() => updateGlobalStyle({ titleGlow: !currentStyle.titleGlow })}
           className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${currentStyle.titleGlow ? 'bg-indigo-500' : 'bg-slate-300'}`}
         >
           <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${currentStyle.titleGlow ? 'translate-x-5' : 'translate-x-0'}`} />
         </button>
      </div>

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

      <div className="space-y-4">
         {/* Font Selection Group */}
         <div className="flex flex-col gap-3">
             <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500 ml-1">Шрифт заголовка</label>
                 <select 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
                   value={currentStyle.titleFontFamily || currentStyle.fontFamily || ''}
                   onChange={(e) => updateGlobalStyle({ titleFontFamily: e.target.value })}
                 >
                   <option value="">По умолчанию</option>
                   {availableFonts.map(f => (
                     <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
                   ))}
                 </select>
             </div>

             <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500 ml-1">Шрифт текста</label>
                 <select 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
                   value={currentStyle.bodyFontFamily || currentStyle.fontFamily || ''}
                   onChange={(e) => updateGlobalStyle({ bodyFontFamily: e.target.value })}
                 >
                   <option value="">По умолчанию</option>
                   {availableFonts.map(f => (
                     <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.label}</option>
                   ))}
                 </select>
             </div>

             <div className="flex gap-2 mt-1">
               <input 
                 type="text" 
                 value={customFontInput}
                 onChange={(e) => setCustomFontInput(e.target.value)}
                 placeholder="Google Font (e.g. Lobster)"
                 className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
               />
               <button 
                 onClick={handleAddCustomFont}
                 className="bg-purple-100 text-purple-600 p-2 rounded-xl hover:bg-purple-200 transition-colors"
                 title="Добавить шрифт"
               >
                 <Plus size={16} />
               </button>
             </div>
         </div>
      </div>

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

      <div className="space-y-3 pt-2">
         <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-slate-400" />
              <label className="text-xs font-semibold text-slate-500">Затемнение фото</label>
            </div>
            <span className="text-xs font-mono text-slate-400">{Math.round((currentStyle.overlayOpacity || 0.2) * 100)}%</span>
         </div>
         <input 
           type="range" min="0" max="0.9" step="0.05"
           value={currentStyle.overlayOpacity !== undefined ? currentStyle.overlayOpacity : 0.2}
           onChange={(e) => updateGlobalStyle({ overlayOpacity: parseFloat(e.target.value) })}
           className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
         />
      </div>
    </section>
  );

  const renderLibrary = () => (
    <section className="space-y-4">
       <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
        <Library size={16} className="text-blue-500" />
        Коллекция ({savedCarousels.length})
      </div>
      
      {savedCarousels.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
           <Library size={32} className="mx-auto text-slate-300 mb-2" />
           <p className="text-sm text-slate-400 font-medium">Пока ничего не сохранено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedCarousels.map((item) => (
             <div key={item.id} onClick={() => handleLoadFromLibrary(item)} className="group bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all">
                <div className="flex justify-between items-start mb-1">
                   <h3 className="font-bold text-slate-700 text-sm line-clamp-2">{item.topic || 'Без названия'}</h3>
                   <button 
                     onClick={(e) => handleDeleteFromLibrary(item.id, e)}
                     className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                   <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded">
                     <Layers size={10} /> {item.slides.length}
                   </span>
                   <span className="flex items-center gap-1">
                     <Clock size={10} /> {new Date(item.timestamp).toLocaleDateString()}
                   </span>
                </div>
             </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      
      {/* --- DESKTOP LEFT SIDEBAR --- */}
      <div className="hidden lg:flex w-[420px] h-full bg-white/80 backdrop-blur-2xl border-r border-white/20 flex-col shadow-2xl z-20 relative">
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

        {/* Sidebar Tabs */}
        <div className="px-6 pt-4">
           <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setActiveSidebarTab('editor')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSidebarTab === 'editor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Редактор
              </button>
              <button 
                onClick={() => setActiveSidebarTab('library')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeSidebarTab === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Коллекция
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {activeSidebarTab === 'editor' ? (
            <>
              {renderGeneratorControls()}
              <div className="h-px bg-slate-100 w-full"></div>
              {renderDesignControls()}
              <div className="pt-4 pb-10">
                 <button 
                   onClick={handleExport}
                   className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                 >
                   <Download size={18} />
                   Экспорт в PNG
                 </button>
              </div>
            </>
          ) : (
            renderLibrary()
          )}
        </div>
      </div>

      {/* --- MOBILE DRAWER (BOTTOM SHEET) --- */}
      {/* Overlay */}
      {activeMobileTab && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setActiveMobileTab(null)}
        />
      )}
      
      {/* Drawer Content */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col max-h-[85vh] ${activeMobileTab ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setActiveMobileTab(null)}>
           <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between px-6 pb-2">
           <h2 className="text-lg font-bold text-slate-800">
             {activeMobileTab === 'generator' ? 'Генератор' : activeMobileTab === 'design' ? 'Дизайн' : 'Коллекция'}
           </h2>
           <button onClick={() => setActiveMobileTab(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
             <X size={18} />
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
           {activeMobileTab === 'generator' && renderGeneratorControls()}
           {activeMobileTab === 'design' && renderDesignControls()}
           {activeMobileTab === 'library' && renderLibrary()}
        </div>
      </div>

      {/* --- HIDDEN INPUTS & EXPORT --- */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
      <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', height: 0, width: 0, opacity: 0 }}>
        <div ref={exportRef}>
          {slides.map((slide) => (
            <div key={slide.number} style={{ width: '360px', height: '450px', position: 'relative' }}>
              <SlideCard
                data={slide} theme={config.theme} totalSlides={slides.length} username={username}
                onSlideChange={() => {}} readOnly={true} customStyle={slideStyles[slide.number]} isRegenerating={false} className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- MAIN AREA (PREVIEW) --- */}
      <div className="relative flex-1 h-full w-full flex flex-col overflow-hidden bg-slate-50 lg:bg-transparent">
         {/* Mobile Header Removed - PhoneFrame handles it */}
         
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-0"></div>
         
         <div className="relative z-10 w-full h-full flex items-center justify-center lg:pb-0 lg:pt-0 pb-20">
             
             {/* DESKTOP VIEW: Phone Frame Mockup */}
             <div className="hidden lg:block relative scale-[0.85] 2xl:scale-100 transition-transform duration-500 origin-center">
                 <PhoneFrame username={username} isDark={true} viewMode="desktop">
                   {renderCurrentSlide(false)}
                 </PhoneFrame>

                 {/* Desktop Navigation */}
                 <button 
                    onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
                    className="absolute top-1/2 -left-24 -translate-y-1/2 w-16 h-16 bg-white/30 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-slate-700 shadow-xl hover:bg-white hover:scale-110 transition-all disabled:opacity-0 disabled:pointer-events-none"
                    disabled={activeSlideIndex === 0}
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button 
                    onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
                    className="absolute top-1/2 -right-24 -translate-y-1/2 w-16 h-16 bg-white/30 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-slate-700 shadow-xl hover:bg-white hover:scale-110 transition-all disabled:opacity-0 disabled:pointer-events-none"
                    disabled={activeSlideIndex === slides.length - 1}
                  >
                    <ChevronRight size={32} />
                  </button>
             </div>

             {/* MOBILE VIEW: Clean Card with Swipe */}
             <div 
               className="lg:hidden w-full h-full flex flex-col items-center justify-center p-6"
               onTouchStart={onTouchStart}
               onTouchMove={onTouchMove}
               onTouchEnd={onTouchEnd}
             >
                 {/* Reverted to simple container instead of PhoneFrame to prevent cutoff and focus on content */}
                 <div className="relative w-full max-w-[400px] aspect-[4/5] shadow-2xl rounded-3xl overflow-hidden ring-1 ring-black/5 bg-zinc-900">
                    {renderCurrentSlide(true)}
                 </div>
                 
                 {/* Mobile Slide Indicator (Clickable) - Positioned below post */}
                 <div className="mt-6 flex gap-2 pb-8">
                    {slides.map((_, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`transition-all rounded-full ${idx === activeSlideIndex ? 'bg-slate-800 w-4 h-2' : 'bg-slate-300 w-2 h-2 hover:bg-slate-400'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                 </div>
             </div>
         </div>
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION BAR --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 flex items-center justify-around z-30 px-2 pb-2">
         <button 
           onClick={() => setActiveMobileTab('generator')}
           className={`flex flex-col items-center justify-center gap-1 w-20 h-full ${activeMobileTab === 'generator' ? 'text-purple-600' : 'text-slate-400'}`}
         >
           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeMobileTab === 'generator' ? 'bg-purple-100' : 'bg-transparent'}`}>
              <Wand2 size={22} />
           </div>
           <span className="text-[10px] font-bold">Генератор</span>
         </button>

         <button 
           onClick={() => setActiveMobileTab('design')}
           className={`flex flex-col items-center justify-center gap-1 w-20 h-full ${activeMobileTab === 'design' ? 'text-pink-600' : 'text-slate-400'}`}
         >
           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeMobileTab === 'design' ? 'bg-pink-100' : 'bg-transparent'}`}>
              <Palette size={22} />
           </div>
           <span className="text-[10px] font-bold">Дизайн</span>
         </button>

         {/* New Library Tab on Mobile */}
         <button 
           onClick={() => setActiveMobileTab('library')}
           className={`flex flex-col items-center justify-center gap-1 w-20 h-full ${activeMobileTab === 'library' ? 'text-blue-600' : 'text-slate-400'}`}
         >
           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeMobileTab === 'library' ? 'bg-blue-100' : 'bg-transparent'}`}>
              <Library size={22} />
           </div>
           <span className="text-[10px] font-bold">Коллекция</span>
         </button>
      </div>

    </div>
  );
};

export default App;
