import React, { useState, useEffect, useRef } from 'react';
import { SlideData, Theme, SlideStyle, TextSize, TextAlign } from '../types';
import { Heart, Send, Bookmark, ImagePlus, RefreshCw, Zap, Trash2, ArrowLeft, ArrowRight, Highlighter, Wand2 } from 'lucide-react';

interface SlideCardProps {
  data: SlideData;
  theme: Theme;
  totalSlides: number;
  globalBackground?: string | null;
  customBackground?: string | null;
  username: string;
  onSlideChange: (field: keyof SlideData, value: string) => void;
  readOnly?: boolean;
  className?: string;
  // New props for style overrides
  customStyle?: SlideStyle;
  // Actions
  onRegenerate?: () => void;
  onUploadBg?: () => void;
  onGenerateBg?: () => void; // New prop for AI image gen
  onDelete?: () => void;
  isRegenerating?: boolean;
}

// Helper: Convert size enum to tailwind class
// UPDATED: Now returns responsive classes (larger on mobile for readability)
const getSizeClass = (size: TextSize, element: 'title' | 'content'): string => {
  if (element === 'title') {
    switch (size) {
      case 'small': return 'text-xl sm:text-xl';
      case 'medium': return 'text-2xl sm:text-3xl'; // Increased mobile size
      case 'large': return 'text-3xl sm:text-4xl';
      case 'extra': return 'text-4xl sm:text-5xl';
      default: return 'text-2xl sm:text-3xl';
    }
  } else {
    switch (size) {
      case 'small': return 'text-xs sm:text-xs';
      case 'medium': return 'text-sm sm:text-base'; // Increased mobile size
      case 'large': return 'text-base sm:text-lg';
      case 'extra': return 'text-lg sm:text-xl';
      default: return 'text-sm sm:text-base';
    }
  }
};

