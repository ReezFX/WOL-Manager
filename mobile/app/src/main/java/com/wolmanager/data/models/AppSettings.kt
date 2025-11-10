package com.wolmanager.data.models

import com.google.gson.annotations.SerializedName

data class AppSettings(
    @SerializedName("min_password_length")
    val minPasswordLength: Int = 8,
    
    @SerializedName("password_expiration_days")
    val passwordExpirationDays: Int = 0,
    
    @SerializedName("require_special_characters")
    val requireSpecialCharacters: Boolean = false,
    
    @SerializedName("require_numbers")
    val requireNumbers: Boolean = false,
    
    @SerializedName("session_timeout_minutes")
    val sessionTimeoutMinutes: Int = 30,
    
    @SerializedName("max_concurrent_sessions")
    val maxConcurrentSessions: Int = 0,
    
    @SerializedName("log_profile")
    val logProfile: String = "MEDIUM",
    
    @SerializedName("current_log_profile")
    val currentLogProfile: String = "MEDIUM"
)

data class AppSettingsResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("settings")
    val settings: AppSettings?,
    
    @SerializedName("current_log_profile")
    val currentLogProfile: String?
)

data class UpdateSettingsRequest(
    @SerializedName("min_password_length")
    val minPasswordLength: Int,
    
    @SerializedName("password_expiration_days")
    val passwordExpirationDays: Int,
    
    @SerializedName("require_special_characters")
    val requireSpecialCharacters: Boolean,
    
    @SerializedName("require_numbers")
    val requireNumbers: Boolean,
    
    @SerializedName("session_timeout_minutes")
    val sessionTimeoutMinutes: Int,
    
    @SerializedName("max_concurrent_sessions")
    val maxConcurrentSessions: Int,
    
    @SerializedName("log_profile")
    val logProfile: String
)
