  // Theme management
  class ThemeManager {
      constructor() {
          this.currentTheme = this.getStoredTheme() || 'light';
          this.init();
      }
      
      getStoredTheme() {
          // Since we can't use localStorage, we'll use a simple variable
          return this.currentTheme || 'light';
      }
      
      init() {
          this.applyTheme(this.currentTheme);
          this.setupThemeToggle();
      }
      
      setupThemeToggle() {
          const themeToggle = document.getElementById('theme-toggle');
          if (themeToggle) {
              themeToggle.addEventListener('click', () => {
                  this.toggleTheme();
              });
          }
      }
      
      toggleTheme() {
          this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
          this.applyTheme(this.currentTheme);
          this.announceThemeChange();
      }
      
      applyTheme(theme) {
          document.documentElement.setAttribute('data-theme', theme);
          this.updateThemeButton(theme);
      }
      
      updateThemeButton(theme) {
          const themeToggle = document.getElementById('theme-toggle');
          const themeText = document.getElementById('theme-text');
          
          if (themeToggle && themeText) {
              const currentLang = document.documentElement.lang.split('-')[0];
              
              if (theme === 'dark') {
                  const lightModeText = currentLang === 'fr' ? 'Mode clair' : 'Light Mode';
                  themeText.textContent = lightModeText;
                  themeToggle.setAttribute('aria-label', 'Switch to light mode');
              } else {
                  const darkModeText = currentLang === 'fr' ? 'Mode sombre' : 'Dark Mode';
                  themeText.textContent = darkModeText;
                  themeToggle.setAttribute('aria-label', 'Switch to dark mode');
              }
          }
      }
      
      announceThemeChange() {
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          
          const message = this.currentTheme === 'dark' ? 
              'Dark theme activated' : 
              'Light theme activated';
          
          announcement.textContent = message;
          document.body.appendChild(announcement);
          
          setTimeout(() => {
              document.body.removeChild(announcement);
          }, 1000);
      }
  }
  
  // Language switching functionality
  class LanguageSwitcher {
      constructor() {
          this.currentLang = this.getLanguageFromUrl() || document.documentElement.lang || 'en-CA';
          this.init();
      }
      
      getLanguageFromUrl() {
          const urlParams = new URLSearchParams(window.location.search);
          const lang = urlParams.get('lang');
          
          if (lang === 'English' || lang === 'en-CA') {
              return 'en-CA';
          } else if (lang === 'Français' || lang === 'fr-CA') {
              return 'fr-CA';
          }
          
          return null;
      }
      
      updateUrl(lang) {
          const url = new URL(window.location);
          const shortLang = lang.split('-')[0];
          url.searchParams.set('lang', shortLang);
          window.history.replaceState({}, '', url);
      }
      
      init() {
          const langButtons = document.querySelectorAll('[data-lang]');
          langButtons.forEach(button => {
              button.addEventListener('click', (e) => {
                  const targetLang = e.currentTarget.getAttribute('data-lang');
                  this.switchLanguage(targetLang);
              });
          });
          
          this.switchLanguage(this.currentLang);
      }
      
      switchLanguage(lang) {
          this.currentLang = lang;
          document.documentElement.lang = lang;
          
          const elements = document.querySelectorAll('[data-en][data-fr]');
          elements.forEach(element => {
              const text = element.getAttribute(`data-${lang.split('-')[0]}`);
              if (text) {
                  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                      element.placeholder = text;
                  } else if (element.tagName === 'IMG') {
                      element.alt = text;
                  } else if (element.hasAttribute('aria-label')) {
                      element.setAttribute('aria-label', text);
                  } else if (element.hasAttribute('title')) {
                      element.title = text;
                  } else if (element.hasAttribute('content')) {
                      element.setAttribute('content', text);
                  } else {
                      element.textContent = text;
                  }
              }
          });
          
          this.updateLanguageButtons();
          this.announceLanguageChange(lang);
      }
      
      updateLanguageButtons() {
          const frBtn = document.getElementById('lang-fr-btn');
          const enBtn = document.getElementById('lang-en-btn');
          
          if (this.currentLang === 'en-CA') {
              frBtn.style.display = 'block';
              enBtn.style.display = 'none';
          } else {
              frBtn.style.display = 'none';
              enBtn.style.display = 'block';
          }
      }
      
      announceLanguageChange(lang) {
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          
          const message = lang === 'en-CA' ? 
              'Language switched to English' : 
              'Langue changée en français';
          
          announcement.textContent = message;
          document.body.appendChild(announcement);
          
          setTimeout(() => {
              document.body.removeChild(announcement);
          }, 1000);
      }
  }
  
  // Initialize everything when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
      new ThemeManager();
      new LanguageSwitcher();
      
      // Handle escape key to close mobile menu
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
              const mobileMenu = document.querySelector('.navbar-collapse.show');
              if (mobileMenu) {
                  const toggleButton = document.querySelector('.navbar-toggler');
                  if (toggleButton) {
                      toggleButton.click();
                      toggleButton.focus();
                  }
              }
          }
      });
      
      // Ensure proper focus management for mobile menu
      const navbarToggler = document.querySelector('.navbar-toggler');
      if (navbarToggler) {
          navbarToggler.addEventListener('click', () => {
              setTimeout(() => {
                  const isExpanded = navbarToggler.getAttribute('aria-expanded') === 'true';
                  if (isExpanded) {
                      const firstNavLink = document.querySelector('.navbar-nav .nav-link');
                      if (firstNavLink) {
                          firstNavLink.focus();
                      }
                  }
              }, 100);
          });
      }
  });
