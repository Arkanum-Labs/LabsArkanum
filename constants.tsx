
import { VoiceOption, CTAOption } from './types';

export const VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore (Wanita)', desc: 'Alami & Ceria (Cocok untuk Review)' },
  { id: 'Fenrir', name: 'Fenrir (Pria)', desc: 'Berat & Profesional (Cocok untuk Tech)' },
  { id: 'Puck', name: 'Puck (Pria)', desc: 'Santai & Seru (Cocok untuk Vlog)' },
  { id: 'Aoede', name: 'Aoede (Wanita)', desc: 'Lembut & Elegan (Cocok untuk Fashion)' },
  { id: 'Charon', name: 'Charon (Pria)', desc: 'Wibawa & Berita (Cocok untuk Formal)' },
];

export const CTA_OPTIONS: CTAOption[] = [
  { id: 'soft', label: 'CTA Halus (Soft Sell)', desc: 'Aman untuk Marketplace' },
  { id: 'hard', label: 'CTA Tegas (Hard Sell)', desc: 'Langsung ajak beli' },
  { id: 'none', label: 'Tanpa CTA', desc: 'Storytelling murni' },
];
