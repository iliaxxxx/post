
export enum Theme {
  MINIMAL_LIGHT = 'minimal_light',
  MINIMAL_DARK = 'minimal_dark',
  RETRO_PAPER = 'retro_paper',
  BOLD_NEON = 'bold_neon',
  DARK_MODERN = 'dark_modern',
  AURORA_GREEN = 'aurora_green',
}

export enum Tone {
  EXPERT = 'expert',
  PROVOCATIVE = 'provocative',
  VIRAL = 'viral',
  EMPATHETIC = 'empathetic',
  FUNNY = 'funny',
}

export interface SlideData {
  number: number;
  title: string;
  content: string;
  highlight?: string;
  cta?: string;
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
  titleFontSize?: number;
  textColor: string;
  titleColor: string;
  titleGlow?: boolean;
  textAlign: TextAlign;
  fontFamily?: string;
  titleFontFamily?: string;
  bodyFontFamily?: string;
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundValue: string;
  overlayOpacity: number;
}

export const DEFAULT_STYLE: SlideStyle = {
  fontSize: 'medium',
  titleFontSize: 28, // Even more neat default size
  textColor: '',
  titleColor: '',
  titleGlow: false,
  textAlign: 'center',
  backgroundType: 'solid',
  backgroundValue: '',
  overlayOpacity: 0.2,
};

export interface SavedCarousel {
  id: string;
  timestamp: number;
  topic: string;
  slides: SlideData[];
  styles: Record<number, SlideStyle>;
  username: string;
  config: CarouselConfig;
}
