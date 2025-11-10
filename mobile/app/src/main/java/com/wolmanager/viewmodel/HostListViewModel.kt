package com.wolmanager.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wolmanager.data.models.HostStatus
import com.wolmanager.data.models.SessionExpiredException
import com.wolmanager.repository.WolManagerRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HostListViewModel(
    private val repository: WolManagerRepository
) : ViewModel() {
    
    private val _hosts = MutableStateFlow<List<HostStatus>>(emptyList())
    val hosts: StateFlow<List<HostStatus>> = _hosts.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()
    
    private val _wakeInProgress = MutableStateFlow<Int?>(null)
    val wakeInProgress: StateFlow<Int?> = _wakeInProgress.asStateFlow()
    
    private val _wakeSuccess = MutableStateFlow<Pair<Int, String>?>(null)
    val wakeSuccess: StateFlow<Pair<Int, String>?> = _wakeSuccess.asStateFlow()
    
    private val _sessionExpired = MutableStateFlow(false)
    val sessionExpired: StateFlow<Boolean> = _sessionExpired.asStateFlow()
    
    fun loadHosts() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            
            try {
                val result = repository.getHostStatuses()
                if (result.isSuccess) {
                    _hosts.value = result.getOrThrow()
                } else {
                    val exception = result.exceptionOrNull()
                    if (exception is SessionExpiredException) {
                        // Session expired, trigger logout
                        _sessionExpired.value = true
                    } else {
                        _errorMessage.value = "Failed to load hosts: ${exception?.message}"
                    }
                }
            } catch (e: SessionExpiredException) {
                _sessionExpired.value = true
            } catch (e: Exception) {
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun refreshHosts() {
        viewModelScope.launch {
            _isRefreshing.value = true
            
            try {
                val result = repository.getHostStatuses()
                if (result.isSuccess) {
                    _hosts.value = result.getOrThrow()
                }
            } catch (e: Exception) {
                // Silent fail for refresh
            } finally {
                _isRefreshing.value = false
            }
        }
    }
    
    fun wakeHost(hostId: Int, hostName: String) {
        viewModelScope.launch {
            _wakeInProgress.value = hostId
            
            try {
                // Get CSRF token
                val csrfResult = repository.refreshCsrfToken()
                if (csrfResult.isFailure) {
                    _errorMessage.value = "Failed to get CSRF token"
                    _wakeInProgress.value = null
                    return@launch
                }
                
                val csrfToken = csrfResult.getOrThrow()
                
                // Wake the host
                val result = repository.wakeHost(hostId, csrfToken)
                if (result.isSuccess && result.getOrThrow()) {
                    _wakeSuccess.value = Pair(hostId, hostName)
                    // Refresh host list after a short delay
                    delay(2000)
                    refreshHosts()
                } else {
                    _errorMessage.value = "Failed to wake host"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error waking host: ${e.message}"
            } finally {
                _wakeInProgress.value = null
            }
        }
    }
    
    fun clearWakeSuccess() {
        _wakeSuccess.value = null
    }
    
    fun clearError() {
        _errorMessage.value = null
    }
    
    fun logout() {
        viewModelScope.launch {
            try {
                repository.logout()
                // Only clear cookies/session, keep server config
                repository.clearSession()
            } catch (e: Exception) {
                // Handle error silently
            }
        }
    }
}
