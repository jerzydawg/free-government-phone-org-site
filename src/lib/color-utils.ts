/**
 * Color utility functions for ensuring readable text colors
 * based on WCAG contrast requirements
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
 * Calculate relative luminance of a color (WCAG formula)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Check if a color is light (luminance > 0.5)
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Ensure a color is dark enough for readable text
 * Darkens light colors to meet minimum luminance threshold
 */
export function ensureReadableTextColor(hex: string, minLuminance: number = 0.25): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const luminance = getLuminance(hex);
  
  // If already dark enough, return as-is
  if (luminance <= minLuminance) {
    return hex;
  }
  
  // Calculate darkening factor
  const ratio = minLuminance / luminance;
  const darkenFactor = Math.pow(ratio, 1.5); // More aggressive darkening
  
  // Darken the color
  let newR = Math.max(0, Math.floor(rgb.r * darkenFactor));
  let newG = Math.max(0, Math.floor(rgb.g * darkenFactor));
  let newB = Math.max(0, Math.floor(rgb.b * darkenFactor));
  
  // Verify the new luminance
  const newLuminance = getLuminance(
    `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  );
  
  // If still too light, darken more aggressively
  if (newLuminance > minLuminance) {
    const additionalDarken = minLuminance / newLuminance;
    newR = Math.max(0, Math.floor(newR * additionalDarken));
    newG = Math.max(0, Math.floor(newG * additionalDarken));
    newB = Math.max(0, Math.floor(newB * additionalDarken));
  }
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Get readable text color - ensures color is dark enough for text on light backgrounds
 */
export function getReadableTextColor(hex: string): string {
  return ensureReadableTextColor(hex, 0.25);
}

/**
 * Get readable background color with opacity
 * Creates a background that works with readable text
 */
export function getReadableBackgroundColor(hex: string, opacity: number = 0.1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  // If color is light, darken it for background
  if (isLightColor(hex)) {
    const darker = ensureReadableTextColor(hex, 0.2);
    const darkerRgb = hexToRgb(darker);
    if (darkerRgb) {
      return `rgba(${darkerRgb.r}, ${darkerRgb.g}, ${darkerRgb.b}, ${opacity})`;
    }
  }
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Ensure a color meets minimum luminance threshold
 * Used for generating readable primary colors
 */
export function ensureReadableColor(hex: string, minLuminance: number = 0.25): string {
  return ensureReadableTextColor(hex, minLuminance);
}

/**
 * Check if color is light for UI purposes (luminance > 0.3)
 */
export function isLightColorForUI(hex: string): boolean {
  return getLuminance(hex) > 0.3;
}
