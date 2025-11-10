package com.wolmanager.ui.navigation

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.wolmanager.repository.WolManagerRepository
import com.wolmanager.ui.screens.*
import com.wolmanager.viewmodel.AuthViewModel
import com.wolmanager.viewmodel.HostListViewModel
import com.wolmanager.viewmodel.SetupViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Composable
fun NavGraph(
    navController: NavHostController,
    repository: WolManagerRepository,
    startDestination: String
) {
    // Shared ViewModel instance for all main screens
    val hostListViewModel: HostListViewModel = viewModel(
        factory = ViewModelFactory(repository)
    )
    
    // Coroutine scope for async operations
    val coroutineScope = rememberCoroutineScope()
    
    // Get server URL for settings
    var serverUrl by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        val config = repository.getServerConfigSync()
        serverUrl = config?.serverUrl ?: ""
    }
    
    // Theme state
    var isDarkTheme by remember { mutableStateOf(false) }
    
    // Current route for bottom navigation
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    
    // Single NavHost for all screens
    if (shouldShowBottomBar(currentRoute)) {
        // Wrap with MainScreen for bottom navigation
        MainScreen(
            navController = navController,
            currentRoute = currentRoute,
            viewModel = hostListViewModel,
            onLogout = {
                coroutineScope.launch {
                    repository.clearSession()
                }
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = startDestination
            ) {
                // All screens must be defined here
                setupScreens(navController, repository, hostListViewModel, serverUrl, isDarkTheme, coroutineScope) { isDarkTheme = it }
            }
        }
    } else {
        // No bottom navigation wrapper for auth screens
        NavHost(
            navController = navController,
            startDestination = startDestination
        ) {
            // All screens must be defined here too
            setupScreens(navController, repository, hostListViewModel, serverUrl, isDarkTheme, coroutineScope) { isDarkTheme = it }
        }
    }
}

private fun androidx.navigation.NavGraphBuilder.setupScreens(
    navController: NavController,
    repository: WolManagerRepository,
    hostListViewModel: HostListViewModel,
    serverUrl: String,
    isDarkTheme: Boolean,
    coroutineScope: CoroutineScope,
    onThemeChange: (Boolean) -> Unit
) {
    // Auth Screens
    composable(Screen.Setup.route) {
        val viewModel: SetupViewModel = viewModel(
            factory = ViewModelFactory(repository)
        )
        SetupScreen(
            viewModel = viewModel,
            onSetupComplete = { _ ->
                navController.navigate(Screen.Login.route) {
                    popUpTo(Screen.Setup.route) { inclusive = true }
                }
            }
        )
    }
    
    composable(Screen.Login.route) {
        val viewModel: AuthViewModel = viewModel(
            factory = ViewModelFactory(repository)
        )
        LoginScreen(
            viewModel = viewModel,
            repository = repository,
            onLoginSuccess = {
                navController.navigate(Screen.Dashboard.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        )
    }
    
    // Main Screens with Bottom Navigation
    composable(Screen.Dashboard.route) {
        DashboardScreen(
            navController = navController,
            viewModel = hostListViewModel,
            onLogout = {
                coroutineScope.launch {
                    repository.clearSession()
                }
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        )
    }
    
    composable(Screen.Hosts.route) {
        HostListScreen(
            viewModel = hostListViewModel,
            onLogout = {
                coroutineScope.launch {
                    repository.clearSession()
                }
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        )
    }
    
    composable(Screen.Profile.route) {
        ProfileScreen(
            username = "User", // TODO: Get from ViewModel
            onLogout = {
                coroutineScope.launch {
                    repository.clearSession()
                }
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            }
        )
    }
    
    composable(Screen.Settings.route) {
        SettingsScreen(
            serverUrl = serverUrl,
            isDarkTheme = isDarkTheme,
            onThemeChange = onThemeChange
        )
    }
    
    // Detail Screens (TODO)
    composable(Screen.AddHost.route) {
        // TODO: Implement AddHostScreen
    }
}
