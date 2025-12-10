import React, { useState, useEffect, useRef } from 'react';
import { SlideData, Theme } from '../types';
import { Heart, Send, Bookmark, ImagePlus, RefreshCw, Zap, Trash2, ArrowLeft, ArrowRight, Highlighter } from 'lucide-react';

interface SlideCardProps {
  data: SlideData;
  theme: Theme;
  totalSlides: number;
  globalBackground?: string | null;
  customBackground?: string | null;
  onUploadBg: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  username: string;
  onSlideChange: (field: keyof SlideData, value: string) => void;
  readOnly?: boolean;
  onDelete?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  className?: string; // Added to allow sizing overrides
}

// Helper to wrap numbers and percentages in a blue span for Dark Modern theme
// Also handles typography (Russian chevrons)
const applyHighlights = (text: string, theme: Theme) => {
  let processed = text;
  
  // 0. Typography: Convert straight quotes to chevrons (Russian style) for Dark Modern
  if (theme === Theme.DARK_MODERN) {
    processed = processed.replace(/(^|[\s\(\[])"/g, '$1«'); 
    processed = processed.replace(/"/g, '»'); 
    processed = processed.replace(/(^|[\s\(\[])[“„]/g, '$1«'); 
    processed = processed.replace(/[”]/g, '»');
  }

  // 1. Manual highlights using *asterisks*
  processed = processed.replace(/\*([^*]+)\*/g, '<span class="text-[#5A9CFF] font-bold">$1</span>');
  
  // 2. Manual highlights using {r}text{/r}
  processed = processed.replace(/\{r\}(.+?)\{\/r\}/g, '<span class="text-[#FF5A5A] font-bold">$1</span>');

  // 3. Manual highlights using {g}text{/g}
  processed = processed.replace(/\{g\}(.+?)\{\/g\}/g, '<span class="text-[#4ADE80] font-bold">$1</span>');

  // 4. Auto-highlight numbers
  if (theme === Theme.DARK_MODERN) {
      processed = processed.replace(/(\b\d+(?:[-–][а-яА-Яa-zA-Z]+)?(?:[.,]\d+)?\s*(?:%|x|k|млн|тыс|г\.?|год|лет)?\b)/gi, (match) => {
          if (processed.includes(`>${match}<`)) return match; 
          return `<span class="text-[#5A9CFF]">${match}</span>`;
      });
  }

  return processed;
};

// --- EDITABLE COMPONENT ---
const EditableText = ({ 
  value, 
  onChange, 
  className = '', 
  tagName = 'div',
  placeholder = 'Нажмите, чтобы изменить',
  readOnly = false,
  theme,
  autoHighlight = false
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string;
  tagName?: string;
  placeholder?: string;
  readOnly?: boolean;
  theme: Theme;
  autoHighlight?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  // --- FLOATING TOOLBAR LOGIC ---
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (readOnly || isEditing) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setShowToolbar(false);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (containerRef.current && containerRef.current.contains(range.commonAncestorContainer)) {
        setShowToolbar(true);
        setToolbarPos({
          top: rect.top - 40,
          left: rect.left + (rect.width / 2) - 40
        });
      } else {
        setShowToolbar(false);
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [readOnly, isEditing]);

  const applyFormatting = (wrapper: string) => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString();
    const fullText = value;
    let prefix = '*'; let suffix = '*';
    if (wrapper === 'red') { prefix = '{r}'; suffix = '{/r}'; }
    if (wrapper === 'green') { prefix = '{g}'; suffix = '{/g}'; }
    const newValue = fullText.replace(text, `${prefix}${text}${suffix}`);
    onChange(newValue);
    selection.removeAllRanges();
    setShowToolbar(false);
  };

  if (isEditing && !readOnly) {
    return (
      <textarea
        ref={textareaRef}
        className={`${className} w-full bg-transparent outline-none border-b-2 border-indigo-500 resize-none overflow-hidden`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  const htmlContent = applyHighlights(value, theme);

  return (
    <>
      {showToolbar && (
        <div 
          className="fixed z-50 flex gap-1 bg-zinc-900 text-white p-1 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button onClick={() => applyFormatting('blue')} className="w-6 h-6 rounded bg-[#5A9CFF]" title="Blue" />
          <button onClick={() => applyFormatting('red')} className="w-6 h-6 rounded bg-[#FF5A5A]" title="Red" />
          <button onClick={() => applyFormatting('green')} className="w-6 h-6 rounded bg-[#4ADE80]" title="Green" />
        </div>
      )}
      {React.createElement(tagName, {
        ref: containerRef,
        className: `${className} cursor-text hover:opacity-80 transition-opacity whitespace-pre-wrap`,
        onClick: () => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) setIsEditing(true);
        },
        dangerouslySetInnerHTML: { __html: htmlContent || `<span class="opacity-30">${placeholder}</span>` }
      })}
    </>
  );
};

export const SlideCard: React.FC<SlideCardProps> = ({ 
  data, theme, totalSlides, globalBackground, customBackground, onUploadBg, onRegenerate, isRegenerating, username, onSlideChange, readOnly = false, onDelete, onMoveLeft, onMoveRight, className = '' 
}) => {
  const isFirst = data.number === 1;
  const isLast = data.number === totalSlides;
  const bgImage = customBackground || globalBackground;

  const commonProps = {
    data, theme, totalSlides, isFirst, isLast, bgImage, username, onSlideChange, readOnly
  };

  const renderCard = () => {
    switch (theme) {
      case Theme.RETRO_PAPER: return <RetroPaperCard {...commonProps} />;
      case Theme.BOLD_NEON: return <BoldNeonCard {...commonProps} />;
      case Theme.DARK_MODERN: return <DarkModernCard {...commonProps} />;
      case Theme.MINIMAL_DARK: return <MinimalCard {...commonProps} isDark={true} />;
      case Theme.MINIMAL_LIGHT: default: return <MinimalCard {...commonProps} isDark={false} />;
    }
  };

  return (
    <div className={`group relative h-full w-full ${className}`}>
      <div className="w-full h-full">
        {renderCard()}
      </div>

      {isRegenerating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center rounded-[inherit]">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {!readOnly && !isRegenerating && (
        <>
          <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onRegenerate(); }} className="p-2 bg-white/90 text-zinc-800 rounded-full shadow-lg hover:bg-white hover:scale-110 active:scale-95 border border-zinc-200" title="Перегенерировать">
              <RefreshCw size={18} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onUploadBg(); }} className="p-2 bg-white/90 text-zinc-800 rounded-full shadow-lg hover:bg-white hover:scale-110 active:scale-95 border border-zinc-200" title="Фон">
              <ImagePlus size={18} />
            </button>
            {onDelete && (
               <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 bg-white/90 text-red-600 rounded-full shadow-lg hover:bg-red-50 hover:scale-110 active:scale-95 border border-zinc-200" title="Удалить">
               <Trash2 size={18} />
             </button>
            )}
          </div>
          <div className="absolute bottom-4 left-0 right-0 z-50 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {onMoveLeft && <button onClick={(e) => { e.stopPropagation(); onMoveLeft(); }} className="pointer-events-auto p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"><ArrowLeft size={16} /></button>}
             {onMoveRight && <button onClick={(e) => { e.stopPropagation(); onMoveRight(); }} className="pointer-events-auto p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"><ArrowRight size={16} /></button>}
          </div>
        </>
      )}
    </div>
  );
};

// --- STYLE COMPONENTS (Pass w-full h-full to containers) ---

const DarkModernCard: React.FC<any> = ({ data, theme, totalSlides, isFirst, isLast, bgImage, username, onSlideChange, readOnly }) => {
  return (
    <div 
      className="w-full h-full bg-[#202020] text-white flex flex-col p-8 relative overflow-hidden shadow-2xl"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {!bgImage && (
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
        }}></div>
      )}
      {bgImage && <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-center mb-4">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium opacity-80">{username}</span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-4">
          <EditableText tagName="h2" className="font-['Inter'] font-bold text-[20px] leading-[1.2] tracking-tight" value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} autoHighlight={true} />
          <div className="font-['Inter'] text-[13px] text-zinc-300 leading-relaxed">
            <EditableText tagName="div" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} autoHighlight={true} />
          </div>
        </div>
        <div className="mt-auto pt-4 pb-4 flex items-end justify-between text-zinc-400">
           <div className="pb-0.5"><Heart className="w-6 h-6 text-red-600 fill-red-600" strokeWidth={0} /></div>
           <div className="text-[9px] text-zinc-600 text-center leading-tight max-w-[120px] select-none font-medium mb-1">делись и сохрани, чтобы не потерять</div>
           <div className="flex items-center gap-3 pb-0.5">
             <Send className="w-5 h-5 -rotate-12 text-zinc-400" strokeWidth={1.5} style={{ marginTop: '-2px' }} />
             <Bookmark className="w-6 h-6 text-[#FFC400] fill-[#FFC400]" strokeWidth={0} />
           </div>
        </div>
      </div>
    </div>
  );
};

