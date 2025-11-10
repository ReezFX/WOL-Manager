package com.wolmanager.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.wolmanager.repository.WolManagerRepository
import com.wolmanager.viewmodel.AuthViewModel
import com.wolmanager.viewmodel.HostListViewModel
import com.wolmanager.viewmodel.SetupViewModel

class ViewModelFactory(
    private val repository: WolManagerRepository
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(SetupViewModel::class.java) -> {
                SetupViewModel(repository) as T
            }
            modelClass.isAssignableFrom(AuthViewModel::class.java) -> {
                AuthViewModel(repository) as T
            }
            modelClass.isAssignableFrom(HostListViewModel::class.java) -> {
                HostListViewModel(repository) as T
            }
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
