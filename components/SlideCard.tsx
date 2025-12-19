
import React, { useState, useEffect, useRef } from 'react';
import { SlideData, Theme, SlideStyle } from '../types';
import { ImagePlus, RefreshCw, Wand2 } from 'lucide-react';

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
  customStyle?: SlideStyle;
  onRegenerate?: () => void;
  onUploadBg?: () => void;
  onGenerateBg?: () => void;
  isRegenerating?: boolean;
  isGeneratingBg?: boolean;
}

const applyHighlights = (text: string, theme: Theme) => {
  let processed = text;
  if (theme === Theme.DARK_MODERN) {
    processed = processed.replace(/(^|[\s\(\[])"/g, '$1«').replace(/"/g, '»');
  }
  processed = processed.replace(/\*([^*]+)\*/g, '<span class="text-indigo-400 font-bold">$1</span>');
  return processed;
};

const getBackgroundConfig = (bgImage: string | null | undefined, overrides: any): React.CSSProperties => {
    const style: React.CSSProperties = {
        backgroundColor: '#18181b',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        textAlign: overrides.textAlign || 'center',
        color: overrides.color,
    };
    if (bgImage) {
        if (bgImage.startsWith('http') || bgImage.startsWith('data:image')) {
            style.backgroundImage = `url(${bgImage})`;
        } else {
            style.backgroundImage = bgImage;
        }
    }
    return style;
};

const EditableText = ({ 
  value, 
  onChange, 
  className = '', 
  tagName = 'div',
  placeholder = '...',
  readOnly = false,
  theme,
  styleOverride,
  glowEnabled = false,
  glowColor = ''
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
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
    if (textareaRef.current) onChange(textareaRef.current.value);
  };

  const finalStyle = {
    ...styleOverride,
    ...(glowEnabled ? { 
        textShadow: `0 0 8px ${glowColor || 'rgba(255,255,255,0.6)'}, 0 0 20px ${glowColor || 'rgba(255,255,255,0.3)'}` 
    } : {})
  };

  if (isEditing && !readOnly) {
    return (
      <textarea
        ref={textareaRef}
        className={`${className} w-full bg-transparent outline-none border-b border-indigo-500 resize-none overflow-hidden text-[inherit] font-[inherit]`}
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
    className: `${className} ${!readOnly ? 'cursor-text hover:opacity-80' : ''} transition-opacity whitespace-pre-wrap break-words`,
    style: finalStyle,
    onClick: () => !readOnly && setIsEditing(true),
    dangerouslySetInnerHTML: { __html: applyHighlights(value, theme) || `<span class="opacity-30">${placeholder}</span>` }
  });
};

export const SlideCard: React.FC<SlideCardProps> = (props) => {
  const { data, customStyle, readOnly, isRegenerating, isGeneratingBg, onRegenerate, onUploadBg, onGenerateBg } = props;
  const finalBg = customStyle?.backgroundValue || props.customBackground || props.globalBackground;

  if (!data) return <div className="h-full w-full bg-zinc-900 animate-pulse rounded-[inherit]" />;

  return (
    <div className={`group relative h-full w-full ${props.className} rounded-[inherit] overflow-hidden`}>
      <UnifiedCard {...props} bgImage={finalBg} />
      
      {!readOnly && (
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
           <button onClick={onRegenerate} className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border border-slate-100"><RefreshCw size={14} /></button>
           <button onClick={onUploadBg} className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border border-slate-100"><ImagePlus size={14} /></button>
           <button onClick={onGenerateBg} className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"><Wand2 size={14} /></button>
        </div>
      )}

      {(isRegenerating || isGeneratingBg) && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white text-center p-4">
          <RefreshCw className="w-8 h-8 animate-spin mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI working...</span>
        </div>
      )}
    </div>
  );
};

const UnifiedCard: React.FC<any> = ({ data, theme, bgImage, username, onSlideChange, onUsernameChange, readOnly, customStyle }) => {
  const isFirstSlide = data.number === 1;
  const overrides = {
    textAlign: customStyle?.textAlign || 'center',
    color: customStyle?.textColor,
    titleColor: customStyle?.titleColor,
    titleFontFamily: customStyle?.titleFontFamily,
    bodyFontFamily: customStyle?.bodyFontFamily,
    titleGlow: customStyle?.titleGlow,
    overlayOpacity: customStyle?.overlayOpacity ?? (bgImage ? 0.4 : 0),
    titleFontSize: customStyle?.titleFontSize || (isFirstSlide ? 32 : 24)
  };

  const bgConfig = getBackgroundConfig(bgImage, overrides);

  return (
    <div 
      className="w-full h-full text-white flex flex-col p-8 relative bg-zinc-900 transition-all duration-300" 
      style={{ ...bgConfig, fontFamily: overrides.bodyFontFamily }}
    >
      <div className="absolute inset-0 bg-black pointer-events-none z-0 transition-opacity duration-300" style={{ opacity: overrides.overlayOpacity }}></div>

      <div className="relative z-10 flex flex-col h-full">
        <div className={`flex-1 flex flex-col justify-center items-center gap-4`}>
          <EditableText 
            tagName="h2" 
            className={`font-bold leading-[1.2] tracking-tight uppercase text-center`} 
            value={data.title} 
            onChange={(val: string) => onSlideChange('title', val)} 
            readOnly={readOnly} 
            theme={theme}
            styleOverride={{ 
                color: overrides.titleColor || overrides.color || 'white', 
                fontFamily: overrides.titleFontFamily, 
                fontSize: `${overrides.titleFontSize}px`,
                width: '100%',
                textAlign: overrides.textAlign
            }}
            glowEnabled={overrides.titleGlow}
            glowColor={overrides.titleColor}
          />
          
          {data.content && (
            <div className="leading-relaxed text-zinc-300 opacity-90 w-full" style={{ fontFamily: overrides.bodyFontFamily, fontSize: '0.95rem' }}>
              <EditableText 
                tagName="div" 
                value={data.content} 
                onChange={(val: string) => onSlideChange('content', val)} 
                readOnly={readOnly} 
                theme={theme}
                styleOverride={{ 
                  color: overrides.color || 'white', 
                  fontFamily: overrides.bodyFontFamily,
                  textAlign: overrides.textAlign
                }}
              />
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-4 flex justify-center items-center w-full">
           <EditableText 
             tagName="div"
             className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-30 text-center"
             value={username}
             onChange={(val: any) => onUsernameChange && onUsernameChange(val)}
             readOnly={readOnly} theme={theme}
             styleOverride={{ color: overrides.color || 'white' }}
          />
        </div>
      </div>
    </div>
  );
};
