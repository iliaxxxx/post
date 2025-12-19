
import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, Tone } from "../types";

const getApiKey = (): string => {
  try {
    const key = process.env.API_KEY;
    if (key && typeof key === 'string' && key.length > 0) {
      return key;
    }
  } catch (e) {}
  return '';
};

const getToneDescription = (tone: Tone): string => {
  switch (tone) {
    case Tone.PROVOCATIVE: return "Дерзкий, провокационный, спорящий с общепринятым мнением.";
    case Tone.VIRAL: return "Максимально краткий, кликбейтный, хайповый. Минимум воды.";
    case Tone.EMPATHETIC: return "Мягкий, поддерживающий, заботливый.";
    case Tone.FUNNY: return "Ироничный, с юмором, легкий.";
    case Tone.EXPERT:
    default: return "Лаконичный, профессиональный, уверенный.";
  }
};

export const generateCarouselContent = async (
  topic: string,
  count: number,
  tone: Tone,
  leadMagnet: string
): Promise<SlideData[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key не найден.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-3-flash-preview';
    const toneDesc = getToneDescription(tone);
    
    const prompt = `
      Создай контент для карусели в Instagram на тему: "${topic}".
      Количество слайдов: ${count}.
      Тональность: ${toneDesc}
      
      СТРУКТУРА:
      1. Слайд №1 (ОБЛОЖКА): Только ГЛАВНЫЙ ЗАГОЛОВОК. Поле "content" ОБЯЗАТЕЛЬНО оставить ПУСТЫМ ("").
      2. Слайды 2-${count-1}: Полезная информация. Заголовок + короткий текст.
      3. Слайд №${count} (CTA): Призыв к действию: ${leadMagnet}.
      
      Верни JSON массив [{title, content, highlight}].
    `;

    const response = await ai.models.generateContent({
      model: modelName,
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
              highlight: { type: Type.STRING, nullable: true }
            },
            required: ["title", "content"]
          }
        }
      }
    });

    const rawSlides = JSON.parse(response.text || "[]");
    return rawSlides.map((slide: any, index: number) => ({
      number: index + 1,
      title: slide.title,
      content: index === 0 ? "" : slide.content,
      highlight: slide.highlight || undefined
    }));
  } catch (error: any) {
    throw new Error(`Ошибка генерации: ${error.message}`);
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
    const modelName = 'gemini-3-flash-preview';
    const toneDesc = getToneDescription(tone);
    
    const prompt = `
      Перепиши слайд №${currentSlide.number} для темы "${topic}".
      Тональность: ${toneDesc}.
      ${currentSlide.number === 1 ? "ЭТО ОБЛОЖКА. Сделай мощный заголовок, текст (content) оставь пустым." : ""}
      Верни JSON {title, content, highlight}.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const newContent = JSON.parse(response.text || "{}");
    return {
      ...currentSlide,
      title: newContent.title,
      content: currentSlide.number === 1 ? "" : newContent.content,
      highlight: newContent.highlight || currentSlide.highlight
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Generates an abstract background image using gemini-2.5-flash-image
 */
export const generateSlideImage = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key не найден");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a professional, minimalist, high-quality abstract background image for an Instagram slide about: ${prompt}. Style: modern, clean, premium aesthetics, NO TEXT, atmospheric lighting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error: any) {
    throw new Error(`Generation failed: ${error.message}`);
  }
};
