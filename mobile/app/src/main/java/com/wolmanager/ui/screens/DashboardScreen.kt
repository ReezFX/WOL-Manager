package com.wolmanager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.wolmanager.ui.components.*
import com.wolmanager.ui.navigation.Screen
import com.wolmanager.ui.theme.*
import com.wolmanager.viewmodel.HostListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    navController: NavController,
    viewModel: HostListViewModel,
    onLogout: () -> Unit
) {
    val hosts by viewModel.hosts.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadHosts()
    }
    
    // Calculate statistics
    val totalHosts = hosts.size
    val onlineHosts = hosts.count { it.status.lowercase() == "online" }
    val offlineHosts = hosts.count { it.status.lowercase() == "offline" }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Dashboard",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 20.sp
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refreshHosts() }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Refresh"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Welcome Header
            item {
                WelcomeCard()
            }
            
            // Statistics Section
            item {
                SectionSeparator(
                    title = "Statistics",
                    icon = Icons.Default.BarChart
                )
            }
            
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatisticCard(
                        title = "Total",
                        value = totalHosts.toString(),
                        icon = Icons.Default.Dns,
                        iconColor = PrimaryColor,
                        modifier = Modifier.weight(1f)
                    )
                    StatisticCard(
                        title = "Online",
                        value = onlineHosts.toString(),
                        icon = Icons.Default.CheckCircle,
                        iconColor = SuccessColor,
                        modifier = Modifier.weight(1f)
                    )
                    StatisticCard(
                        title = "Offline",
                        value = offlineHosts.toString(),
                        icon = Icons.Default.Cancel,
                        iconColor = DangerColor,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            // Quick Actions
            item {
                SectionSeparator(
                    title = "Quick Actions",
                    icon = Icons.Default.FlashOn
                )
            }
            
            item {
                QuickActionCard(
                    title = "Add New Host",
                    description = "Register a new device for Wake-on-LAN",
                    icon = Icons.Default.Add,
                    onClick = { navController.navigate(Screen.AddHost.route) }
                )
            }
            
            item {
                QuickActionCard(
                    title = "View All Hosts",
                    description = "Manage and wake all registered devices",
                    icon = Icons.Default.List,
                    onClick = { navController.navigate(Screen.Hosts.route) }
                )
            }
            
            // Recent Hosts Section (if any)
            if (hosts.isNotEmpty()) {
                item {
                    SectionSeparator(
                        title = "Recent Hosts",
                        icon = Icons.Default.History
                    )
                }
                
                items(minOf(3, hosts.size)) { index ->
                    val host = hosts[index]
                    CompactHostCard(
                        host = host,
                        onClick = { /* TODO: Navigate to host detail */ }
                    )
                }
            }
        }
    }
}

@Composable
fun WelcomeCard() {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(0.dp),
        elevation = 8.dp
    ) {
        // Gradient header section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppGradients.DashboardHeaderOverlay)
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Icon with gradient background
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .shadow(
                            elevation = 8.dp,
                            shape = RoundedCornerShape(14.dp),
                            spotColor = PrimaryColor.copy(alpha = 0.3f)
                        )
                        .background(
                            AppGradients.CardHeader,
                            shape = RoundedCornerShape(14.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.WavingHand,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = "Welcome Back!",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Manage your Wake-on-LAN devices",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// StatCard is now replaced by StatisticCard from AppComponents.kt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickActionCard(
    title: String,
    description: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(0.dp),
        elevation = 4.dp
    ) {
        Surface(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth(),
            color = Color.Transparent
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Icon with gradient background
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .shadow(
                            elevation = 4.dp,
                            shape = RoundedCornerShape(12.dp),
                            spotColor = PrimaryColor.copy(alpha = 0.25f)
                        )
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    PrimaryColor.copy(alpha = 0.15f),
                                    PrimaryColor.copy(alpha = 0.08f)
                                )
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = 1.dp,
                            color = PrimaryColor.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = PrimaryColor,
                        modifier = Modifier.size(26.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = description,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.85f)
                    )
                }
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompactHostCard(
    host: com.wolmanager.data.models.HostStatus,
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(0.dp),
        elevation = 3.dp
    ) {
        Surface(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth(),
            color = Color.Transparent
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    // Use StatusBadge component
                    StatusBadge(
                        status = host.status,
                        showIcon = true
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = host.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (host.ip != null) {
                            Text(
                                text = host.ip,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