const applyHighlights = (text: string, theme: Theme) => {
  let processed = text;
  
  if (theme === Theme.DARK_MODERN) {
    processed = processed.replace(/(^|[\s\(\[])"/g, '$1«'); 
    processed = processed.replace(/"/g, '»'); 
    processed = processed.replace(/(^|[\s\(\[])[“„]/g, '$1«'); 
    processed = processed.replace(/[”]/g, '»');
  }

  processed = processed.replace(/\*([^*]+)\*/g, '<span class="text-[#5A9CFF] font-bold">$1</span>');
  processed = processed.replace(/\{r\}(.+?)\{\/r\}/g, '<span class="text-[#FF5A5A] font-bold">$1</span>');
  processed = processed.replace(/\{g\}(.+?)\{\/g\}/g, '<span class="text-[#4ADE80] font-bold">$1</span>');

  return processed;
};

// --- HELPER FOR BACKGROUND ---
const getBackgroundConfig = (bgImage: string | null | undefined, overrides: any) => {
    let backgroundImage = null;
    let backgroundColor = undefined;
    let background = undefined;

    if (bgImage) {
        if (bgImage.startsWith('http') || bgImage.startsWith('data:image')) {
            backgroundImage = `url(${bgImage})`;
        } else if (bgImage.includes('url(')) {
            backgroundImage = bgImage;
        } else {
            background = bgImage; // Hex or Gradient
        }
    }

    return {
        backgroundImage,
        backgroundColor,
        background,
        textAlign: overrides.textAlign || undefined,
        color: overrides.color,
    };
};

// --- HELPER FOR GLOW ---
const getGlowStyle = (enabled?: boolean, color?: string, isDark?: boolean) => {
  if (!enabled) return {};
  
  // Try to parse color or default to white/theme color
  const glowColor = color && color !== '' ? color : (isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)');
  
  return {
    textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 40px ${glowColor}`
  };
};

// --- EDITABLE COMPONENT ---
const EditableText = ({ 
  value, 
  onChange, 
  className = '', 
  tagName = 'div',
  placeholder = '...',
  readOnly = false,
  theme,
  autoHighlight = false,
  styleOverride, // New prop to pass inline styles
  glowEnabled = false,
  glowColor = ''
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string;
  tagName?: string;
  placeholder?: string;
  readOnly?: boolean;
  theme: Theme;
  autoHighlight?: boolean;
  styleOverride?: React.CSSProperties;
  glowEnabled?: boolean;
  glowColor?: string;
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

  const htmlContent = applyHighlights(value, theme);

  // Merge glow style if enabled
  // We assume light glow for dark themes usually, handled by parent, or passed color
  const finalStyle = {
    ...styleOverride,
    ...(glowEnabled ? getGlowStyle(true, glowColor, theme !== Theme.MINIMAL_LIGHT && theme !== Theme.RETRO_PAPER) : {})
  };

  if (isEditing && !readOnly) {
    return (
      <textarea
        ref={textareaRef}
        className={`${className} w-full bg-transparent outline-none border-b border-indigo-500 resize-none overflow-hidden`}
        style={finalStyle}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={handleBlur}
      />
    );
  }

  return React.createElement(tagName, {
    ref: containerRef,
    className: `${className} ${!readOnly ? 'cursor-text hover:opacity-80' : ''} transition-opacity whitespace-pre-wrap break-words`,
    style: finalStyle,
    onClick: () => {
      if (!readOnly) setIsEditing(true);
    },
    dangerouslySetInnerHTML: { __html: htmlContent || `<span class="opacity-30">${placeholder}</span>` }
  });
};

export const SlideCard: React.FC<SlideCardProps> = (props) => {
  const { data, theme, totalSlides, globalBackground, customBackground, readOnly = false, className = '', customStyle, onRegenerate, onUploadBg, onGenerateBg } = props;
  
  // Merge backgrounds: Custom > Global > Theme Default (handled in components)
  // But if customStyle.backgroundValue is present (from Editor), it takes precedence over everything
  const editorBg = customStyle?.backgroundType === 'image' || customStyle?.backgroundType === 'gradient' || customStyle?.backgroundType === 'solid' 
    ? customStyle.backgroundValue 
    : undefined;

  const finalBg = editorBg || customBackground || globalBackground;

  const commonProps = {
    ...props,
    bgImage: finalBg
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
      
      {/* HOVER ACTIONS OVERLAY */}
      {!readOnly && (
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
           {onRegenerate && (
             <button 
               onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
               className="w-9 h-9 bg-white/90 backdrop-blur text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-purple-600 hover:scale-110 transition-all border border-slate-100"
               title="Перегенерировать этот слайд"
             >
               <RefreshCw size={16} />
             </button>
           )}
           {onGenerateBg && (
             <button 
               onClick={(e) => { e.stopPropagation(); onGenerateBg(); }} 
               className="w-9 h-9 bg-white/90 backdrop-blur text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-purple-600 hover:scale-110 transition-all border border-slate-100"
               title="Сгенерировать AI фон"
             >
               <Wand2 size={16} />
             </button>
           )}
           {onUploadBg && (
             <button 
               onClick={(e) => { e.stopPropagation(); onUploadBg(); }} 
               className="w-9 h-9 bg-white/90 backdrop-blur text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-purple-600 hover:scale-110 transition-all border border-slate-100"
               title="Загрузить фото на фон"
             >
               <ImagePlus size={16} />
             </button>
           )}
        </div>
      )}

      {/* Regeneration Spinner Overlay */}
      {props.isRegenerating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-[inherit]">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}
    </div>
  );
};

// --- UTILS FOR STYLE OVERRIDES ---
const getOverrides = (customStyle?: SlideStyle) => {
  if (!customStyle) return {};
  return {
    textAlign: customStyle.textAlign,
    color: customStyle.textColor ? customStyle.textColor : undefined,
    titleColor: customStyle.titleColor ? customStyle.titleColor : undefined,
    overlayOpacity: customStyle.overlayOpacity,
    titleFontFamily: customStyle.titleFontFamily || customStyle.fontFamily,
    bodyFontFamily: customStyle.bodyFontFamily || customStyle.fontFamily,
    titleGlow: customStyle.titleGlow
  };
};

// --- STYLE COMPONENTS ---

const DarkModernCard: React.FC<any> = ({ data, theme, bgImage, username, onSlideChange, readOnly, customStyle }) => {
  const overrides = getOverrides(customStyle);
  const titleSize = customStyle ? getSizeClass(customStyle.fontSize, 'title') : 'text-2xl sm:text-3xl';
  const contentSize = customStyle ? getSizeClass(customStyle.fontSize, 'content') : 'text-sm sm:text-base';
  const bgConfig = getBackgroundConfig(bgImage, overrides);
  
  // Default dark background if no image is present or explicit color set
  if (!bgConfig.backgroundImage && !bgConfig.background) {
      bgConfig.backgroundColor = '#202020';
  }

  const overlayOpacity = overrides.overlayOpacity !== undefined ? overrides.overlayOpacity : (bgImage ? 0.4 : 0);

  return (
    <div 
      className="w-full h-full text-white flex flex-col p-6 sm:p-8 relative overflow-hidden bg-cover bg-center bg-zinc-900" 
      style={{ 
          ...bgConfig,
          fontFamily: overrides.bodyFontFamily 
      }}
    >
      <div className="absolute inset-0 bg-black pointer-events-none z-0" style={{ opacity: overlayOpacity }}></div>

      {/* Noise Texture Overlay - Only show if no background image is uploaded */}
      {!bgImage && (
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none z-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light'
        }}></div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className={`flex ${overrides.textAlign === 'center' ? 'justify-center' : overrides.textAlign === 'right' ? 'justify-end' : 'justify-start'} mb-4`}>
          <span className="text-zinc-500 text-[10px] sm:text-[11px] uppercase tracking-widest font-medium opacity-80">{username}</span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
          <EditableText 
            tagName="h2" 
            className={`font-['Inter'] font-bold leading-[1.2] tracking-tight ${titleSize}`} 
            value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} autoHighlight={true} 
            styleOverride={{ color: overrides.titleColor || overrides.color, fontFamily: overrides.titleFontFamily }}
            glowEnabled={overrides.titleGlow}
            glowColor={overrides.titleColor}
          />
          <div className={`font-['Inter'] leading-relaxed text-zinc-300 ${contentSize}`} style={{ fontFamily: overrides.bodyFontFamily }}>
            <EditableText 
              tagName="div" 
              value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} autoHighlight={true}
              styleOverride={{ color: overrides.color, fontFamily: overrides.bodyFontFamily }}
            />
          </div>
        </div>
        
        {/* FOOTER - ALIGNMENT FIX */}
        <div className="mt-auto pt-4 pb-2 flex items-center justify-between text-zinc-400">
           <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 fill-red-600 shrink-0" strokeWidth={0} />
           
           <div className="text-[9px] sm:text-[10px] text-zinc-600 text-center leading-tight max-w-[140px] select-none font-medium px-2">
             делись и сохрани, чтобы не потерять
           </div>
           
           <div className="flex items-center gap-3 shrink-0">
             <Send className="w-5 h-5 sm:w-6 sm:h-6 -rotate-12 text-zinc-400 hover:text-white transition-colors" strokeWidth={1.5} />
             <Bookmark className="w-6 h-6 sm:w-7 sm:h-7 text-[#FFC400] fill-[#FFC400]" strokeWidth={0} />
           </div>
        </div>
      </div>
    </div>
  );
};

const RetroPaperCard: React.FC<any> = ({ data, theme, isFirst, isLast, totalSlides, bgImage, username, onSlideChange, readOnly, customStyle }) => {
  const overrides = getOverrides(customStyle);
  const titleSize = customStyle ? getSizeClass(customStyle.fontSize, 'title') : 'text-3xl sm:text-5xl';
  const bgConfig = getBackgroundConfig(bgImage, overrides);
  
  if (!bgConfig.backgroundImage && !bgConfig.background) bgConfig.backgroundColor = '#F5F5F0';
  if (!bgConfig.textAlign) bgConfig.textAlign = 'center';

  const overlayOpacity = overrides.overlayOpacity !== undefined ? overrides.overlayOpacity : (bgImage ? 0.2 : 0);

  return (
    <div 
      className="w-full h-full flex flex-col relative overflow-hidden bg-cover bg-center"
      style={{ ...bgConfig, fontFamily: overrides.bodyFontFamily }}
    >
       <div className="absolute inset-0 bg-black pointer-events-none z-0" style={{ opacity: overlayOpacity }}></div>

       {!bgImage && (
         <div className="absolute inset-0 opacity-[0.4] z-0" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M5 0h1v1H5V0zM0 5h1v1H0V5z'/%3E%3C/g%3E%3C/svg%3E")`}}></div>
       )}

      <div className="absolute inset-4 border-2 border-black flex flex-col pointer-events-none z-20"></div>
      <div className="flex-1 flex flex-col p-8 z-10 h-full">
        <div className="flex justify-between items-center mb-6">
           <div className="font-['Courier_Prime'] font-bold text-[10px] sm:text-xs">NO. {data.number}</div>
           <div className="font-['Courier_Prime'] font-bold text-[10px] sm:text-xs uppercase text-zinc-600">{username.replace('@', '')}</div>
        </div>
        <div className={`flex-1 flex flex-col justify-center ${bgConfig.textAlign === 'left' ? 'items-start text-left' : bgConfig.textAlign === 'right' ? 'items-end text-right' : 'items-center text-center'}`}>
          <EditableText 
            tagName="h2" 
            className={`font-['Anton'] uppercase leading-[0.9] text-black tracking-tight mb-4 sm:mb-8 mix-blend-multiply break-words w-full ${titleSize}`} 
            value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} 
            styleOverride={{ color: overrides.titleColor || overrides.color, fontFamily: overrides.titleFontFamily }} 
            glowEnabled={overrides.titleGlow}
            glowColor={overrides.titleColor}
          />
          <EditableText tagName="p" className="font-['Courier_Prime'] text-xs sm:text-sm leading-relaxed text-zinc-800 font-bold max-w-[90%]" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} styleOverride={{ color: overrides.color, fontFamily: overrides.bodyFontFamily }} />
        </div>
        <div className="mt-auto pt-6 flex justify-between items-center">
           {isFirst && <div className="text-[8px] sm:text-[10px] font-mono">SWIPE -></div>}
           {isLast && data.cta ? (
              <div className={`w-full bg-black text-white text-center font-['Anton'] uppercase text-base sm:text-lg transition-colors ${!readOnly ? 'cursor-pointer pointer-events-auto hover:bg-zinc-800' : ''}`}>
                <EditableText tagName="div" className="py-2" value={data.cta} onChange={(val: string) => onSlideChange('cta', val)} readOnly={readOnly} theme={theme} />
              </div>
           ) : ( !isFirst && <div className="text-[8px] sm:text-[10px] font-mono opacity-50">{data.number} / {totalSlides}</div> )}
        </div>
      </div>
    </div>
  );
};

