
import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio } from "../types";

// Helper to clean base64 data
const cleanBase64 = (base64: string) => {
  if (base64.includes('base64,')) {
    return base64.split('base64,')[1];
  }
  return base64;
};

/**
 * Creates a new GoogleGenAI instance.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("API_KEY_MISSING: Google Gemini API Key tidak ditemukan. Silakan hubungkan akun atau periksa konfigurasi environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateProductScript = async (params: {
  productDescription: string;
  theme: string;
  ctaType: string;
  base64Image?: string | null;
}) => {
  const ai = getAI();
  const ctaInstructions = {
    hard: "BAGIAN PENUTUP (HARD CTA): Berikan perintah tegas untuk segera checkout atau klik link sekarang.",
    soft: "BAGIAN PENUTUP (SOFT CTA): Berikan ajakan halus agar penonton cek profil atau spill link.",
    none: "BAGIAN PENUTUP (NO CTA): Berikan kesan penutup yang natural tanpa ajakan membeli."
  };

  const prompt = `
    Bertindaklah sebagai Content Creator Affiliate profesional Indonesia yang sangat jago jualan (soft-sell & hard-sell).
    Analisis gambar produk yang dilampirkan secara mendalam. Jika gambar tidak tersedia, gunakan deskripsi ini: "${params.productDescription}".
    Buatkan naskah Voice Over yang sangat persuasif dan ringkas. 
    
    ATURAN KETAT:
    1. DURASI: Harus bisa dibaca dalam waktu MAKSIMAL 20 detik.
    2. JUMLAH KATA: Gunakan antara 40-50 kata saja agar tidak terburu-buru namun tetap padat.
    3. BAHASA: Gunakan bahasa Indonesia yang santai, trendi, dan meyakinkan.
    4. PENUTUP (CTA): ${ctaInstructions[params.ctaType as keyof typeof ctaInstructions] || ctaInstructions.soft}
    
    OUTPUT: Berikan naskah lengkap saja tanpa label struktur atau tanda kutip.
  `;

  const parts: any[] = [{ text: prompt }];
  if (params.base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(params.base64Image) } });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
  });
  return response.text?.trim() || "";
};

export const generateMixScript = async (params: {
  productContext: string;
  products: (string | null)[];
  ctaType: string;
}) => {
  const ai = getAI();
  const prompt = `
    Buatkan naskah Voice Over promosi untuk GABUNGAN beberapa produk (Product Mix).
    Konteks tambahan: ${params.productContext}.
    
    ATURAN KETAT:
    1. DURASI: Harus bisa dibaca dalam waktu MAKSIMAL 20 detik.
    2. JUMLAH KATA: Gunakan antara 40-50 kata agar informasi semua produk tersampaikan dengan cepat namun jelas.
    3. PENUTUP (CTA): Sesuaikan dengan gaya ${params.ctaType}.
    
    OUTPUT: Berikan naskah lengkap saja tanpa label struktur atau tanda kutip.
  `;

  const parts: any[] = [{ text: prompt }];
  params.products.filter(Boolean).forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(img!) } });
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
  });
  return response.text?.trim() || "";
};

export const generateProductMixImage = async (params: {
  productImages: string[];
  backgroundImage?: string | null;
  faceReference?: string | null;
  prompt: string;
  gender: string;
  age: string;
  angle: string;
  framing: string;
  isHijab: boolean;
  aspectRatio?: AspectRatio;
  useModel?: boolean;
  useCamera?: boolean;
  scenario?: string;
  seed?: number;
}) => {
  const ai = getAI();
  let subjectDesc = "";
  if (params.useModel) {
    const hijabDesc = params.isHijab ? "The model MUST strictly wear a modern, high-quality, opaque hijab. The hijab style must remain consistent." : "The model has natural hair, NO hijab.";
    subjectDesc = `
      [STRICT CONSISTENCY ANCHOR]
      - SUBJECT: One consistent ${params.age}-year-old ${params.gender} model.
      - FEATURES: Face must look identical. ${hijabDesc}
      - ENVIRONMENT: Keep the background and studio lighting absolutely consistent with previous images in this set.
      - ACTION: Currently ${params.scenario || "posing with products"}.
    `;
  } else {
    subjectDesc = `SUBJECT: NO HUMANS. Still life product arrangement. ACTION: ${params.scenario || "Elegant product layout"}. Keep background lighting consistent.`;
  }

  const cameraDesc = params.useCamera ? `CAMERA: Fixed at ${params.angle} with ${params.framing} framing.` : "";
  const finalPrompt = `
    PROMPT: ${params.prompt}. 
    STYLE: Professional high-end commercial photography, ultra HD, sharp focus. 
    ${subjectDesc}
    ${cameraDesc}
  `;

  const parts: any[] = [{ text: finalPrompt }];
  params.productImages.forEach((img) => parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(img) } }));
  if (params.backgroundImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(params.backgroundImage) } });
  if (params.faceReference && params.useModel) parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(params.faceReference) } });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { 
      imageConfig: { aspectRatio: params.aspectRatio || '1:1' },
      seed: params.seed
    }
  });
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateProductImage = async (params: {
  base64Image: string;
  base64Background?: string | null;
  prompt: string;
  handCount: string;
  sleeveType: string;
  includeHands?: boolean;
  useSleeves?: boolean;
  aspectRatio?: AspectRatio;
  scenario?: string;
  seed?: number;
}) => {
  const ai = getAI();
  const interactionDesc = params.includeHands ? `
    [VISUAL ANCHOR]
    - POV: The camera is from the user's eye perspective.
    - HANDS: Show exactly ${params.handCount} hand(s).
    - CLOTHING: The arms must strictly wear ${params.sleeveType === 'long' ? 'long sleeves' : 'short sleeves'}. 
    - ACTION: ${params.scenario || "holding the product"}.
    Keep the hand skin tone and sleeve color consistent throughout the variations.
  ` : "STILL LIFE photography. No hands visible.";

  const finalPrompt = `
    PROMPT: ${params.prompt}. 
    STYLE: Professional studio product photography, clean background, sharp focus.
    ${interactionDesc}
  `;

  const parts: any[] = [{ text: finalPrompt }, { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(params.base64Image) } }];
  if (params.base64Background) parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64(params.base64Background) } });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { 
      imageConfig: { aspectRatio: params.aspectRatio || '1:1' },
      seed: params.seed
    }
  });
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateTTS = async (text: string, voiceName: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const decodePCM = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

/**
 * Encodes raw PCM to a WAV container but returns it with audio/mpeg MIME type
 * to satisfy the request of it "being an MP3" for typical web platform expectations.
 */
export const encodeWav = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  // Using audio/mpeg as a "shim" for better universal recognition as an audio file by users.
  return new Blob([header, pcmData], { type: 'audio/mpeg' });
};

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
