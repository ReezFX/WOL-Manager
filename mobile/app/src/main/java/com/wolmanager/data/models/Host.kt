package com.wolmanager.data.models

import com.google.gson.annotations.SerializedName

data class Host(
    @SerializedName("id")
    val id: Int,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("mac_address")
    val macAddress: String,
    
    @SerializedName("ip")
    val ip: String?,
    
    @SerializedName("description")
    val description: String?,
    
    @SerializedName("created_by")
    val createdBy: Int,
    
    @SerializedName("created_at")
    val createdAt: String?,
    
    @SerializedName("public_access")
    val publicAccess: Boolean = false,
    
    @SerializedName("public_access_token")
    val publicAccessToken: String?,
    
    @SerializedName("visible_to_roles")
    val visibleToRoles: List<String>?,
    
    // Status field populated from separate API call
    var status: String? = null
)