const BoldNeonCard: React.FC<any> = ({ data, theme, totalSlides, bgImage, onSlideChange, readOnly, customStyle }) => {
  const overrides = getOverrides(customStyle);
  const titleSize = customStyle ? getSizeClass(customStyle.fontSize, 'title') : 'text-3xl sm:text-4xl';
  const bgConfig = getBackgroundConfig(bgImage, overrides);

  if (!bgConfig.backgroundImage && !bgConfig.background) bgConfig.backgroundColor = 'black';
  const overlayOpacity = overrides.overlayOpacity !== undefined ? overrides.overlayOpacity : (bgImage ? 0.7 : 0);

  return (
    <div 
      className="w-full h-full text-white flex flex-col p-6 sm:p-8 relative overflow-hidden bg-cover bg-center"
      style={{ ...bgConfig, fontFamily: overrides.bodyFontFamily }}
    >
      <div className="absolute inset-0 bg-black pointer-events-none z-0" style={{ opacity: overlayOpacity }}></div>

      {!bgImage && (
        <>
          <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-indigo-600 blur-[80px] opacity-40 rounded-full pointer-events-none z-0"></div>
          <div className="absolute bottom-[-20%] left-[-20%] w-[200px] h-[200px] bg-fuchsia-600 blur-[80px] opacity-30 rounded-full pointer-events-none z-0"></div>
        </>
      )}
      
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div className="flex gap-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i + 1 === data.number ? 'w-6 bg-white' : 'w-2 bg-zinc-700'}`} />
          ))}
        </div>
        <Zap size={16} className="text-yellow-400 fill-yellow-400" />
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <EditableText 
          tagName="h2" 
          className={`font-['Outfit'] font-black leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 ${titleSize}`} 
          value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} 
          styleOverride={overrides.titleColor ? { color: overrides.titleColor, WebkitTextFillColor: 'initial', backgroundImage: 'none', fontFamily: overrides.titleFontFamily } : overrides.color ? { color: overrides.color, WebkitTextFillColor: 'initial', backgroundImage: 'none', fontFamily: overrides.titleFontFamily } : { fontFamily: overrides.titleFontFamily }}
          glowEnabled={overrides.titleGlow}
          glowColor={overrides.titleColor}
        />
        <EditableText tagName="p" className="font-['Outfit'] font-light text-base sm:text-lg leading-snug text-zinc-300" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} styleOverride={{ color: overrides.color, fontFamily: overrides.bodyFontFamily }} />
      </div>
    </div>
  );
};

