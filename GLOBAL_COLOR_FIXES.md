# Global Color Fixes - Preventing Light Color Issues

## Changes Made to Global Templates

### 1. **Layout.astro (Global Template)**
   - Added `--color-primary-readable` CSS variable that's automatically generated
   - Updated all navigation links to use readable colors
   - Added global CSS rules to force readable colors for any text using primary color
   - Added rules to prevent light orange/yellow Tailwind classes from being used

### 2. **design-dna.ts (Color Generation)**
   - Automatically generates `--color-primary-readable` variable
   - Uses aggressive darkening (0.25 luminance) to ensure readability
   - All sites will now have readable primary colors available globally

### 3. **color-utils.ts (Utility Functions)**
   - Created reusable functions for ensuring readable colors
   - `getReadableTextColor()` - Darkens light colors for text
   - `getReadableBackgroundColor()` - Creates readable backgrounds with opacity

## How It Works

### Automatic Protection
1. **CSS Variables**: Every site automatically gets `--color-primary-readable` in the `:root` CSS variables
2. **Global CSS Rules**: Layout.astro includes CSS that forces readable colors for:
   - Any inline style using `var(--color-primary)` for text
   - Any Tailwind class like `.text-[var(--color-primary)]`
   - Light orange/yellow Tailwind classes are forced to dark colors

### For Developers
When creating new components:
- **Use**: `var(--color-primary-readable)` for text colors
- **Use**: `var(--color-primary)` for backgrounds, borders, etc.
- **Import**: `getReadableTextColor()` from `color-utils.ts` for dynamic colors
- **Avoid**: Light orange/yellow Tailwind classes (`text-orange-400`, `text-orange-500`, etc.)

## Future Deployments

All new sites will automatically:
1. Have `--color-primary-readable` available globally
2. Have CSS rules preventing light colors for text
3. Have utility functions available for ensuring readability

## Testing

Before deploying, verify:
- [ ] Text using primary colors is readable
- [ ] State abbreviations use readable colors
- [ ] No light orange/yellow text appears
- [ ] CSS variable `--color-primary-readable` is available in browser DevTools

