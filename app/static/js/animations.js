/**
 * Advanced animation effects for WoL Manager
 * Includes ripple effects, status animations and performance optimizations
 */

// DOM elements (will be set on init)
let cards = [];
let actionButtons = [];
let statusBadges = [];

/**
 * Initialize animations across the application
 */
function initAnimations() {
  // Initialize DOM element references
  cards = document.querySelectorAll('.card');
  actionButtons = document.querySelectorAll('.action-button');
  statusBadges = document.querySelectorAll('.status-badge');
  
  setupRippleEffects();
  setupCardAnimations();
  optimizeAnimationPerformance();
  enhanceStatusBadges();
  
  // Auto-enhance all interactive elements with animations
  autoEnhanceInteractiveElements();
}

/**
 * Apply ripple effect to action buttons
 * @param {HTMLElement} container - Optional container to limit scope
 */
function setupRippleEffects(container = document) {
  const actionButtons = container.querySelectorAll('.action-button');
  
  actionButtons.forEach(button => {
    // Skip if already initialized
    if (button.dataset.rippleInitialized === 'true') {
      return;
    }
    
    button.dataset.rippleInitialized = 'true';
    
    button.addEventListener('click', function(e) {
      const button = e.currentTarget;
      
      // Create ripple element
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      
      // Calculate position
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Apply position and animate
      ripple.style.cssText = `
        position: absolute;
        top: ${y}px;
        left: ${x}px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        pointer-events: none;
        transform: scale(0);
        width: 5px;
        height: 5px;
        animation: ripple 400ms cubic-bezier(0.25, 0.1, 0.25, 1.0);
      `;
      
      // Add and clean up
      button.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 400);
    });
  });
}

/**
 * Set up advanced card animations and interactions
 * @param {HTMLElement} container - Optional container to limit scope
 */
function setupCardAnimations(container = document) {
  // Apply staggered animations for cards - but avoid double application
  const cards = container.querySelectorAll('.card-animate-in');
  
  cards.forEach((card, index) => {
    // Skip if animation has already been initialized to prevent conflicts
    if (card.dataset.animationInitialized === 'true') {
      return;
    }
    
    // Mark as initialized
    card.dataset.animationInitialized = 'true';
    
    // Only apply animation delay if not already set inline
    if (!card.style.animationDelay) {
      card.style.animationDelay = `${index * 50}ms`;
    }
    
    // Ensure animation runs
    card.style.animationPlayState = 'running';
    
    // Add hover animation class for cards that don't already have it
    if (!card.classList.contains('hover-elevate')) {
      card.classList.add('hover-elevate');
    }
  });
  
  // Optional: Use IntersectionObserver for on-scroll animations
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    // Observe all cards not already animated
    container.querySelectorAll('.card:not(.card-animate-in)').forEach(card => {
      observer.observe(card);
    });
  }
}

/**
 * Optimize animation performance with will-change and other techniques
 * @param {HTMLElement} container - Optional container to limit scope
 */
function optimizeAnimationPerformance(container = document) {
  // Apply will-change to elements that will animate frequently
  const statusBadges = container.querySelectorAll('.status-badge');
  statusBadges.forEach(badge => {
    badge.style.willChange = 'transform, opacity';
  });
  
  // Remove will-change after animation completes to free up resources
  container.querySelectorAll('.card-animate-in').forEach(card => {
    card.addEventListener('animationend', () => {
      card.style.willChange = 'auto';
    });
  });
}

/**
 * Enhance status badge animations based on status
 * @param {HTMLElement} container - Optional container to limit scope
 */
