package com.wolmanager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.currentBackStackEntryAsState
import com.wolmanager.ui.navigation.BottomNavItem
import com.wolmanager.ui.navigation.Screen
import com.wolmanager.ui.theme.PrimaryColor
import com.wolmanager.viewmodel.HostListViewModel

@Composable
fun MainScreen(
    navController: NavController,
    currentRoute: String?,
    viewModel: HostListViewModel,
    onLogout: () -> Unit,
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        bottomBar = {
            if (shouldShowBottomBar(currentRoute)) {
                ModernBottomNavigationBar(
                    navController = navController,
                    currentRoute = currentRoute
                )
            }
        }
    ) { paddingValues ->
        content(paddingValues)
    }
}

@Composable
fun ModernBottomNavigationBar(
    navController: NavController,
    currentRoute: String?
) {
    // Floating Navigation Dock with Glass Effect
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
        ) {
            // Background blur layer
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .shadow(
                        elevation = 16.dp,
                        shape = RoundedCornerShape(24.dp),
                        spotColor = Color.Black.copy(alpha = 0.2f)
                    )
                    .clip(RoundedCornerShape(24.dp))
                    .blur(radius = 20.dp) // Real blur effect!
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                                MaterialTheme.colorScheme.surface.copy(alpha = 0.6f)
                            )
                        )
                    )
            )
            
            // Glass overlay with border
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.1f),
                                Color.White.copy(alpha = 0.05f)
                            )
                        )
                    )
                    .border(
                        width = 1.5.dp,
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.4f),
                                Color.White.copy(alpha = 0.15f)
                            )
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
            )
            
            // Content
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                BottomNavItem.items().forEach { item ->
                    val selected = currentRoute == item.screen.route
                    val icon = when (item.icon) {
                        "home" -> Icons.Default.Home
                        "devices" -> Icons.Default.Dns
                        "person" -> Icons.Default.Person
                        "settings" -> Icons.Default.Settings
                        else -> Icons.Default.Home
                    }
                    
                    NavigationDockItem(
                        icon = icon,
                        label = item.title,
                        selected = selected,
                        onClick = {
                            if (!selected) {
                                navController.navigate(item.screen.route) {
                                    popUpTo(Screen.Dashboard.route) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        }
                    )
                    }
            }
        }
    }
}

@Composable
fun NavigationDockItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(72.dp)
            .fillMaxHeight()
            .clip(RoundedCornerShape(16.dp))
            .background(
                if (selected) {
                    Brush.verticalGradient(
                        colors = listOf(
                            PrimaryColor.copy(alpha = 0.18f),
                            PrimaryColor.copy(alpha = 0.12f)
                        )
                    )
                } else {
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Transparent)
                    )
                }
            )
            .then(
                if (selected) {
                    Modifier.border(
                        width = 1.dp,
                        color = PrimaryColor.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(16.dp)
                    )
                } else Modifier
            )
            .padding(vertical = 10.dp)
            .then(Modifier.clickable(onClick = onClick)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Icon with gradient background when selected
        if (selected) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                PrimaryColor.copy(alpha = 0.25f),
                                PrimaryColor.copy(alpha = 0.15f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    modifier = Modifier.size(22.dp),
                    tint = PrimaryColor
                )
            }
        } else {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(26.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f)
            )
        }
            
        Spacer(modifier = Modifier.height(6.dp))
        
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (selected) {
                PrimaryColor
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f)
            },
            fontSize = 11.sp,
            fontWeight = if (selected) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Normal,
            maxLines = 1
        )
    }
}

fun shouldShowBottomBar(currentRoute: String?): Boolean {
    return when (currentRoute) {
        Screen.Dashboard.route,
        Screen.Hosts.route,
        Screen.Profile.route,
        Screen.Settings.route -> true
        else -> false
    }
}
