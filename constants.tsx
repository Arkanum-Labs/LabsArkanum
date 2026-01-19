
import { VoiceOption, CTAOption } from './types';

/**
 * Daftar suara yang didukung secara resmi oleh model gemini-2.5-flash-preview-tts.
 * ID harus menggunakan huruf kecil sesuai dengan parameter 'voiceName' di API.
 */
export const VOICES: VoiceOption[] = [
  { id: 'kore', name: 'Kore (Wanita)', desc: 'Ceria & Energik (Terbaik untuk Review Produk)' },
  { id: 'zephyr', name: 'Zephyr (Wanita)', desc: 'Ramah & Informatif (Cocok untuk Edukasi/Tutorial)' },
  { id: 'aoede', name: 'Aoede (Wanita)', desc: 'Elegan & Mewah (Produk Skincare/Fashion)' },
  { id: 'charon', name: 'Charon (Pria)', desc: 'Formal & Jelas (Unboxing/Review Serius)' },
  { id: 'puck', name: 'Puck (Pria)', desc: 'Santai & Akrab (Gaya Vlog/Daily Life)' },
  { id: 'fenrir', name: 'Fenrir (Pria)', desc: 'Berat & Profesional (Produk Otomotif/Tech)' },
  { id: 'despina', name: 'Despina (Wanita)', desc: 'Cepat & Antusias (Promo Flash Sale)' },
  { id: 'algieba', name: 'Algieba (Pria)', desc: 'Tegas & To-the-point (Iklan Durasi Pendek)' },
];

export const CTA_OPTIONS: CTAOption[] = [
  { id: 'soft', label: 'CTA Halus (Soft Sell)', desc: 'Spill link di profil' },
  { id: 'hard', label: 'CTA Tegas (Hard Sell)', desc: 'Checkout sekarang juga' },
  { id: 'none', label: 'Tanpa CTA', desc: 'Murni penjelasan visual' },
];
