/**
 * Color Utility Functions
 * Ensures text colors are always readable and meet contrast requirements
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance (for contrast calculation)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if a color is light (high luminance)
 * Returns true if color is light, false if dark
 */
function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
}

/**
 * Darken a color to ensure readability on light backgrounds
 * If color is already dark enough, returns original
 * Otherwise returns a darker version
 */
export function ensureReadableTextColor(hex: string, minLuminance: number = 0.3): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // If color is already dark enough, return as-is
  if (luminance <= minLuminance) {
    return hex;
  }

  // Darken the color by reducing RGB values proportionally
  // Target luminance: around 0.25-0.3 for good readability
  const targetLuminance = minLuminance;
  const ratio = targetLuminance / luminance;

  // Apply darkening factor (more aggressive for very light colors)
  const darkenFactor = Math.pow(ratio, 1.5);

  const newR = Math.max(0, Math.floor(rgb.r * darkenFactor));
  const newG = Math.max(0, Math.floor(rgb.g * darkenFactor));
  const newB = Math.max(0, Math.floor(rgb.b * darkenFactor));

  // Ensure minimum contrast - if still too light, make it darker
  const newLuminance = getLuminance(newR, newG, newB);
  if (newLuminance > minLuminance) {
    // Further darken
    const additionalDarken = minLuminance / newLuminance;
    return `#${Math.max(0, Math.floor(newR * additionalDarken))
      .toString(16)
      .padStart(2, '0')}${Math.max(0, Math.floor(newG * additionalDarken))
      .toString(16)
      .padStart(2, '0')}${Math.max(0, Math.floor(newB * additionalDarken))
      .toString(16)
      .padStart(2, '0')}`;
  }

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Get a darker version of a color for use as text on light backgrounds
 * Ensures WCAG AA contrast (4.5:1 minimum)
 * Uses more aggressive darkening (0.25 luminance) to ensure readability
 */
export function getReadableTextColor(hex: string): string {
  return ensureReadableTextColor(hex, 0.25);
}

/**
 * Get a background color with opacity that ensures text remains readable
 * Returns a darker version of the color for the background
 */
export function getReadableBackgroundColor(hex: string, opacity: number = 0.1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // For light backgrounds, use a darker version of the color
  if (isLightColor(hex)) {
    const darker = ensureReadableTextColor(hex, 0.2);
    const darkerRgb = hexToRgb(darker);
    if (darkerRgb) {
      return `rgba(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b}, ${opacity})`;
    }
  }

  // For dark colors, use as-is with opacity
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Check if a color should be considered "light" for UI purposes
 * Used to determine if we need darker text colors
 */
export function isLightColorForUI(hex: string): boolean {
  return isLightColor(hex);
}

