# WOL Manager Android App

Native Android App für den WOL-Manager Server.

## Funktionen

- ✅ Server-Konfiguration beim ersten Start
- ✅ Sichere Authentifizierung mit CSRF-Token
- ✅ Host-Liste mit Echtzeit-Status
- ✅ Wake-on-LAN Funktion für alle konfigurierten Hosts
- ✅ Pull-to-Refresh für Host-Liste
- ✅ Persistente Speicherung der Server-Konfiguration
- ✅ Material Design 3 UI
- ✅ Dark Mode Support

## Tech Stack

- **Kotlin** - Moderne Programmiersprache für Android
- **Jetpack Compose** - Deklaratives UI Framework
- **MVVM Architektur** - Model-View-ViewModel Pattern
- **Retrofit** - HTTP Client für API-Kommunikation
- **Room** - Lokale Datenspeicherung
- **Navigation Compose** - App-Navigation
- **Coroutines** - Asynchrone Programmierung

## Entwicklung

### Voraussetzungen

- Android Studio Hedgehog (2023.1.1) oder neuer
- JDK 17 oder neuer
- Android SDK API 34

### Projekt öffnen

1. Android Studio öffnen
2. "Open" wählen
3. Zum Ordner `/Users/reez/WOL-Manager/mobile` navigieren
4. Projekt öffnen

### App bauen und ausführen

1. In Android Studio ein Emulator-Device erstellen (z.B. Pixel 5 mit API 34)
2. Emulator starten
3. Run-Button klicken oder `Shift + F10` drücken

### Gradle Sync

Nach dem ersten Öffnen führt Android Studio automatisch einen Gradle Sync durch. Falls nicht:
- "File" > "Sync Project with Gradle Files"

## Verwendung

1. **Erstes Setup:**
   - App starten
   - IP:Port oder Domain des WOL-Manager Servers eingeben (z.B. `192.168.1.100:8008`)
   - "Continue" klicken

2. **Login:**
   - Benutzername eingeben (Standard: `WOLadmin`)
   - Passwort eingeben (Standard: `Manager`)
   - "Login" klicken

3. **Hosts verwalten:**
   - Host-Liste wird automatisch geladen
   - Status wird durch farbigen Indicator angezeigt (Grün = Online, Rot = Offline)
   - "Wake" Button klicken um einen Host aufzuwecken
   - Pull-to-Refresh für Status-Aktualisierung
   - Logout über das Menü oben rechts

## Architektur

```
com.wolmanager/
├── data/
│   ├── local/          # Room Database (ServerConfig)
│   ├── models/         # Data Classes (Host, User, etc.)
│   └── remote/         # Retrofit API Service
├── repository/         # Repository Pattern
├── viewmodel/          # ViewModels (MVVM)
└── ui/
    ├── screens/        # Composable Screens
    ├── components/     # Wiederverwendbare UI Components
    ├── theme/          # Material Design Theme
    └── navigation/     # Navigation Graph
```

## API Integration

Die App kommuniziert mit den folgenden Backend-Endpunkten:

- `GET /auth/login` - CSRF Token holen
- `POST /auth/login` - Login mit Credentials
- `GET /auth/logout` - Logout
- `GET /hosts/api/status` - Host-Status abrufen
- `POST /wol/wake/{host_id}` - Wake-on-LAN senden
- `GET /auth/api/refresh-csrf-token` - CSRF Token erneuern

## Sicherheit

- Cookies werden automatisch verwaltet für Session-Persistenz
- CSRF-Tokens werden bei jedem Request validiert
- Cleartext Traffic ist erlaubt für lokale IP-Adressen
- Session-Daten werden lokal verschlüsselt gespeichert

## Bekannte Limitierungen

- Die App unterstützt derzeit nur HTTP (nicht HTTPS)
- Keine Host-Verwaltung (Hinzufügen/Bearbeiten/Löschen) in der App
- Keine 2FA-Unterstützung
- Diese Features können in zukünftigen Versionen hinzugefügt werden

## Troubleshooting

### Verbindung zum Server fehlgeschlagen

- Stelle sicher, dass der WOL-Manager Server läuft
- Überprüfe die eingegebene Server-URL
- Stelle sicher, dass das Android-Gerät/Emulator das Netzwerk erreichen kann
- Bei Emulator: `10.0.2.2` statt `localhost` verwenden

### Gradle Build Fehler

```bash
# Gradle Cache löschen
./gradlew clean

# Projekt neu bauen
./gradlew build
```

### App stürzt beim Start ab

- Logcat in Android Studio überprüfen
- Stelle sicher, dass alle Dependencies korrekt synchronisiert sind

## Zukünftige Features

- [ ] Host-Verwaltung (CRUD-Operationen)
- [ ] HTTPS Support
- [ ] 2FA-Unterstützung
- [ ] Mehrere Server-Profile
- [ ] Host-Details-Ansicht
- [ ] WOL-Historie
- [ ] Push-Benachrichtigungen
- [ ] Widget für Quick-Wake
