/**
 * main.js - Main application JavaScript functionality
 * Includes host status management, custom dialog styling, and animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initHostStatusManagement();
    initConfirmationDialogs();
    initAnimations();
});

/**
 * Host Status Management
 * Handles status indicators, updates, and notifications
 */
function initHostStatusManagement() {
    // Cache DOM elements
    const statusIndicators = document.querySelectorAll('.status-indicator');
    
    // Update host status indicators
    statusIndicators.forEach(indicator => {
        updateHostStatus(indicator);
    });
    
    // Set up periodic status checks (every 30 seconds)
    setInterval(() => {
        statusIndicators.forEach(indicator => {
            updateHostStatus(indicator);
        });
    }, 30000);
    
    // Function to fetch and update host status
    function updateHostStatus(indicator) {
        const hostId = indicator.dataset.hostId;
        if (!hostId) return;
        
        // Simulate status check with fetch (replace with actual endpoint)
        fetch(`/api/hosts/${hostId}/status`)
            .then(response => response.json())
            .catch(() => ({ status: 'unknown' })) // Fallback for demo
            .then(data => {
                // Remove all current status classes
                indicator.classList.remove('status-online', 'status-offline', 'status-warning', 'status-unknown');
                
                // Add appropriate status class
                indicator.classList.add(`status-${data.status || 'unknown'}`);
                
                // Update text if there's a status text element
                const statusText = indicator.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = data.status 
                        ? data.status.charAt(0).toUpperCase() + data.status.slice(1) 
                        : 'Unknown';
                }
                
                // Add animation to show status change
                indicator.classList.add('status-updated');
                setTimeout(() => {
                    indicator.classList.remove('status-updated');
                }, 1500);
            });
    }
    
    // Add event listeners for manual refresh buttons
    document.querySelectorAll('.refresh-status').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const indicator = document.querySelector(`.status-indicator[data-host-id="${button.dataset.hostId}"]`);
            if (indicator) {
                updateHostStatus(indicator);
                
                // Animate refresh button
                button.classList.add('rotating');
                setTimeout(() => {
                    button.classList.remove('rotating');
                }, 1000);
            }
        });
    });
}

/**
 * Apple-inspired Confirmation Dialogs
 * Replaces browser's default confirm() with styled custom dialogs
 */
function initConfirmationDialogs() {
    // Override default confirm behavior
    window.originalConfirm = window.confirm;
    
    window.confirm = function(message, title = 'Confirmation', options = {}) {
        return new Promise((resolve) => {
            // Remove any existing dialogs
            const existingDialog = document.querySelector('.apple-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }
            
            // Create dialog elements
            const dialog = document.createElement('div');
            dialog.className = 'apple-dialog';
            
            const dialogContainer = document.createElement('div');
            dialogContainer.className = 'apple-dialog-container';
            
            const dialogHeader = document.createElement('div');
            dialogHeader.className = 'apple-dialog-header';
            dialogHeader.textContent = title;
            
            const dialogContent = document.createElement('div');
            dialogContent.className = 'apple-dialog-content';
            dialogContent.textContent = message;
            
            const dialogActions = document.createElement('div');
            dialogActions.className = 'apple-dialog-actions';
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'apple-dialog-button apple-dialog-cancel';
            cancelButton.textContent = options.cancelText || 'Cancel';
            cancelButton.addEventListener('click', () => {
                closeDialog(false);
            });
            
            const confirmButton = document.createElement('button');
            confirmButton.className = 'apple-dialog-button apple-dialog-confirm';
            confirmButton.textContent = options.confirmText || 'Confirm';
            confirmButton.addEventListener('click', () => {
                closeDialog(true);
            });
            
            // Add danger class for destructive actions
            if (options.isDangerous) {
                confirmButton.classList.add('apple-dialog-dangerous');
            }
            
            // Assemble dialog
            dialogActions.appendChild(cancelButton);
            dialogActions.appendChild(confirmButton);
            
            dialogContainer.appendChild(dialogHeader);
            dialogContainer.appendChild(dialogContent);
            dialogContainer.appendChild(dialogActions);
            
            dialog.appendChild(dialogContainer);
            document.body.appendChild(dialog);
            
            // Apply entrance animation
            setTimeout(() => {
                dialog.classList.add('visible');
                dialogContainer.classList.add('visible');
            }, 10);
            
            // Handle keyboard navigation
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeDialog(false);
                } else if (e.key === 'Enter') {
                    closeDialog(true);
                }
            });
            
            // Focus confirm button
            setTimeout(() => {
                confirmButton.focus();
            }, 100);
            
            // Dialog close function
            function closeDialog(result) {
                dialog.classList.remove('visible');
                dialogContainer.classList.remove('visible');
                
                setTimeout(() => {
                    dialog.remove();
                    resolve(result);
                }, 300); // Match transition duration
            }
        });
    };
    
    // Attach to delete buttons and other confirmation actions
    document.querySelectorAll('[data-confirm]').forEach(element => {
        element.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const message = element.dataset.confirm || 'Are you sure you want to proceed?';
            const title = element.dataset.confirmTitle || 'Confirmation';
            const isDangerous = element.dataset.confirmDangerous !== undefined;
            
            const confirmed = await window.confirm(message, title, {
                isDangerous,
                confirmText: element.dataset.confirmText || 'Confirm',
                cancelText: element.dataset.cancelText || 'Cancel'
            });
            
            if (confirmed) {
                // If it's a link, navigate to href
                if (element.tagName === 'A' && element.href) {
                    window.location.href = element.href;
                } 
                // If it's a form submit button
                else if (element.form && (element.type === 'submit' || element.tagName === 'BUTTON')) {
                    element.form.submit();
                }
                // If it has a custom callback
                else if (element.dataset.confirmCallback) {
                    window[element.dataset.confirmCallback](element);
                }
            }
        });
    });
}

