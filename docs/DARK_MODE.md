# Dark Mode Implementation

Choriot now supports automatic dark mode based on system preferences! 🌙

## Features

- **Automatic detection**: Respects your system's dark mode preference (macOS, Windows, Linux)
- **No flash**: Page loads with correct theme immediately
- **Persistent**: Your preference is saved in localStorage
- **Smooth transitions**: All UI elements are styled for both light and dark modes

## How It Works

The app uses Tailwind CSS's built-in dark mode support with the `class` strategy. When your system is set to dark mode, the app automatically switches to dark colors.

### Technical Details

1. **Theme Provider** (`app/theme-provider.tsx`):
   - Detects system preference via `prefers-color-scheme` media query
   - Saves user preference to localStorage
   - Manages the `dark` class on the HTML root element

2. **Flash Prevention** (`app/layout.tsx`):
   - Inline script runs before page render
   - Checks localStorage and system preference
   - Adds `dark` class immediately if needed

3. **Tailwind Classes**:
   - All components use `dark:` prefix for dark mode styles
   - Example: `bg-white dark:bg-gray-800`

## Color Scheme

### Light Mode
- Background: White, Gray 50
- Text: Gray 900, Gray 600
- Primary: Indigo 600
- Cards: White with subtle shadows

### Dark Mode
- Background: Gray 900, Gray 800
- Text: White, Gray 300
- Primary: Indigo 400/500
- Cards: Gray 800 with dark shadows

## Browser Support

Works in all modern browsers that support:
- CSS custom properties
- `prefers-color-scheme` media query
- localStorage

This includes:
- Chrome/Edge 76+
- Firefox 67+
- Safari 12.1+

## Future Enhancements

While the current implementation uses automatic system detection, we could add:

1. **Manual toggle**: Let users override system preference
2. **Theme switcher UI**: Button in header to cycle through light/dark/system
3. **Custom themes**: Add alternative color schemes (blue, green, etc.)
4. **Scheduled switching**: Auto-switch based on time of day

## Usage

Simply set your operating system to dark mode and the app will follow:

**macOS**: System Preferences → General → Appearance → Dark

**Windows 10/11**: Settings → Personalization → Colors → Choose your color → Dark

**iOS/Android**: System Settings → Display → Dark mode

The app will automatically match your system preference!
