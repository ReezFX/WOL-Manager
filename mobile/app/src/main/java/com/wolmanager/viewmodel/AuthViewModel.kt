package com.wolmanager.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wolmanager.data.local.ServerConfig
import com.wolmanager.repository.WolManagerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val repository: WolManagerRepository
) : ViewModel() {
    
    private val _username = MutableStateFlow("")
    val username: StateFlow<String> = _username.asStateFlow()
    
    private val _password = MutableStateFlow("")
    val password: StateFlow<String> = _password.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    private val _loginSuccess = MutableStateFlow(false)
    val loginSuccess: StateFlow<Boolean> = _loginSuccess.asStateFlow()
    
    private val _isCheckingSession = MutableStateFlow(false)
    val isCheckingSession: StateFlow<Boolean> = _isCheckingSession.asStateFlow()
    
    fun updateUsername(value: String) {
        _username.value = value
    }
    
    fun updatePassword(value: String) {
        _password.value = value
    }
    
    fun login(serverUrl: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            try {
                // Initialize API service
                repository.initializeApiService(serverUrl)
                
                // Get CSRF token
                val csrfResult = repository.getCsrfToken()
                if (csrfResult.isFailure) {
                    _errorMessage.value = "Failed to get CSRF token"
                    _isLoading.value = false
                    return@launch
                }
                
                val csrfToken = csrfResult.getOrThrow()
                
                // Attempt login
                val loginResult = repository.login(_username.value, _password.value, csrfToken)
                android.util.Log.d("AuthViewModel", "Login result: success=${loginResult.isSuccess}, value=${loginResult.getOrNull()}")
                
                if (loginResult.isSuccess && loginResult.getOrNull() == true) {
                    android.util.Log.d("AuthViewModel", "Login successful, setting loginSuccess=true")
                    // Save server configuration
                    val config = ServerConfig(
                        serverUrl = serverUrl,
                        username = _username.value,
                        isLoggedIn = true,
                        lastLoginTimestamp = System.currentTimeMillis()
                    )
                    repository.saveServerConfig(config)
                    _loginSuccess.value = true
                    android.util.Log.d("AuthViewModel", "loginSuccess value after set: ${_loginSuccess.value}")
                } else {
                    android.util.Log.e("AuthViewModel", "Login failed: ${loginResult.exceptionOrNull()?.message}")
                    _errorMessage.value = loginResult.exceptionOrNull()?.message ?: "Invalid username or password"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Login failed: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
    
    fun resetLoginSuccess() {
        _loginSuccess.value = false
    }
    
    fun loadSavedUsername(serverUrl: String) {
        viewModelScope.launch {
            val config = repository.getServerConfigSync()
            if (config != null && config.serverUrl == serverUrl && config.username.isNotEmpty()) {
                _username.value = config.username
            }
        }
    }
    
    fun checkExistingSession(serverUrl: String) {
        viewModelScope.launch {
            _isCheckingSession.value = true
            _errorMessage.value = null
            try {
                // Initialize API service
                repository.initializeApiService(serverUrl)
                
                // Try to get host statuses to check if session is still valid
                val result = repository.getHostStatuses()
                if (result.isSuccess) {
                    // Session is still valid, go directly to host list
                    _loginSuccess.value = true
                } else {
                    val exception = result.exceptionOrNull()
                    // If it's a SessionExpiredException or JSON error, session is expired
                    // This is normal, just show login form (do nothing)
                }
            } catch (e: Exception) {
                // Session invalid or expired, user needs to login
                // This is normal, just show login form (do nothing)
            } finally {
                _isCheckingSession.value = false
            }
        }
    }
}
