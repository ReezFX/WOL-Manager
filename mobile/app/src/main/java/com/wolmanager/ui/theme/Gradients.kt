package com.wolmanager.ui.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Gradient definitions matching the WebApp CSS design system
 * Based on app/static/css/modules/buttons.css and components.css
 */
object AppGradients {
    
    // Primary/Accent Button Gradients (from buttons.css)
    val PrimaryButton = Brush.linearGradient(
        colors = listOf(
            Color(0xFFff9579), // #ff9579
            Color(0xFFff7e5f)  // #ff7e5f
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    val PrimaryButtonHover = Brush.linearGradient(
        colors = listOf(
            Color(0xFFffa589), // #ffa589
            Color(0xFFff8c70)  // #ff8c70
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Secondary Button Gradient
    val SecondaryButton = Brush.linearGradient(
        colors = listOf(
            Color(0xFF1891b3), // #1891b3
            Color(0xFF0d6e8c)  // #0d6e8c
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Success Button Gradient
    val SuccessButton = Brush.linearGradient(
        colors = listOf(
            Color(0xFF31c98d), // #31c98d
            Color(0xFF28b485)  // #28b485
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Warning Button Gradient
    val WarningButton = Brush.linearGradient(
        colors = listOf(
            Color(0xFFf9ae56), // #f9ae56
            Color(0xFFf8a643)  // #f8a643
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Danger Button Gradient
    val DangerButton = Brush.linearGradient(
        colors = listOf(
            Color(0xFFe25563), // #e25563
            Color(0xFFdf364a)  // #df364a
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Online Status Button (from buttons.css line 87)
    val OnlineStatus = Brush.linearGradient(
        colors = listOf(
            SuccessColor,      // var(--success-color)
            Color(0xFF50c878)  // #50c878
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Offline Status Button
    val OfflineStatus = Brush.linearGradient(
        colors = listOf(
            DangerColor,       // var(--danger-color)
            Color(0xFFff5757)  // #ff5757
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Card Header Gradient (from components.css line 27)
    val CardHeader = Brush.linearGradient(
        colors = listOf(
            PrimaryColor,  // var(--primary-color)
            AccentColor    // var(--accent-color)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Alternative card header gradients
    val CardHeaderAccent = Brush.linearGradient(
        colors = listOf(
            AccentColor,           // var(--accent-color)
            PrimaryColor           // var(--primary-color)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    val CardHeaderSuccess = Brush.linearGradient(
        colors = listOf(
            SuccessColor,                    // var(--success-color)
            SuccessColor.copy(alpha = 0.8f)  // rgba(40, 180, 133, 0.8)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    val CardHeaderDanger = Brush.linearGradient(
        colors = listOf(
            DangerColor,                     // var(--danger-color)
            DangerColor.copy(alpha = 0.8f)   // rgba(226, 85, 99, 0.8)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Pagination active gradient (from components.css line 388)
    val PaginationActive = Brush.linearGradient(
        colors = listOf(
            PrimaryColor,  // var(--primary-color)
            AccentColor    // var(--accent-color)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Section separator icon gradient (from components.css line 501)
    val SeparatorIcon = Brush.linearGradient(
        colors = listOf(
            PrimaryColor,  // var(--primary-color)
            AccentColor    // var(--accent-color)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Dashboard header subtle overlay (from dashboard-enhanced.css line 42)
    val DashboardHeaderOverlay = Brush.linearGradient(
        colors = listOf(
            PrimaryColor.copy(alpha = 0.1f),   // rgba(23, 162, 184, 0.1)
            AccentColor.copy(alpha = 0.05f)    // rgba(255, 126, 95, 0.05)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Wake animation pulse circle (from animations.css line 1318)
    val WakePulseCircle = Brush.linearGradient(
        colors = listOf(
            PrimaryColor,  // var(--primary-color)
            AccentColor    // var(--accent-color)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Status Badge Backgrounds with transparency
    val StatusBadgeSuccess = Brush.linearGradient(
        colors = listOf(
            SuccessColor.copy(alpha = 0.18f),  // rgba(40, 180, 133, 0.18)
            SuccessColor.copy(alpha = 0.12f)   // rgba(40, 180, 133, 0.12)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    val StatusBadgeDanger = Brush.linearGradient(
        colors = listOf(
            DangerColor.copy(alpha = 0.18f),   // rgba(226, 85, 99, 0.18)
            DangerColor.copy(alpha = 0.12f)    // rgba(226, 85, 99, 0.12)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    val StatusBadgeSecondary = Brush.linearGradient(
        colors = listOf(
            Color(0xFF6c757d).copy(alpha = 0.12f),  // rgba(108, 117, 125, 0.12)
            Color(0xFF6c757d).copy(alpha = 0.08f)   // rgba(108, 117, 125, 0.08)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
    
    // Action Button Success (from dashboard-enhanced.css line 560)
    val ActionButtonSuccess = Brush.linearGradient(
        colors = listOf(
            SuccessColor.copy(alpha = 0.12f),  // rgba(40, 180, 133, 0.12)
            SuccessColor.copy(alpha = 0.08f)   // rgba(40, 180, 133, 0.08)
        ),
        start = Offset.Zero,
        end = Offset.Infinite
    )
}
