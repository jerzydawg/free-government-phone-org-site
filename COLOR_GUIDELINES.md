# Color Guidelines - Preventing Light Color Readability Issues

## Problem
Light colors (especially light orange/yellow) used for text on light backgrounds create poor readability and accessibility issues.

## Solution
Always use readable color utilities when using primary colors for text.

## Rules

### 1. **Never use `designDNA.colors.primary` directly for text**
   ❌ **BAD:**
   ```astro
   <span style={`color: ${designDNA.colors.primary};`}>
   ```

   ✅ **GOOD:**
   ```astro
   import { getReadableTextColor } from '../lib/color-utils';
   const readablePrimaryColor = getReadableTextColor(designDNA.colors.primary);
   <span style={`color: ${readablePrimaryColor};`}>
   ```

### 2. **Never use primary color with opacity for text on light backgrounds**
   ❌ **BAD:**
   ```astro
   <span style={`background-color: ${designDNA.colors.primary}20; color: ${designDNA.colors.primary};`}>
   ```

   ✅ **GOOD:**
   ```astro
   import { getReadableTextColor, getReadableBackgroundColor } from '../lib/color-utils';
   const readablePrimaryColor = getReadableTextColor(designDNA.colors.primary);
   const readablePrimaryBg = getReadableBackgroundColor(designDNA.colors.primary, 0.15);
   <span style={`background-color: ${readablePrimaryBg}; color: ${readablePrimaryColor};`}>
   ```

### 3. **Avoid hardcoded light orange colors**
   ❌ **BAD:**
   ```html
   <span class="text-orange-400">Text</span>
   <span class="text-orange-500">Text</span>
   <span class="text-orange-600">Text</span>
   ```

   ✅ **GOOD:**
   ```html
   <span class="text-orange-700">Text</span>
   <span class="text-orange-800">Text</span>
   ```

### 4. **Use CSS variable `--color-primary-readable` when available**
   ✅ **GOOD:**
   ```css
   .my-text {
     color: var(--color-primary-readable);
   }
   ```

## Available Utilities

### `getReadableTextColor(hex: string): string`
Ensures a color is dark enough for readable text on light backgrounds.

### `getReadableBackgroundColor(hex: string, opacity: number): string`
Creates a readable background color with opacity that ensures text remains readable.

### `isLightColorForUI(hex: string): boolean`
Checks if a color is light (for UI decisions).

## Examples

### CitiesSection Component
```astro
---
import { getReadableTextColor, getReadableBackgroundColor } from '../../lib/color-utils';

const readablePrimaryColor = getReadableTextColor(designDNA.colors.primary);
const readablePrimaryBg = getReadableBackgroundColor(designDNA.colors.primary, 0.15);
---

<span style={`background-color: ${readablePrimaryBg}; color: ${readablePrimaryColor};`}>
  {city.state_abbr}
</span>
```

## Future Deployments

When creating new components or pages:
1. Always import color utilities if using primary colors for text
2. Use `getReadableTextColor()` for any text color
3. Use `getReadableBackgroundColor()` for backgrounds with opacity
4. Never use Tailwind classes like `text-orange-400`, `text-orange-500`, `text-orange-600` for text
5. Prefer `text-orange-700` or `text-orange-800` if hardcoding is necessary

## Testing

Before deploying, check:
- [ ] All text using primary colors is readable
- [ ] No light orange/yellow colors are used for text
- [ ] All components use readable color utilities
- [ ] CSS variables `--color-primary-readable` is available globally




