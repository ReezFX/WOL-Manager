package com.wolmanager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wolmanager.ui.components.*
import com.wolmanager.ui.theme.*
import com.wolmanager.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    repository: com.wolmanager.repository.WolManagerRepository,
    onLoginSuccess: () -> Unit
) {
    // Get server URL from saved config
    var serverUrl by remember { mutableStateOf("") }
    
    LaunchedEffect(Unit) {
        val config = repository.getServerConfigSync()
        serverUrl = config?.serverUrl ?: ""
    }
    val username by viewModel.username.collectAsState()
    val password by viewModel.password.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val loginSuccess by viewModel.loginSuccess.collectAsState()
    val isCheckingSession by viewModel.isCheckingSession.collectAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    
    // Reset login success state and check session only once
    LaunchedEffect(Unit) {
        viewModel.resetLoginSuccess()
        viewModel.loadSavedUsername(serverUrl)
        viewModel.checkExistingSession(serverUrl)
    }
    
    LaunchedEffect(loginSuccess) {
        if (loginSuccess) {
            onLoginSuccess()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Login Card with Glass Effect
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                contentPadding = PaddingValues(32.dp),
                elevation = 12.dp
            ) {
                // Logo/Icon with Gradient
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .shadow(
                            elevation = 12.dp,
                            shape = RoundedCornerShape(22.dp),
                            spotColor = PrimaryColor.copy(alpha = 0.35f)
                        )
                        .clip(RoundedCornerShape(22.dp))
                        .background(AppGradients.CardHeader),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Login",
                        modifier = Modifier.size(44.dp),
                        tint = Color.White
                    )
                }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Text(
                        text = "WOL Manager",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "Sign in to continue",
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = serverUrl,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
        
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    OutlinedTextField(
                        value = username,
                        onValueChange = { viewModel.updateUsername(it) },
                        label = { Text("Username") },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = "Username")
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading && !isCheckingSession,
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PrimaryColor,
                            focusedLabelColor = PrimaryColor
                        )
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = password,
                        onValueChange = { viewModel.updatePassword(it) },
                        label = { Text("Password") },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = "Password")
                        },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (passwordVisible) "Hide password" else "Show password"
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading && !isCheckingSession,
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PrimaryColor,
                            focusedLabelColor = PrimaryColor
                        )
                    )
        
                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = errorMessage ?: "",
                                color = MaterialTheme.colorScheme.error,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(12.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    GradientButton(
                        onClick = { viewModel.login(serverUrl) },
                        text = when {
                            isCheckingSession -> "Checking session..."
                            isLoading -> "Logging in..."
                            else -> "Login"
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        gradient = AppGradients.PrimaryButton,
                        enabled = !isLoading && !isCheckingSession && username.isNotEmpty() && password.isNotEmpty(),
                        icon = if (isLoading || isCheckingSession) null else Icons.Default.Lock,
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
                    )
            }
        }
    }
}
