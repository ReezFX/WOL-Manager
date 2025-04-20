/**
 * Advanced animation effects for WoL Manager
 * Includes ripple effects, status animations and performance optimizations
 */
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const cards = document.querySelectorAll('.card');
  const actionButtons = document.querySelectorAll('.action-button');
  const statusBadges = document.querySelectorAll('.status-badge');
  
  /**
   * Initialize animations across the application
   */
  function initAnimations() {
    setupRippleEffects();
    setupCardAnimations();
    optimizeAnimationPerformance();
    enhanceStatusBadges();
  }
  
  /**
   * Apply ripple effect to action buttons
   */
  function setupRippleEffects() {
    actionButtons.forEach(button => {
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
   */
  function setupCardAnimations() {
    // Apply staggered animations for cards
    cards.forEach((card, index) => {
      // Only apply animation if it has the card-animate-in class
      if (card.classList.contains('card-animate-in')) {
        // Ensure cards that load later still animate in
        if (card.getBoundingClientRect().top < window.innerHeight) {
          card.style.animationDelay = `${index * 50}ms`;
          card.style.animationPlayState = 'running';
        }
      }
      
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
      document.querySelectorAll('.card:not(.card-animate-in)').forEach(card => {
        observer.observe(card);
      });
    }
  }
  
  /**
   * Optimize animation performance with will-change and other techniques
   */
  function optimizeAnimationPerformance() {
    // Apply will-change to elements that will animate frequently
    statusBadges.forEach(badge => {
      badge.style.willChange = 'transform, opacity';
    });
    
    // Remove will-change after animation completes to free up resources
    document.querySelectorAll('.card-animate-in').forEach(card => {
      card.addEventListener('animationend', () => {
        card.style.willChange = 'auto';
      });
    });
  }
  
  /**
   * Enhance status badge animations based on status
   */
  function enhanceStatusBadges() {
    statusBadges.forEach(badge => {
      const status = badge.getAttribute('data-status');
      
      if (status === 'online') {
        badge.style.animation = 'pulseOnline 2s infinite';
      } else if (status === 'offline') {
        badge.style.animation = 'pulseOffline 2s infinite';
      }
    });
  }
  
  // Initialize animations
  initAnimations();
  
  // Register a global function to update status badge animations
  window.updateStatusBadgeAnimation = function(badgeId, status) {
    const badge = document.getElementById(badgeId);
    if (badge) {
      badge.setAttribute('data-status', status);
      enhanceStatusBadges();
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
  
  // Initial check and listen for changes
  checkReducedMotion();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', checkReducedMotion);
});
