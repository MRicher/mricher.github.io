/**
 * CREAVIA.JS - Global Utilities and Theme Management
 * Handles theme switching, language management, and UI utilities
 */

// ===================================================================
// CONSTANTS AND VERSION INFO
// ===================================================================

// Default version for pages without specific app version
const APP_VERSION = "1.0.3";
const VERSION_STRING = `Version ${APP_VERSION}`;

/**
 * Update version info dynamically on page load
 * Only sets version if it hasn't been set by the specific app
 */
document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version-info");
  if (versionElement) {
    // Only set version if it's empty (hasn't been set by app-specific JS)
    if (!versionElement.textContent || versionElement.textContent.trim() === "") {
      versionElement.textContent = VERSION_STRING;
    }
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
    this.currentTheme = this.getPreferredTheme();
    this.init();
  }

  /**
   * Get preferred theme from various sources
   * @returns {string} Theme name ('light' or 'dark')
   */
  getPreferredTheme() {
    const cookieTheme = CookieManager.getCookie("preferred_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    return cookieTheme || (systemPrefersDark ? "dark" : "light");
  }

  /**
   * Save theme preference to cookie
   * @param {string} theme - Theme name to save
   */
  saveTheme(theme) {
    CookieManager.setCookie("preferred_theme", theme);
  }

  /**
   * Initialize theme functionality
   */
  init() {
    this.applyTheme(this.currentTheme);
    this.setupEventListeners();
  }

  /**
   * Apply theme to document
   * @param {string} theme - Theme name to apply
   */
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.currentTheme = theme;
    this.updateThemeToggleUI();
  }

  /**
   * Setup event listeners for theme toggle
   */
  setupEventListeners() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme(newTheme);
    this.saveTheme(newTheme);
    this.announceThemeChange();
  }

  /**
   * Update theme toggle button UI
   */
  updateThemeToggleUI() {
    const themeToggle = document.getElementById("theme-toggle");
    const themeText = document.getElementById("theme-text");

    if (themeToggle && themeText) {
      const currentLang = document.documentElement.lang?.split("-")[0] || "en";

      if (this.currentTheme === "dark") {
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
   * Initialize language switching functionality
   */
  init() {
    this.applyLanguage(this.currentLang);
    this.setupEventListeners();
  }

  /**
   * Apply language to document
   * @param {string} lang - Language code to apply
   */
  applyLanguage(lang) {
    document.documentElement.lang = lang;
    this.currentLang = lang;
    this.updateContent();
    this.updateLanguageButtons();
    this.dispatchLanguageChangeEvent();
  }

  /**
   * Dispatch custom event when language changes
   */
  dispatchLanguageChangeEvent() {
    const event = new CustomEvent("languageChanged", {
      detail: { language: this.currentLang },
    });
    document.dispatchEvent(event);
  }

  /**
   * Update all bilingual content on the page
   */
  updateContent() {
    const lang = this.currentLang.split("-")[0];
    const elements = document.querySelectorAll("[data-en], [data-fr]");

    elements.forEach((element) => {
      const content = lang === "fr" ? element.getAttribute("data-fr") : element.getAttribute("data-en");
      if (content !== null) {
        // Handle HTML content vs text content
        if (content.includes("<")) {
          element.innerHTML = content;
        } else {
          element.textContent = content;
        }
      }
    });

    // Update labels
    const labelElements = document.querySelectorAll("[data-en-label], [data-fr-label]");
    labelElements.forEach((element) => {
      const label = lang === "fr" ? element.getAttribute("data-fr-label") : element.getAttribute("data-en-label");
      if (label !== null) {
        element.setAttribute("aria-label", label);
      }
    });
  }

  /**
   * Update language toggle buttons state
   */
  updateLanguageButtons() {
    const enBtn = document.getElementById("lang-en-btn");
    const frBtn = document.getElementById("lang-fr-btn");

    if (enBtn && frBtn) {
      if (this.currentLang === "en-CA") {
        enBtn.style.display = "none";
        frBtn.style.display = "inline-block";
        enBtn.setAttribute("aria-pressed", "true");
        frBtn.setAttribute("aria-pressed", "false");
      } else {
        enBtn.style.display = "inline-block";
        frBtn.style.display = "none";
        enBtn.setAttribute("aria-pressed", "false");
        frBtn.setAttribute("aria-pressed", "true");
      }
    }
  }

  /**
   * Setup event listeners for language toggle buttons
   */
  setupEventListeners() {
    const enBtn = document.getElementById("lang-en-btn");
    const frBtn = document.getElementById("lang-fr-btn");

    if (enBtn) {
      enBtn.addEventListener("click", () => this.switchLanguage("en-CA"));
    }

    if (frBtn) {
      frBtn.addEventListener("click", () => this.switchLanguage("fr-CA"));
    }
  }

  /**
   * Switch to a specific language
   * @param {string} lang - Language code to switch to
   */
  switchLanguage(lang) {
    this.applyLanguage(lang);
    this.saveLanguage(lang);
    this.announceLanguageChange();
  }

  /**
   * Announce language change to screen readers
   */
  announceLanguageChange() {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";

    const message = this.currentLang === "fr-CA" ? "Langue changée au français" : "Language changed to English";

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
 * Back to top button functionality
 * Shows/hides button based on scroll position
 */
class BackToTopButton {
  constructor() {
    this.button = document.getElementById("back-to-top");
    if (this.button) {
      this.init();
    }
  }

  /**
   * Initialize back to top functionality
   */
  init() {
    window.addEventListener("scroll", () => this.toggleVisibility());
    this.button.addEventListener("click", () => this.scrollToTop());
  }

  /**
   * Toggle button visibility based on scroll position
   */
  toggleVisibility() {
    if (window.scrollY > 300) {
      this.button.classList.add("show");
    } else {
      this.button.classList.remove("show");
    }
  }

  /**
   * Scroll to top of page
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}

// ===================================================================
// FILE DOWNLOAD UTILITY
// ===================================================================

/**
 * File download utility
 * Handles creating and downloading files from content
 */
class FileDownloader {
  /**
   * Download content as file
   * @param {string} content - File content
   * @param {string} filename - Desired filename
   * @param {string} mimeType - MIME type of file
   */
  static download(content, filename, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download JSON data
   * @param {object} data - Data to download
   * @param {string} filename - Desired filename
   */
  static downloadJSON(data, filename = "data.json") {
    const content = JSON.stringify(data, null, 2);
    this.download(content, filename, "application/json");
  }

  /**
   * Download HTML content
   * @param {string} html - HTML content
   * @param {string} filename - Desired filename
   */
  static downloadHTML(html, filename = "document.html") {
    this.download(html, filename, "text/html");
  }
}

// ===================================================================
// ALERT MANAGEMENT
// ===================================================================

/**
 * Alert management utility
 * Creates Bootstrap alerts programmatically
 */
class AlertManager {
  /**
   * Show alert message
   * @param {string} message - Alert message
   * @param {string} type - Alert type (success, danger, warning, info)
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   * @param {string|null} containerId - Container element ID
   */
  static showAlert(message, type = "info", duration = 0, containerId = null) {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute("role", "alert");

    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const container = containerId ? document.getElementById(containerId) : document.body;
    const firstChild = container.firstChild;

    if (firstChild) {
      container.insertBefore(alertDiv, firstChild);
    } else {
      container.appendChild(alertDiv);
    }

    // Auto-dismiss if duration is specified
    if (duration > 0) {
      setTimeout(() => {
        alertDiv.classList.remove("show");
        setTimeout(() => alertDiv.remove(), 150);
      }, duration);
    }
  }

  /**
   * Show success alert
   */
  static showSuccess(message, duration = 5000, containerId = null) {
    this.showAlert(message, "success", duration, containerId);
  }

  /**
   * Show error alert
   */
  static showError(message, duration = 5000, containerId = null) {
    this.showAlert(message, "danger", duration, containerId);
  }

  /**
   * Show warning alert
   */
  static showWarning(message, duration = 5000, containerId = null) {
    this.showAlert(message, "warning", duration, containerId);
  }

  /**
   * Show info alert
   */
  static showInfo(message, duration = 5000, containerId = null) {
    this.showAlert(message, "info", duration, containerId);
  }
}

/**
 * Date Formatting Utility
 * Handles date input formatting
 */
class DateFormatter {
  /**
   * Format date input to YYYY-MM-DD
   * @param {HTMLInputElement} input - The date input element
   */
  static formatDateInput(input) {
    if (!input || input.type !== "date") return;

    // Ensure the date is in YYYY-MM-DD format
    const value = input.value;
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        input.value = `${year}-${month}-${day}`;
      }
    }
  }

  /**
   * Get current date in YYYY-MM-DD format
   * @returns {string} Current date
   */
  static getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Format date object to YYYY-MM-DD
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

// ===================================================================
// UI UTILITIES
// ===================================================================

/**
 * General UI utility functions
 */
class UIUtils {
  /**
   * Setup keyboard navigation for mobile menu
   */
  static setupMobileMenuFocus() {
    const navToggle = document.querySelector(".navbar-toggler");
    const navMenu = document.querySelector(".navbar-collapse");

    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        setTimeout(() => {
          if (navMenu.classList.contains("show")) {
            const firstLink = navMenu.querySelector("a");
            if (firstLink) firstLink.focus();
          }
        }, 300);
      });
    }
  }

  /**
   * Handle escape key to close modals/dropdowns
   */
  static handleEscapeKey() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Close any open Bootstrap modals
        const modals = document.querySelectorAll(".modal.show");
        modals.forEach((modal) => {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        });

        // Close mobile menu if open
        const navMenu = document.querySelector(".navbar-collapse.show");
        if (navMenu) {
          const navToggle = document.querySelector(".navbar-toggler");
          if (navToggle) navToggle.click();
        }
      }
    });
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

  // Make utilities globally accessible
  window.FileDownloader = FileDownloader;
  window.AlertManager = AlertManager;
  window.DateFormatter = DateFormatter;

  // Setup UI utilities
  UIUtils.handleEscapeKey();
  UIUtils.setupMobileMenuFocus();

  // Debug logging (remove in production)
  console.log("Global preferences loaded:", {
    theme: CookieManager.getCookie("preferred_theme"),
    language: CookieManager.getCookie("preferred_language"),
  });
});
