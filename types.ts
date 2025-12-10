
export enum Theme {
  MINIMAL_LIGHT = 'minimal_light',
  MINIMAL_DARK = 'minimal_dark',
  RETRO_PAPER = 'retro_paper',
  BOLD_NEON = 'bold_neon',
  DARK_MODERN = 'dark_modern',
}

export enum Tone {
  EXPERT = 'expert', // Экспертный, спокойный
  PROVOCATIVE = 'provocative', // Дерзкий, с вызовом
  VIRAL = 'viral', // Короткий, хайповый, для охватов
  EMPATHETIC = 'empathetic', // Мягкий, поддерживающий
  FUNNY = 'funny', // С юмором и иронией
}

export interface SlideData {
  number: number;
  title: string;
  content: string;
  highlight?: string; // A key phrase or stat to emphasize
  cta?: string; // Call to action (usually for last slide)
}

export interface CarouselConfig {
  topic: string;
  slideCount: number;
  theme: Theme;
  tone: Tone;
}

export type TextAlign = 'left' | 'center' | 'right';
export type TextSize = 'small' | 'medium' | 'large' | 'extra';

export interface SlideStyle {
  fontSize: TextSize;
  textColor: string; // Body text color
  titleColor: string; // Header text color
  textAlign: TextAlign;
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundValue: string; // Color code, gradient string, or image URL
  overlayOpacity: number; // 0-1
}

export const DEFAULT_STYLE: SlideStyle = {
  fontSize: 'medium',
  textColor: '#ffffff',
  titleColor: '#ffffff',
  textAlign: 'center',
  backgroundType: 'solid',
  backgroundValue: '', // Empty means use Theme default
  overlayOpacity: 0
};

export type EditorTab = 'text' | 'image' | 'background';
