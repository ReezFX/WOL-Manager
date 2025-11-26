import { Platform } from 'react-native';

// Webapp Dark Theme Color Palette
export const Colors = {
  // Primary colors - Webapp turquoise
  primary: {
    main: '#17a2b8',     // Main turquoise
    light: '#5bc0de',    // Lighter blue (info-color)
    dark: '#0d6e8c',     // Deeper blue-teal
    gradient: ['#17a2b8', '#5bc0de'],
  },
  
  // Accent colors - Webapp coral-orange
  accent: {
    main: '#ff7e5f',     // Complementary coral-orange
    light: '#ff9d82',
    dark: '#ff5f3c',
  },
  
  // Semantic colors - Webapp values
  success: {
    main: '#28b485',     // Distinct green
    light: '#3dc79a',
    dark: '#1f8a68',
    bg: '#1f8a6840',
  },
  
  error: {
    main: '#e25563',     // Clear red (danger-color)
    light: '#e87785',
    dark: '#d23341',
    bg: '#d2334140',
  },
  
  warning: {
    main: '#f9ae56',     // Warm amber
    light: '#fac178',
    dark: '#f39c34',
    bg: '#f39c3440',
  },
  
  info: {
    main: '#5bc0de',     // Lighter blue
    light: '#7dcfe8',
    dark: '#3da8d5',
    bg: '#3da8d540',
  },
  
  // Background colors - Dark theme from webapp
  background: {
    primary: '#1a1a1c',    // bg-primary
    secondary: '#242426',  // bg-secondary
    tertiary: '#2d2d30',   // bg-tertiary (card backgrounds)
    dark: '#1a1a1c',
    darkSecondary: '#242426',
    gradient: ['#1a1a1c', '#242426'],
  },
  
  // Text colors - Dark theme from webapp
  text: {
    primary: '#f8f9fa',    // text-primary (light text)
    secondary: '#ced4da',  // text-secondary
    tertiary: '#adb5bd',   // text-muted
    disabled: '#6c757d',
    inverse: '#212529',    // For light backgrounds
  },
  
  // Border colors - Dark theme from webapp
  border: {
    light: '#444446',      // border-light
    main: '#3a3a3d',       // border-color
    dark: '#2d2d30',
  },
  
  // Status colors
  status: {
    online: '#28b485',
    offline: '#e25563',
    unknown: '#adb5bd',
  },
  
  // Glass effect colors - Dark theme
  glass: {
    background: 'rgba(45, 45, 48, 0.95)',    // bg-tertiary with opacity
    backgroundDark: 'rgba(36, 36, 38, 0.95)',
    border: 'rgba(68, 68, 70, 0.5)',         // border-light with opacity
    shadow: 'rgba(0, 0, 0, 0.25)',
  },
};

// Typography
export const Typography = {
  // Font families
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing system (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 28,
  '2xl': 24,
  full: 9999,
};

// Shadows (iOS and Android) - Dark theme from webapp
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,      // Stronger for dark theme
    shadowRadius: 5,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,      // apple-shadow dark
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,      // apple-shadow-lg dark
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 12,
  },
  
  // Glass morphism shadow
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Glass morphism effect
export const GlassEffect = {
  backgroundColor: Colors.glass.background,
  borderWidth: 1,
  borderColor: Colors.glass.border,
  ...Shadows.glass,
};

// Animation durations
export const AnimationDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
};

// Layout constants
export const Layout = {
  bottomTabHeight: 64,
  bottomTabMargin: 16,
  headerHeight: 56,
  inputHeight: 48,
  buttonHeight: 48,
  cardMinHeight: 80,
  maxContentWidth: 600,
};

// Icon sizes
export const IconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
};