function enhanceStatusBadges(container = document) {
  const statusBadges = container.querySelectorAll('.status-badge');
  
  statusBadges.forEach(badge => {
    // Get the current status directly from the element's data attribute
    const status = badge.getAttribute('data-status');
    
    console.log("Enhancing badge with status:", status, "for element:", badge.id);
    
    // Remove any existing animation classes and reset styles
    badge.style.animation = '';
    
    // Apply appropriate animation based on status
    if (status === 'online') {
      // No animation for online - just set styling
      badge.style.animation = 'none';
      badge.style.backgroundColor = 'var(--success-color)';
      badge.style.color = 'white';
      // Ensure classes are correct (in case of manual updates)
      badge.classList.remove('bg-danger', 'bg-secondary');
      badge.classList.add('bg-success');
    } else if (status === 'offline') {
      // Only offline status pulsates
      badge.style.animation = 'pulseOffline 2s infinite';
      badge.style.backgroundColor = 'var(--danger-color)';
      badge.style.color = 'white';
      // Ensure classes are correct
      badge.classList.remove('bg-success', 'bg-secondary');
      badge.classList.add('bg-danger');
    } else if (status === 'unknown') {
      // No animation for unknown - just set styling
      badge.style.animation = 'none';
      badge.style.backgroundColor = 'var(--secondary-color)';
      badge.style.color = 'white';
      // Ensure classes are correct
      badge.classList.remove('bg-success', 'bg-danger');
      badge.classList.add('bg-secondary');
    }
    
    // Add text shadow for better visibility
    badge.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.2)';
    badge.style.fontWeight = '600';
  });
}

/**
 * Automatically enhance interactive elements with animations
 * This function finds common UI elements and adds animation behavior
 * @param {HTMLElement} container - Optional container to limit scope
 */
function autoEnhanceInteractiveElements(container = document) {
  // Add press animation to all buttons without having to add btn-animate-press to each
  container.querySelectorAll('.btn:not(.btn-animate-press):not(.btn-close):not(.navbar-toggler)').forEach(btn => {
    btn.classList.add('btn-animate-press');
  });
  
  // Add ripple effect to all cards that don't have hover-shadow
  container.querySelectorAll('.card:not(.hover-shadow)').forEach(card => {
    card.classList.add('hover-shadow');
  });
  
  // Add entry animation to all cards with host-card class that don't have card-animate-in
  container.querySelectorAll('.host-card:not(.card-animate-in)').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    
    // Staggered delay for multiple cards
    setTimeout(() => {
      card.style.transition = 'all 0.5s var(--animation-spring)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + (index * 100)); // Stagger by 100ms
  });
  
  // Auto-handle flash messages
  const flashMessages = container.querySelectorAll('.alert:not(.processed-alert)');
  flashMessages.forEach((alert, index) => {
    alert.classList.add('processed-alert');
    
    // Skip if already animated to prevent conflicts
    if (alert.dataset.alertAnimated === 'true') {
      return;
    }
    alert.dataset.alertAnimated = 'true';
    
    // Add initial styles
    alert.style.opacity = '0';
    alert.style.transform = 'translateY(-20px)';
    
    // Animate in with delay
    setTimeout(() => {
      alert.style.transition = 'all 0.3s ease';
      alert.style.opacity = '1';
      alert.style.transform = 'translateY(0)';
    }, 100 + (index * 150));
    
    // Add auto-dismiss after 5 seconds for success messages
    if (alert.classList.contains('alert-success')) {
      setTimeout(() => {
        if (alert.parentNode) { // Check if element still exists
          alert.style.opacity = '0';
          alert.style.transform = 'translateY(-20px)';
          setTimeout(() => {
            if (alert.parentNode) {
              alert.remove();
            }
          }, 300);
        }
      }, 5000);
    }
  });
  
  // Enhance form submissions that don't have the data-animate attribute
  container.querySelectorAll('form:not([data-animate])').forEach(form => {
    // Don't touch navigation or search forms
    if (form.classList.contains('navbar-form') || form.classList.contains('search-form')) {
      return;
    }
    
    // Add animation attribute to regular forms
    form.setAttribute('data-animate', 'true');
    
    // Add button loading state
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn && !submitBtn.classList.contains('btn-with-loader')) {
      // Prepare for loading state
      const btnText = submitBtn.innerHTML;
      submitBtn.classList.add('btn-with-loader');
      submitBtn.innerHTML = `
        <span class="btn-text">${btnText}</span>
        <span class="btn-loader">
          <span class="btn-spinner"></span>
        </span>
      `;
    }
  });
  
  // This check should only happen once on page load, not for every container
  if (container === document) {
    // Check URL for success parameter and show toast if found
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1' || urlParams.get('success') === 'true') {
      const message = urlParams.get('message') || 'Operation completed successfully';
      showToast('success', 'Success', message);
      
      // Clean up URL
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url);
      }
    } else if (urlParams.get('error') === '1' || urlParams.get('error') === 'true') {
      const message = urlParams.get('message') || 'An error occurred';
      showToast('error', 'Error', message);
      
      // Clean up URL
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url);
      }
    }
  }
}

