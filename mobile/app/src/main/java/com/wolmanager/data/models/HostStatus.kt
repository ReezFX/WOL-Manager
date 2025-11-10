package com.wolmanager.data.models

import com.google.gson.annotations.SerializedName

data class HostStatusResponse(
    @SerializedName("statuses")
    val statuses: List<HostStatus>
)

data class HostStatus(
    @SerializedName("host_id")
    val hostId: Int,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("ip")
    val ip: String?,
    
    @SerializedName("status")
    val status: String,
    
    @SerializedName("last_check")
    val lastCheck: String?
)

data class WakeRequest(
    @SerializedName("csrf_token")
    val csrfToken: String
)

data class WakeResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?
)
