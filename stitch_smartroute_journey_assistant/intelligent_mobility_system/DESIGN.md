---
name: Intelligent Mobility System
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
  on-surface-variant: '#464554'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#553300'
  on-tertiary: '#ffffff'
  tertiary-container: '#744800'
  on-tertiary-container: '#ffb759'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.4px
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.4px
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.4px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.4px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.2px
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.4px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-main: 1.25rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
  touch-target-min: 44px
---

## Brand & Style
The design system is engineered for a premium, iOS-first journey optimization experience. The brand personality is **Calm**, **Intelligent**, and **Trustworthy**, prioritizing clarity and reduced cognitive load during navigation and planning.

The style is **Refined Minimalism** with a heavy focus on native iOS patterns. It utilizes high-quality whitespace, a restrained color palette, and sophisticated elevation to create a sense of effortless intelligence. The interface should feel like a premium extension of the OS, utilizing familiar gestures like edge-swiping and fluid bottom-sheet transitions to ensure the user feels in total control of their transit data.

## Colors
The palette is centered around **Deep Indigo**, signaling deep-tech intelligence and reliability. Semantic colors are utilized strictly for status communication: **Emerald** for "Optimized/Go," **Amber** for "Caution/Traffic," and **Rose** for "Critical Delay/Error."

- **Primary (Deep Indigo):** Used for primary actions, active route paths, and branding elements.
- **Surface (Gray-50):** Used for card backgrounds and secondary layout sections to create subtle contrast against the white base.
- **Text (Slate):** Primary text uses Slate-800/900 for maximum legibility, while secondary metadata uses Slate-500.

## Typography
While the system defaults to native SF Pro on-device, **Inter** is specified for cross-platform consistency, mimicking the high-legibility, neo-grotesque characteristics of Apple's system fonts. 

The hierarchy is "Top-Heavy," using large, bold headlines to anchor views and provide instant context. Body text is set to 17px (iOS Large default) to ensure accessibility while in motion. Tracking is tightened slightly for headings to maintain a premium, editorial feel. Use `headline-lg-mobile` for secondary page titles on smaller devices to prevent awkward line breaks.

## Layout & Spacing
The layout follows a **Fluid Mobile-First** model with a standard 16px or 20px horizontal margin. It relies on a "Stack" philosophy—vertical spacing increments that group related travel information.

- **Bottom Sheets:** The primary container for information density. Use 3 detents (compact, half-height, full-screen).
- **Safe Areas:** Strictly adhere to iOS safe area insets for home indicators and notches.
- **Touch Targets:** No interactive element should be smaller than 44x44px. Information density is achieved through typography scale rather than shrinking targets.

## Elevation & Depth
Depth is signaled through **Ambient Shadows** and **Tonal Layering**. 

1. **Base:** Pure White (#FFFFFF) map or background.
2. **Surface Low:** Gray-50 (#F9FAFB) for secondary groupings or inset sections.
3. **Floating Cards:** Use a very soft, diffused shadow (0px 10px 30px rgba(0,0,0,0.05)) to lift route options or trip summaries above the map.
4. **Modals/Bottom Sheets:** Feature a background blur (UIBlurEffectStyleSystemMaterial) to maintain context of the map underneath while focusing the user's attention.

## Shapes
The shape language is defined by large, friendly radii that evoke a modern, approachable feel. 

- **Cards & Bottom Sheets:** Use `rounded-xl` (24px on mobile) for the top corners of bottom sheets and all corners of floating route cards.
- **Buttons & Inputs:** Use `rounded-lg` (16px) to match the card aesthetic.
- **Chips/Badges:** Use a full pill shape for status indicators (e.g., "On Time").

## Components
- **Primary Buttons:** High-contrast Deep Indigo with white text. 16px corner radius, 56px height for primary mobile actions.
- **Route Cards:** White background, 24px radius, subtle 5% black shadow. Content inside uses a "Triple-Row" layout: (1) Destination & ETA, (2) Route Details/Status, (3) Action Buttons.
- **Bottom Sheets:** Handlebar at the top (36x5px, Slate-200). Fluid transition between states.
- **Status Chips:** High-saturation background at 10% opacity with 100% opacity text of the same color (e.g., Emerald chip for "Fastest").
- **Input Fields:** Gray-50 background, no border, 16px radius. On focus, add a 2px Deep Indigo stroke.
- **Segmented Control:** Native iOS-style pill for switching between transit modes (Car, Bike, Walk, Rail).