// Register a global function to update status badge animations
window.updateStatusBadgeAnimation = function(badgeId, status) {
  const badge = document.getElementById(badgeId);
  if (badge) {
    console.log("Updating badge animation:", badgeId, "with status:", status);
    
    // Prevent animation conflicts by checking if status is actually changing
    const currentStatus = badge.getAttribute('data-status');
    if (currentStatus === status) {
      return; // No change needed
    }
    
    // Update data attribute
    badge.setAttribute('data-status', status);
    
    // Remove current animation and classes cleanly
    badge.style.animation = 'none';
    badge.classList.remove('bg-success', 'bg-danger', 'bg-secondary');
    
    // Force a reflow to ensure animation state is reset
    void badge.offsetWidth;
    
    // Apply styling based on status
    if (status === 'online') {
      // No animation for online status
      badge.style.backgroundColor = 'var(--success-color)';
      badge.style.color = 'white';
      badge.classList.add('bg-success');
    } else if (status === 'offline') {
      // Only offline status pulsates
      badge.style.animation = 'pulseOffline 2s infinite';
      badge.style.backgroundColor = 'var(--danger-color)';
      badge.style.color = 'white';
      badge.classList.add('bg-danger');
    } else if (status === 'unknown') {
      // No animation for unknown status
      badge.style.backgroundColor = 'var(--secondary-color)';
      badge.style.color = 'white';
      badge.classList.add('bg-secondary');
    }
    
    // Update icon
    let icon = '<i class="fas fa-circle-question fa-xs me-1"></i>';
    if (status === 'online') {
        icon = '<i class="fas fa-circle-check fa-xs me-1"></i>';
    } else if (status === 'offline') {
        icon = '<i class="fas fa-circle-xmark fa-xs me-1"></i>';
    }
    badge.innerHTML = icon + status;
  }
};

// Check for reduced motion preference
function checkReducedMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  } else {
    document.documentElement.classList.remove('reduced-motion');
  }
}

/**
 * Shows a toast notification using the modern glass design
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} title - The title of the toast
 * @param {string} message - The message to show
 * @param {number} duration - Duration in ms
 * @returns {HTMLElement} - The toast element
 */
function showToast(type, title, message, duration = 4000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Create toast content
    let iconClass = 'fa-bell';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    if (type === 'info') iconClass = 'fa-info-circle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;
    
    // Get all existing toasts and apply staggered animation if needed
    const allToasts = toastContainer.querySelectorAll('.toast');
    const toastIndex = allToasts.length;
    
    // Add to container - prepend instead of append to show newest on top
    if (toastContainer.firstChild) {
        toastContainer.insertBefore(toast, toastContainer.firstChild);
    } else {
        toastContainer.appendChild(toast);
    }
    
    // Add a close button to the toast
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    toast.appendChild(closeBtn);
    
    // Force a reflow (to ensure animation works)
    void toast.offsetWidth;
    
    // Apply entrance animation with staggered delay for multiple toasts
    setTimeout(() => {
        // First add the show-animate class for animation
        toast.classList.add('show-animate');
        
        // Apply show class for CSS transitions
        setTimeout(() => {
            toast.classList.add('show');
            
            // Start progress bar animation if there's a duration
            if (duration) {
                const progressBar = toast.querySelector('.toast-progress-bar');
                if (progressBar) {
                    progressBar.style.transition = `transform ${duration}ms linear`;
                    setTimeout(() => {
                        progressBar.style.transform = 'scaleX(1)';
                    }, 100);
                }
            }
        }, 50);
    }, Math.min(toastIndex * 150, 300)); // Cap stagger delay
    
    // Create a sound effect for the toast (optional - uncomment if desired)
    // playToastSound(type);
    
    // Auto hide after duration
    if (duration) {
        const hideTimeout = setTimeout(() => {
            removeToast(toast);
        }, duration + (Math.min(toastIndex * 150, 300))); // Adjust timeout based on staggered entrance
        
        // Store timeout ID to cancel if needed
        toast.dataset.timeoutId = hideTimeout;
        
        // Cancel auto-hide on hover
        toast.addEventListener('mouseenter', () => {
            clearTimeout(parseInt(toast.dataset.timeoutId));
            
            // Also pause progress bar animation
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                const computedStyle = window.getComputedStyle(progressBar);
                const currentWidth = computedStyle.getPropertyValue('transform');
                progressBar.style.transition = 'none';
                progressBar.style.transform = currentWidth;
            }
        });
        
        toast.addEventListener('mouseleave', () => {
            // Calculate remaining time (proportional to progress bar width)
            const progressBar = toast.querySelector('.toast-progress-bar');
            const remainingTime = duration / 2;
            
            // Resume progress bar animation
            if (progressBar) {
                progressBar.style.transition = `transform ${remainingTime}ms linear`;
                progressBar.style.transform = 'scaleX(1)';
            }
            
            // Set new timeout
            const newTimeout = setTimeout(() => {
                removeToast(toast);
            }, remainingTime);
            
            toast.dataset.timeoutId = newTimeout;
        });
    }
    
    // Helper to remove toast with exit animation
    function removeToast(toastElement) {
        // First remove show class and add exit animation
        toastElement.classList.remove('show');
        toastElement.classList.remove('show-animate');
        toastElement.classList.add('hide-animate');
        
        // Wait for animation to finish before removing
        toastElement.addEventListener('animationend', () => {
            if (toastContainer.contains(toastElement)) {
                toastElement.remove();
                
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }
        }, {once: true});
    }
    
    // Optionally vibrate the device for mobile (uncomment if desired)
    // if (navigator.vibrate && window.innerWidth <= 768) {
    //    navigator.vibrate(50);
    // }
    
    return toast;
}

