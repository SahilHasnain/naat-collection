# Naat Platform - Styling Guide

## Design System Overview

This document outlines the consistent styling approach used throughout the Naat Platform mobile application.

## Color Palette

### Primary Colors

- **Primary Blue**: `#2563eb` (primary-600)
  - Used for: CTAs, active states, loading indicators
  - Variants: 50-900 scale available

### Neutral Colors

- **Light Mode Background**: `#fafafa` (neutral-50)
- **Dark Mode Background**: `#171717` (neutral-900)
- **Card Background Light**: `#ffffff` (white)
- **Card Background Dark**: `#262626` (neutral-800)

### Text Colors (High Contrast)

- **Primary Text Light**: `#171717` (neutral-900)
- **Primary Text Dark**: `#ffffff` (white)
- **Secondary Text Light**: `#525252` (neutral-600)
- **Secondary Text Dark**: `#d4d4d4` (neutral-300)
- **Tertiary Text Light**: `#737373` (neutral-500)
- **Tertiary Text Dark**: `#a3a3a3` (neutral-400)

## Typography

### Font Sizes & Line Heights

- **3xl**: 30px / 36px (Page titles)
- **2xl**: 24px / 32px (Section headers)
- **xl**: 20px / 28px (Card titles)
- **lg**: 18px / 28px (Emphasized text)
- **base**: 16px / 24px (Body text)
- **sm**: 14px / 20px (Secondary text)
- **xs**: 12px / 16px (Captions, metadata)

### Font Weights

- **Bold**: 700 (Headings, CTAs)
- **Semibold**: 600 (Subheadings)
- **Medium**: 500 (Labels)
- **Regular**: 400 (Body text)

## Spacing System

### Consistent Spacing Scale

- **1**: 4px
- **2**: 8px
- **3**: 12px
- **4**: 16px
- **6**: 24px
- **8**: 32px
- **12**: 48px
- **16**: 64px
- **20**: 80px

### Component Spacing

- **Card padding**: 16px (p-4)
- **Screen padding**: 24px (px-6)
- **Card margin bottom**: 16px (mb-4)
- **Section spacing**: 32px (space-y-8)

## Border Radius

- **Small**: 8px (rounded-lg)
- **Medium**: 12px (rounded-xl)
- **Large**: 16px (rounded-2xl)
- **Full**: 9999px (rounded-full)

## Shadows & Elevation

### Light Mode Shadows

- **Small**: `shadow-sm` - Subtle elevation
- **Medium**: `shadow-md` - Cards, buttons
- **Large**: `shadow-lg` - Modals, overlays

### Shadow Colors

- Primary actions: `#2563eb` with 30% opacity
- Default: `#000000` with 10% opacity

## Component-Specific Styles

### NaatCard

- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-md`
- Image height: 192px (h-48)
- Content padding: 16px (p-4)
- Active state: 98% scale + 90% opacity

### SearchBar

- Border radius: `rounded-xl` (12px)
- Padding: 14px horizontal, 14px vertical
- Border: 1px solid neutral-200/600
- Icon size: 18px (text-lg)

### Buttons (Primary)

- Border radius: `rounded-xl` (12px)
- Padding: 32px horizontal, 16px vertical
- Font: Bold, 16px
- Shadow: Large with primary color

### EmptyState

- Icon size: 56px (text-7xl)
- Message: 18px, leading-relaxed
- Max width: 384px (max-w-sm)

## Accessibility

### Contrast Ratios

All text meets WCAG AA standards:

- **Large text (18px+)**: Minimum 3:1 contrast
- **Normal text**: Minimum 4.5:1 contrast
- **Interactive elements**: Minimum 3:1 contrast

### Focus States

- Outline: 2px solid primary-600
- Outline offset: 2px
- Applied via `.focus-visible` utility

### Touch Targets

- Minimum size: 44x44px
- Buttons: 48px+ height
- Interactive elements: Adequate spacing

## Dark Mode Support

All components support dark mode using the `dark:` prefix:

- Automatic color inversion for backgrounds
- Adjusted text colors for readability
- Border colors adapted for visibility
- Shadow adjustments for depth perception

### Dark Mode Classes

```
bg-neutral-50 dark:bg-neutral-900
text-neutral-900 dark:text-white
border-neutral-200 dark:border-neutral-600
```

## Animation & Transitions

### Pressable States

- Scale: 98% on active
- Opacity: 90% on active
- Transition: 150ms ease-out

### Image Loading

- Fade-in transition: 200ms
- Placeholder: Neutral background with icon

## Best Practices

1. **Consistency**: Always use design tokens from tailwind.config.js
2. **Spacing**: Use the 4px base spacing scale
3. **Typography**: Maintain hierarchy with size and weight
4. **Colors**: Use semantic color names (primary, neutral)
5. **Accessibility**: Test with screen readers and high contrast mode
6. **Performance**: Use React.memo for list items
7. **Dark Mode**: Always provide dark mode variants

## Implementation Examples

### Card Component

```tsx
<View className="rounded-xl bg-white dark:bg-neutral-800 shadow-md p-4">
  <Text className="text-lg font-bold text-neutral-900 dark:text-white">
    Title
  </Text>
</View>
```

### Button Component

```tsx
<Pressable className="rounded-xl bg-primary-600 px-8 py-4 active:bg-primary-700">
  <Text className="text-base font-bold text-white">Action</Text>
</Pressable>
```

### Text Hierarchy

```tsx
<Text className="text-3xl font-bold text-neutral-900 dark:text-white">
  Page Title
</Text>
<Text className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
  Subtitle
</Text>
<Text className="text-base text-neutral-600 dark:text-neutral-400">
  Body text
</Text>
```
