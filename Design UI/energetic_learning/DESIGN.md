---
name: Energetic Learning
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5c3f40'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#906f70'
  outline-variant: '#e5bdbe'
  surface-tint: '#be0037'
  primary: '#b80035'
  on-primary: '#ffffff'
  primary-container: '#e11d48'
  on-primary-container: '#fffaf9'
  inverse-primary: '#ffb3b6'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#585c5d'
  on-tertiary: '#ffffff'
  tertiary-container: '#717476'
  on-tertiary-container: '#f9fbfd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b6'
  on-primary-fixed: '#40000c'
  on-primary-fixed-variant: '#920028'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Quicksand
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Quicksand
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
  max-width: 1440px
---

## Brand & Style
The design system is crafted for a vibrant educational environment, balancing the playful energy required for children with the structured professionalism expected by parents and educators. The aesthetic is **Modern & Friendly**, leaning into soft geometry and high-clarity interfaces.

The UI should evoke a sense of optimism and momentum. This is achieved through generous whitespace, high-saturation accent colors, and an overall "bouncy" but organized layout. It avoids the clutter often found in educational software, opting instead for a streamlined, high-trust experience that feels more like a modern creative tool than a rigid administrative database.

## Colors
The palette is anchored by a high-energy **Primary Red** (#E11D48) used for critical actions and brand presence. This is balanced by a **Secondary Purple** (#7C3AED) which represents wisdom and creativity, used for navigation highlights and instructional elements.

- **Success/Safety**: Use a soft emerald green for positive feedback.
- **Backgrounds**: Use pure White (#FFFFFF) for primary surfaces, with Tertiary Slate (#F8FAFC) for container backgrounds to provide subtle contrast.
- **Text**: Use deep Navy/Slate (#1E293B) instead of pure black to maintain a softer, more premium feel.

## Typography
The system uses a pairing of **Plus Jakarta Sans** for structure and **Quicksand** for approachability. 

- **Plus Jakarta Sans** is used for all headlines and labels. Its slightly wider stance and modern terminals provide the "Professional" half of the brand personality.
- **Quicksand** is used for all body copy and long-form text. Its rounded terminals make reading feel effortless and child-friendly, reducing the visual "weight" of administrative data.
- **Visual Hierarchy**: Use heavy weights (700-800) for headlines to create a strong, confident focal point.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy to ensure the management dashboard remains functional on tablets (common in classroom settings) and desktops (common for admin).

- **Grid System**: A 12-column grid is used for desktop with a 24px gutter.
- **Mobile**: Margins scale down to 16px, and columns collapse into a single vertical stack.
- **Rhythm**: All spacing is derived from an 8px base unit. Component internal padding should favor "breathability"—use 16px (2x) or 24px (3x) for card padding to prevent the UI from feeling cramped.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Soft Ambient Shadows**. 

- **Surfaces**: Primary content lives on white cards. The background of the application is a very light grey/blue tint to make the white cards "pop."
- **Shadows**: Avoid harsh, dark shadows. Use a "Cloud Shadow" style: high blur (20px+), low opacity (around 5-8%), and a tiny hint of the secondary purple color in the shadow mix to keep the tones warm and integrated.
- **Active State**: When an item is dragged or interacted with, increase its elevation using a slightly deeper shadow to mimic it "lifting" off the page.

## Shapes
The shape language is strictly **Rounded**. This removes the "sharpness" and perceived danger often associated with enterprise software, replacing it with a welcoming, tactile feel.

- **Standard Radius**: 0.5rem (8px) for inputs and small buttons.
- **Large Radius (rounded-lg)**: 1rem (16px) for cards and modals.
- **Extra Large Radius (rounded-xl)**: 1.5rem (24px) for hero elements or special "celebration" banners.
- **Icons**: Icons should feature rounded caps and corners to match the typography.

## Components
Consistent implementation of these components ensures the system remains intuitive for users of all technical levels.

### Buttons
- **Primary**: Solid Primary Red with white text. High-contrast, bold, and rounded.
- **Secondary**: Solid Secondary Purple with white text. Used for secondary actions like "Add New" or "Export."
- **Ghost**: Transparent background with a 2px border in Red or Purple. Use for "Cancel" or less frequent actions.

### Cards
- Cards must use the `rounded-lg` (16px) radius.
- Borders should be avoided in favor of a subtle 1px stroke in a light grey or the "Cloud Shadow" elevation.
- Header sections within cards should use a light Purple tint background to distinguish titles.

### Input Fields
- Inputs feature a light grey border that turns Secondary Purple on focus.
- Help text should be in `body-sm` (Quicksand) for clarity.
- Focus states should include a soft purple outer glow (3px) to guide the eye.

### Chips & Badges
- Used for student status (e.g., "Active", "Pending"). These should use the `pill-shaped` radius and high-saturation background tints with darker text of the same hue for maximum legibility.

### Progress Bars
- Essential for tracking learning goals. Use a thick (12px), rounded track. The progress indicator should use the Secondary Purple to symbolize growth.