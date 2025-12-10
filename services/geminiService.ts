import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, Tone } from "../types";

// SECURITY WARNING: API key is exposed in client-side code!
// RECOMMENDED: Move this to a backend proxy (Express/Cloudflare Workers/Firebase Functions)
// For production, create an API endpoint that forwards requests to Gemini API
// Client -> Your Backend -> Gemini API (with secure API key)

// Initialize the client
// For Vite, use VITE_ prefix for environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    'VITE_GEMINI_API_KEY is not set. Please add it to your .env file.\n' +
    'WARNING: This API key will be visible in the client bundle. ' +
    'For production, use a backend proxy instead.'
  );
}

const ai = new GoogleGenAI({ apiKey });

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
  tone: Tone
): Promise<SlideData[]> => {
  try {
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
      3. Последний слайд: Четкий призыв к действию (CTA), связанный с темой.
      
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
              title: { 
                type: Type.STRING, 
                description: "Заголовок слайда" 
              },
              content: { 
                type: Type.STRING, 
                description: "Основной текст" 
              },
              highlight: {
                type: Type.STRING,
                description: "Акцентная фраза или цифра",
                nullable: true
              },
              cta: {
                type: Type.STRING,
                description: "Призыв к действию (только для последнего слайда, для остальных null)",
                nullable: true
              }
            },
            required: ["title", "content"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    interface RawSlide {
      title: string;
      content: string;
      highlight?: string | null;
      cta?: string | null;
    }

    const rawSlides = JSON.parse(jsonText) as RawSlide[];

    // Validate response structure
    if (!Array.isArray(rawSlides)) {
      throw new Error("Invalid response format: expected array");
    }

    // Map to ensure numbering and validate each slide
    return rawSlides.map((slide, index) => {
      if (!slide.title || !slide.content) {
        throw new Error(`Invalid slide ${index + 1}: missing title or content`);
      }
      return {
        number: index + 1,
        title: slide.title,
        content: slide.content,
        highlight: slide.highlight || undefined,
        cta: slide.cta || undefined
      };
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Не удалось сгенерировать карусель: ${errorMessage}`);
  }
};

export const regenerateSlideContent = async (
  topic: string,
  currentSlide: SlideData,
  totalSlides: number,
  tone: Tone
): Promise<SlideData> => {
  try {
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

    interface RegeneratedContent {
      title: string;
      content: string;
      highlight?: string | null;
      cta?: string | null;
    }

    const newContent = JSON.parse(jsonText) as RegeneratedContent;

    // Validate response
    if (!newContent.title || !newContent.content) {
      throw new Error("Invalid response: missing title or content");
    }

    return {
      ...currentSlide,
      title: newContent.title,
      content: newContent.content,
      highlight: newContent.highlight || currentSlide.highlight,
      cta: newContent.cta || currentSlide.cta
    };

  } catch (error) {
    console.error("Gemini Slide Regen Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Не удалось перегенерировать слайд: ${errorMessage}`);
  }
};

export const generateBackgroundImage = async (
  topic: string,
  slideContext: SlideData
): Promise<string> => {
  try {
    const model = "gemini-2.5-flash-image";
    
    // Construct a specific visual prompt
    const prompt = `
      Professional, cinematic, minimalist background image for a social media post.
      Topic: ${topic}
      Context: ${slideContext.title}
      Style: Modern, aesthetic, soft lighting, 4k quality, abstract or photorealistic, high resolution.
      Ensure the center is not too cluttered so text can be readable.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Closest to 4:5 vertical slide format
        }
      }
    });

    // Check parts for inlineData
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          // Determine mime type if possible, or assume png/jpeg based on API behavior
          // The API typically returns standard image mime types.
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64Data}`;
        }
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw new Error("Не удалось сгенерировать изображение.");
  }
};