/**
 * Play a sound effect for the toast notification
 * @param {string} type - The type of toast
 */
function playToastSound(type) {
    // Check if Web Audio API is supported
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Connect the nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Set frequency based on toast type
    switch (type) {
        case 'success':
            oscillator.frequency.setValueAtTime(1046.50, context.currentTime); // C6
            break;
        case 'error':
            oscillator.frequency.setValueAtTime(196.00, context.currentTime); // G3
            break;
        case 'warning':
            oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
            break;
        default:
            oscillator.frequency.setValueAtTime(783.99, context.currentTime); // G5
    }
    
    // Set volume (very subtle)
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    
    // Play sound
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
}

/**
 * Shows a save success animation with a checkmark
 * @param {HTMLElement|string} targetElement - Element or selector where animation should appear
 * @param {Function} callback - Callback function to run after animation completes
 */
function showSaveAnimation(targetElement, callback) {
  // Create animation container if not provided
  let saveContainer;
  if (typeof targetElement === 'string') {
      saveContainer = document.querySelector(targetElement);
  } else {
      saveContainer = targetElement;
  }
  
  if (!saveContainer) {
      console.error('Target element for save animation not found');
      return;
  }
  
  // Clear any existing animation
  saveContainer.innerHTML = '';
  
  // Create animation elements
  const saveAnimation = document.createElement('div');
  saveAnimation.className = 'save-animation';
  saveAnimation.innerHTML = `
      <div class="save-circle"></div>
      <div class="save-checkmark">
          <i class="fas fa-check"></i>
      </div>
  `;
  
  // Add to container
  saveContainer.appendChild(saveAnimation);
  
  // Trigger animation
  setTimeout(() => {
      saveAnimation.classList.add('active');
  }, 10);
  
  // Remove after animation
  setTimeout(() => {
      saveAnimation.classList.remove('active');
      setTimeout(() => {
          if (saveContainer.contains(saveAnimation)) {
              saveContainer.removeChild(saveAnimation);
          }
          if (typeof callback === 'function') {
              callback();
          }
      }, 300);
  }, 1200);
}

/**
 * Shows a delete confirmation dialog
 * @param {string} itemName - Name of the item being deleted
 * @param {Function} onConfirm - Callback function to run if user confirms deletion
 */
