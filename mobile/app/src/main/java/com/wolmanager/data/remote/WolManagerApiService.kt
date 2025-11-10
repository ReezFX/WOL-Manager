package com.wolmanager.data.remote

import com.wolmanager.data.models.*
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface WolManagerApiService {
    
    // Authentication endpoints
    @GET("auth/login")
    suspend fun getLoginPage(): Response<ResponseBody>
    
    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String,
        @Field("csrf_token") csrfToken: String
    ): Response<ResponseBody>
    
    @GET("auth/logout")
    suspend fun logout(): Response<ResponseBody>
    
    @GET("auth/api/refresh-csrf-token")
    suspend fun refreshCsrfToken(): Response<CsrfTokenResponse>
    
    // Host management endpoints
    @GET("hosts/")
    suspend fun getHosts(
        @Query("page") page: Int = 1
    ): Response<ResponseBody>
    
    @GET("hosts/api/status")
    suspend fun getHostStatuses(): Response<HostStatusResponse>
    
    @GET("hosts/view/{host_id}")
    suspend fun getHostDetails(
        @Path("host_id") hostId: Int
    ): Response<ResponseBody>
    
    @FormUrlEncoded
    @POST("hosts/add")
    suspend fun addHost(
        @Field("name") name: String,
        @Field("mac_address") macAddress: String,
        @Field("ip_address") ipAddress: String?,
        @Field("description") description: String?,
        @Field("csrf_token") csrfToken: String
    ): Response<ResponseBody>
    
    @FormUrlEncoded
    @POST("hosts/edit/{host_id}")
    suspend fun editHost(
        @Path("host_id") hostId: Int,
        @Field("name") name: String,
        @Field("mac_address") macAddress: String,
        @Field("ip_address") ipAddress: String?,
        @Field("description") description: String?,
        @Field("csrf_token") csrfToken: String
    ): Response<ResponseBody>
    
    @FormUrlEncoded
    @POST("hosts/delete/{host_id}")
    suspend fun deleteHost(
        @Path("host_id") hostId: Int,
        @Field("csrf_token") csrfToken: String
    ): Response<ResponseBody>
    
    // Wake-on-LAN endpoints
    @FormUrlEncoded
    @POST("wol/wake/{host_id}")
    suspend fun wakeHost(
        @Path("host_id") hostId: Int,
        @Field("csrf_token") csrfToken: String
    ): Response<ResponseBody>
    
    // User profile
    @GET("auth/profile")
    suspend fun getUserProfile(): Response<ResponseBody>
}
