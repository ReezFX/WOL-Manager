// Theme switcher functionality
document.addEventListener('DOMContentLoaded', function() {
  // Theme constants
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';
  const THEME_STORAGE_KEY = 'preferred-theme';

  /**
   * Get the user's preferred theme from localStorage or system preference
   * @returns {string} The preferred theme ('light' or 'dark')
   */
  function getPreferredTheme() {
    // Check if a theme preference is stored in localStorage
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      return storedTheme;
    }
    
    // If no stored preference, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? DARK_THEME 
      : LIGHT_THEME;
  }

  /**
   * Apply the theme to the document
   * @param {string} theme - The theme to apply ('light' or 'dark')
   */
  function applyTheme(theme) {
    const navbar = document.getElementById('main-navbar');
    const footer = document.getElementById('main-footer');
    const cardHeaders = document.querySelectorAll('.card-header.bg-tertiary-theme');
    
    if (theme === DARK_THEME) {
      // Apply dark theme
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      document.body.setAttribute('data-bs-theme', 'dark');
      
      // Update navbar
      if (navbar) {
        navbar.classList.remove('navbar-light', 'bg-light');
        navbar.classList.add('navbar-dark', 'bg-dark');
      }
      
      // Update footer
      if (footer) {
        footer.classList.remove('bg-light');
        footer.classList.add('bg-dark');
      }
      
      // Update card headers with bg-tertiary-theme class
      cardHeaders.forEach(header => {
        header.style.color = 'var(--text-primary)';
      });
    } else {
      // Apply light theme
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      document.body.setAttribute('data-bs-theme', 'light');
      
      // Update navbar
      if (navbar) {
        navbar.classList.remove('navbar-dark', 'bg-dark');
        navbar.classList.add('navbar-light', 'bg-light');
      }
      
      // Update footer
      if (footer) {
        footer.classList.remove('bg-dark');
        footer.classList.add('bg-light');
      }
      
      // Update card headers with bg-tertiary-theme class
      cardHeaders.forEach(header => {
        header.style.color = 'var(--text-primary)';
      });
    }
  }

  /**
   * Save the theme preference to localStorage
   * @param {string} theme - The theme to save ('light' or 'dark')
   */
  function saveThemePreference(theme) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  /**
   * Toggle the theme between light and dark
   */
  function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? DARK_THEME : LIGHT_THEME;
    const newTheme = currentTheme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
    
    applyTheme(newTheme);
    saveThemePreference(newTheme);
    
    // Update any theme toggle buttons (assumes they have a .theme-toggle class)
    updateToggleButtons(newTheme);
  }

  /**
   * Update the state of theme toggle buttons based on current theme
   * @param {string} theme - The current theme
   */
  function updateToggleButtons(theme) {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach(button => {
      if (button.tagName === 'INPUT' && button.type === 'checkbox') {
        button.checked = theme === DARK_THEME;
      } else {
        // For other button types, update text or icons
        if (theme === DARK_THEME) {
          button.setAttribute('aria-label', 'Switch to light mode');
        } else {
          button.setAttribute('aria-label', 'Switch to dark mode');
        }
      }
    });
    
    // Handle specific theme toggle button with ID 'theme-toggle'
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    if (themeToggle && themeIcon) {
      if (theme === DARK_THEME) {
        // In dark mode, show sun icon (to switch to light)
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      } else {
        // In light mode, show moon icon (to switch to dark)
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
      }
    }
  }

  // Initialize theme on page load
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);
  updateToggleButtons(initialTheme);

  // Attach event listeners to any theme toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.addEventListener('click', toggleTheme);
  });
  
  // Make sure to attach listener to the specific theme-toggle button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const systemTheme = e.matches ? DARK_THEME : LIGHT_THEME;
    
    // Only change theme automatically if user hasn't set a preference
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
      applyTheme(systemTheme);
      updateToggleButtons(systemTheme);
    }
  });

  // Expose toggle function globally so it can be called from other scripts or inline handlers
  window.toggleTheme = toggleTheme;
});

// JavaScript to enforce proper text color in modal pre elements
document.addEventListener('DOMContentLoaded', function() {
  /**
   * Fix pre element text color in modals based on current theme
   */
  function fixModalPreElementColors() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const preTextColor = isDarkTheme ? '#ffffff' : '#212529'; // Brighter white for dark theme
    
    // Target all pre elements in modal dialogs
    document.querySelectorAll('.modal pre').forEach(preElement => {
      // Set text color and ensure it's inherited by all child elements
      preElement.style.color = preTextColor;
      
      // Force all child elements to inherit the text color, 
      // unless they have specific styling classes
      Array.from(preElement.querySelectorAll('*')).forEach(child => {
        // Skip elements with specific styling classes
        if (!child.classList.contains('metadata') && 
            !child.classList.contains('timestamp') && 
            !child.classList.contains('log-level') &&
            !child.classList.contains('error') &&
            !child.classList.contains('warning') &&
            !child.classList.contains('info')) {
          child.style.color = 'inherit';
        }
      });
      
      // Enhance readability by highlighting key parts of log lines
      if (isDarkTheme) {
        // Apply automatic log formatting to improve readability
        const content = preElement.innerHTML;
        
        // This is a light-touch formatting approach that won't break existing content
        // but will help identify common log patterns for better readability
        if (!preElement.hasAttribute('data-formatted')) {
          preElement.innerHTML = content
            .replace(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/g, '<span class="timestamp">$1</span>')
            .replace(/(\[ERROR\]|\bERROR\b)/gi, '<span class="error">$1</span>')
            .replace(/(\[WARN\]|\bWARNING\b)/gi, '<span class="warning">$1</span>')
            .replace(/(\[INFO\]|\bINFO\b)/gi, '<span class="info">$1</span>');
            
          preElement.setAttribute('data-formatted', 'true');
        }
      }
    });
  }

  // Fix colors when page loads
  fixModalPreElementColors();
  
  // Fix colors when the theme changes
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.addEventListener('click', function() {
      // Small timeout to ensure theme has been applied before fixing colors
      setTimeout(fixModalPreElementColors, 50);
    });
  });

  // Fix colors when any modal is shown
  document.body.addEventListener('shown.bs.modal', function() {
    // Use a slight delay to ensure the modal is fully rendered
    setTimeout(fixModalPreElementColors, 10);
  });
  
  // Also apply formatting when content is dynamically loaded into a modal
  document.body.addEventListener('DOMNodeInserted', function(e) {
    if (document.querySelector('.modal.show') && 
        (e.target.tagName === 'PRE' || e.target.querySelector('pre'))) {
      setTimeout(fixModalPreElementColors, 10);
    }
  });

  // Re-fix colors when window resizes (in case of responsive styling changes)
  window.addEventListener('resize', function() {
    if (document.querySelector('.modal.show')) {
      fixModalPreElementColors();
    }
  });
});

