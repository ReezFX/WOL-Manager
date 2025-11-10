# WOL Manager Mobile App - Design System

## Overview

Die Mobile App implementiert das exakte Design-System der Webapp mit Fokus auf:
- **Farbverläufe (Gradients)** - Alle UI-Elemente nutzen die gleichen Gradients wie die Webapp
- **Glassmorphism** - Transparente Cards mit Backdrop-Blur-Effekten
- **Enhanced Shadows** - Mehrschichtige Schatten für Tiefe
- **Consistent Branding** - Identische Farbpalette und Abstände

## Design-Komponenten

### 1. Gradients (`Gradients.kt`)

Alle Gradients sind 1:1 aus den Webapp CSS-Dateien übernommen:

```kotlin
// Primary Button (aus buttons.css)
AppGradients.PrimaryButton  // linear-gradient(135deg, #ff9579, #ff7e5f)

// Success Button
AppGradients.SuccessButton  // linear-gradient(135deg, #31c98d, #28b485)

// Card Header
AppGradients.CardHeader     // linear-gradient(135deg, primary, accent)

// Status Badges
AppGradients.StatusBadgeSuccess  // mit Transparenz
AppGradients.StatusBadgeDanger   // mit Transparenz
```

### 2. Wiederverwendbare Komponenten (`AppComponents.kt`)

#### GradientButton
```kotlin
GradientButton(
    onClick = { },
    text = "Login",
    gradient = AppGradients.PrimaryButton,
    icon = Icons.Default.Lock
)
```
- Gradient-Hintergrund
- Enhanced Shadows
- Icon-Support
- Disabled-States

#### GlassCard
```kotlin
GlassCard(
    modifier = Modifier.fillMaxWidth(),
    contentPadding = PaddingValues(16.dp),
    elevation = 4.dp
) {
    // Content
}
```
- Semi-transparenter Hintergrund
- Border mit White Overlay
- Shadow mit spotColor
- Webapp-konsistente Border-Radius (20dp)

#### StatusBadge
```kotlin
StatusBadge(
    status = "online", // oder "offline", "unknown"
    showIcon = true
)
```
- Gradient-Hintergründe je nach Status
- Status-Icon (Punkt)
- Border und Shadow
- Lowercase Text wie in Webapp

#### StatisticCard
```kotlin
StatisticCard(
    title = "Total",
    value = "42",
    icon = Icons.Default.Dns,
    iconColor = PrimaryColor
)
```
- Glassmorphic Card
- Icon mit Gradient-Background
- Enhanced Typography
- Schatten-Effekte

#### GradientHeaderCard
```kotlin
GradientHeaderCard(
    title = "Settings",
    headerGradient = AppGradients.CardHeader,
    headerIcon = Icons.Default.Settings
) {
    // Card Content
}
```
- Gradient-Header wie in Webapp
- Icon in semi-transparentem Container
- Webapp-konsistente Abstände

#### SectionSeparator
```kotlin
SectionSeparator(
    title = "Statistics",
    icon = Icons.Default.BarChart
)
```
- Gradient-Icon in Circle
- Uppercase Title mit Letter-Spacing
- Zentrierte Ausrichtung

### 3. Farbpalette (`Theme.kt`)

Identisch zur Webapp:
```kotlin
val PrimaryColor = Color(0xFF17a2b8)   // Turquoise
val SecondaryColor = Color(0xFF0d6e8c) // Deep blue-teal
val AccentColor = Color(0xFFff7e5f)    // Coral-orange
val SuccessColor = Color(0xFF28b485)   // Green
val DangerColor = Color(0xFFe25563)    // Red
val WarningColor = Color(0xFFf9ae56)   // Amber
val InfoColor = Color(0xFF5bc0de)      // Light blue
```

## Screen-spezifische Implementierungen

### Dashboard Screen
- **WelcomeCard**: Gradient-Icon mit Dashboard-Header-Overlay
- **StatisticCards**: Glass-Effect mit Gradient-Icon-Backgrounds
- **SectionSeparators**: Mit Gradient-Icons
- **QuickActionCards**: Glass-Cards mit Gradient-Icon-Containern
- **CompactHostCards**: Glass-Effect mit StatusBadge-Komponente

