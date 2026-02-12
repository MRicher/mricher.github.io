/**
 * CREAVIA.JS - Global Utilities and Theme Management
 * Handles theme switching, language management, and UI utilities
 */

// ===================================================================
// CONSTANTS AND VERSION INFO
// ===================================================================

const APP_VERSION = "1.0.3";
const VERSION_STRING = `Version ${APP_VERSION}`;

/**
 * Update version info dynamically on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version-info");
  if (versionElement) {
    versionElement.textContent = VERSION_STRING;
  }
});

// ===================================================================
// COOKIE MANAGEMENT UTILITY
// ===================================================================

/**
 * Cookie management utility class
 * Provides methods for setting, getting, and deleting cookies
 */
class CookieManager {
  /**
   * Set a cookie with specified name, value, and expiration
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Days until expiration (default: 365)
   */
  static setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }

  /**
   * Get a cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  static getCookie(name) {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === name) return value;
    }
    return null;
  }

  /**
   * Delete a cookie by name
   * @param {string} name - Cookie name to delete
   */
  static deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

// ===================================================================
// THEME MANAGEMENT
// ===================================================================

/**
 * Theme management class
 * Handles light/dark theme switching and persistence
 */
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || "light";
    this.init();
  }

  /**
   * Get the stored theme preference
   * Checks cookies first, then localStorage, then defaults to light
   * @returns {string} Theme preference ('light' or 'dark')
   */
  getStoredTheme() {
    return CookieManager.getCookie("preferred_theme") || localStorage.getItem("theme") || "light";
  }

  /**
   * Save theme preference to both cookie and localStorage
   * @param {string} theme - Theme to save ('light' or 'dark')
   */
  saveTheme(theme) {
    CookieManager.setCookie("preferred_theme", theme);
    localStorage.setItem("theme", theme);
  }

  /**
   * Initialize theme manager
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.setupThemeToggle();
  }

  /**
   * Setup theme toggle button event listener
   */
  setupThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme(this.currentTheme);
    this.saveTheme(this.currentTheme);
    this.announceThemeChange();
  }

  /**
   * Apply theme to the document
   * @param {string} theme - Theme to apply ('light' or 'dark')
   */
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-bs-theme", theme);
    this.updateThemeButton(theme);
  }

  /**
   * Update theme button text and aria-label
   * @param {string} theme - Current theme ('light' or 'dark')
   */
  updateThemeButton(theme) {
    const themeToggle = document.getElementById("theme-toggle");
    const themeText = document.getElementById("theme-text");

    if (themeToggle && themeText) {
      const currentLang = document.documentElement.lang?.split("-")[0] || "en";

      if (theme === "dark") {
        const lightModeText = currentLang === "fr" ? "Mode clair" : "Light mode";
        themeText.textContent = lightModeText;
        themeToggle.setAttribute("aria-label", "Switch to light mode");
      } else {
        const darkModeText = currentLang === "fr" ? "Mode sombre" : "Dark mode";
        themeText.textContent = darkModeText;
        themeToggle.setAttribute("aria-label", "Switch to dark mode");
      }
    }
  }

  /**
   * Announce theme change to screen readers
   */
  announceThemeChange() {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";

    const message = this.currentTheme === "dark" ? "Dark theme activated" : "Light theme activated";

    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove announcement after screen reader has time to read it
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }
}

// ===================================================================
// LANGUAGE SWITCHING
// ===================================================================

/**
 * Language switching functionality
 * Handles bilingual content switching between English and French
 */
class LanguageSwitcher {
  constructor() {
    this.currentLang = this.getPreferredLanguage();
    this.init();
  }

  /**
   * Get preferred language from various sources
   * @returns {string} Language code (e.g., 'en-CA', 'fr-CA')
   */
  getPreferredLanguage() {
    const urlLang = this.getLanguageFromUrl();
    const cookieLang = CookieManager.getCookie("preferred_language");
    const documentLang = document.documentElement.lang;

    return urlLang || cookieLang || documentLang || "en-CA";
  }

  /**
   * Extract language preference from URL parameters
   * @returns {string|null} Language code or null if not found
   */
  getLanguageFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get("lang");

    if (lang === "English" || lang === "en" || lang === "en-CA") {
      return "en-CA";
    } else if (lang === "Français" || lang === "fr" || lang === "fr-CA") {
      return "fr-CA";
    }

