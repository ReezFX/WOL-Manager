# WOL Manager - React Native Mobile App

Modern React Native mobile application for the WOL-Manager server with improved authentication and session handling.

## Features

- ✅ **Robust Authentication** - Improved CSRF token and session management
- ✅ **HTTP & HTTPS Support** - Works with both encrypted and non-encrypted connections  
- ✅ **Host Management** - View all hosts with real-time status
- ✅ **Wake-on-LAN** - Send WOL packets to wake up hosts
- ✅ **Pull-to-Refresh** - Refresh host status with a simple swipe
- ✅ **Persistent Sessions** - Stay logged in across app restarts
- ✅ **WebApp-Consistent Design** - Gradients, glass cards, and matching UI
- ✅ **Android Studio Compatible** - Full support for emulator testing and APK building

## Installation

```bash
cd /Users/reez/WOL-Manager/mobile-react
npm install
```

## Development

Run in Android Studio emulator:
```bash
npm run android
```

Or open `android/` folder in Android Studio and click Run.

## Build APK

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

See full documentation in the project files.
