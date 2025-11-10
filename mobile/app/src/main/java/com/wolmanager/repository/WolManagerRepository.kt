package com.wolmanager.repository

import com.wolmanager.data.local.ServerConfig
import com.wolmanager.data.local.ServerConfigDao
import com.wolmanager.data.models.*
import com.wolmanager.data.remote.RetrofitClient
import com.wolmanager.data.remote.WolManagerApiService
import kotlinx.coroutines.flow.Flow
import org.jsoup.Jsoup
import retrofit2.Response

class WolManagerRepository(
    private val serverConfigDao: ServerConfigDao
) {
    
    private var apiService: WolManagerApiService? = null
    private var currentServerUrl: String? = null
    
    // Server configuration operations
    fun getServerConfig(): Flow<ServerConfig?> = serverConfigDao.getServerConfig()
    
    suspend fun getServerConfigSync(): ServerConfig? = serverConfigDao.getServerConfigSync()
    
    suspend fun saveServerConfig(config: ServerConfig) {
        serverConfigDao.insertServerConfig(config)
        currentServerUrl = config.serverUrl
        apiService = RetrofitClient.getApiService(config.serverUrl)
    }
    
    suspend fun updateServerConfig(config: ServerConfig) {
        serverConfigDao.updateServerConfig(config)
    }
    
    suspend fun clearServerConfig() {
        serverConfigDao.clearServerConfig()
        RetrofitClient.clearCookies()
        apiService = null
        currentServerUrl = null
    }
    
    suspend fun clearSession() {
        // Clear cookies to end session
        RetrofitClient.clearCookies()
        // Reinitialize API service to ensure cookies are cleared
        currentServerUrl?.let { url ->
            apiService = RetrofitClient.getApiService(url)
        }
    }
    
    // Initialize API service with server URL
    fun initializeApiService(serverUrl: String) {
        if (currentServerUrl != serverUrl) {
            currentServerUrl = serverUrl
            apiService = RetrofitClient.getApiService(serverUrl)
        }
    }
    
    private fun getApi(): WolManagerApiService {
        return apiService ?: throw IllegalStateException("API service not initialized. Please set server URL first.")
    }
    
    // Extract CSRF token from HTML response
    private fun extractCsrfToken(html: String): String? {
        return try {
            val doc = Jsoup.parse(html)
            doc.select("input[name=csrf_token]").first()?.attr("value")
        } catch (e: Exception) {
            null
        }
    }
    
    // Authentication operations
    suspend fun getCsrfToken(): Result<String> {
        return try {
            val response = getApi().getLoginPage()
            if (response.isSuccessful) {
                val html = response.body()?.string() ?: ""
                val token = extractCsrfToken(html)
                if (token != null) {
                    Result.success(token)
                } else {
                    Result.failure(Exception("Could not extract CSRF token"))
                }
            } else {
                Result.failure(Exception("Failed to get login page: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun login(username: String, password: String, csrfToken: String): Result<Boolean> {
        return try {
            val response = getApi().login(username, password, csrfToken)
            
            // Flask sends 302 redirect on successful login
            // 200 means we're still on the login page (failed)
            when (response.code()) {
                302, 301 -> {
                    // Redirect = successful login
                    Result.success(true)
                }
                200 -> {
                    // Still on login page = failed login
                    Result.failure(Exception("Invalid username or password"))
                }
                else -> {
                    Result.failure(Exception("Login failed: HTTP ${response.code()}"))
                }
            }
        } catch (e: Exception) {
            Result.failure(Exception("Login error: ${e.message}", e))
        }
    }
    
    suspend fun logout(): Result<Boolean> {
        return try {
            val response = getApi().logout()
            Result.success(response.isSuccessful)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun refreshCsrfToken(): Result<String> {
        return try {
            val response = getApi().refreshCsrfToken()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.csrfToken)
            } else {
                Result.failure(Exception("Failed to refresh CSRF token"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Host operations
    suspend fun getHostStatuses(): Result<List<HostStatus>> {
        return try {
            val response = getApi().getHostStatuses()
            
            // Check if we got redirected to login (session expired)
            if (response.code() == 302 || response.code() == 301) {
                return Result.failure(SessionExpiredException("Session expired. Please login again."))
            }
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.statuses)
            } else {
                // Check if response is HTML (login page) instead of JSON
                val contentType = response.headers()["Content-Type"]
                if (contentType?.contains("text/html") == true) {
                    Result.failure(SessionExpiredException("Session expired. Please login again."))
                } else {
                    Result.failure(Exception("Failed to get host statuses: ${response.code()}"))
                }
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            // JSON parsing error usually means we got HTML (login page) instead
            Result.failure(SessionExpiredException("Session expired. Please login again."))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun wakeHost(hostId: Int, csrfToken: String): Result<Boolean> {
        return try {
            val response = getApi().wakeHost(hostId, csrfToken)
            Result.success(response.isSuccessful)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
