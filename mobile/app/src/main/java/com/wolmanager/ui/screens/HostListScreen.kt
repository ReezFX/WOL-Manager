package com.wolmanager.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import com.wolmanager.data.models.HostStatus
import com.wolmanager.viewmodel.HostListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HostListScreen(
    viewModel: HostListViewModel,
    onLogout: () -> Unit
) {
    val hosts by viewModel.hosts.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val wakeInProgress by viewModel.wakeInProgress.collectAsState()
    val wakeSuccess by viewModel.wakeSuccess.collectAsState()
    val sessionExpired by viewModel.sessionExpired.collectAsState()
    
    var showLogoutDialog by remember { mutableStateOf(false) }
    
    // Handle session expiration
    LaunchedEffect(sessionExpired) {
        if (sessionExpired) {
            viewModel.logout()
            onLogout()
        }
    }
    
    LaunchedEffect(Unit) {
        viewModel.loadHosts()
    }
    
    // Show snackbar for wake success
    wakeSuccess?.let { (_, hostName) ->
        LaunchedEffect(wakeSuccess) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearWakeSuccess()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("WOL Manager") },
                actions = {
                    IconButton(onClick = { viewModel.refreshHosts() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = { showLogoutDialog = true }) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Logout")
                    }
                }
            )
        },
        floatingActionButton = {
            if (wakeSuccess != null) {
                ExtendedFloatingActionButton(
                    onClick = { viewModel.clearWakeSuccess() },
                    icon = { Icon(Icons.Default.Check, contentDescription = null) },
                    text = { Text("Wake packet sent to ${wakeSuccess?.second}") },
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when {
                isLoading && hosts.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                errorMessage != null && hosts.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = errorMessage ?: "Unknown error",
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.loadHosts() }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                hosts.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No hosts configured",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                else -> {
                    SwipeRefresh(
                        state = rememberSwipeRefreshState(isRefreshing),
                        onRefresh = { viewModel.refreshHosts() }
                    ) {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(hosts) { host ->
                                HostCard(
                                    host = host,
                                    isWaking = wakeInProgress == host.hostId,
                                    onWake = { viewModel.wakeHost(host.hostId, host.name) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Logout confirmation dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        viewModel.logout()
                        onLogout()
                    }
                ) {
                    Text("Logout")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun HostCard(
    host: HostStatus,
    isWaking: Boolean,
    onWake: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatusIndicator(status = host.status)
                    Text(
                        text = host.name,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                if (host.ip != null && host.ip.isNotEmpty()) {
                    Text(
                        text = host.ip,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Text(
                    text = "Status: ${host.status}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            FilledTonalButton(
                onClick = onWake,
                enabled = !isWaking
            ) {
                if (isWaking) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.PowerSettingsNew,
                        contentDescription = "Wake"
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Wake")
                }
            }
        }
    }
}

@Composable
fun StatusIndicator(status: String) {
    val color = when (status.lowercase()) {
        "online" -> Color(0xFF4CAF50)
        "offline" -> Color(0xFFF44336)
        else -> Color(0xFFFF9800)
    }
    
    Surface(
        modifier = Modifier.size(12.dp),
        shape = androidx.compose.foundation.shape.CircleShape,
        color = color
    ) {}
}
