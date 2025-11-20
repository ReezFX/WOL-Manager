# Widget Feature - WOL Manager Android

## Übersicht

Die WOL Manager Android App unterstützt jetzt Home Screen Widgets, mit denen Sie Ihre Hosts direkt vom Android-Homescreen aufwecken können, ohne die App öffnen zu müssen.

## Features

- **Schnellzugriff**: Wecken Sie Hosts direkt vom Homescreen
- **Mehrere Widgets**: Fügen Sie mehrere Widgets für verschiedene Hosts hinzu
- **Server & Public Hosts**: Unterstützt sowohl Server-basierte als auch Public Hosts
- **Einfache Konfiguration**: Intuitive Konfiguration innerhalb der App
- **Automatische Synchronisation**: Widget-Konfigurationen werden automatisch verwaltet

## Wie man Widgets hinzufügt

### Methode 1: Manuell vom Homescreen

1. **Langer Druck auf den Homescreen** Ihres Android-Geräts
2. **Tippen Sie auf "Widgets"**
3. **Suchen Sie "WOLManagerReact"** in der Widget-Liste
4. **Ziehen Sie das Widget** auf Ihren Homescreen
5. **Öffnen Sie die App** und gehen Sie zu:
   - **Profile** → **Widget Management**
6. **Wählen Sie den Host** für das neue Widget aus

### Methode 2: Über die App (Android 8.0+)

1. Öffnen Sie die WOL Manager App
2. Gehen Sie zu **Profile** → **Widget Management**
3. Tippen Sie auf **"Try to Add Widget"**
4. Das System öffnet den Widget-Picker
5. Platzieren Sie das Widget auf Ihrem Homescreen
6. Wählen Sie in der App den gewünschten Host aus

## Widget-Verwaltung

### Zugriff auf Widget Management

1. Öffnen Sie die App
2. Navigieren Sie zu **Profile** (unterer Tab-Navigator)
3. Tippen Sie auf **"Widget Management"**

### Widget konfigurieren/rekonfigurieren

Im Widget Management Screen können Sie:

- **Alle konfigurierten Widgets** anzeigen
- **Widgets rekonfigurieren** - Ändern Sie den zugewiesenen Host
- **Widget-Konfigurationen entfernen** - Entfernt die Konfiguration, Widget bleibt auf dem Homescreen
- **Verwaiste Konfigurationen bereinigen** - Entfernt Konfigurationen für gelöschte Widgets

### Host-Auswahl

- **Server-Modus**: Wählen Sie aus allen verfügbaren Hosts auf Ihrem WOL-Manager Server
- **Public Host-Modus**: Nutzen Sie den konfigurierten Public Host

## Widget-Funktionalität

### Was das Widget anzeigt

- **Host-Name**: Der Name des zugewiesenen Hosts
- **MAC-Adresse**: Die MAC-Adresse des Hosts
- **Wake-Button**: Großer Button zum Aufwecken des Hosts

### Wake-Funktion

- **Tippen Sie auf den Wake-Button** im Widget
- Das System sendet ein **Wake-on-LAN Magic Packet**
- Sie erhalten eine **Toast-Benachrichtigung** über den Status
- Der Vorgang läuft **im Hintergrund**, ohne die App zu öffnen

## Technische Details

### Anforderungen

- **Android-Version**: 5.0 (Lollipop) oder höher
- **Berechtigungen**: 
  - Internet (für Server-basierte Hosts)
  - Netzwerkzugriff
  - WiFi-Status (für WOL-Funktionalität)

### Widget-Größen

- **Minimalgröße**: 180dp × 110dp
- **Empfohlene Größe**: 2×2 Zellen
- **Anpassbar**: Horizontal und vertikal skalierbar

### Daten-Synchronisation

- Widget-Konfigurationen werden in **SharedPreferences** gespeichert
- React Native App nutzt **AsyncStorage** für zusätzliche Metadaten
- Beide Speicher werden automatisch synchronisiert

### Netzwerk-Funktionalität

Das Widget sendet WOL-Pakete direkt, ohne die App zu öffnen:
- **Broadcast-Adresse**: 255.255.255.255 (oder spezifische IP)
- **Ports**: 9 (Standard), 7, 2304 (zusätzlich für Kompatibilität)
- **Protokoll**: UDP mit Standard WOL Magic Packet Format

## Fehlerbehebung

### Widget zeigt "Not Configured"

**Problem**: Widget wurde hinzugefügt, aber kein Host wurde zugewiesen.

**Lösung**:
1. Öffnen Sie die App
2. Gehen Sie zu **Profile** → **Widget Management**
3. Tippen Sie auf **"Reconfigure"** neben dem Widget
4. Wählen Sie einen Host aus

### Widget funktioniert nicht

**Problem**: Wake-Button sendet kein Paket.

**Lösung**:
1. Überprüfen Sie Ihre Netzwerkverbindung
2. Stellen Sie sicher, dass Sie im gleichen Netzwerk wie der Ziel-Host sind
3. Überprüfen Sie, ob der Host WOL unterstützt und aktiviert hat
4. Konfigurieren Sie das Widget neu in der App

### Widget verschwindet nach App-Update

**Problem**: Nach einem App-Update sind Widgets nicht konfiguriert.

**Lösung**:
1. Konfigurationen sollten erhalten bleiben
2. Falls nicht, gehen Sie zu **Widget Management**
3. Nutzen Sie **"Cleanup Orphaned Configs"**
4. Konfigurieren Sie Widgets neu

### "Widget pinning not supported" Fehler

**Problem**: Methode 2 (via App) funktioniert nicht.

**Lösung**:
- Ihr Launcher unterstützt kein programmgesteuertes Hinzufügen von Widgets
- Verwenden Sie **Methode 1** (manuell vom Homescreen)
- Dies ist bei einigen Custom Launchern normal

## Best Practices

1. **Ein Widget pro häufig genutztem Host**: Fügen Sie Widgets für Ihre wichtigsten Hosts hinzu
2. **Aussagekräftige Host-Namen**: Verwenden Sie klare Namen in der App für bessere Widget-Übersicht
3. **Regelmäßige Bereinigung**: Nutzen Sie "Cleanup Orphaned Configs" nach dem Entfernen von Widgets
4. **Testen Sie die Verbindung**: Wecken Sie einen Host zuerst aus der App, bevor Sie ein Widget hinzufügen

## Architektur (für Entwickler)

### Komponenten

1. **WOLWidgetProvider.kt**: Android AppWidgetProvider für Widget-Lifecycle
2. **WakeService.kt**: Background Service für WOL-Paket-Versand
3. **WidgetConfigHelper.kt**: Konfigurationsverwaltung in SharedPreferences
4. **WidgetModule.kt**: React Native Native Module Bridge
5. **WidgetModule.ts**: TypeScript Bridge für React Native
6. **WidgetManagementScreen.tsx**: UI für Widget-Verwaltung in der App

### Datenfluss

```
User Action (Widget) 
  → WOLWidgetProvider 
  → WakeService 
  → UDP Socket 
  → WOL Magic Packet 
  → Network
```

### Konfigurationsfluss

```
App (React Native) 
  → WidgetModule.ts 
  → WidgetModule.kt 
  → WidgetConfigHelper.kt 
  → SharedPreferences
```

## Lizenz

Dieses Feature ist Teil der WOL Manager App und unterliegt derselben Lizenz wie das Hauptprojekt.