function showDeleteConfirm(itemName, onConfirm) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'delete-confirm-overlay';
  
  overlay.innerHTML = `
      <div class="delete-confirm-container">
          <div class="delete-icon-container">
              <i class="fas fa-trash delete-icon"></i>
          </div>
          <div class="delete-confirm-title">Delete ${itemName}</div>
          <div class="delete-confirm-message">
              Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.
          </div>
          <div class="delete-confirm-buttons">
              <button class="delete-cancel-btn">Cancel</button>
              <button class="delete-confirm-btn">Delete</button>
          </div>
      </div>
  `;
  
  // Add to body
  document.body.appendChild(overlay);
  
  // Activate overlay
  setTimeout(() => {
      overlay.classList.add('active');
  }, 10);
  
  // Setup event handlers
  const cancelBtn = overlay.querySelector('.delete-cancel-btn');
  const confirmBtn = overlay.querySelector('.delete-confirm-btn');
  
  cancelBtn.addEventListener('click', closeConfirm);
  
  confirmBtn.addEventListener('click', () => {
      if (typeof onConfirm === 'function') {
          onConfirm();
      }
      closeConfirm();
  });
  
  function closeConfirm() {
      overlay.classList.remove('active');
      setTimeout(() => {
          overlay.remove();
      }, 300);
  }
}

/**
 * Shows a create/add animation effect
 * @param {Function} callback - Callback function to run after animation completes
 */
function showCreateAnimation(callback) {
  // Create animation
  const container = document.createElement('div');
  container.className = 'create-animation-container';
  
  container.innerHTML = `
      <div class="create-animation">
          <div class="create-circle"></div>
          <div class="create-plus">
              <i class="fas fa-plus"></i>
          </div>
      </div>
  `;
  
  // Add to body
  document.body.appendChild(container);
  
  // Activate animation
  setTimeout(() => {
      container.classList.add('active');
  }, 10);
  
  // Remove after animation
  setTimeout(() => {
      container.remove();
      if (typeof callback === 'function') {
          callback();
      }
  }, 1600);
}

/**
 * Sets a button to loading state with spinner
 * @param {HTMLElement} button - The button element
 * @param {boolean} isLoading - Whether to show or hide loading state
 */
function setButtonLoading(button, isLoading) {
  if (!button) return;
  
  // Add necessary classes if they don't exist
  if (!button.classList.contains('btn-with-loader')) {
      button.classList.add('btn-with-loader');
      
      // Save original text
      const originalText = button.innerHTML;
      button.innerHTML = `
          <span class="btn-text">${originalText}</span>
          <span class="btn-loader">
              <span class="btn-spinner"></span>
          </span>
      `;
  }
  
  // Toggle loading state
  if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
  } else {
      button.classList.remove('loading');
      button.disabled = false;
  }
}

/**
 * Shows a simple success feedback on an element (for copy buttons, etc)
 * @param {HTMLElement} element - Element to show feedback on
 * @param {string} originalHTML - Original HTML to restore after feedback
 * @param {string} successHTML - HTML to show during success feedback
 * @param {number} duration - Duration to show feedback
 */
function showSuccessFeedback(element, originalHTML, successHTML, duration = 1500) {
  if (!element) return;
  
  // Save original state
  if (!originalHTML) {
      originalHTML = element.innerHTML;
  }
  
  // Default success HTML if not provided
  if (!successHTML) {
      successHTML = '<i class="fas fa-check"></i>';
      
      // Add success styling
      element.classList.add('btn-success');
      if (element.classList.contains('btn-outline-secondary')) {
          element.classList.remove('btn-outline-secondary');
      }
  }
  
  // Apply success state
  element.innerHTML = successHTML;
  
  // Reset after duration
  setTimeout(() => {
      element.innerHTML = originalHTML;
      
      // Remove success styling if we added it
      if (element.classList.contains('btn-success')) {
          element.classList.remove('btn-success');
          if (originalHTML.includes('btn-outline-secondary')) {
              element.classList.add('btn-outline-secondary');
          }
      }
  }, duration);
}

/**
 * Helper function to get CSRF token for AJAX requests
 * @returns {string} CSRF token
 */
function getCsrfToken() {
  // Check for token in meta tag
  const tokenMeta = document.querySelector('meta[name="csrf-token"]');
  if (tokenMeta) {
      return tokenMeta.getAttribute('content');
  }
  
  // Check for token in form
  const tokenInput = document.querySelector('input[name="csrf_token"]');
  if (tokenInput) {
      return tokenInput.value;
  }
  
  return '';
}

/**
 * Auto-binds animation effects to elements with specific data attributes
 * This should be called when the DOM is loaded
 */