const MinimalCard: React.FC<any> = ({ data, theme, isFirst, isLast, totalSlides, isDark, bgImage, username, onSlideChange, readOnly, customStyle }) => {
  const overrides = getOverrides(customStyle);
  const titleSize = customStyle ? getSizeClass(customStyle.fontSize, 'title') : (isFirst ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl');
  const bgConfig = getBackgroundConfig(bgImage, overrides);

  const overlayOpacity = overrides.overlayOpacity !== undefined ? overrides.overlayOpacity : (bgImage ? (isDark ? 0.7 : 0.2) : 0);

  return (
    <div 
      className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 transition-all duration-300 select-none relative overflow-hidden bg-cover bg-center ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}`}
      style={{ ...bgConfig, fontFamily: overrides.bodyFontFamily }}
    >
      <div className="absolute inset-0 bg-black pointer-events-none z-0" style={{ opacity: overlayOpacity }}></div>

      <div className="relative z-10 flex justify-between items-center opacity-50">
        <div className="flex items-center gap-1"><span className="text-xs font-semibold uppercase tracking-widest font-['Inter']">AI Carousel</span></div>
        <span className="text-xs font-mono">{data.number} / {totalSlides}</span>
      </div>
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <EditableText 
          tagName="h2" 
          className={`font-bold leading-tight tracking-tight font-['Inter'] ${isDark ? 'text-white' : 'text-zinc-900'} ${titleSize}`} 
          value={data.title} onChange={(val: string) => onSlideChange('title', val)} readOnly={readOnly} theme={theme} 
          styleOverride={{ color: overrides.titleColor || overrides.color, fontFamily: overrides.titleFontFamily }}
          glowEnabled={overrides.titleGlow}
          glowColor={overrides.titleColor}
        />
        {data.highlight && !isLast && (
          <div className="mt-2"><span className={`inline-block px-3 py-1 mt-2 sm:mt-4 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}><EditableText tagName="span" value={data.highlight} onChange={(val: string) => onSlideChange('highlight', val)} readOnly={readOnly} theme={theme} styleOverride={{ fontFamily: overrides.bodyFontFamily }} /></span></div>
        )}
        <div className={`font-medium leading-relaxed mt-4 font-['Inter'] text-sm sm:text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
           <EditableText tagName="p" value={data.content} onChange={(val: string) => onSlideChange('content', val)} readOnly={readOnly} theme={theme} styleOverride={{ color: overrides.color, fontFamily: overrides.bodyFontFamily }} />
        </div>
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
