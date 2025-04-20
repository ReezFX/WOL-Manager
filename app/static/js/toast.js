/**
 * Toast notification system for WOL Manager
 * Provides a simple interface for showing toast notifications
 */

/**
 * ToastManager - A class for creating and managing toast notifications
 */
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map(); // Store active toasts by ID
    this.counter = 0; // Used for generating unique IDs
    this.defaultDuration = 5000; // Default duration in ms
    
    this.init();
  }

  /**
   * Initialize the toast container
   */
  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.classList.add('toast-container');
      
      // Position at the top right
      this.container.style.position = 'fixed';
      this.container.style.top = '20px';
      this.container.style.right = '20px';
      this.container.style.zIndex = '9999';
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
      this.container.style.gap = '10px';
      
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.message - The message to display
   * @param {string} options.type - The type of toast (success, error, warning, info)
   * @param {number} options.duration - Duration in ms
   * @param {boolean} options.autoHide - Whether to auto-hide the toast
   * @returns {string} The ID of the created toast
   */
  show({ message, type = 'info', duration = this.defaultDuration, autoHide = true }) {
    const toastId = `toast-${this.counter++}`;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.classList.add('toast', 'animate-toast');
    
    // Base styles
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.minWidth = '280px';
    toast.style.maxWidth = '400px';
    toast.style.position = 'relative';
    
    // Style based on type
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#4caf50';
        toast.style.color = 'white';
        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="margin-right: 8px;" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>';
        break;
      case 'error':
        toast.style.backgroundColor = '#f44336';
        toast.style.color = 'white';
        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="margin-right: 8px;" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>';
        // Add shake animation for errors
        toast.classList.add('toast-shake');
        break;
      case 'warning':
        toast.style.backgroundColor = '#ff9800';
        toast.style.color = 'white';
        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="margin-right: 8px;" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';
        break;
      default: // info
        toast.style.backgroundColor = '#2196f3';
        toast.style.color = 'white';
        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="margin-right: 8px;" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';
    }
    
    // Add the message
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.marginLeft = 'auto';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'inherit';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.opacity = '0.7';
    closeBtn.style.padding = '0 0 0 12px';
    closeBtn.title = 'Close';
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.7';
    });
    
    closeBtn.addEventListener('click', () => {
      this.hide(toastId);
    });
    
    toast.appendChild(closeBtn);
    
    // Add to container
    this.container.appendChild(toast);
    
    // Store reference
    this.toasts.set(toastId, { element: toast, timeoutId: null });
    
    // Setup auto-hide
    if (autoHide) {
      const timeoutId = setTimeout(() => {
        this.hide(toastId);
      }, duration);
      
      this.toasts.get(toastId).timeoutId = timeoutId;
    }
    
    return toastId;
  }

  /**
   * Hide a specific toast by ID
   * @param {string} id - The toast ID to hide
   */
  hide(id) {
    const toast = this.toasts.get(id);
    
    if (!toast) return;
    
    // Clear any pending timeout
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    // Apply exit animation
    toast.element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    toast.element.style.transform = 'translateX(100%)';
    toast.element.style.opacity = '0';
    
    // Remove after animation completes
    setTimeout(() => {
      if (toast.element.parentNode === this.container) {
        this.container.removeChild(toast.element);
      }
      this.toasts.delete(id);
      
      // Remove container if it's empty
      if (this.toasts.size === 0 && this.container.parentNode) {
        //document.body.removeChild(this.container);
        //this.container = null;
      }
    }, 300);
  }

  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {Object} options - Additional options
   * @returns {string} The toast ID
   */
  success(message, options = {}) {
    return this.show({ message, type: 'success', ...options });
  }

  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {Object} options - Additional options
   * @returns {string} The toast ID
   */
  error(message, options = {}) {
    return this.show({ message, type: 'error', ...options });
  }

  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {Object} options - Additional options
   * @returns {string} The toast ID
   */
  warning(message, options = {}) {
    return this.show({ message, type: 'warning', ...options });
  }

  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {Object} options - Additional options
   * @returns {string} The toast ID
   */
  info(message, options = {}) {
    return this.show({ message, type: 'info', ...options });
  }
}

// Create a global instance
const toast = new ToastManager();

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
  // Initialize toast container
  toast.init();
}); 