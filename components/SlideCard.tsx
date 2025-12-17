import React, { useState, useEffect, useRef } from 'react';
import { SlideData, Theme, SlideStyle, TextSize, TextAlign } from '../types';
import { ImagePlus, RefreshCw, Zap, Trash2, Wand2 } from 'lucide-react';

interface SlideCardProps {
  data: SlideData;
  theme: Theme;
  totalSlides: number;
  globalBackground?: string | null;
  customBackground?: string | null;
  username: string;
  onSlideChange: (field: keyof SlideData, value: string) => void;
  onUsernameChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  // New props for style overrides
  customStyle?: SlideStyle;
  // Actions
  onRegenerate?: () => void;
  onUploadBg?: () => void;
  onGenerateBg?: () => void;
  onDelete?: () => void;
  isRegenerating?: boolean;
  isGeneratingBg?: boolean;
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
  
  // Arrow handling for Aurora theme
  processed = processed.replace(/->/g, '→');

  return processed;
};

// --- HELPER FOR BACKGROUND ---
const getBackgroundConfig = (bgImage: string | null | undefined, overrides: any, isDarkTheme: boolean): React.CSSProperties => {
    const style: React.CSSProperties = {
        backgroundColor: isDarkTheme ? '#18181b' : '#ffffff',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        textAlign: overrides.textAlign || undefined,
        color: overrides.color,
    };

    if (bgImage) {
        if (bgImage.startsWith('http') || bgImage.startsWith('data:image')) {
            style.backgroundImage = `url(${bgImage})`;
        } else if (bgImage.includes('gradient') || bgImage.includes('url(')) {
            style.backgroundImage = bgImage;
        } else {
            style.backgroundColor = bgImage;
            style.backgroundImage = 'none';
        }
    }

    return style;
};

// --- HELPER FOR GLOW ---
const getGlowStyle = (enabled?: boolean, color?: string, isDark?: boolean) => {
  if (!enabled) return {};
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
  styleOverride,
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

  // For the unified card, we default isDark=true for glow calculation because the template is dark-based.
  const finalStyle = {
    ...styleOverride,
    ...(glowEnabled ? getGlowStyle(true, glowColor, true) : {})
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
  
  const editorBg = customStyle?.backgroundType === 'image' || customStyle?.backgroundType === 'gradient' || customStyle?.backgroundType === 'solid' 
    ? customStyle.backgroundValue 
    : undefined;

  const finalBg = editorBg || customBackground || globalBackground;

  const commonProps = {
    ...props,
    bgImage: finalBg
  };

  // UNIFIED CARD RENDER
  // We use the robust DarkModernCard structure as the base for the single template.
  return (
    <div className={`group relative h-full w-full ${className}`}>
      <div className="w-full h-full">
         <UnifiedCard {...commonProps} />
      </div>
      
      {!readOnly && (
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
           {onRegenerate && (
             <button onClick={(e) => { e.stopPropagation(); onRegenerate(); }} className="w-9 h-9 bg-white/90 backdrop-blur text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-purple-600 hover:scale-110 transition-all border border-slate-100" title="Перегенерировать">
               <RefreshCw size={16} />
             </button>
           )}
           {onUploadBg && (
             <button onClick={(e) => { e.stopPropagation(); onUploadBg(); }} className="w-9 h-9 bg-white/90 backdrop-blur text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-purple-600 hover:scale-110 transition-all border border-slate-100" title="Загрузить фото">
               <ImagePlus size={16} />
             </button>
           )}
           {onGenerateBg && (
             <button onClick={(e) => { e.stopPropagation(); onGenerateBg(); }} className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border border-transparent" title="Сгенерировать AI">
               <Wand2 size={16} />
             </button>
           )}
        </div>
      )}

      {props.isRegenerating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-[inherit]">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {props.isGeneratingBg && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[inherit] text-white">
          <Wand2 className="w-8 h-8 text-purple-400 animate-pulse mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider">Создаю фото...</span>
        </div>
      )}
    </div>
  );
};

// --- UTILS ---
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

const UnifiedCard: React.FC<any> = ({ data, theme, bgImage, username, onSlideChange, onUsernameChange, readOnly, customStyle }) => {
  const overrides = getOverrides(customStyle);
  const titleSize = (customStyle && customStyle.fontSize) ? getSizeClass(customStyle.fontSize, 'title') : 'text-2xl sm:text-3xl';
  const contentSize = (customStyle && customStyle.fontSize) ? getSizeClass(customStyle.fontSize, 'content') : 'text-sm sm:text-base';
  
  // Default to Dark style if no overrides, but allow light overrides if set
  const isDarkBase = true;
  const bgConfig = getBackgroundConfig(bgImage, overrides, isDarkBase);
  
  const overlayOpacity = overrides.overlayOpacity !== undefined ? overrides.overlayOpacity : (bgImage ? 0.4 : 0);

  return (
    <div 
      className="w-full h-full text-white flex flex-col p-6 sm:p-8 relative overflow-hidden bg-zinc-900" 
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
        <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
          <EditableText 
            tagName="h2" 
            className={`font-['Inter'] font-bold leading-[1.2] tracking-tight uppercase ${titleSize}`} 
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
        
        {/* FOOTER - ONLY USERNAME CENTERED - NOW EDITABLE */}
        <div className="mt-auto pt-4 pb-2 flex justify-center items-center w-full" style={{ color: overrides.color || 'inherit' }}>
           <EditableText 
             tagName="div"
             className="text-[10px] sm:text-[11px] uppercase tracking-widest font-medium opacity-60 text-center"
             value={username}
             onChange={(val) => onUsernameChange && onUsernameChange(val)}
             readOnly={readOnly}
             theme={theme}
             styleOverride={{ color: overrides.color }}
          />
        </div>
      </div>
    </div>
  );
};