    return null;
  }

  /**
   * Save language preference to cookie
   * @param {string} lang - Language code to save
   */
  saveLanguage(lang) {
    CookieManager.setCookie("preferred_language", lang);
  }

  /**
   * Update URL with language parameter
   * @param {string} lang - Language code
   */
  updateUrl(lang) {
    const url = new URL(window.location);
    const shortLang = lang.split("-")[0];
    url.searchParams.set("lang", shortLang);
    window.history.replaceState({}, "", url);
  }

  /**
   * Initialize language switcher
   */
  init() {
    const langButtons = document.querySelectorAll("[data-lang]");
    langButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const targetLang = e.currentTarget.getAttribute("data-lang");
        this.switchLanguage(targetLang);
      });
    });

    this.switchLanguage(this.currentLang);
  }

  /**
   * Switch to specified language
   * @param {string} lang - Target language code
   */
  switchLanguage(lang) {
    this.currentLang = lang;
    document.documentElement.lang = lang;

    this.saveLanguage(lang);
    this.updateUrl(lang);

    // Update all bilingual elements
    const elements = document.querySelectorAll("[data-en][data-fr]");
    elements.forEach((element) => {
      const shortLang = lang.split("-")[0];
      const text = element.getAttribute(`data-${shortLang}`);
      if (text) {
        this.updateElementContent(element, text);
      }
    });

    this.updateLanguageButtons();
    this.announceLanguageChange(lang);

    // Update theme button text in new language
    if (window.themeManager) {
      window.themeManager.updateThemeButton(window.themeManager.currentTheme);
    }

    // Notify other components about language change
    if (window.editor && typeof window.editor.updateCalendarLanguage === "function") {
      setTimeout(() => window.editor.updateCalendarLanguage(), 100);
    }

    // Dispatch custom event for language change
    document.dispatchEvent(
      new CustomEvent("languageChanged", {
        detail: { language: lang },
      }),
    );
  }

  /**
   * Update element content based on element type
   * @param {Element} element - DOM element to update
   * @param {string} text - New text content
   */
  updateElementContent(element, text) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      element.placeholder = text;
    } else if (element.tagName === "IMG") {
      element.alt = text;
    } else if (element.hasAttribute("content")) {
      element.setAttribute("content", text);
    } else if (element.hasAttribute("aria-label") && element.hasAttribute("title")) {
      element.setAttribute("aria-label", text);
      element.title = text;
    } else if (element.hasAttribute("aria-label")) {
      element.setAttribute("aria-label", text);
    } else if (element.hasAttribute("title")) {
      element.title = text;
    } else {
      element.innerHTML = text;
    }
  }

  /**
   * Update visibility of language toggle buttons
   */
  updateLanguageButtons() {
    const frBtn = document.getElementById("lang-fr-btn");
    const enBtn = document.getElementById("lang-en-btn");

    if (this.currentLang === "en-CA") {
      if (frBtn) frBtn.style.display = "block";
      if (enBtn) enBtn.style.display = "none";
    } else {
      if (frBtn) frBtn.style.display = "none";
      if (enBtn) enBtn.style.display = "block";
    }
  }

  /**
   * Announce language change to screen readers
   * @param {string} lang - New language code
   */
  announceLanguageChange(lang) {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";

    const message = lang === "en-CA" ? "Language switched to English" : "Langue changée en français";

    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove announcement after screen reader has time to read it
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }
}

// ===================================================================
// BACK TO TOP BUTTON
// ===================================================================

/**
 * Back to Top Button functionality
 * Shows/hides button based on scroll position and handles smooth scrolling
 */
class BackToTopButton {
  constructor() {
    this.button = document.getElementById("backToTop");
    this.scrollThreshold = 300; // Show button after scrolling 300px
    this.init();
  }

  /**
   * Initialize back to top button functionality
   */
  init() {
    if (!this.button) return;

    // Add scroll event listener with throttling for better performance
    let scrollTimeout;
    window.addEventListener("scroll", () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => this.handleScroll(), 10);
    });

    // Add click event listener
    this.button.addEventListener("click", () => this.scrollToTop());

    // Handle keyboard navigation
    this.button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.scrollToTop();
      }
    });

    // Initial check in case page is already scrolled
    this.handleScroll();
  }

  /**
   * Handle scroll events to show/hide button
   */
  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Toggle 'visible' class based on scroll position
    if (scrollTop > this.scrollThreshold) {
      this.button.classList.add("visible");
    } else {
      this.button.classList.remove("visible");
    }
  }

  /**
   * Scroll smoothly to top of page
   */
  scrollToTop() {
    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Focus management - focus on a logical element after scroll
    setTimeout(() => {
      const mainHeading = document.querySelector("h1, .main-heading, #main-content");
      if (mainHeading && mainHeading.tabIndex === -1) {
        mainHeading.tabIndex = -1;
        mainHeading.focus();
      }
    }, 500);
  }
}

// ===================================================================
// UI UTILITIES
// ===================================================================

/**
 * General UI utility functions
 * Handles keyboard navigation and mobile menu interactions
 */
class UIUtils {
  /**
   * Handle Escape key press to close mobile menu
   */
  static handleEscapeKey() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const mobileMenu = document.querySelector(".navbar-collapse.show");
        if (mobileMenu) {
          const toggleButton = document.querySelector(".navbar-toggler");
          if (toggleButton) {
            toggleButton.click();
            toggleButton.focus();
          }
        }
      }
    });
  }

  /**
   * Setup focus management for mobile menu
   */
  static setupMobileMenuFocus() {
    const navbarToggler = document.querySelector(".navbar-toggler");
    if (navbarToggler) {
      navbarToggler.addEventListener("click", () => {
        setTimeout(() => {
          const isExpanded = navbarToggler.getAttribute("aria-expanded") === "true";
          if (isExpanded) {
            const firstNavLink = document.querySelector(".navbar-nav .nav-link");
            if (firstNavLink) {
              firstNavLink.focus();
            }
          }
        }, 100);
      });
    }
  }
}

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize all components when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  // Create and make instances globally accessible
  window.themeManager = new ThemeManager();
  window.languageSwitcher = new LanguageSwitcher();
  window.backToTopButton = new BackToTopButton();

  // Setup UI utilities
  UIUtils.handleEscapeKey();
  UIUtils.setupMobileMenuFocus();

  // Debug logging (remove in production)
  console.log("Global preferences loaded:", {
    theme: CookieManager.getCookie("preferred_theme"),
    language: CookieManager.getCookie("preferred_language"),
  });
});
