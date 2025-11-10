package com.wolmanager.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Brand Colors - matching WebApp
val PrimaryColor = Color(0xFF17a2b8)  // Turquoise
val SecondaryColor = Color(0xFF0d6e8c)  // Deep blue-teal
val AccentColor = Color(0xFFff7e5f)  // Coral-orange
val SuccessColor = Color(0xFF28b485)  // Green
val InfoColor = Color(0xFF5bc0de)  // Light blue
val WarningColor = Color(0xFFf9ae56)  // Amber
val DangerColor = Color(0xFFe25563)  // Red

// Light Theme Colors - matching WebApp
private val LightColorScheme = lightColorScheme(
    primary = PrimaryColor,
    secondary = SecondaryColor,
    tertiary = AccentColor,
    background = Color(0xFFffffff),  // --bg-primary
    surface = Color(0xFFffffff),  // --card-bg
    surfaceVariant = Color(0xFFf8f9fa),  // --bg-secondary
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFF212529),  // --text-primary
    onSurface = Color(0xFF212529),  // --text-primary
    onSurfaceVariant = Color(0xFF6c757d),  // --text-secondary
    error = DangerColor,
    onError = Color.White,
    outline = Color(0xFFdee2e6)  // --border-color
)

// Dark Theme Colors - matching WebApp
private val DarkColorScheme = darkColorScheme(
    primary = PrimaryColor,
    secondary = SecondaryColor,
    tertiary = AccentColor,
    background = Color(0xFF1a1a1c),  // --bg-primary
    surface = Color(0xFF2d2d30),  // --card-bg
    surfaceVariant = Color(0xFF242426),  // --bg-secondary
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFf8f9fa),  // --text-primary
    onSurface = Color(0xFFf8f9fa),  // --text-primary
    onSurfaceVariant = Color(0xFFced4da),  // --text-secondary
    error = DangerColor,
    onError = Color.White,
    outline = Color(0xFF3a3a3d)  // --border-color
)

@Composable
fun WOLManagerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = androidx.compose.material3.Typography(),
        content = content
    )
}
