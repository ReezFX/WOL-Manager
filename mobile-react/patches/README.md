# Patches

This directory contains patches for third-party dependencies that are automatically applied after `npm install` via `patch-package`.

## @react-native-community/blur@4.4.1

**Issue:** BlurView incorrectly layered above child components in React Native New Architecture  
**Source:** https://github.com/Kureev/react-native-blur/issues/628  
**Platforms:** iOS and Android

### Problem
In React Native's New Architecture, `BlurView` renders on top of its child components instead of blurring the background behind them. This causes UI elements inside the BlurView to be obscured by the blur effect itself.

### Solution

**iOS (`BlurView.mm`):**
- `mountChildComponentView`: Properly inserts child components into the blur effect's `contentView` at the correct index
- `unmountChildComponentView`: Cleanly removes child components when unmounted

**Android (`BlurViewManager.java`):**
- `addView`: Override to properly add child views to the BlurView container at the correct index
- `removeViewAt`: Override to properly remove child views from the BlurView container

Both fixes ensure that child components render correctly **above** the blur effect, not behind it.

### Usage in this project
Applied to the bottom navigation dock in `src/navigation/AppNavigator.tsx` to create a proper blurred glass effect behind the tab bar icons.

### Maintenance
- The patch is automatically applied after `npm install` via the `postinstall` script
- If upgrading `@react-native-community/blur`, test if this patch is still needed
- Check the original GitHub issue for official fixes in future releases
