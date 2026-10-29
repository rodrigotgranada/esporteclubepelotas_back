export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex({ h, s, l }: HSL): string {
  const sRatio = Math.max(0, Math.min(100, s)) / 100;
  const lRatio = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lRatio - 1)) * sRatio;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lRatio - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h <= 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    return Math.max(0, Math.min(255, val)).toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateCampaignPalettes(seedHex: string) {
  const { h, s } = hexToHsl(seedHex);

  const light = {
    primary: seedHex.toLowerCase(),
    secondary: hslToHex({ h, s: Math.min(100, s + 10), l: 32 }),
    buttonSecondary: hslToHex({ h, s: Math.min(100, s + 10), l: 32 }),
    background: hslToHex({ h, s: 35, l: 97 }),
    surface: '#ffffff',
    header: seedHex.toLowerCase(),
    card: '#ffffff',
    drawer: '#ffffff',
    table: '#ffffff',
    textPrimary: hslToHex({ h, s: 60, l: 15 }),
    textSecondary: hslToHex({ h, s: 40, l: 32 }),
    border: hslToHex({ h, s: 45, l: 88 }),
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  const dark = {
    primary: hslToHex({ h, s: Math.min(100, s + 15), l: 68 }),
    secondary: seedHex.toLowerCase(),
    buttonSecondary: seedHex.toLowerCase(),
    background: hslToHex({ h, s: 35, l: 7 }),
    surface: hslToHex({ h, s: 25, l: 14 }),
    header: hslToHex({ h, s: 30, l: 11 }),
    card: hslToHex({ h, s: 30, l: 11 }),
    drawer: hslToHex({ h, s: 30, l: 11 }),
    table: hslToHex({ h, s: 30, l: 11 }),
    textPrimary: hslToHex({ h, s: 40, l: 95 }),
    textSecondary: hslToHex({ h, s: 30, l: 80 }),
    border: hslToHex({ h, s: 40, l: 24 }),
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  return { light, dark };
}
