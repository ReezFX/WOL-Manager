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