/**
 * Animation Utilities
 * Adds subtle animations and transitions for UI elements
 */
function initAnimations() {
    // Animate card entrances
    const animateCards = () => {
        const cards = document.querySelectorAll('.card:not(.animated)');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animated', 'fade-in-up');
            }, index * 100); // Stagger animations
        });
    };
    
    // Animate status changes
    const animateStatusChanges = () => {
        document.querySelectorAll('.status-change:not(.animated)').forEach(element => {
            element.classList.add('animated');
            
            // Reset animation when status changes
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'class' && 
                        !element.classList.contains('animating')) {
                        
                        element.classList.add('animating');
                        setTimeout(() => {
                            element.classList.remove('animating');
                        }, 800); // Match CSS animation duration
                    }
                });
            });
            
            observer.observe(element, { attributes: true });
        });
    };
    
    // Initialize animations
    animateCards();
    animateStatusChanges();
    
    // Re-run animations when content changes (for SPA-like behavior)
    const contentObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                animateCards();
                animateStatusChanges();
            }
        });
    });
    
    contentObserver.observe(document.querySelector('main') || document.body, { 
        childList: true,
        subtree: true
    });
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for fixed header
                    behavior: 'smooth'
                });
                
                // Update URL without reloading
                history.pushState(null, null, targetId);
            }
        });
    });
}

/**
 * Toast Notification System
 * Displays Apple-style toast notifications for system events
 */
class Toast {
    static show(message, type = 'info', duration = 4000) {
        // Remove existing toasts of the same type
        document.querySelectorAll(`.apple-toast.toast-${type}`).forEach(toast => {
            toast.remove();
        });
        
        // Create toast elements
        const toast = document.createElement('div');
        toast.className = `apple-toast toast-${type}`;
        
        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        
        // Set icon based on type
        switch(type) {
            case 'success':
                icon.innerHTML = '✓';
                break;
            case 'error':
                icon.innerHTML = '✕';
                break;
            case 'warning':
                icon.innerHTML = '⚠';
                break;
            default:
                icon.innerHTML = 'ℹ';
        }
        
        const content = document.createElement('div');
        content.className = 'toast-content';
        content.textContent = message;
        
        // Assemble toast
        toast.appendChild(icon);
        toast.appendChild(content);
        
        // Add to DOM
        const container = document.querySelector('.toast-container') || createToastContainer();
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('visible');
        }, 10);
        
        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.remove();
                
                // Remove container if empty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);
        
        // Add close on click
        toast.addEventListener('click', () => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Helper function to create toast container
        function createToastContainer() {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
            return container;
        }
    }
    
    static success(message, duration) {
        this.show(message, 'success', duration);
    }
    
    static error(message, duration) {
        this.show(message, 'error', duration);
    }
    
    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }
    
    static info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Expose Toast to window
window.Toast = Toast;

