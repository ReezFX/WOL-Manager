package com.wolmanager.ui.navigation

sealed class Screen(val route: String) {
    // Auth Screens
    object Setup : Screen("setup")
    object Login : Screen("login")
    
    // Main Screens (with Bottom Navigation)
    object Dashboard : Screen("dashboard")
    object Hosts : Screen("hosts")
    object Profile : Screen("profile")
    object Settings : Screen("settings")
    
    // Detail Screens
    object HostDetail : Screen("host_detail/{hostId}") {
        fun createRoute(hostId: Int) = "host_detail/$hostId"
    }
    object AddHost : Screen("add_host")
    object EditHost : Screen("edit_host/{hostId}") {
        fun createRoute(hostId: Int) = "edit_host/$hostId"
    }
}

sealed class BottomNavItem(
    val screen: Screen,
    val title: String,
    val icon: String // We'll use Material Icons
) {
    object Dashboard : BottomNavItem(
        screen = Screen.Dashboard,
        title = "Dashboard",
        icon = "home"
    )
    
    object Hosts : BottomNavItem(
        screen = Screen.Hosts,
        title = "Hosts",
        icon = "devices"
    )
    
    object Profile : BottomNavItem(
        screen = Screen.Profile,
        title = "Profile",
        icon = "person"
    )
    
    object Settings : BottomNavItem(
        screen = Screen.Settings,
        title = "Settings",
        icon = "settings"
    )
    
    companion object {
        fun items() = listOf(Dashboard, Hosts, Profile, Settings)
    }
}
