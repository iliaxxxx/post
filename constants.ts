// UI Constants and Configuration

export const COLORS = [
  '#FFFFFF',
  '#000000',
  '#F87171',
  '#FBBF24',
  '#34D399',
  '#60A5FA',
  '#818CF8',
  '#A78BFA',
  '#F472B6',
  '#FB7185'
];

export const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
  'linear-gradient(to right, #434343 0%, black 100%)',
  'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
  'linear-gradient(to top, #a8edea 0%, #fed6e3 100%)',
];

export const FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif", label: "Modern Sans" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", label: "Geometric" },
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", label: "Display Bold" },
  { name: 'Playfair Display', family: "'Playfair Display', serif", label: "Elegant Serif" },
  { name: 'Merriweather', family: "'Merriweather', serif", label: "Readable Serif" },
  { name: 'Roboto Slab', family: "'Roboto Slab', serif", label: "Strong Slab" },
];

export const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Courier+Prime:wght@400;700&family=Inter:wght@300;400;600;700&family=Merriweather:wght@300;400;700&family=Montserrat:wght@400;600;800&family=Outfit:wght@300;500;700;900&family=Playfair+Display:wght@400;700&family=Roboto+Slab:wght@400;700&display=swap';

// Tone of Voice Mapping
export const TONE_MAP = [
  { val: 0, tone: 'expert' as const, label: "Экспертный", icon: "🎓", desc: "Строгий, профессиональный" },
  { val: 25, tone: 'empathetic' as const, label: "Заботливый", icon: "🤗", desc: "Мягкий, с поддержкой" },
  { val: 50, tone: 'viral' as const, label: "Вирусный", icon: "⚡", desc: "Коротко, хайпово" },
  { val: 75, tone: 'provocative' as const, label: "Дерзкий", icon: "🔥", desc: "С вызовом, триггеры" },
  { val: 100, tone: 'funny' as const, label: "С юмором", icon: "🤪", desc: "Ирония и шутки" },
];

// Export configuration
export const EXPORT_CONFIG = {
  pixelRatio: 2.7,
  quality: 1.0,
  cacheBust: true,
  delay: 500, // ms to wait before starting export
} as const;
