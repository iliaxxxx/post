import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, Tone } from "../types";

// Helper to safely get API Key
// UPDATED: Now supports bundler string replacement patterns safely
const getApiKey = (): string => {
  try {
    // Direct access allows bundlers (like Vite) to replace 'process.env.API_KEY' with the actual string literal.
    // We wrap it in try-catch to handle runtime environments where process might not be defined.
    const key = process.env.API_KEY;
    if (key && typeof key === 'string' && key.length > 0) {
      return key;
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }
  return '';
};

const getToneDescription = (tone: Tone): string => {
  switch (tone) {
    case Tone.PROVOCATIVE: return "Дерзкий, провокационный, спорящий с общепринятым мнением. Используй жесткие факты и триггеры.";
    case Tone.VIRAL: return "Максимально краткий, кликбейтный, хайповый. Минимум воды, сленг допустим (в меру).";
    case Tone.EMPATHETIC: return "Мягкий, поддерживающий, заботливый. Используй 'мы', 'понимаю', теплые обороты.";
    case Tone.FUNNY: return "Ироничный, с юмором, легкий. Можно использовать метафоры и шутки.";
    case Tone.EXPERT:
    default: return "Лаконичный, профессиональный, уверенный. Стиль топовых экспертов.";
  }
};

export const generateCarouselContent = async (
  topic: string,
  count: number,
  tone: Tone,
  leadMagnet: string
): Promise<SlideData[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key не найден. Проверьте настройки окружения (.env) или переменные деплоя.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";
    const toneDesc = getToneDescription(tone);
    
    const prompt = `
      Создай контент для "карусели" (слайд-шоу для соцсетей) на тему: "${topic}".
      Язык: Русский.
      Количество слайдов: ${count}.
      Tone of Voice (Тональность): ${toneDesc}
      
      Структура:
      1. Первый слайд: Заголовок-крючок (Hook). Должен заставить листать дальше.
      2. Тело (слайды 2-${count-1}): Полезный контент, советы, шаги или разрушение мифов.
      3. ПРЕДЕЛЬНО ВАЖНО - Последний слайд (слайд ${count}): 
         Он должен быть ПОЛНОСТЬЮ посвящен призыву к действию (CTA).
         Инструкция для последнего слайда: ${leadMagnet}.
         Заголовок последнего слайда должен содержать глагол (например "Подпишись", "Запишись", "Пиши").
         Текст последнего слайда должен мотивировать выполнить это действие. Не делай общих выводов, делай продажу действия.
      
      Требования к тексту:
      - Заголовки: Крупные, читабельные (до 40 символов).
      - Текст: Без "воды". Разбывай на абзацы.
      - Highlight: Выбери ОДНУ самую важную фразу или цифру на слайде для визуального выделения.
      
      Верни JSON массив.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              highlight: { type: Type.STRING, nullable: true },
              cta: { type: Type.STRING, nullable: true }
            },
            required: ["title", "content"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Пустой ответ от AI");

    const rawSlides = JSON.parse(jsonText) as any[];

    return rawSlides.map((slide, index) => ({
      number: index + 1,
      title: slide.title,
      content: slide.content,
      highlight: slide.highlight || undefined,
      cta: slide.cta || undefined
    }));

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message || "Неизвестная ошибка";
    if (msg.includes("API key not valid") || msg.includes("400")) {
       throw new Error("Неверный API ключ. Проверьте настройки проекта (Google AI Studio).");
    }
    throw new Error(`Ошибка генерации: ${msg}`);
  }
};

export const regenerateSlideContent = async (
  topic: string,
  currentSlide: SlideData,
  totalSlides: number,
  tone: Tone
): Promise<SlideData> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key не найден");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";
    const toneDesc = getToneDescription(tone);
    
    const prompt = `
      Перепиши контент для одного слайда карусели.
      Тема: "${topic}".
      Тональность: ${toneDesc}.
      Номер слайда: ${currentSlide.number} из ${totalSlides}.
      
      Текущий контент:
      Заголовок: ${currentSlide.title}
      Текст: ${currentSlide.content}
      
      Задача: Перефразируй в заданной тональности. Сделай текст сильнее.
      
      Верни JSON объект.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            highlight: { type: Type.STRING, nullable: true },
            cta: { type: Type.STRING, nullable: true }
          },
          required: ["title", "content"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");

    const newContent = JSON.parse(jsonText);

    return {
      ...currentSlide,
      title: newContent.title,
      content: newContent.content,
      highlight: newContent.highlight || currentSlide.highlight,
      cta: newContent.cta || currentSlide.cta
    };

  } catch (error) {
    console.error("Gemini Slide Regen Error:", error);
    throw error;
  }
};

export const generateSlideImage = async (
  topic: string,
  slideContext: string
): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key не найден");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Create a hyper-realistic, high-resolution cinematic background image for a presentation slide.
    Topic: "${topic}".
    Context: "${slideContext.slice(0, 150)}".
    
    Style Requirements:
    - Aesthetic: Dark, moody, premium, sleek.
    - Lighting: Cinematic, dramatic, high contrast, volumetric lighting.
    - Colors: Deep blacks, dark greys, muted neutral tones. Avoid neon or oversaturated colors.
    - Composition: Minimalist, plenty of negative space, vertical orientation (3:4 ratio).
    - Texture: If abstract, use materials like dark glass, matte metal, smoke, or marble.
    - Content: Photorealistic photography or high-end 3D abstract.
    - STRICTLY NO TEXT: The image must contain NO letters, numbers, or watermarks.
    
    The image should look like a high-end Unsplash background.
  `;

  // Strategy: Try Gemini 2.5 Flash Image first (Standard) -> Imagen 3.0 (Fallback)
  
  // Attempt 1: Gemini 2.5 Flash Image
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "3:4" }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data && part.inlineData.data.length > 100) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
  } catch (error: any) {
    console.warn("Gemini 2.5 Flash Image failed, attempting fallback...", error);
    // Continue to next attempt if error is not critical, or just let it fall through
  }

  // Attempt 2: Imagen 3.0
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '3:4',
            outputMimeType: 'image/jpeg'
        }
    });
    
    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes && imageBytes.length > 100) {
        return `data:image/jpeg;base64,${imageBytes}`;
    }
  } catch (error) {
    console.error("Imagen generation also failed:", error);
  }

  // Final catch-all: Throw error to alert user
  throw new Error("Не удалось сгенерировать изображение. Попробуйте позже или проверьте квоты.");
};