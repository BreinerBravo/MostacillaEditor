import type { PaletteColor } from './pattern';
export interface WeavingStep { index: number; row: number; column: number; colorId: string | 0; color?: PaletteColor }
