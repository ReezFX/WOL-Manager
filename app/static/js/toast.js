/**
 * Toast notification system for WOL Manager
 * Provides a simple interface for showing toast notifications
 */

// This file is being replaced by the enhanced animations.js implementation
// It's kept for backward compatibility but will forward all calls to the new system

/**
 * Forwards toast calls to the new animations.js implementation
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} title - The title of the toast
 * @param {string} message - The message to show
 * @param {number} duration - Duration in ms
 * @returns {HTMLElement} - The toast element
 */
function createToast(type, title, message, duration = 5000) {
    // Check if the new toast function exists
    if (typeof showToast === 'function') {
        return showToast(type, title, message, duration);
    }
    
    // Fallback implementation in case animations.js is not loaded
    console.warn('Using legacy toast implementation. Please ensure animations.js is loaded.');
    
    // Create a simple toast container if needed
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.style.backgroundColor = getToastColor(type);
    toast.style.color = '#fff';
    toast.style.padding = '15px';
    toast.style.borderRadius = '5px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    toast.style.display = 'flex';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    
    toast.innerHTML = `
        <div style="margin-right:10px;">
            <i class="fas ${getToastIcon(type)}"></i>
        </div>
        <div>
            <div style="font-weight:bold;">${title}</div>
            <div>${message}</div>
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    if (duration) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    return toast;
}

/**
 * Get the color for a toast type
 */
function getToastColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'error': return '#dc3545';
        case 'warning': return '#ffc107';
        default: return '#17a2b8'; // info
    }
}

/**
 * Get the icon for a toast type
 */
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Export functions to global scope
window.createToast = createToast;

// Compatibility with the new API
window.toastSuccess = function(message, title = 'Success', duration = 5000) {
    return createToast('success', title, message, duration);
};

window.toastError = function(message, title = 'Error', duration = 5000) {
    return createToast('error', title, message, duration);
};

window.toastWarning = function(message, title = 'Warning', duration = 5000) {
    return createToast('warning', title, message, duration);
};

window.toastInfo = function(message, title = 'Information', duration = 5000) {
    return createToast('info', title, message, duration);
}; 