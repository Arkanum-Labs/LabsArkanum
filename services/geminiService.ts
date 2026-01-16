
import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio } from "../types";

// Helper to clean base64 data
const cleanBase64 = (base64: string) => {
  if (base64.includes('base64,')) {
    return base64.split('base64,')[1];
  }
  return base64;
};

// Selalu buat instance baru sebelum pemanggilan untuk memastikan mengambil API Key terbaru
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    Bertindaklah sebagai Content Creator Affiliate profesional Indonesia yang sedang melakukan 'spill' produk secara natural di TikTok/Reels.
    
    TUGAS UTAMA:
    Perhatikan gambar produk yang diberikan (jika ada) dan deskripsi ini: "${params.productDescription}".
    Buatkan naskah Voice Over yang sangat fokus pada DETAIL FISIK produk:
    1. BENTUK & UKURAN: Bagaimana feel-nya saat dipegang atau proporsinya.
    2. WARNA & MOTIF: Deskripsikan estetika warnanya dan detail motif/teksturnya secara spesifik.
    3. REALITAS: Buat seolah-olah kamu sedang memegang produknya langsung (Gaya POV).
    
    KONTEKS TEMA: ${params.theme || 'Umum'}
    DURASI: Maksimal 20 detik (sekitar 35-40 kata).
    GAYA BAHASA: Santai, jujur, persuasif, menggunakan bahasa Indonesia gaul/akrab (seperti: "cakep banget", "sumpah ini...", "pas banget").

    STRUKTUR:
    - HOOK: Langsung bahas visual menarik produknya.
    - DETAIL: Bahas warna/motif/ukuran yang bikin produk ini worth it.
    - PENUTUP: ${ctaInstructions[params.ctaType as keyof typeof ctaInstructions] || ctaInstructions.soft}

    OUTPUT: Hanya teks naskah saja. Jangan ada label (Hook:, Detail:, dll). Jangan ada tanda kutip.
  `;

  const parts: any[] = [{ text: prompt }];
  if (params.base64Image) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(params.base64Image) } });
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
    Bertindaklah sebagai Content Creator Affiliate profesional.
    Buatkan naskah Voice Over promosi untuk GABUNGAN beberapa produk (MIX/OOTD/SET) yang terlihat di gambar.
    
    TUGAS UTAMA:
    1. Hubungkan semua produk tersebut dalam satu tema (misal: "Setelan buat kondangan" atau "Mix n match ngantor").
    2. Deskripsikan bagaimana WARNA, MOTIF, dan BENTUK antar produk tersebut saling melengkapi.
    3. Fokus pada detail unik masing-masing produk (misal: "motif roknya matching sama detail di tasnya").
    
    Konteks tambahan: ${params.productContext}.
    DURASI: Maksimal 20 detik (35-40 kata).
    GAYA: Natural, antusias, ala influencer Indonesia.
    PENUTUP: Sesuaikan dengan gaya ${params.ctaType}.
    
    OUTPUT: Hanya teks naskah saja tanpa pengantar atau label.
  `;

  const parts: any[] = [{ text: prompt }];
  params.products.filter(Boolean).forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img!) } });
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
}) => {
  const ai = getAI();
  
  const hijabDesc = params.isHijab ? "The model MUST wear a stylish, modern hijab (headscarf) that matches the outfit." : "The model has natural hair, no headscarf.";
  const faceDesc = params.faceReference ? "CRITICAL: Replicate the facial features from the face reference image precisely." : "";

  const coreInstruction = `
    ULTRA HD 8K PROFESSIONAL COMMERCIAL PHOTOGRAPHY.
    PRODUCT FIDELITY: You MUST preserve all product details perfectly. Do NOT change shape, size, text, labels, branding, colors, or motifs. The product in the output must be an exact replica of the product in the input image.
    INTEGRATION: Seamlessly blend the product and model into the background with realistic shadows, global illumination, and high-quality textures.
    SUBJECT: A ${params.age} year old ${params.gender} model. ${hijabDesc} ${faceDesc}
    COMPOSITION: ${params.framing} shot, camera angle is ${params.angle}.
  `;

  const finalPrompt = `${params.prompt}. TECHNICAL REQUIREMENTS: ${coreInstruction}`;
  const parts: any[] = [{ text: finalPrompt }];
  
  params.productImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(img) } });
  });

  if (params.backgroundImage) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(params.backgroundImage) } });
  }

  if (params.faceReference) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(params.faceReference) } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1'
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err: any) {
    console.error("Gemini Mix Image API Error:", err);
    throw err;
  }
};

export const generateProductImage = async (params: {
  base64Image: string;
  base64Background?: string | null;
  prompt: string;
  handCount: string;
  sleeveType: string;
  includeHands?: boolean;
  isReview?: boolean;
  aspectRatio?: AspectRatio;
}) => {
  const ai = getAI();
  
  let interactionDesc = "";
  if (params.includeHands === false) {
    interactionDesc = "Product only, no hands, minimalist studio background.";
  } else if (params.isReview) {
    interactionDesc = `First-person POV, hands actively testing/interacting with the product, ${params.sleeveType} sleeves.`;
  } else {
    interactionDesc = `First-person POV, ${params.handCount} hand holding the product naturally, ${params.sleeveType} sleeves.`;
  }

  const coreInstruction = `
    ULTRA HD 8K CAMERA RESOLUTION. PROFESSIONAL PRODUCT PHOTOGRAPHY.
    MANDATORY FIDELITY: Maintain ALL details of the product (shape, size, text, labels, color, motif) exactly as shown in the source. Do not alter branding or motifs.
    ENVIRONMENT: Seamlessly integrate the product into the ${params.base64Background ? 'provided background' : 'studio setting'} with realistic lighting and reflections.
    VIEW: ${interactionDesc}
  `;

  const finalPrompt = `${params.prompt}. STYLE: ${coreInstruction}`;
  const parts: any[] = [
    { text: finalPrompt },
    { inlineData: { mimeType: 'image/png', data: cleanBase64(params.base64Image) } }
  ];
  if (params.base64Background) {
    parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64(params.base64Background) } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: params.aspectRatio || '1:1'
        }
      }
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err: any) {
    console.error("Gemini POV Image API Error:", err);
    throw err;
  }
};

export const generateTTS = async (text: string, voiceName: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
      },
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
  return new Blob([header, pcmData], { type: 'audio/wav' });
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