const RetroPaperCard: React.FC<any> = ({ data, theme, totalSlides, isFirst, isLast, bgImage, username, onSlideChange, readOnly }) => {
  return (
    <div 
      className="w-full h-full bg-[#F5F5F0] flex flex-col relative overflow-hidden shadow-xl"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M5 0h1v1H5V0zM0 5h1v1H0V5z'/%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
      <div className="absolute inset-4 border-2 border-black flex flex-col pointer-events-none z-20"></div>
      <div className="flex-1 flex flex-col p-8 z-10 h-full">
        <div className="flex justify-between items-center mb-6">
           <div className="font-['Courier_Prime'] font-bold text-xs">NO. {data.number}</div>
           <div className="font-['Courier_Prime'] font-bold text-xs uppercase text-zinc-600">{username.replace('@', '')}</div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <EditableText tagName="h2" className="font-['Anton'] uppercase text-5xl leading-[0.9] text-black tracking-tight mb-8 mix-blend-multiply break-words w-full" value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} />
          <EditableText tagName="p" className="font-['Courier_Prime'] text-sm leading-relaxed text-zinc-800 font-bold max-w-[90%]" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} />
          {data.highlight && (
            <div className="mt-6 bg-black text-white px-3 py-1 -rotate-1 shadow-sm">
              <EditableText tagName="span" className="font-['Courier_Prime'] font-bold text-xs uppercase" value={data.highlight} onChange={(val: string) => onSlideChange('highlight', val)} readOnly={readOnly} theme={theme} />
            </div>
          )}
        </div>
        <div className="mt-auto pt-6 flex justify-between items-center">
           {isFirst && <div className="text-[10px] font-mono">SWIPE -></div>}
           {isLast && data.cta ? (
              <div className={`w-full bg-black text-white text-center font-['Anton'] uppercase text-lg transition-colors ${!readOnly ? 'cursor-pointer pointer-events-auto hover:bg-zinc-800' : ''}`}>
                <EditableText tagName="div" className="py-2" value={data.cta} onChange={(val: string) => onSlideChange('cta', val)} readOnly={readOnly} theme={theme} />
              </div>
           ) : ( !isFirst && <div className="text-[10px] font-mono opacity-50">{data.number} / {totalSlides}</div> )}
        </div>
      </div>
    </div>
  );
};

