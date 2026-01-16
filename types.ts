
export interface VoiceOption {
  id: string;
  name: string;
  desc: string;
}

export interface CTAOption {
  id: string;
  label: string;
  desc: string;
}

export enum ThemeMode {
  DARK = 'dark',
  LIGHT = 'light'
}

export type SleeveType = 'long' | 'short';
export type HandCount = '1' | '2';
export type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
