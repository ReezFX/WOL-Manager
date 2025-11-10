package com.wolmanager.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.wolmanager.repository.WolManagerRepository
import com.wolmanager.ui.screens.HostListScreen
import com.wolmanager.ui.screens.LoginScreen
import com.wolmanager.ui.screens.SetupScreen
import com.wolmanager.viewmodel.AuthViewModel
import com.wolmanager.viewmodel.HostListViewModel
import com.wolmanager.viewmodel.SetupViewModel

sealed class Screen(val route: String) {
    object Setup : Screen("setup")
    object Login : Screen("login")
    object HostList : Screen("hostList")
}

@Composable
fun NavGraph(
    navController: NavHostController,
    repository: WolManagerRepository,
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Setup.route) {
            val viewModel: SetupViewModel = viewModel(
                factory = ViewModelFactory(repository)
            )
            SetupScreen(
                viewModel = viewModel,
                onSetupComplete = { serverUrl ->
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
                    navController.navigate(Screen.HostList.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.HostList.route) {
            val viewModel: HostListViewModel = viewModel(
                factory = ViewModelFactory(repository)
            )
            HostListScreen(
                viewModel = viewModel,
                onLogout = {
                    navController.navigate(Screen.Setup.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
