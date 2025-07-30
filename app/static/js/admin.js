/**
 * Admin-specific JavaScript functionality
 * Handles update checking and other admin features
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeUpdateChecker();
});

/**
 * Initialize the update checker functionality
 */
function initializeUpdateChecker() {
    const checkButton = document.getElementById('check-for-updates-btn');
    const statusAlert = document.getElementById('update-status-alert');
    
    if (!checkButton) return; // Exit if elements don't exist
    
    // Load initial version info
    loadVersionInfo();
    
    // Set up click handler for manual update check
    checkButton.addEventListener('click', function() {
        checkForUpdates();
    });
}

/**
 * Load current version information
 */
function loadVersionInfo() {
    const headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add CSRF token if available
    if (window.csrfToken) {
        headers['X-CSRFToken'] = window.csrfToken;
    }
    
    fetch('/admin/api/version-info', {
        method: 'GET',
        headers: headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateVersionDisplay(data.data);
        } else {
            console.error('Error loading version info:', data.message);
        }
    })
    .catch(error => {
        console.error('Network error loading version info:', error);
    });
}

/**
 * Trigger a manual update check
 */
function checkForUpdates() {
    const checkButton = document.getElementById('check-for-updates-btn');
    const statusAlert = document.getElementById('update-status-alert');
    
    // Disable button and show loading state
    checkButton.disabled = true;
    checkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    
    // Hide any previous status messages
    statusAlert.classList.add('d-none');
    
    const headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add CSRF token if available
    if (window.csrfToken) {
        headers['X-CSRFToken'] = window.csrfToken;
    }
    
    fetch('/admin/api/check-update', {
        method: 'POST',
        headers: headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateVersionDisplay(data.data);
            showUpdateStatus(data.data);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Update check failed:', error);
        showError('Network error while checking for updates');
    })
    .finally(() => {
        // Re-enable button and restore original text
        checkButton.disabled = false;
        checkButton.innerHTML = '<i class="fas fa-sync-alt"></i> Check for Updates';
    });
}

/**
 * Update the version display with new data
 */
function updateVersionDisplay(data) {
    const localVersionEl = document.getElementById('local-version');
    const remoteVersionEl = document.getElementById('remote-version');
    const lastCheckedEl = document.getElementById('last-checked-time');
    
    if (localVersionEl) {
        localVersionEl.textContent = data.local_version || 'Unknown';
    }
    
    if (remoteVersionEl) {
        remoteVersionEl.textContent = data.remote_version || 'Unknown';
    }
    
    if (lastCheckedEl && data.last_check) {
        const lastCheckDate = new Date(data.last_check * 1000);
        lastCheckedEl.textContent = lastCheckDate.toLocaleString();
    }
}

/**
 * Show update status message
 */
function showUpdateStatus(data) {
    const statusAlert = document.getElementById('update-status-alert');
    
    if (!statusAlert) return;
    
    if (data.check_error) {
        // Show error message
        statusAlert.className = 'alert alert-warning mt-3';
        statusAlert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Check failed:</strong> ${escapeHtml(data.check_error)}
        `;
        statusAlert.classList.remove('d-none');
    } else if (data.update_available) {
        // Show update available message
        statusAlert.className = 'alert alert-info mt-3';
        statusAlert.innerHTML = `
            <i class="fas fa-download me-2"></i>
            <strong>Update available!</strong> Version ${escapeHtml(data.remote_version)} is now available.
            <a href="https://github.com/${escapeHtml(data.github_repo)}/releases/latest" class="alert-link" target="_blank">
                View release notes <i class="fas fa-external-link-alt ms-1"></i>
            </a>
        `;
        statusAlert.classList.remove('d-none');
    } else {
        // Show up-to-date message
        statusAlert.className = 'alert alert-success mt-3';
        statusAlert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            <strong>Up to date!</strong> You are running the latest version.
        `;
        statusAlert.classList.remove('d-none');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
            if (statusAlert.classList.contains('alert-success')) {
                statusAlert.classList.add('d-none');
            }
        }, 5000);
    }
}

/**
 * Show error message
 */
function showError(message) {
    const statusAlert = document.getElementById('update-status-alert');
    
    if (!statusAlert) return;
    
    statusAlert.className = 'alert alert-danger mt-3';
    statusAlert.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        <strong>Error:</strong> ${escapeHtml(message)}
    `;
    statusAlert.classList.remove('d-none');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
