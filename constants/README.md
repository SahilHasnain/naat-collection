# Theme System

This directory contains the centralized theme configuration for the app, focused on dark mode colors.

## Usage

Import the theme constants in your components:

```typescript
import { colors, shadows, tw } from "@/constants/theme";
```

### Colors

Use the `colors` object for inline styles:

```typescript
<View style={{ backgroundColor: colors.background.primary }}>
  <Text style={{ color: colors.text.primary }}>Hello</Text>
</View>
```

Or use ActivityIndicator colors:

```typescript
<ActivityIndicator color={colors.accent.primary} />
```

### Tailwind Classes

For Tailwind/NativeWind classes, use the predefined classes directly:

```typescript
<View className="bg-black text-white border-neutral-700">
```

### Shadows

Use the `shadows` object for consistent shadow styling:

```typescript
<View style={shadows.md}>
  {/* Content */}
</View>
```

## Color Palette

### Background Colors

- `background.primary` - #000000 (black)
- `background.secondary` - #171717 (neutral-900)
- `background.tertiary` - #262626 (neutral-800)
- `background.elevated` - #404040 (neutral-700)

### Text Colors

- `text.primary` - #ffffff (white)
- `text.secondary` - #a3a3a3 (neutral-400)
- `text.tertiary` - #737373 (neutral-500)
- `text.disabled` - #525252 (neutral-600)

### Border Colors

- `border.primary` - #404040 (neutral-700)
- `border.secondary` - #262626 (neutral-800)
- `border.subtle` - #171717 (neutral-900)

### Accent Colors

- `accent.primary` - #1DB954 (Spotify green for audio/music)
- `accent.secondary` - #2563eb (blue for primary actions)
- `accent.success` - #10b981 (green for success states)
- `accent.error` - #ef4444 (red for errors)
- `accent.warning` - #f59e0b (orange for warnings)

### Interactive States

- `interactive.hover` - #525252 (neutral-600)
- `interactive.active` - #737373 (neutral-500)
- `interactive.disabled` - #262626 (neutral-800)

### Overlay Colors

- `overlay.dark` - rgba(0, 0, 0, 0.8)
- `overlay.medium` - rgba(0, 0, 0, 0.5)
- `overlay.light` - rgba(0, 0, 0, 0.3)

## Best Practices

1. Always use theme colors instead of hardcoded values
2. Use semantic color names (e.g., `colors.text.primary` instead of `#ffffff`)
3. For Tailwind classes, use the neutral color scale for consistency
4. Use the predefined shadows for consistent elevation
5. Keep the dark mode aesthetic consistent across all components
