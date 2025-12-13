import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateSlideImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, SavedCarousel } from './types';
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Type, Palette, Download, Layers, RefreshCw, AtSign, ImagePlus, Copy, Trash2, X, Library, Save, Clock, Lightbulb, Plus, AlertCircle, LayoutTemplate, Share, Eye, Loader2, List, Grid2X2, ArrowUpRight, MessageSquare, Briefcase, Smile, Zap } from 'lucide-react';
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

// Content Ideas
const QUICK_TOPICS = [
  "5 ошибок новичка в...",
  "Как заработать на...",
  "Секрет продуктивности",
  "Тренды 2025 года",
  "Чек-лист: Готовность к...",
  "История моего провала"
];

const INITIAL_FONTS = [
  { name: 'Inter', label: 'Inter (База)' },
  { name: 'Golos Text', label: 'Golos (Тренд 2025)' },
  { name: 'Manrope', label: 'Manrope (Стиль)' },
  { name: 'Montserrat', label: 'Montserrat (Гео)' },
  { name: 'Unbounded', label: 'Unbounded (Смелый)' },
  { name: 'Bebas Neue', label: 'Bebas (Caps)' },
  { name: 'Oswald', label: 'Oswald (Узкий)' },
  { name: 'Anton', label: 'Anton (Heavy)' },
  { name: 'Russo One', label: 'Russo (Мощь)' },
  { name: 'Tektur', label: 'Tektur (Cyber)' },
  { name: 'Cormorant Garamond', label: 'Cormorant (Люкс)' },
  { name: 'Playfair Display', label: 'Playfair (Элегант)' },
  { name: 'Merriweather', label: 'Merriweather (Чтение)' },
  { name: 'Alice', label: 'Alice (Сказка)' },
  { name: 'Caveat', label: 'Caveat (Рука)' },
  { name: 'Comfortaa', label: 'Comfortaa (Мягкий)' },
  { name: 'Courier Prime', label: 'Courier (Ретро)' },
];

const FONT_PAIRINGS: Record<string, string> = {
  'Inter': 'Inter',
  'Golos Text': 'Inter',
  'Manrope': 'Golos Text',
  'Montserrat': 'Inter',
  'Unbounded': 'Inter',
  'Bebas Neue': 'Montserrat',
  'Oswald': 'Open Sans',
  'Anton': 'Inter',
  'Russo One': 'Golos Text',
  'Tektur': 'Manrope',
  'Cormorant Garamond': 'Manrope',
  'Playfair Display': 'Golos Text',
  'Merriweather': 'Inter',
  'Alice': 'Montserrat',
  'Caveat': 'Golos Text',
  'Comfortaa': 'Manrope',
  'Courier Prime': 'Inter',
};

const COLOR_PRESETS = [
  '#000000', '#FFFFFF', '#F43F5E', '#8B5CF6', 
  '#3B82F6', '#10B981', '#F59E0B', '#64748B'
];

const GRADIENT_PRESETS = [
  { name: 'Soft Creme', value: 'linear-gradient(135deg, #F5EDE2, #FFFDF9)' },
  { name: 'Deep Obsidian', value: 'linear-gradient(135deg, #18181b, #020202)' },
  { name: 'Cherry Crush', value: 'linear-gradient(135deg, #E84F5E, #FCDFC5)' },
  { name: 'Vanilla Teal', value: 'linear-gradient(135deg, #F3E5C3, #174E4F)' },
  { name: 'Sage Olive', value: 'linear-gradient(135deg, #ABC8A2, #1A2417)' },
  { name: 'Mint Mustard', value: 'linear-gradient(135deg, #D7EAE2, #4B421B)' },
  { name: 'Lime Evergreen', value: 'linear-gradient(135deg, #8ED968, #103C1F)' },
  { name: 'Burgundy Sand', value: 'linear-gradient(135deg, #5C0E14, #F0E193)' },
  { name: 'Ocean Sky', value: 'linear-gradient(135deg, #2772A0, #CCDDEA)' },
];

