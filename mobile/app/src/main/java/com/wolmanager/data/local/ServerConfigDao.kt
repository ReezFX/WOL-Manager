package com.wolmanager.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ServerConfigDao {
    
    @Query("SELECT * FROM server_config LIMIT 1")
    fun getServerConfig(): Flow<ServerConfig?>
    
    @Query("SELECT * FROM server_config LIMIT 1")
    suspend fun getServerConfigSync(): ServerConfig?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertServerConfig(config: ServerConfig)
    
    @Update
    suspend fun updateServerConfig(config: ServerConfig)
    
    @Query("DELETE FROM server_config")
    suspend fun clearServerConfig()
}