function initAllAnimations() {
  // Form submission animations
  document.querySelectorAll('form[data-animate="true"]').forEach(form => {
      form.addEventListener('submit', function(e) {
          // Find submit button
          const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) {
              setButtonLoading(submitBtn, true);
          }
          
          // For forms with data-show-success="true" attribute that aren't using AJAX
          if (this.getAttribute('data-show-success') === 'true' && !this.getAttribute('data-ajax')) {
              // Create hidden field to remember to show success message after redirect
              const successField = document.createElement('input');
              successField.type = 'hidden';
              successField.name = 'show_success';
              successField.value = 'true';
              this.appendChild(successField);
          }
      });
  });
  
  // Delete button handlers
  document.querySelectorAll('[data-delete-target]').forEach(btn => {
      btn.addEventListener('click', function(e) {
          e.preventDefault();
          
          const targetType = this.getAttribute('data-delete-target');
          const itemName = this.getAttribute('data-item-name') || targetType;
          
          showDeleteConfirm(itemName, () => {
              // If there's a form to submit
              const formId = this.getAttribute('data-delete-form');
              if (formId) {
                  const form = document.getElementById(formId);
                  if (form) {
                      setButtonLoading(this, true);
                      form.submit();
                  }
              }
              
              // If there's an AJAX endpoint to call
              const endpoint = this.getAttribute('data-delete-endpoint');
              if (endpoint) {
                  setButtonLoading(this, true);
                  fetch(endpoint, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'X-Requested-With': 'XMLHttpRequest',
                          'X-CSRFToken': getCsrfToken()
                      }
                  })
                  .then(response => {
                      if (response.ok) {
                          showToast('success', 'Success', `${itemName} deleted successfully`);
                          
                          // If we should redirect after
                          const redirectUrl = this.getAttribute('data-redirect-after');
                          if (redirectUrl) {
                              window.location.href = redirectUrl;
                          }
                          
                          // If we should remove an element from DOM
                          const removeSelector = this.getAttribute('data-remove-element');
                          if (removeSelector) {
                              // Find all elements matching the selector
                              const elementsToRemove = document.querySelectorAll(removeSelector);
                              if (elementsToRemove.length > 0) {
                                  // Remove all matching elements
                                  elementsToRemove.forEach(el => {
                                      // Get the grid container before removing the element
                                      const gridContainer = el.closest('#host-grid, #dashboard-host-grid, .row');
                                      
                                      // Store the parent's scroll position
                                      const scrollParent = gridContainer ? gridContainer.parentElement : document.documentElement;
                                      const scrollTop = scrollParent.scrollTop;
                                      
                                      // Remove the element
                                      el.remove();
                                      
                                      // Force grid reflow after element removal
                                      if (gridContainer) {
                                          // Simple approach: use flex layout update trick
                                          setTimeout(() => {
                                              // Force a repaint by modifying a property
                                              gridContainer.style.display = 'none';
                                              
                                              // Force browser to process the style change
                                              void gridContainer.offsetHeight;
                                              
                                              // Restore display property
                                              gridContainer.style.display = '';
                                              
                                              // Restore scroll position
                                              scrollParent.scrollTop = scrollTop;
                                              
                                              // Add a very small timeout for browsers to handle the change
                                              setTimeout(() => {
                                                  // Apply a slight visual change to highlight the layout update
                                                  document.querySelectorAll('.host-column').forEach(col => {
                                                      col.style.transition = 'all 0.3s ease';
                                                      col.style.opacity = '0.8';
                                                      setTimeout(() => {
                                                          col.style.opacity = '1';
                                                      }, 50);
                                                  });
                                              }, 10);
                                          }, 50);
                                      }
                                  });
                              } else {
                                  console.warn('Element to remove not found:', removeSelector);
                              }
                          }
                      } else {
                          showToast('error', 'Error', `Failed to delete ${itemName.toLowerCase()}`);
                          setButtonLoading(this, false);
                      }
                  })
                  .catch(error => {
                      console.error('Error:', error);
                      showToast('error', 'Error', `Failed to delete ${itemName.toLowerCase()}`);
                      setButtonLoading(this, false);
                  });
              }
          });
      });
  });
  
  // Create button animations
  document.querySelectorAll('[data-animate-create="true"]').forEach(btn => {
      btn.addEventListener('click', function(e) {
          // Only play animation if directed to a new page/form
          if (this.getAttribute('href') || this.getAttribute('data-target')) {
              // Will show the animation as we transition to the create form
              showCreateAnimation();
          }
      });
  });
  
  // Clipboard copy buttons
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
      btn.addEventListener('click', function() {
          const targetSelector = this.getAttribute('data-copy-target');
          const targetElement = document.querySelector(targetSelector);
          
          if (targetElement) {
              const textToCopy = targetElement.value || targetElement.textContent;
              navigator.clipboard.writeText(textToCopy)
                  .then(() => {
                      showSuccessFeedback(this, this.innerHTML, '<i class="fas fa-check"></i>');
                  })
                  .catch(err => {
                      console.error('Failed to copy: ', err);
                  });
          }
      });
  });
}

