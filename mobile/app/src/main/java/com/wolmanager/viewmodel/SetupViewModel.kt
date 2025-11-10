package com.wolmanager.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wolmanager.data.local.ServerConfig
import com.wolmanager.repository.WolManagerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SetupViewModel(
    private val repository: WolManagerRepository
) : ViewModel() {
    
    private val _serverUrl = MutableStateFlow("")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    private val _setupComplete = MutableStateFlow(false)
    val setupComplete: StateFlow<Boolean> = _setupComplete.asStateFlow()
    
    fun updateServerUrl(url: String) {
        _serverUrl.value = url
    }
    
    fun validateAndSaveServerUrl() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            try {
                var url = _serverUrl.value.trim()
                
                // Basic validation
                if (url.isEmpty()) {
                    _errorMessage.value = "Please enter a server URL"
                    _isLoading.value = false
                    return@launch
                }
                
                // Add http:// if no protocol specified
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "http://$url"
                }
                
                // Ensure URL ends with /
                if (!url.endsWith("/")) {
                    url = "$url/"
                }
                
                // Test connection by initializing API service
                try {
                    repository.initializeApiService(url)
                    
                    // Try to get CSRF token to verify server is reachable
                    val result = repository.getCsrfToken()
                    if (result.isSuccess) {
                        _serverUrl.value = url
                        _setupComplete.value = true
                    } else {
                        val error = result.exceptionOrNull()
                        _errorMessage.value = when {
                            error?.message?.contains("Unable to resolve host") == true -> 
                                "Cannot reach server. Check URL and network connection."
                            error?.message?.contains("timeout") == true -> 
                                "Connection timeout. Server may be unreachable."
                            error?.message?.contains("Connection refused") == true -> 
                                "Connection refused. Is the server running?"
                            else -> "Could not connect: ${error?.message ?: "Unknown error"}"
                        }
                    }
                } catch (e: java.net.UnknownHostException) {
                    _errorMessage.value = "Cannot resolve hostname. Check the URL."
                } catch (e: java.net.ConnectException) {
                    _errorMessage.value = "Cannot connect to server. Check if it's running."
                } catch (e: java.net.SocketTimeoutException) {
                    _errorMessage.value = "Connection timeout. Server unreachable."
                } catch (e: Exception) {
                    _errorMessage.value = "Error: ${e.message ?: "Unknown error"}"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
}
