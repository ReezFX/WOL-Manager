package com.wolmanager

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.rememberNavController
import com.wolmanager.data.local.AppDatabase
import com.wolmanager.repository.WolManagerRepository
import com.wolmanager.ui.navigation.NavGraph
import com.wolmanager.ui.navigation.Screen
import com.wolmanager.ui.theme.WOLManagerTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    
    private lateinit var repository: WolManagerRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize database and repository
        val database = AppDatabase.getDatabase(applicationContext)
        repository = WolManagerRepository(database.serverConfigDao())
        
        setContent {
            WOLManagerTheme {
                val navController = rememberNavController()
                var startDestination by remember { mutableStateOf<String?>(null) }
                
                // Determine start destination based on saved server config
                LaunchedEffect(Unit) {
                    val serverConfig = repository.getServerConfigSync()
                    startDestination = if (serverConfig != null) {
                        // We have a saved server config, go to login
                        // Note: We don't automatically go to HostList even if isLoggedIn=true
                        // because the session might have expired
                        repository.initializeApiService(serverConfig.serverUrl)
                        Screen.Login.route
                    } else {
                        // No saved config, start with setup
                        Screen.Setup.route
                    }
                }
                
                // Show navigation only when start destination is determined
                startDestination?.let { destination ->
                    NavGraph(
                        navController = navController,
                        repository = repository,
                        startDestination = destination
                    )
                }
            }
        }
    }
}