const THEME_PRESETS = [
  { id: Theme.AURORA_GREEN, label: 'Aurora', color: 'bg-emerald-800', textColor: 'text-white' },
  { id: Theme.DARK_MODERN, label: 'Dark', color: 'bg-zinc-900', textColor: 'text-white' },
  { id: Theme.MINIMAL_LIGHT, label: 'Light', color: 'bg-white border border-gray-200', textColor: 'text-black' },
  { id: Theme.BOLD_NEON, label: 'Neon', color: 'bg-indigo-600', textColor: 'text-white' },
  { id: Theme.RETRO_PAPER, label: 'Retro', color: 'bg-[#F5F5F0]', textColor: 'text-black' },
];

type MobileTab = 'generator' | 'design' | 'library' | null;
type SidebarTab = 'editor' | 'library';
type ViewMode = 'visual' | 'structure'; // New state for switching views

const App: React.FC = () => {
  // --- STATE ---
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
  const [error, setError] = useState<string | null>(null);
  
  // Font State
  const [availableFonts, setAvailableFonts] = useState(INITIAL_FONTS);
  const [customFontInput, setCustomFontInput] = useState('');

  // Library State
  const [savedCarousels, setSavedCarousels] = useState<SavedCarousel[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('editor');
  
  // Mobile UI State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>(null);
  const [mobileViewMode, setMobileViewMode] = useState<ViewMode>('visual');

  // Swipe State
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // Editing State
  const [slideStyles, setSlideStyles] = useState<Record<number, SlideStyle>>({});
  const [loadingSlides, setLoadingSlides] = useState<Record<number, boolean>>({});
  const [generatingBgSlides, setGeneratingBgSlides] = useState<Record<number, boolean>>({});

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
    setError(null);
    setActiveMobileTab(null);
    setMobileViewMode('structure'); // Switch to structure view after generation
    setActiveSidebarTab('editor');
    try {
      const tone = mapSliderToTone(toneValue);
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, tone);
      setSlides(generatedSlides);
      setActiveSlideIndex(0);
      setSlideStyles({});
      setConfig(prev => ({ ...prev, tone }));
    } catch (error: any) {
      const msg = error.message || "Ошибка генерации";
      setError(msg);
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
      alert("Не удалось обновить слайд");
    } finally {
      setLoadingSlides(prev => ({ ...prev, [slide.number]: false }));
    }
  };
  
  const handleGenerateAIBackground = async () => {
      const slide = slides[activeSlideIndex];
      const targetSlideNumber = slide.number;

      setGeneratingBgSlides(prev => ({ ...prev, [targetSlideNumber]: true }));
      try {
          const topic = config.topic || slide.title;
          const context = slide.content;
          const bgImage = await generateSlideImage(topic, context);
          
          if (bgImage) {
              setSlideStyles(prev => ({
                ...prev,
                [targetSlideNumber]: {
                  ...(prev[targetSlideNumber] || DEFAULT_STYLE),
                  backgroundType: 'image',
                  backgroundValue: bgImage
                }
              }));
          }
      } catch (e: any) {
          console.error(e);
          alert(e.message || "Не удалось сгенерировать изображение");
      } finally {
          setGeneratingBgSlides(prev => ({ ...prev, [targetSlideNumber]: false }));
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

  const handleStructureChange = (index: number, field: keyof SlideData, value: string) => {
    setSlides(prev => {
        const newSlides = [...prev];
        if (newSlides[index]) {
            newSlides[index] = { ...newSlides[index], [field]: value };
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
    const type = slideStyles[currentSlideNum]?.backgroundType;

    setSlideStyles(prev => {
      const newStyles = { ...prev };
      slides.forEach(s => {
        newStyles[s.number] = {
          ...(newStyles[s.number] || DEFAULT_STYLE),
          backgroundType: type || 'image',
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

  const handleAddCustomFont = () => {
    if (!customFontInput.trim()) return;
    const fontName = customFontInput.trim();
    const formattedName = fontName.replace(/\s+/g, '+');
    const url = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@300;400;700;900&display=swap`;
    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const newFont = { name: fontName, label: `${fontName} (Custom)` };
    setAvailableFonts(prev => [...prev, newFont]);
    updateGlobalStyle({ titleFontFamily: fontName, bodyFontFamily: fontName });
    setCustomFontInput('');
    alert(`Шрифт ${fontName} добавлен!`);
  };

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
        key={currentSlideData.number}
        data={currentSlideData}
        theme={config.theme}
        totalSlides={slides.length}
        username={username}
        onSlideChange={handleContentChange}
        onRegenerate={() => handleRegenerateSlide(activeSlideIndex)}
        onUploadBg={() => fileInputRef.current?.click()}
        onGenerateBg={handleGenerateAIBackground}
        isRegenerating={loadingSlides[currentSlideData.number]}
        isGeneratingBg={generatingBgSlides[currentSlideData.number]}
        customStyle={currentStyle}
        className="w-full h-full"
      />
  );

  // --- RENDER SECTIONS ---

  const renderGeneratorControls = () => (
    <section className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
        <Wand2 size={16} className="text-purple-500" />
        Генератор
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-pulse">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-red-700">Ошибка</span>
                <span className="text-xs text-red-600 leading-snug">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <X size={16} />
            </button>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 ml-1">Тема карусели</label>
        <div className="space-y-3">
          <input 
            type="text" 
            value={config.topic}
            onChange={e => setConfig(prev => ({ ...prev, topic: e.target.value }))}
            placeholder="О чем будет пост?"
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 transition-all font-medium placeholder:text-slate-400"
          />
          {/* Quick Topics Chips */}
          <div className="flex flex-wrap gap-2">
             {QUICK_TOPICS.map(t => (
                <button
                   key={t}
                   onClick={() => setConfig(prev => ({ ...prev, topic: t }))}
                   className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm"
                >
                   {t}
                </button>
             ))}
          </div>
        </div>
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

  const renderDesignControls = () => {
    const currentTitleFont = currentStyle.titleFontFamily || 'Inter';
    const recommendedBodyFont = FONT_PAIRINGS[currentTitleFont];

    return (
    <section className="space-y-6">
      
      {/* Template Selector */}
      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <LayoutTemplate size={14} className="text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Шаблоны</label>
         </div>
         <div className="grid grid-cols-3 gap-2">
           {THEME_PRESETS.map((t) => (
             <button
                key={t.id}
                onClick={() => {
                  setConfig(prev => ({ ...prev, theme: t.id }));
                  updateGlobalStyle({ titleColor: '', textColor: '' }); 
                }}
                className={`relative h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all overflow-hidden ${config.theme === t.id ? 'ring-2 ring-purple-500 ring-offset-1 border-transparent' : 'border-slate-200 hover:border-purple-300'}`}
             >
                <div className={`absolute inset-0 opacity-20 ${t.color}`}></div>
                <div className={`z-10 w-6 h-6 rounded-full ${t.color} shadow-sm border border-white/20`}></div>
                <span className="z-10 text-[10px] font-bold text-slate-700">{t.label}</span>
             </button>
           ))}
         </div>
      </div>

      <div className="h-px bg-slate-100 w-full"></div>

      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <AtSign size={14} className="text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Никнейм</label>
         </div>
         <input 
           type="text" 
           value={username}
           onChange={(e) => setUsername(e.target.value)}
           className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
           placeholder="@username"
         />
      </div>

      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <ImagePlus size={14} className="text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Готовые фоны</label>
         </div>
         <div className="grid grid-cols-4 gap-2">
           {GRADIENT_PRESETS.map((preset) => (
             <button
               key={preset.name}
               onClick={() => updateSlideStyle({ backgroundType: 'gradient', backgroundValue: preset.value })}
               className={`w-full aspect-square rounded-lg shadow-sm hover:scale-105 transition-transform border border-black/5 ${currentStyle.backgroundValue === preset.value ? 'ring-2 ring-purple-500' : ''}`}
               style={{ background: preset.value }}
               title={preset.name}
             />
           ))}
         </div>

         {(currentStyle.backgroundType === 'image' || currentStyle.backgroundType === 'gradient') && (
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
         <div className="flex flex-col gap-3">
             <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500 ml-1">Шрифт заголовка</label>
                 <select 
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
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
                   className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
                   value={currentStyle.bodyFontFamily || currentStyle.fontFamily || ''}
                   onChange={(e) => updateGlobalStyle({ bodyFontFamily: e.target.value })}
                 >
                   <option value="">По умолчанию</option>
                   {availableFonts.map(f => (
                     <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                       {f.label} {f.name === recommendedBodyFont ? '✨' : ''}
                     </option>
                   ))}
                 </select>
             </div>
         </div>
      </div>
      
      {/* Spacer for bottom sheet usage */}
      <div className="h-12"></div>
    </section>
  )};

  const renderStructureEditor = () => (
    <div className="space-y-4 p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Структура карусели</h2>
            <div className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">
                {slides.length} слайдов
            </div>
        </div>
        
        {slides.map((slide, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative group">
                <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-300">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Заголовок</label>
                        <input 
                            type="text" 
                            value={slide.title}
                            onChange={(e) => handleStructureChange(idx, 'title', e.target.value)}
                            className="w-full font-bold text-slate-800 border-b border-slate-200 focus:border-purple-500 outline-none py-1 bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Контент</label>
                        <textarea 
                            value={slide.content}
                            onChange={(e) => handleStructureChange(idx, 'content', e.target.value)}
                            rows={3}
                            className="w-full text-sm text-slate-600 border border-slate-100 bg-slate-50 rounded-lg p-2 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                        />
                    </div>
                    {slide.highlight && (
                        <div>
                             <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1 block flex items-center gap-1"><Zap size={10} /> Акцент</label>
                             <input 
                                type="text" 
                                value={slide.highlight}
                                onChange={(e) => handleStructureChange(idx, 'highlight', e.target.value)}
                                className="w-full text-xs text-purple-700 font-medium bg-purple-50 rounded px-2 py-1 outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
        ))}
        
        <button className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-purple-300 hover:text-purple-500 transition-colors">
            <Plus size={18} />
            Добавить слайд
        </button>
    </div>
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
      
      {/* --- DESKTOP LEFT SIDEBAR (Unchanged) --- */}
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

      {/* --- DESKTOP PREVIEW AREA (Unchanged) --- */}
      <div className="hidden lg:flex relative flex-1 h-full flex-col overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 z-0"></div>
         <div className="relative z-10 w-full h-full flex items-center justify-center">
             <div className="relative scale-[0.85] 2xl:scale-100 transition-transform duration-500 origin-center">
                 <PhoneFrame username={username} isDark={true} viewMode="desktop">
                   {renderCurrentSlide(false)}
                 </PhoneFrame>
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
         </div>
      </div>

      {/* =========================================================================
          MOBILE LAYOUT - iOS APP STYLE (IMPROVED UX)
          ========================================================================= */}
      <div className="lg:hidden flex flex-col h-full bg-slate-50 overflow-hidden relative">
         
         {/* Full Screen Loading Overlay */}
         {isGenerating && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
               <div className="relative mb-6">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin relative z-10" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">Генерирую контент...</h3>
               <p className="text-sm text-slate-500 max-w-[250px] text-center">Создаю заголовки и структуру для вашей карусели</p>
            </div>
         )}

         {/* iOS Header */}
         <div className="pt-safe px-4 pb-2 bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-black/5 flex justify-between items-center transition-all">
            <div className="flex items-center gap-1.5 pt-2">
               <Sparkles className="text-purple-600" size={18} />
               <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">CarouselKit</span>
            </div>
            {/* View Toggle */}
            <div className="pt-2 flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button 
                   onClick={() => setMobileViewMode('structure')}
                   className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'structure' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                    <List size={16} />
                </button>
                <button 
                   onClick={() => setMobileViewMode('visual')}
                   className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'visual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                    <Grid2X2 size={16} />
                </button>
            </div>
         </div>

         {/* Mobile Main Content Area */}
         {mobileViewMode === 'structure' ? (
             <div className="flex-1 overflow-y-auto bg-slate-50">
                 {renderStructureEditor()}
             </div>
         ) : (
             <div 
                className={`flex-1 overflow-hidden relative flex flex-col transition-all duration-500 ease-in-out`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
             >  
                {/* Background Mesh */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 z-0 pointer-events-none"></div>

                {/* SLIDE PREVIEW CONTAINER 
                    Logic: If a drawer is active, translate this container UP and Scale it down 
                    to fit the remaining top space without covering it.
                */}
                <div className={`relative z-10 flex-1 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    activeMobileTab 
                       ? 'justify-start pt-4 scale-90 -translate-y-4' // Push up state
                       : 'justify-center pb-24 px-4 pt-4' // Normal centered state
                }`}>
                    
                    {/* Carousel Card Container */}
                    <div 
                      className={`w-full max-w-sm aspect-[4/5] shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 relative transition-all duration-300 ${
                          activeMobileTab ? 'shadow-lg' : 'shadow-2xl'
                      }`}
                    >
                        {renderCurrentSlide(true)}
                    </div>

                    {/* Slide Indicators - Only show when no drawer is active to save space */}
                    {!activeMobileTab && (
                        <div className="flex justify-center gap-1.5 mt-8 animate-in fade-in slide-in-from-bottom-4">
                            {slides.map((_, idx) => (
                                <div 
                                key={idx}
                                onClick={() => setActiveSlideIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlideIndex ? 'w-4 bg-purple-600 shadow-md' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
             </div>
         )}

         {/* iOS Tab Bar (Bottom Nav) */}
         <div className="pb-safe bg-white/90 backdrop-blur-xl border-t border-black/5 absolute bottom-0 left-0 right-0 z-30">
            <div className="flex justify-around items-center h-16 px-1">
               <button 
                 onClick={() => {
                     setActiveMobileTab(activeMobileTab === 'generator' ? null : 'generator');
                 }}
                 className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${activeMobileTab === 'generator' ? 'text-purple-600' : 'text-slate-400'}`}
               >
                 <Sparkles size={24} strokeWidth={activeMobileTab === 'generator' ? 2.5 : 2} />
                 <span className="text-[10px] font-medium">Создать</span>
               </button>
               
               <button 
                 onClick={handleExport}
                 className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors text-slate-400 active:text-slate-600`}
               >
                 <Share size={24} strokeWidth={2} />
                 <span className="text-[10px] font-medium">Экспорт</span>
               </button>

               <button 
                 onClick={() => {
                     setMobileViewMode('visual'); // Switch to visual when opening design
                     setActiveMobileTab(activeMobileTab === 'design' ? null : 'design');
                 }}
                 className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${activeMobileTab === 'design' ? 'text-purple-600' : 'text-slate-400'}`}
               >
                 <Palette size={24} strokeWidth={activeMobileTab === 'design' ? 2.5 : 2} />
                 <span className="text-[10px] font-medium">Стиль</span>
               </button>
            </div>
         </div>

         {/* NON-BLOCKING HALF-SCREEN DRAWERS */}
         {/* Instead of a modal that covers everything, we use a fixed bottom sheet that pushes the content up logic above */}
         {activeMobileTab && (
           <div 
             className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 flex flex-col h-[45vh] pb-safe animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
           >
                {/* Handle Bar */}
                <div className="w-full flex justify-center pt-3 pb-2 cursor-grab" onClick={() => setActiveMobileTab(null)}>
                   <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-2 border-b border-slate-50">
                   <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                     {activeMobileTab === 'generator' ? 'Генератор' : 'Настройки Дизайна'}
                   </h2>
                   <button onClick={() => setActiveMobileTab(null)} className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                     <X size={14} />
                   </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 pb-24">
                   {activeMobileTab === 'generator' && renderGeneratorControls()}
                   {activeMobileTab === 'design' && renderDesignControls()}
                </div>
           </div>
         )}
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
    </div>
  );
};

export default App;