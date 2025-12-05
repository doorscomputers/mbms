# Design Theme Implementation Plan

## Task Overview
Implement the new design theme from the provided screenshots across all pages.

## Todo Items

- [x] Update globals.css with new color scheme and CSS variables
- [x] Update layout.tsx with new fonts (Libre Baskerville, Lora, IBM Plex Mono)
- [x] Verify sidebar and dashboard pages display correctly
- [x] Test mobile responsiveness (build passes, existing responsive classes maintained)

## Review Section

### Changes Made

1. **globals.css** - Complete theme overhaul:
   - Updated all CSS variables with warm brown/cream color palette
   - Primary color: #a67c62 (warm brown)
   - Background: #f5f1e6 (cream)
   - Cards: #fffcf5 (off-white cream)
   - Sidebar: #ece5d8 (light tan)
   - Dark mode theme also updated with matching dark brown tones
   - Border radius changed from 0.625rem to 0.25rem
   - Added destructive-foreground variable
   - Updated font variables to use new fonts

2. **layout.tsx** - Typography update:
   - Changed from Geist/Geist_Mono to Libre Baskerville, Lora, IBM Plex Mono
   - Libre Baskerville for primary sans-serif
   - Lora for serif text
   - IBM Plex Mono for monospace

3. **login/page.tsx** - Fixed hardcoded background:
   - Changed `bg-gray-50 dark:bg-gray-900` to `bg-background`

4. **setup/page.tsx** - Fixed hardcoded background:
   - Changed `bg-gray-50 dark:bg-gray-900` to `bg-background`

### Build Status
- Build completed successfully with no errors
- All 36 pages generated without issues

### Theme Colors Applied
| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | #f5f1e6 | #1a1714 |
| Card | #fffcf5 | #2a2520 |
| Primary | #a67c62 | #a67c62 |
| Foreground | #4a3f35 | #f5f1e6 |
| Muted | #ece5d8 | #3d342c |
| Border | #dbd0ba | #3d342c |
| Sidebar | #ece5d8 | #2a2520 |
