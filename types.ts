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