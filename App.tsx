import React, { useState, useRef, useEffect } from 'react';
import { generateCarouselContent, regenerateSlideContent, generateSlideImage } from './services/geminiService';
import { SlideCard } from './components/SlideCard';
import { PhoneFrame } from './components/PhoneFrame';
import { CarouselConfig, SlideData, Theme, Tone, SlideStyle, DEFAULT_STYLE, SavedCarousel } from './types';
import { ChevronLeft, ChevronRight, Sparkles, Wand2, Type, Palette, Download, Layers, RefreshCw, AtSign, ImagePlus, Copy, Trash2, X, Library, Save, Clock, Lightbulb, Plus, AlertCircle, LayoutTemplate, Share, Eye, Loader2, List, Grid2X2, ArrowUpRight, MessageSquare, Briefcase, Smile, Zap, Magnet } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Initial Demo Data
const DEMO_SLIDES: SlideData[] = [
  {
    number: 1,
    title: "CAROUSEL KIT",
    content: "Создавайте вирусные карусели для Instagram за считанные секунды с помощью AI.",
    highlight: "AI POWER"
  },
  {
    number: 2,
    title: "НАСТРОЙКИ СЛЕВА",
    content: "Управляйте стилем, шрифтами и настроением контента в единой панели.",
    highlight: "УДОБСТВО"
  },
  {
    number: 3,
    title: "РЕЗУЛЬТАТ СПРАВА",
    content: "Смотрите превью в реальном времени на мокапе iPhone. Кликни на текст, чтобы изменить его.",
    cta: "ПОПРОБУЙ СЕЙЧАС"
  }
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

const LEAD_MAGNETS = [
  { id: 'subscribe', label: 'Подпишись на блог', prompt: 'Последний слайд: Сделай явный призыв ПОДПИСАТЬСЯ на блог. Объясни ценность подписки.' },
  { id: 'consultation', label: 'Запись на консультацию', prompt: 'Последний слайд: Продай идею записаться на КОНСУЛЬТАЦИЮ. Прямой призыв: "Запишись в Директ".' },
  { id: 'dm_word', label: 'Слово в Директ (Воронка)', prompt: 'Последний слайд: Призыв написать КОДОВОЕ СЛОВО в Директ для получения бонуса/гайда. Придумай это слово.' },
  { id: 'link_bio', label: 'Ссылка в шапке', prompt: 'Последний слайд: Отправь пользователя по ССЫЛКЕ В ШАПКЕ профиля за подробностями или продуктом.' },
  { id: 'save', label: 'Сохрани пост', prompt: 'Последний слайд: Убеди пользователя СОХРАНИТЬ этот пост, чтобы не потерять пользу.' },
  { id: 'comment', label: 'Оставь комментарий', prompt: 'Последний слайд: Задай провокационный вопрос, чтобы спровоцировать ОБСУЖДЕНИЕ в комментариях.' },
];

type MobileTab = 'generator' | 'design' | 'library' | null;
type SidebarTab = 'editor' | 'library';
type ViewMode = 'visual' | 'structure';

const App: React.FC = () => {
  // --- STATE ---
  const [config, setConfig] = useState<CarouselConfig>({
    topic: '',
    slideCount: 5,
    theme: Theme.DARK_MODERN,
    tone: Tone.EXPERT
  });

  const [toneValue, setToneValue] = useState<number>(0);
  const [leadMagnetId, setLeadMagnetId] = useState<string>(LEAD_MAGNETS[0].id);
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
    setMobileViewMode('structure');
    setActiveSidebarTab('editor');
    try {
      const tone = mapSliderToTone(toneValue);
      const selectedMagnet = LEAD_MAGNETS.find(m => m.id === leadMagnetId)?.prompt || "Подпишись";
      const generatedSlides = await generateCarouselContent(config.topic, config.slideCount, tone, selectedMagnet);
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
      [slideNum]: { ...(prev[slideNum] || {}), ...updates }
    }));
  };

  const updateGlobalStyle = (updates: Partial<SlideStyle>) => {
    setSlideStyles(prev => {
      const newStyles = { ...prev };
      slides.forEach(slide => {
        newStyles[slide.number] = {
          ...(newStyles[slide.number] || {}),
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
          ...(newStyles[s.number] || {}),
          backgroundType: type || 'image',
          backgroundValue: currentBg
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
            ...(newStyles[slideNum] || {}),
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
  // Default style for current slide logic check
  const currentStyle = slideStyles[currentSlideData.number] || {};

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
        isRegenerating={loadingSlides[currentSlideData.number]}
        customStyle={slideStyles[currentSlideData.number]}
        className="w-full h-full"
      />
  );

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
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <Magnet size={14} className="text-slate-400" />
           <label className="text-xs font-semibold text-slate-500">Лид-магнит (Призыв в конце)</label>
        </div>
        <select 
            value={leadMagnetId}
            onChange={(e) => setLeadMagnetId(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-purple-500 font-medium text-slate-700"
        >
            {LEAD_MAGNETS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
            ))}
        </select>
        <p className="text-[10px] text-slate-400 ml-1">
            {LEAD_MAGNETS.find(m => m.id === leadMagnetId)?.prompt.split(':')[1] || LEAD_MAGNETS.find(m => m.id === leadMagnetId)?.prompt}
        </p>
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
    <div className="space-y-6">
      {/* Fonts */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-500 ml-1">Шрифты</label>
        
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Заголовок</span>
          <select 
            value={slideStyles[slides[activeSlideIndex]?.number]?.titleFontFamily || ''}
            onChange={(e) => updateGlobalStyle({ titleFontFamily: e.target.value })}
            className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm"
          >
            <option value="">По умолчанию</option>
            {availableFonts.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Основной текст</span>
          <select 
            value={slideStyles[slides[activeSlideIndex]?.number]?.bodyFontFamily || ''}
            onChange={(e) => updateGlobalStyle({ bodyFontFamily: e.target.value })}
            className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-sm"
          >
            <option value="">По умолчанию</option>
            {availableFonts.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
          </select>
        </div>

         <div className="flex gap-2">
            <input 
              type="text" 
              value={customFontInput}
              onChange={(e) => setCustomFontInput(e.target.value)}
              placeholder="Google Font Name"
              className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={handleAddCustomFont} className="bg-slate-200 p-2 rounded-lg hover:bg-slate-300">
               <Plus size={16} />
            </button>
         </div>
      </div>
      
      {/* Colors */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-500 ml-1">Цвета текста</label>
        
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Заголовок</span>
          <div className="flex gap-2 flex-wrap">
            <button 
                onClick={() => updateGlobalStyle({ titleColor: '' })}
                className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center hover:scale-110 transition-transform"
                title="По умолчанию"
            >
                <div className="w-4 h-0.5 bg-slate-400 rotate-45" />
            </button>
            {COLOR_PRESETS.map((c, i) => (
               <button 
                 key={i}
                 className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm"
                 style={{ backgroundColor: c }}
                 onClick={() => updateGlobalStyle({ titleColor: c })}
               />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Основной текст</span>
          <div className="flex gap-2 flex-wrap">
             <button 
                onClick={() => updateGlobalStyle({ textColor: '' })}
                className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center hover:scale-110 transition-transform"
                title="По умолчанию"
            >
                <div className="w-4 h-0.5 bg-slate-400 rotate-45" />
            </button>
            {COLOR_PRESETS.map((c, i) => (
               <button 
                 key={i}
                 className="w-6 h-6 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm"
                 style={{ backgroundColor: c }}
                 onClick={() => updateGlobalStyle({ textColor: c })}
               />
            ))}
          </div>
        </div>
      </div>

      {/* Backgrounds */}
      <div className="space-y-3">
         <label className="text-xs font-semibold text-slate-500 ml-1">Фон слайда</label>
         
         {/* Gradients */}
          <div className="flex flex-wrap gap-2 mt-2">
            {GRADIENT_PRESETS.map((g, i) => (
               <button 
                 key={i}
                 className="w-8 h-8 rounded-full border border-black/5 hover:scale-110 transition-transform shadow-sm"
                 style={{ background: g.value }}
                 onClick={() => updateSlideStyle({ backgroundType: 'gradient', backgroundValue: g.value })}
                 title={g.name}
               />
            ))}
          </div>

          <button onClick={handleApplyBgToAll} className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 underline">
             Применить этот фон ко всем слайдам
          </button>
          
          {/* Restore hidden file input here for Mockup access */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
            multiple
         />
      </div>

      {/* Neon Glow Toggle */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-4">
         <div className="flex items-center gap-2">
            <Zap size={16} className="text-indigo-500" />
            <label className="text-xs font-bold text-slate-700">Неоновое свечение (Заголовок)</label>
         </div>
         <button 
           onClick={() => updateGlobalStyle({ titleGlow: !currentStyle.titleGlow })}
           className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${currentStyle.titleGlow ? 'bg-indigo-500' : 'bg-slate-300'}`}
         >
           <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${currentStyle.titleGlow ? 'translate-x-5' : 'translate-x-0'}`} />
         </button>
      </div>

    </div>
  );

  const renderLibrary = () => (
     <div className="space-y-6">
       <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
         <Library size={16} className="text-pink-500" />
         Мои карусели
       </div>
       
       {savedCarousels.length === 0 ? (
         <div className="text-center py-10 text-slate-400 text-sm">
            Нет сохраненных каруселей
         </div>
       ) : (
         <div className="space-y-3">
            {savedCarousels.map(item => (
               <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleLoadFromLibrary(item)}>
                  <div className="flex justify-between items-start">
                     <div>
                        <div className="font-bold text-sm text-slate-800 mb-1">{item.topic}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                           <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                           <span>•</span>
                           <span>{item.slides.length} слайдов</span>
                        </div>
                     </div>
                     <button onClick={(e) => handleDeleteFromLibrary(item.id, e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} />
                     </button>
                  </div>
               </div>
            ))}
         </div>
       )}
     </div>
  );

  // Main Render
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      
      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-3 pb-safe">
         <button onClick={() => setActiveMobileTab('generator')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'generator' ? 'text-purple-600' : 'text-slate-400'}`}>
            <Sparkles size={20} />
            <span className="text-[10px] font-medium">Создать</span>
         </button>
         <button onClick={() => setActiveMobileTab('design')} className={`flex flex-col items-center gap-1 ${activeMobileTab === 'design' ? 'text-purple-600' : 'text-slate-400'}`}>
            <Palette size={20} />
            <span className="text-[10px] font-medium">Стиль</span>
         </button>
         <button onClick={() => { setActiveMobileTab(null); setMobileViewMode('visual'); }} className={`flex flex-col items-center gap-1 ${activeMobileTab === null ? 'text-purple-600' : 'text-slate-400'}`}>
            <Eye size={20} />
            <span className="text-[10px] font-medium">Просмотр</span>
         </button>
      </div>

      <div className="max-w-[1600px] mx-auto min-h-screen flex">
         
         {/* LEFT SIDEBAR (Desktop) */}
         <div className="hidden lg:flex w-[400px] flex-col border-r border-slate-200 bg-white h-screen sticky top-0">
            <div className="p-6 border-b border-slate-100">
               <div className="flex items-center gap-2 font-black text-2xl tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  <Layers size={28} className="text-purple-600" />
                  CarouselKit
               </div>
            </div>
            
            <div className="flex border-b border-slate-100">
               <button 
                 onClick={() => setActiveSidebarTab('editor')} 
                 className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSidebarTab === 'editor' ? 'border-purple-600 text-purple-900 bg-purple-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                 Редактор
               </button>
               <button 
                 onClick={() => setActiveSidebarTab('library')} 
                 className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSidebarTab === 'library' ? 'border-purple-600 text-purple-900 bg-purple-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                 Библиотека
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
               {activeSidebarTab === 'editor' ? (
                  <div className="space-y-10">
                     {renderGeneratorControls()}
                     <hr className="border-slate-100" />
                     {renderDesignControls()}
                  </div>
               ) : (
                  renderLibrary()
               )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
               <button onClick={handleExport} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                  <Download size={18} />
                  Экспорт в PNG
               </button>
            </div>
         </div>

         {/* RIGHT PREVIEW AREA */}
         <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC] relative">
            
            {/* Toolbar */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-40 pointer-events-none">
               <div className="pointer-events-auto bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-1.5 flex gap-1">
                  <button onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))} disabled={activeSlideIndex === 0} className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30">
                     <ChevronLeft size={20} />
                  </button>
                  <div className="px-3 flex items-center font-mono text-sm font-medium">
                     {activeSlideIndex + 1} / {slides.length}
                  </div>
                  <button onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))} disabled={activeSlideIndex === slides.length - 1} className="p-2 hover:bg-slate-100 rounded-md disabled:opacity-30">
                     <ChevronRight size={20} />
                  </button>
               </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 lg:p-10 overflow-hidden relative" 
                 onTouchStart={onTouchStart} 
                 onTouchMove={onTouchMove} 
                 onTouchEnd={onTouchEnd}
            >
               {/* Export Container (Hidden) */}
               <div ref={exportRef} className="fixed left-[-9999px] top-0 flex gap-0 w-[360px] pointer-events-none opacity-0">
                  {slides.map(slide => (
                     <SlideCard 
                       key={slide.number}
                       data={slide}
                       theme={config.theme}
                       totalSlides={slides.length}
                       username={username}
                       onSlideChange={() => {}}
                       readOnly={true}
                       customStyle={slideStyles[slide.number]}
                       className="w-[360px] h-[450px]" // Fixed export size
                     />
                  ))}
               </div>

               <div className="scale-[0.85] sm:scale-90 lg:scale-100 transition-transform duration-300">
                  <PhoneFrame username={username} isDark={config.theme === Theme.DARK_MODERN || config.theme === Theme.AURORA_GREEN || config.theme === Theme.BOLD_NEON}>
                     {renderCurrentSlide(false)}
                  </PhoneFrame>
               </div>
            </div>
         </div>
      
         {/* Mobile Drawer/Modal for Controls */}
         {(activeMobileTab === 'generator' || activeMobileTab === 'design') && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setActiveMobileTab(null)}>
               <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 pb-24 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                  {activeMobileTab === 'generator' && renderGeneratorControls()}
                  {activeMobileTab === 'design' && renderDesignControls()}
               </div>
            </div>
         )}

      </div>
    </div>
  );
};

export default App;