const BoldNeonCard: React.FC<any> = ({ data, theme, totalSlides, isFirst, isLast, bgImage, username, onSlideChange, readOnly }) => {
  return (
    <div 
      className="w-full h-full bg-black text-white flex flex-col p-8 relative overflow-hidden shadow-2xl shadow-indigo-500/20"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {!bgImage && (
        <>
          <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-indigo-600 blur-[80px] opacity-40 rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-20%] w-[200px] h-[200px] bg-fuchsia-600 blur-[80px] opacity-30 rounded-full pointer-events-none"></div>
        </>
      )}
      {bgImage && <div className="absolute inset-0 bg-black/70"></div>}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div className="flex gap-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i + 1 === data.number ? 'w-6 bg-white' : 'w-2 bg-zinc-700'}`} />
          ))}
        </div>
        <Zap size={16} className="text-yellow-400 fill-yellow-400" />
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <EditableText tagName="h2" className="font-['Outfit'] font-black text-4xl leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400" value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} />
        <EditableText tagName="p" className="font-['Outfit'] font-light text-lg leading-snug text-zinc-300" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} />
        {data.highlight && (
          <div className="mt-6 flex items-center gap-3">
             <div className="h-px bg-zinc-700 flex-1"></div>
             <div className="font-['Outfit'] font-bold text-sm text-indigo-400 uppercase tracking-widest">
                <EditableText tagName="span" value={data.highlight} onChange={(val: string) => onSlideChange('highlight', val)} readOnly={readOnly} theme={theme} />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MinimalCard: React.FC<any> = ({ data, theme, totalSlides, isFirst, isLast, isDark, bgImage, username, onSlideChange, readOnly }) => {
  return (
    <div 
      className={`w-full h-full flex flex-col justify-between p-8 transition-all duration-300 select-none relative overflow-hidden ${isDark ? 'bg-zinc-900 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]' : 'bg-white text-zinc-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]'}`}
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
       {bgImage && <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-white/80'} z-0`}></div>}
      <div className="relative z-10 flex justify-between items-center opacity-50">
        <div className="flex items-center gap-1"><span className="text-xs font-semibold uppercase tracking-widest font-['Inter']">AI Carousel</span></div>
        <span className="text-xs font-mono">{data.number} / {totalSlides}</span>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <EditableText tagName="h2" className={`font-bold leading-tight tracking-tight font-['Inter'] ${isFirst ? 'text-4xl' : 'text-2xl'} ${isDark ? 'text-white' : 'text-zinc-900'}`} value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} />
        {data.highlight && !isLast && (
          <div className="mt-2"><span className={`inline-block px-3 py-1 mt-4 rounded-lg text-sm font-bold uppercase tracking-wider ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}><EditableText tagName="span" value={data.highlight} onChange={(val: string) => onSlideChange('highlight', val)} readOnly={readOnly} theme={theme} /></span></div>
        )}
        <div className={`text-lg font-medium leading-relaxed mt-4 font-['Inter'] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
           <EditableText tagName="p" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} />
        </div>
        {isLast && data.cta && (
           <div className={`mt-8 py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors ${!readOnly ? 'cursor-pointer' : ''} ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-zinc-800'}`}>
             <EditableText tagName="span" value={data.cta} onChange={(val: string) => onSlideChange('cta', val)} readOnly={readOnly} theme={theme} />
           </div>
        )}
      </div>
      <div className="relative z-10 flex justify-between items-end mt-4 pt-4 border-t border-dashed border-opacity-20" style={{ borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}>
        <div className="flex items-center gap-2">
           <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}><Highlighter size={14} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} /></div>
           <span className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{username}</span>
        </div>
      </div>
    </div>
  );
};