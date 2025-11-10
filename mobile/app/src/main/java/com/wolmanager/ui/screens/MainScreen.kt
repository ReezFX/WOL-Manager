package com.wolmanager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
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
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp,
        modifier = Modifier.height(80.dp)
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
            
            NavigationBarItem(
                selected = selected,
                onClick = {
                    if (!selected) {
                        navController.navigate(item.screen.route) {
                            // Pop up to start destination and save state
                            popUpTo(Screen.Dashboard.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = {
                    Icon(
                        imageVector = icon,
                        contentDescription = item.title,
                        modifier = Modifier.size(24.dp)
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.labelSmall
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = PrimaryColor,
                    selectedTextColor = PrimaryColor,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    indicatorColor = PrimaryColor.copy(alpha = 0.15f)
                )
            )
        }
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