/**
 * Enhanced initialization function that ensures animations work across all pages
 */
function initGlobalAnimations() {
  // Call our main animation initialization
  initAnimations();
  initAllAnimations();
  
  // Setup event handler for dynamic content
  document.addEventListener('contentLoaded', function(e) {
    // Re-initialize animations for dynamically loaded content
    if (e.detail && e.detail.container) {
      setupCardAnimations(e.detail.container);
      setupRippleEffects(e.detail.container);
      enhanceStatusBadges(e.detail.container);
      autoEnhanceInteractiveElements(e.detail.container);
    }
  });
  
  // Handle AJAX loaded content
  if (window.jQuery) {
    jQuery(document).ajaxComplete(function(event, xhr, settings) {
      // Wait a bit for DOM to update
      setTimeout(function() {
        // Re-enhance any new elements
        setupCardAnimations();
        enhanceStatusBadges();
        autoEnhanceInteractiveElements();
      }, 50);
    });
  }
  
  // Expose all animation functions globally so they're accessible everywhere
  window.animationAPI = {
    showToast: showToast,
    showSaveAnimation: showSaveAnimation,
    showDeleteConfirm: showDeleteConfirm,
    showWakeConfirm: showWakeConfirm,
    showCreateAnimation: showCreateAnimation,
    setButtonLoading: setButtonLoading,
    showSuccessFeedback: showSuccessFeedback,
    enhanceStatusBadges: enhanceStatusBadges
  };
  
  // Export common functions to window for backwards compatibility
  window.showToast = showToast;
  window.showSaveAnimation = showSaveAnimation;
  window.showDeleteConfirm = showDeleteConfirm;
  window.showWakeConfirm = showWakeConfirm;
  window.showCreateAnimation = showCreateAnimation;
  window.setButtonLoading = setButtonLoading;
  window.showSuccessFeedback = showSuccessFeedback;
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initGlobalAnimations();
  
  // Initial check for reduced motion
  checkReducedMotion();
  
  // Listen for changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', checkReducedMotion);
});

// Re-initialize when page is fully loaded (for images and other resources)
window.addEventListener('load', function() {
  // Refresh animations after all resources are loaded
  setupCardAnimations();
  enhanceStatusBadges();
});

/**
 * Shows a wake confirmation dialog for hosts that are already online
 * @param {string} hostName - Name of the host being woken
 * @param {Function} onConfirm - Callback function to run if user confirms wake
 */
function showWakeConfirm(hostName, onConfirm) {
  // Get overlay
  const overlay = document.getElementById('wakeConfirmOverlay');
  
  if (!overlay) return;
  
  // Update host name if provided
  if (hostName) {
    const titleElement = overlay.querySelector('.wake-confirm-title');
    const messageElement = overlay.querySelector('.wake-confirm-message');
    
    if (titleElement) {
      titleElement.textContent = `${hostName} Is Already Online`;
    }
    
    if (messageElement) {
      messageElement.innerHTML = `This host appears to be <span class="text-success">online</span>. Do you still want to send a wake-up packet?`;
    }
  }
  
  // Setup event handlers
  const cancelBtn = overlay.querySelector('#wakeCancelBtn');
  const confirmBtn = overlay.querySelector('#wakeConfirmBtn');
  
  // Remove any existing event listeners
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  
  if (cancelBtn.parentNode) {
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  }
  
  if (confirmBtn.parentNode) {
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  }
  
  // Add event listeners to new buttons
  newCancelBtn.addEventListener('click', closeConfirm);
  
  newConfirmBtn.addEventListener('click', () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeConfirm();
  });
  
  // Show the overlay
  overlay.classList.add('active');
  
  function closeConfirm() {
    overlay.classList.remove('active');
  }
}
