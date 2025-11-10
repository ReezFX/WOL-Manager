package com.wolmanager.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "server_config")
data class ServerConfig(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    
    val serverUrl: String,
    val username: String,
    val isLoggedIn: Boolean = false,
    val lastLoginTimestamp: Long = 0L
)
