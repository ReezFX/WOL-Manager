// Colors from webapp (matching Kotlin app)
export const Colors = {
  // Brand Colors
  primary: '#17a2b8',      // Turquoise
  secondary: '#0d6e8c',    // Deep blue-teal
  accent: '#ff7e5f',       // Coral-orange
  success: '#28b485',      // Green
  danger: '#e25563',       // Red
  warning: '#f9ae56',      // Amber
  info: '#5bc0de',         // Light blue
  
  // Gradients (for gradient start/end colors)
  gradientStart: {
    primaryButton: '#ff9579',
    successButton: '#31c98d',
    dangerButton: '#ff6b7a',
    cardHeader: '#17a2b8',
  },
  gradientEnd: {
    primaryButton: '#ff7e5f',
    successButton: '#28b485',
    dangerButton: '#e25563',
    cardHeader: '#ff7e5f',
  },
  
  // Background colors
  background: {
    light: '#f8f9fa',
    dark: '#1a1a1c',
  },
  
  // Surface colors
  surface: {
    light: '#ffffff',
    dark: '#2d2d2f',
  },
  
  // Text colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#ffffff',
    dark: '#1a1a1c',
  },
  
  // Status colors (for badges)
  status: {
    online: '#28b485',
    offline: '#e25563',
    unknown: '#666666',
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Typography
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};
