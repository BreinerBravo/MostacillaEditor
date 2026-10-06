const hueGroups = [
  ['Rojos', 0], ['Corales', 12], ['Naranjas', 25], ['Amarillos', 48],
  ['Lima', 72], ['Verdes', 128], ['Turquesas', 168], ['Cianes', 190],
  ['Azules', 215], ['Índigos', 238], ['Violetas', 270], ['Púrpuras', 290],
  ['Magenta', 318], ['Rosas', 340],
];
const tones = [
  ['Oscuro', 78, 24], ['Profundo', 76, 34], ['Intenso', 82, 45],
  ['Vivo', 76, 56], ['Medio', 62, 66], ['Claro', 52, 77], ['Pastel', 43, 88],
];

export const COLOR_CATEGORIES = [...hueGroups.map(([name]) => name), 'Neutros'];

export function hsvToHex(hue, saturation, value) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, Number(saturation))) / 100;
  const v = Math.max(0, Math.min(100, Number(value))) / 100;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - chroma;
  const sector = Math.floor(h / 60);
  const rgb = sector === 0 ? [chroma, x, 0] : sector === 1 ? [x, chroma, 0] : sector === 2 ? [0, chroma, x] : sector === 3 ? [0, x, chroma] : sector === 4 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${rgb.map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function hexToHsv(hex) {
  const raw = String(hex).replace('#', '');
  if (!/^[\da-f]{6}$/i.test(raw)) return { hue: 0, saturation: 0, brightness: 100 };
  const [r, g, b] = raw.match(/../g).map(channel => parseInt(channel, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  return { hue: (hue + 360) % 360, saturation: max ? delta / max * 100 : 0, brightness: max * 100 };
}

export const PRESET_COLORS = [
  ...hueGroups.flatMap(([category, hue]) => tones.map(([tone, saturation, brightness]) => ({
    id: `preset-${category.toLowerCase()}-${tone.toLowerCase()}`,
    name: `${category} ${tone.toLowerCase()}`,
    hex: hsvToHex(hue, saturation, brightness),
    category,
    source: 'preset',
  }))),
  ...[['Blanco', '#FFFFFF'], ['Perla', '#E9E1D9'], ['Plata', '#B8B8BE'], ['Gris', '#85858D'], ['Grafito', '#505058'], ['Negro', '#17171B'], ['Marfil', '#F3E8D5'], ['Arena', '#C9B89C'], ['Marrón', '#765341']].map(([name, hex]) => ({ id: `preset-neutral-${name.toLowerCase()}`, name, hex, category: 'Neutros', source: 'preset' })),
];
