// Update version info dynamically
document.getElementById('version-info').textContent = VERSION_STRING;
document.getElementById('version-info').setAttribute('data-en', VERSION_STRING);
document.getElementById('version-info').setAttribute('data-fr', VERSION_STRING);

// Cookie utility functions
class CookieManager {
    static setCookie(name, value, days = 365) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    }
    
    static getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) return value;
        }
        return null;
    }
    
    static deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
}

// Theme management
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.init();
    }
    
    getStoredTheme() {
        // Try to get from cookie first, then fall back to default
        const cookieTheme = CookieManager.getCookie('preferred_theme');
        return cookieTheme || this.currentTheme || 'light';
    }
    
    saveTheme(theme) {
        CookieManager.setCookie('preferred_theme', theme);
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
        this.saveTheme(this.currentTheme);
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
                const lightModeText = currentLang === 'fr' ? 'Mode clair' : 'Light mode';
                themeText.textContent = lightModeText;
                themeToggle.setAttribute('aria-label', 'Switch to light mode');
            } else {
                const darkModeText = currentLang === 'fr' ? 'Mode sombre' : 'Dark mode';
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
        this.currentLang = this.getPreferredLanguage();
        this.init();
    }
    
    getPreferredLanguage() {
        // Priority order: URL parameter > Cookie > Document lang > Default
        const urlLang = this.getLanguageFromUrl();
        const cookieLang = CookieManager.getCookie('preferred_language');
        const documentLang = document.documentElement.lang;
        
        return urlLang || cookieLang || documentLang || 'en-CA';
    }
    
    getLanguageFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        
        if (lang === 'English' || lang === 'en' || lang === 'en-CA') {
            return 'en-CA';
        } else if (lang === 'Français' || lang === 'fr' || lang === 'fr-CA') {
            return 'fr-CA';
        }
        
        return null;
    }
    
    saveLanguage(lang) {
        CookieManager.setCookie('preferred_language', lang);
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
        
        // Save to cookie
        this.saveLanguage(lang);
        
        // Update URL
        this.updateUrl(lang);
        
        const elements = document.querySelectorAll('[data-en][data-fr]');
        elements.forEach(element => {
            const shortLang = lang.split('-')[0]; // Get 'en' or 'fr'
            const text = element.getAttribute(`data-${shortLang}`);
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
                    element.innerHTML = text;
                }
            }
        });
        
        this.updateLanguageButtons();
        this.announceLanguageChange(lang);
        
        // Update theme button text in new language
        if (window.themeManager) {
            window.themeManager.updateThemeButton(window.themeManager.currentTheme);
        }
    }
    
    updateLanguageButtons() {
        const frBtn = document.getElementById('lang-fr-btn');
        const enBtn = document.getElementById('lang-en-btn');
        
        if (this.currentLang === 'en-CA') {
            if (frBtn) frBtn.style.display = 'block';
            if (enBtn) enBtn.style.display = 'none';
        } else {
            if (frBtn) frBtn.style.display = 'none';
            if (enBtn) enBtn.style.display = 'block';
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
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make instances globally accessible for cross-component communication
    window.themeManager = new ThemeManager();
    window.languageSwitcher = new LanguageSwitcher();
    
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
    
    // Debug logging (remove in production)
    console.log('Preferences loaded:', {
        theme: CookieManager.getCookie('preferred_theme'),
        language: CookieManager.getCookie('preferred_language')
    });
});
