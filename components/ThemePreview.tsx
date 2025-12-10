import React from 'react';
import { SlideCard } from './SlideCard';
import { Theme, SlideData } from '../types';

const DUMMY_DATA: SlideData = {
  number: 1,
  title: "Заголовок",
  content: "Пример текста для предпросмотра стиля.",
  highlight: "Акцент"
};

interface ThemePreviewProps {
  theme: Theme;
  isSelected: boolean;
  onClick: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${
        isSelected ? 'border-purple-600 shadow-xl ring-2 ring-purple-600 ring-offset-2' : 'border-transparent shadow-md'
      }`}
    >
      <div className="w-full aspect-[4/5] bg-gray-100 relative overflow-hidden">
        {/* Scale container: render at 4x size and scale down by 0.25 to simulate high-res thumbnail */}
        <div className="absolute inset-0 w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none select-none">
          <SlideCard 
            data={DUMMY_DATA} 
            theme={theme} 
            totalSlides={5} 
            username="@preview" 
            onSlideChange={() => {}} 
            readOnly={true} 
            // Ensure background covers the preview area
            className="h-full w-full"
          />
        </div>
        
        {/* Overlay for unselected state */}
        {!isSelected && (
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
        )}
      </div>
      
      <div className={`absolute bottom-0 inset-x-0 p-2 text-center text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-colors ${
        isSelected ? 'bg-purple-600/90 text-white' : 'bg-white/80 text-slate-700 group-hover:bg-white/95'
      }`}>
        {theme.replace('_', ' ')}
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      )}
    </div>
  );
};
