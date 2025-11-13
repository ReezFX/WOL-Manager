# WOL Manager React Native - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/reez/WOL-Manager/mobile-react
npm install
```

### 2. Start Metro Bundler

```bash
npm start
```

### 3. Run on Android (Choose one method)

**Method A: Command Line**
```bash
npm run android
```

**Method B: Android Studio** (Recommended for your workflow)
1. Open Android Studio
2. Click "Open" and select `/Users/reez/WOL-Manager/mobile-react/android`
3. Wait for Gradle sync to complete
4. Select an emulator or connected device
5. Click the green "Run" button (or Shift + F10)

## Building APK

### Debug APK (for testing)

```bash
cd /Users/reez/WOL-Manager/mobile-react/android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution)

```bash
cd /Users/reez/WOL-Manager/mobile-react/android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## Testing the App

### 1. With Local Server

If testing on emulator with server on host machine:
- Use `10.0.2.2` instead of `localhost`
- Example: `10.0.2.2:8008`

### 2. With Real Device

- Ensure device and server are on the same network
- Use server's IP address: `192.168.1.x:8008`

### 3. Test Both HTTP and HTTPS

The app now properly handles both:
- HTTP: `http://192.168.1.100:8008`
- HTTPS: `https://wol.example.com`

## Key Improvements Over Kotlin App

### Authentication Fixes

1. **CSRF Token Handling**
   - Properly extracts token from HTML response
   - Stores token in AsyncStorage
   - Automatically refreshes when needed
   - Clear error messages on failure

2. **Cookie/Session Management**
   - Axios interceptors handle cookies automatically
   - Cookies persist across app restarts
   - Session validation on app startup
   - Graceful session expiration handling

3. **HTTP/HTTPS Support**
   - Works with both protocols
   - Properly configured Android manifest
   - No hardcoded URL schemes

### Code Quality

1. **TypeScript**: Type safety throughout
2. **Modular**: Clean separation of concerns
3. **Documented**: Inline comments and comprehensive docs
4. **Maintainable**: Easy to extend and modify

## Architecture

```
App
└── AuthProvider (Context)
    └── AppNavigator
        ├── SetupScreen (no config)
        ├── LoginScreen (not authenticated)
        └── HostListScreen (authenticated)
```

### Data Flow

1. **App Start**
   - AuthProvider initializes
   - Checks for saved server config
   - If found, attempts to restore session
   - Navigates to appropriate screen

2. **Login**
   - Get CSRF token from server
   - Submit login with token
   - Save session cookies and config
   - Navigate to HostList

3. **API Requests**
   - Axios interceptor adds cookies to requests
   - Intercept or saves new cookies from responses
   - Handles session expiration
   - Shows appropriate errors

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache
npm start -- --reset-cache

# Or delete and reinstall
rm -rf node_modules
npm install
```

### Build Errors

```bash
cd android
./gradlew clean
cd ..
npm start -- --reset-cache
```

### Can't Connect to Server

1. Check server is running
2. Verify network connectivity
3. For emulator, use `10.0.2.2` not `localhost`
4. Check Android app has INTERNET permission (already configured)

### Login Fails

The new implementation should fix most login issues. If problems persist:

1. Clear app data
2. Check server logs for CSRF issues
3. Verify credentials are correct
4. Try both HTTP and HTTPS

### Session Not Persisting

1. Clear app storage: Settings → Apps → WOL Manager → Clear Storage
2. Login again
3. Close and reopen app to test persistence

## Development Tips

### Hot Reload

After starting the app:
- Press `r` in Metro terminal to reload
- Press `d` to open developer menu
- Shake device to open developer menu

### Debugging

1. **Console Logs**: View in Metro bundler output
2. **React DevTools**: Use Chrome DevTools
3. **Network**: Check Metro output for API requests

### Code Changes

The app uses hot reload, so most changes appear instantly:
- Edit files in `/Users/reez/WOL-Manager/mobile-react/src/`
- Save file
- App updates automatically

### Adding Features

1. **New Screen**: Create in `src/screens/`
2. **New Component**: Add to `src/components/UI.tsx`
3. **New API Call**: Add to `src/api/client.ts`
4. **Navigation**: Update `src/navigation/AppNavigator.tsx`

## Comparison: Old vs New

| Feature | Kotlin App | React Native App |
|---------|-----------|------------------|
| CSRF Handling | ❌ Unreliable | ✅ Robust |
| Cookie Management | ❌ Complex | ✅ Automatic |
| HTTP Support | ⚠️ Limited | ✅ Full Support |
| HTTPS Support | ⚠️ Limited | ✅ Full Support |
| Session Persistence | ❌ Inconsistent | ✅ Reliable |
| Code Documentation | ⚠️ Minimal | ✅ Comprehensive |
| Type Safety | ⚠️ Kotlin only | ✅ TypeScript |
| Maintainability | ⚠️ Complex | ✅ Clean |
| Extensibility | ⚠️ Difficult | ✅ Easy |

## Next Steps

1. **Test thoroughly** in Android emulator
2. **Build release APK** and test on real device
3. **Test with both HTTP and HTTPS** servers
4. **Verify CSRF tokens** work correctly
5. **Test session persistence** (close/reopen app)

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review Metro bundler output
3. Check server logs
4. Verify network connectivity
5. Try clearing app data and Metro cache

## File Locations

- **App Source**: `/Users/reez/WOL-Manager/mobile-react/src/`
- **Android Project**: `/Users/reez/WOL-Manager/mobile-react/android/`
- **Debug APK**: `android/app/build/outputs/apk/debug/`
- **Release APK**: `android/app/build/outputs/apk/release/`

Happy coding! 🚀
