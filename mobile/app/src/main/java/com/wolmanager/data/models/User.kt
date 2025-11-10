package com.wolmanager.data.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id")
    val id: Int,
    
    @SerializedName("username")
    val username: String,
    
    @SerializedName("email")
    val email: String?,
    
    @SerializedName("is_admin")
    val isAdmin: Boolean = false,
    
    @SerializedName("roles")
    val roles: List<Role>?
)

data class Role(
    @SerializedName("id")
    val id: Int,
    
    @SerializedName("name")
    val name: String
)

data class LoginRequest(
    @SerializedName("username")
    val username: String,
    
    @SerializedName("password")
    val password: String,
    
    @SerializedName("csrf_token")
    val csrfToken: String
)

data class LoginResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("user")
    val user: User?,
    
    @SerializedName("csrf_token")
    val csrfToken: String?
)

data class CsrfTokenResponse(
    @SerializedName("csrf_token")
    val csrfToken: String
)