### Login Screen
- **GlassCard**: Für Login-Form
- **Gradient-Icon**: Lock-Icon mit CardHeader-Gradient
- **GradientButton**: Login-Button mit Primary-Gradient

### Host List Screen
- **ModernHostCard**: 
  - Gradient-Header-Overlay
  - StatusBadge-Komponente
  - Wake-Button mit Success-Gradient
  - View-Button mit Primary-Border
  - Glass-Card-Background

### Settings Screen
- **GlassCard**: Für alle Setting-Cards
- **GradientButton**: Save-Button mit Success-Gradient
- **Gradient-Icon-Containers**: Für alle Icons

### Profile Screen
- **ProfileHeader**: 
  - Gradient-Avatar-Icon
  - StatusBadge für Online-Status
  - Glass-Card-Background
- **ProfileMenuItems**: Glass-Cards mit Gradient-Icons

## Design-Prinzipien

### 1. Konsistenz
- Alle Border-Radius-Werte entsprechen der Webapp
- Schatten-Elevations sind identisch
- Font-Weights und -Sizes matchen die Webapp

### 2. Gradients everywhere
- Buttons verwenden immer Gradients (nie solid colors)
- Icons haben Gradient-Backgrounds
- Headers nutzen Gradient-Overlays
- Status-Badges haben Gradient-Backgrounds

### 3. Glass-Effekt
- Alle Cards verwenden semi-transparente Backgrounds
- White-Border-Overlays für Glassmorphism
- Consistent Elevation-System

### 4. Schatten-Hierarchie
```kotlin
elevation: Dp
- 3.dp  - Kleinere interactive Elements
- 4.dp  - Standard Cards
- 6.dp  - Important Cards (z.B. Profile Header)
- 8.dp  - Top-Level Elements
- 12.dp - Login Card, Special Elements
```

### 5. Animationen
- Elevation-Changes bei isWaking in HostCards
- Smooth transitions (300ms cubic-bezier)
- Scale-Transformationen bei Button-Presses

## Verwendete Webapp-CSS-Quellen

- `buttons.css` - Alle Button-Gradients
- `components.css` - Card-Headers, Badges, Pagination
- `dashboard-enhanced.css` - Glass-Cards, Statistics
- `animations.css` - Status-Pulse-Animationen
- `variables.css` - Farbpalette, Border-Radius
- `separator-designs.css` - Section-Separators

## Migration von alten zu neuen Komponenten

### Vorher (Old Design):
```kotlin
Card(
    colors = CardDefaults.cardColors(
        containerColor = MaterialTheme.colorScheme.surface
    )
) { }
```

### Nachher (Webapp Design):
```kotlin
GlassCard(
    contentPadding = PaddingValues(16.dp),
    elevation = 4.dp
) { }
```

### Vorher (Button):
```kotlin
Button(
    colors = ButtonDefaults.buttonColors(
        containerColor = PrimaryColor
    )
) { Text("Click") }
```

### Nachher (Gradient Button):
```kotlin
GradientButton(
    onClick = { },
    text = "Click",
    gradient = AppGradients.PrimaryButton,
    icon = Icons.Default.Add
)
```

## Nächste Schritte

1. ✅ Gradients implementiert
2. ✅ Glass-Cards implementiert
3. ✅ Enhanced Shadows hinzugefügt
4. ✅ Alle Screens aktualisiert
5. ✅ Komponenten-Bibliothek erstellt
6. ✅ Status-Badges mit Gradients
7. TODO: Wake-Animationen aus Webapp portieren
8. TODO: Toast-Notifications mit Gradients
9. TODO: Pull-to-Refresh mit Custom-Indicator

## Wichtige Hinweise

- **Alle neuen Components sollten die `AppComponents.kt` verwenden**
- **Nie solid colors für Buttons verwenden - immer Gradients**
- **GlassCard statt Standard-Card für visuell wichtige Elemente**
- **StatusBadge-Komponente verwenden statt eigene Implementations**
- **SectionSeparator für alle Section-Trenner**

## Testing

Die App wurde getestet auf:
- Light Theme ✓
- Dark Theme ✓
- Verschiedene Bildschirmgrößen ✓
- Animationen und Transitions ✓
