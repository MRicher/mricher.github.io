const ORCAVIA_APP_VERSION = "1.0.1";
const ORCAVIA_VERSION_STRING = `Version ${ORCAVIA_APP_VERSION}`;

// Update version info dynamically
document.addEventListener('DOMContentLoaded', () => {
	const versionElement = document.getElementById('version-info');
	if (versionElement) {
		versionElement.textContent = ORCAVIA_VERSION_STRING;
	}
});

class RCMPDataEditor {
	constructor() {
		// Constants
		this.MAX_UPDATES = 6;
		this.MAX_RECOMMENDATIONS = 3;
		this.DEBOUNCE_DELAY = 500;
		this.ALERT_TIMEOUT = 5000;
		
		this.data = {
			data: []
		};
		
		this.themeMapping = {
			'Systemic barriers': 'Les obstacle systémiques',
			'Recruitment': 'Le recrutement',
			'Training at Depot': 'La formation à la division Dépôt',
			'Recruit field training': 'La formation pratique des recrues',
			'Postings': 'Les affectations',
			'Ongoing training': 'La formation continue',
			'Human resources and staffing': 'Les ressources humaines et la dotation',
			'Maternity and parental leave': 'Le congé de maternité et le congé parental',
			'Employment flexibility': 'La flexibilité de l\'emploi',
			'Grievances and discipline': 'Les griefs et la disciplines',
			'Mental health': 'La santé mentale',
			'Promotions': 'Les promotions',
			'Leadership': 'Le leadership',
			'Specialized teams': 'Les équipes spécialisées',
			'Medical Examination': 'L\'examen médical',
			'Temporary civilian employees, civilian members and public service employees': 'Employés civiles temporaires, membres civiles et fonctionnaires'
		};
		
		this.reversedThemeMapping = Object.fromEntries(
			Object.entries(this.themeMapping).map(([key, value]) => [value, key])
		);
		
		this.quillInstances = new Map();
		
		// Create debounced update function
		this.debouncedUpdate = this.debounce((index, field, value) => {
			this.updateRecord(index, field, value);
		}, this.DEBOUNCE_DELAY);
		
		this.waitForLanguageInitialization();
	}
	
	// Utility: Debounce function
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const context = this;
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(context, args), wait);
		};
	}
	
	// Utility: Date validation
	isValidDate(dateString) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
		
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return false;
		
		// Check if date components match (prevents invalid dates like 2024-13-45)
		const [year, month, day] = dateString.split('-').map(Number);
		return date.getFullYear() === year && 
			   date.getMonth() === month - 1 && 
			   date.getDate() === day;
	}
	
	init() {
		document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));
		document.getElementById('add-record-btn').addEventListener('click', () => this.addNewRecord());
		document.getElementById('download-btn').addEventListener('click', () => this.downloadData());
		document.getElementById('load-from-url-btn').addEventListener('click', () => this.loadFromURL());
		
		// Event delegation for record actions
		document.getElementById('records-container').addEventListener('click', (e) => {
			const target = e.target.closest('[data-action]');
			if (!target) return;
			
			const action = target.dataset.action;
			const index = parseInt(target.dataset.index);
			
			switch(action) {
				case 'delete-record':
					this.deleteRecord(index);
					break;
				case 'delete-update':
					const updateNum = parseInt(target.dataset.updateNum);
					this.deleteUpdate(index, updateNum);
					break;
				case 'delete-recommendation':
					const recNum = parseInt(target.dataset.recNum);
					this.deleteRecommendation(index, recNum);
					break;
				case 'add-update':
					this.addUpdate(index);
					break;
				case 'add-recommendation':
					this.addRecommendation(index);
					break;
			}
		});
		
		// Event delegation for form inputs
		document.getElementById('records-container').addEventListener('change', (e) => {
			if (e.target.matches('[data-field]')) {
				const index = parseInt(e.target.dataset.recordIndex);
				const field = e.target.dataset.field;
				const value = e.target.value;
				
				if (field.includes('mcc-actions')) {
					this.updateMCCActions(index, field, value);
				} else {
					this.updateRecord(index, field, value);
				}
			}
		});
		
		// Event delegation for text inputs with debouncing
		document.getElementById('records-container').addEventListener('input', (e) => {
			if (e.target.matches('[data-field-debounced]')) {
				const index = parseInt(e.target.dataset.recordIndex);
				const field = e.target.dataset.fieldDebounced;
				const value = e.target.value;
				this.debouncedUpdate(index, field, value);
			}
		});
		
		this.render();
	}
	
	showAlert(message, type = 'success') {
		const container = document.getElementById('alerts-container');
		const alert = document.createElement('div');
		alert.className = `alert alert-${type} alert-dismissible fade show`;
		alert.setAttribute('role', 'alert');
		
		const closeButtonLabel = window.languageSwitcher?.currentLang === 'fr' ? 'Fermer' : 'Close';
		
		// Handle both string messages and object messages with en/fr properties
		let messageContent;
		if (typeof message === 'object' && message.en && message.fr) {
			const currentLang = window.languageSwitcher ? window.languageSwitcher.currentLang : 'en';
			const displayMessage = currentLang === 'fr' ? message.fr : message.en;
			messageContent = `<span data-en="${this.escapeHtml(message.en)}" data-fr="${this.escapeHtml(message.fr)}">${this.escapeHtml(displayMessage)}</span>`;
		} else {
			messageContent = this.escapeHtml(message);
		}
		
		alert.innerHTML = `
			${messageContent}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="${closeButtonLabel}"></button>
		`;
		
		container.appendChild(alert);
		
		// Apply current language to the alert content
		if (window.languageSwitcher) {
			window.languageSwitcher.switchLanguage(window.languageSwitcher.currentLang);
		}
		
		setTimeout(() => {
			if (alert.parentNode) {
				alert.remove();
			}
		}, this.ALERT_TIMEOUT);
	}
	
	showUpdateAlert(recordIndex, message, type = 'danger') {
		const container = document.getElementById(`update-alerts-${recordIndex}`);
		if (!container) return;
		
		// Clear any existing alerts in this container
		container.innerHTML = '';
		
		const alert = document.createElement('div');
		alert.className = `alert alert-${type} alert-dismissible fade show`;
		alert.setAttribute('role', 'alert');
		
		const closeButtonLabel = window.languageSwitcher?.currentLang === 'fr' ? 'Fermer' : 'Close';
		
		alert.innerHTML = `
			${this.escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="${closeButtonLabel}"></button>
		`;
		
		container.appendChild(alert);
		
		// Auto-dismiss after timeout
		setTimeout(() => {
			if (alert.parentNode) {
				alert.remove();
			}
		}, this.ALERT_TIMEOUT);
	}
	
	showRecommendationAlert(recordIndex, message, type = 'danger') {
		const container = document.getElementById(`recommendation-alerts-${recordIndex}`);
		if (!container) return;
		
		// Clear any existing alerts in this container
		container.innerHTML = '';
		
		const alert = document.createElement('div');
		alert.className = `alert alert-${type} alert-dismissible fade show`;
		alert.setAttribute('role', 'alert');
		
		const closeButtonLabel = window.languageSwitcher?.currentLang === 'fr' ? 'Fermer' : 'Close';
		
		alert.innerHTML = `
			${this.escapeHtml(message)}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="${closeButtonLabel}"></button>
		`;
		
		container.appendChild(alert);
		
		// Auto-dismiss after timeout
		setTimeout(() => {
			if (alert.parentNode) {
				alert.remove();
			}
		}, this.ALERT_TIMEOUT);
	}
	
	// Security: Escape HTML to prevent XSS
	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	// Security: Sanitize HTML with whitelist
	sanitizeHtml(html) {
		if (!html || typeof html !== 'string') return html;
		
		const allowedTags = ['p', 'br', 'strong', 'cite', 'a', 'abbr', 'li'];
		const temp = document.createElement('div');
		temp.innerHTML = html;
		
		// Remove all script tags and event handlers
		temp.querySelectorAll('script').forEach(el => el.remove());
		
		// Check all elements
		const allElements = temp.querySelectorAll('*');
		allElements.forEach(el => {
			// Remove if not in allowed list
			if (!allowedTags.includes(el.tagName.toLowerCase())) {
				el.replaceWith(...el.childNodes);
				return;
			}
			
			// Remove all event handler attributes
			Array.from(el.attributes).forEach(attr => {
				if (attr.name.startsWith('on')) {
					el.removeAttribute(attr.name);
				}
			});
			
			// Special handling for anchor tags
			if (el.tagName.toLowerCase() === 'a') {
				const href = el.getAttribute('href');
				if (href && (href.includes('javascript:') || href.includes('data:'))) {
					el.removeAttribute('href');
				}
			}
		});
		
		return temp.innerHTML;
	}
	
	sanitizeText(text) {
		if (!text || typeof text !== 'string') return text;
		
		// First sanitize any HTML
		let sanitized = this.sanitizeHtml(text);
		
		// Replace straight apostrophes with smart apostrophes
		sanitized = sanitized.replace(/'/g, "'");
		
		// Replace space before closing guillemet with non-breaking space
		sanitized = sanitized.replace(/ »/g, "&#160;»");
		
		// Replace space after opening guillemet with non-breaking space
		sanitized = sanitized.replace(/« /g, "«&#160;");
		
		// Remove empty paragraph tags with line breaks
		sanitized = sanitized.replace(/<p><br><\/p>/g, "");
		
		// Replace double spaces with space + non-breaking space
		sanitized = sanitized.replace(/  /g, " &#160;");
		
		// Check if this is Quill content (contains <p> tags or Quill classes)
		const isQuillContent = sanitized.includes('<p>') || sanitized.includes('ql-');
		
		// Handle email addresses (but not if already in mailto links)
		const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
		sanitized = sanitized.replace(emailRegex, (match) => {
			const lowercaseEmail = match.toLowerCase();
			const beforeMatch = sanitized.substring(0, sanitized.indexOf(match));
			const afterMatch = sanitized.substring(sanitized.indexOf(match) + match.length);
			
			if (beforeMatch.includes('<a href="mailto:') && !beforeMatch.includes('</a>') && afterMatch.includes('</a>')) {
				return lowercaseEmail;
			}
			
			// Don't auto-wrap emails in Quill content as Quill handles links
			if (isQuillContent && beforeMatch.includes('<a ') && afterMatch.includes('</a>')) {
				return lowercaseEmail;
			}
			
			return isQuillContent ? match : `<a href="mailto:${lowercaseEmail}">${lowercaseEmail}</a>`;
		});
		
		// Wrap acronyms in abbr tags (works for both Quill and non-Quill content)
		const wrapWithAbbr = (text, acronym) => {
			return text.replace(new RegExp(`(?<!<abbr[^>]*>)\\b${acronym}\\b(?!</abbr>)`, 'g'), (match, offset, string) => {
				const beforeText = string.substring(0, offset);
				const afterText = string.substring(offset + match.length);
				const lastAbbrOpen = beforeText.lastIndexOf('<abbr');
				const lastAbbrClose = beforeText.lastIndexOf('</abbr>');
				
				// Skip if already inside an abbr tag
				if (lastAbbrOpen > lastAbbrClose && afterText.includes('</abbr>')) {
					return match;
				}
				
				return `<abbr>${match}</abbr>`;
			});
		};
		
		const acronyms = ['RCMP', 'GRC', 'MCC', 'CACP', 'CISC', 'ATIP', 'CPM', 'ACCP', 'SCRC', 'AIPRP', 'ICIR', 'IIIC', 'CAD', 'RAO', 'CCG', 'MAB', 'GBA', 'EDI', 'ACS', 'DICE', 'DREAM'];
		acronyms.forEach(acronym => {
			sanitized = wrapWithAbbr(sanitized, acronym);
		});
		
		return sanitized;
	}
	
	sanitizeRecord(record) {
		const sanitizedRecord = {};
		for (const [key, value] of Object.entries(record)) {
			if (typeof value === 'string') {
				sanitizedRecord[key] = this.sanitizeText(value);
			} else {
				sanitizedRecord[key] = value;
			}
		}
		return sanitizedRecord;
	}
	
	sanitizeAllData() {
		return {
			...this.data,
			data: this.data.data.map(record => this.sanitizeRecord(record))
		};
	}
	
	async restoreScrollPosition(targetScrollPosition) {
		return new Promise((resolve) => {
			const maxAttempts = 10;
			let attempts = 0;
			
			const tryRestore = () => {
				attempts++;
				const currentHeight = document.documentElement.scrollHeight;
				const viewportHeight = window.innerHeight;
				
				// Only restore if content height allows it or we've tried enough times
				if (targetScrollPosition <= currentHeight - viewportHeight || attempts >= maxAttempts) {
					window.scrollTo({
						top: Math.min(targetScrollPosition, currentHeight - viewportHeight),
						behavior: 'instant'
					});
					resolve();
				} else {
					// Content still loading, try again
					requestAnimationFrame(tryRestore);
				}
			};
			
			requestAnimationFrame(tryRestore);
		});
	}
	
	async loadFromURL() {
		const url = 'bas.json';
		const button = document.getElementById('load-from-url-btn');
		const originalText = button.textContent;
		
		// Store current scroll position
		const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		
		try {
			button.textContent = 'Loading...';
			button.disabled = true;
			
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const jsonData = await response.json();
			
			if (jsonData.data && Array.isArray(jsonData.data)) {
				this.data = jsonData;
				this.render();
				
				// Enhanced scroll restoration
				await this.restoreScrollPosition(currentScrollPosition);
				
				this.showAlert({
					en: `Successfully loaded ${jsonData.data.length} records from website!`,
					fr: `${jsonData.data.length} enregistrements chargés avec succès depuis le site web !`
				});
			} else {
				const errorMsg = window.languageSwitcher?.currentLang === 'fr' 
					? 'Structure JSON invalide depuis l\'URL' 
					: 'Invalid JSON structure from URL';
				throw new Error(errorMsg);
			}
		} catch (error) {
			const errorMsg = window.languageSwitcher?.currentLang === 'fr' 
				? 'Erreur lors du chargement des données depuis le site web : ' + error.message 
				: 'Error loading data from website: ' + error.message;
			this.showAlert(errorMsg, 'danger');
		} finally {
			button.textContent = originalText;
			button.disabled = false;
		}
	}
	
	async handleFileUpload(event) {
		const file = event.target.files[0];
		if (!file) return;
		
		// Store current scroll position
		const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
		
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const jsonData = JSON.parse(e.target.result);
				
				if (jsonData.data && Array.isArray(jsonData.data)) {
					this.data = jsonData;
					this.render();
					
					// Use the class method to restore scroll position
					await this.restoreScrollPosition(currentScrollPosition);
					
					this.showAlert({
						en: 'JSON file loaded successfully!',
						fr: 'Fichier JSON chargé avec succès !'
					});
				} else {
					const errorMsg = window.languageSwitcher?.currentLang === 'fr' 
						? 'Structure JSON invalide' 
						: 'Invalid JSON structure';
					throw new Error(errorMsg);
				}
			} catch (error) {
				const errorMsg = window.languageSwitcher?.currentLang === 'fr' 
					? 'Erreur lors du chargement du fichier JSON : ' + error.message 
					: 'Error loading JSON file: ' + error.message;
				this.showAlert(errorMsg, 'danger');
			}
		};
		
		reader.readAsText(file);
	}
	
	addNewRecord() {
		const newRecord = {
			"last-updated": this.getCurrentDateFormatted(),
			"english-theme": "",
			"french-theme": "",
			"english-title": "",
			"french-title": "",
			"english-summary": "",
			"french-summary": "",
			"english-progress": "In progress",
			"french-progress": "En cours",
			"recommendations-1": "",
			"english-recommendation-summary-1": "",
			"french-recommendation-summary-1": "",
			"recommendations-2": "",
			"english-recommendation-summary-2": "",
			"french-recommendation-summary-2": "",
			"recommendations-3": "",
			"english-recommendation-summary-3": "",
			"french-recommendation-summary-3": "",
			"english-mcc-actions": "",
			"french-mcc-actions": "",
			"update-1-date": "",
			"english-update-1": "",
			"french-update-1": "",
			"update-2-date": "",
			"english-update-2": "",
			"french-update-2": "",
			"update-3-date": "",
			"english-update-3": "",
			"french-update-3": "",
			"update-4-date": "",
			"english-update-4": "",
			"french-update-4": "",
			"update-5-date": "",
			"english-update-5": "",
			"french-update-5": "",
			"update-6-date": "",
			"english-update-6": "",
			"french-update-6": ""
		};
		
		this.data.data.push(newRecord);
		this.render();
		
		// Scroll to the new record
		setTimeout(() => {
			const recordCards = document.querySelectorAll('.record-card');
			const lastCard = recordCards[recordCards.length - 1];
			if (lastCard) {
				lastCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
		
		this.showAlert({
			en: 'New record added successfully!',
			fr: 'Nouvel enregistrement ajouté avec succès !'
		});
	}
	
	getCurrentDateFormatted() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	
	deleteRecord(index) {
		const confirmMsg = window.languageSwitcher?.currentLang === 'fr' 
			? 'Êtes-vous sûr de vouloir supprimer cet enregistrement ?' 
			: 'Are you sure you want to delete this record?';
		
		if (confirm(confirmMsg)) {
			this.data.data.splice(index, 1);
			this.render();
			this.showAlert({
				en: 'Record deleted successfully!',
				fr: 'Enregistrement supprimé avec succès !'
			});
		}
	}
	
	downloadData() {
		try {
			const sanitizedData = this.sanitizeAllData();
			const dataStr = JSON.stringify(sanitizedData, null, 2);
			const dataBlob = new Blob([dataStr], {
				type: 'application/json'
			});
			
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `bas-data-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			
			const successMsg = window.languageSwitcher?.currentLang === 'fr' 
				? 'Données téléchargées avec succès avec formatage assaini !' 
				: 'Data downloaded successfully with sanitized formatting!';
			this.showAlert(successMsg);
		} catch (error) {
			const errorMsg = window.languageSwitcher?.currentLang === 'fr' 
				? 'Erreur lors de la génération du fichier JSON : ' + error.message
				: 'Error generating JSON file: ' + error.message;
			this.showAlert(errorMsg, 'danger');
		}
	}
	
	updateRecord(index, field, value) {
		if (!this.data.data[index]) return;
		
		// For date fields, validate and store
		if ((field.includes('date') || field === 'last-updated') && value) {
			if (this.isValidDate(value)) {
				this.data.data[index][field] = value;
			} else {
				this.showAlert({
					en: 'Invalid date format. Please use YYYY-MM-DD.',
					fr: 'Format de date invalide. Veuillez utiliser AAAA-MM-JJ.'
				}, 'danger');
				return;
			}
		} else {
			this.data.data[index][field] = value;
		}
		
		// Handle theme linking
		if (field === 'english-theme' && this.themeMapping[value]) {
			this.data.data[index]['french-theme'] = this.themeMapping[value];
			const frenchSelect = document.getElementById(`french-theme-${index}`);
			if (frenchSelect) frenchSelect.value = this.themeMapping[value];
		} else if (field === 'french-theme' && this.reversedThemeMapping[value]) {
			this.data.data[index]['english-theme'] = this.reversedThemeMapping[value];
			const englishSelect = document.getElementById(`english-theme-${index}`);
			if (englishSelect) englishSelect.value = this.reversedThemeMapping[value];
		}
		
		// Handle progress linking
		else if (field === 'english-progress') {
			const progressMap = {
				'In progress': 'En cours',
				'Complete': 'Terminé'
			};
			if (progressMap[value]) {
				this.data.data[index]['french-progress'] = progressMap[value];
				const frenchSelect = document.getElementById(`french-progress-${index}`);
				if (frenchSelect) frenchSelect.value = progressMap[value];
			}
		} else if (field === 'french-progress') {
			const progressMap = {
				'En cours': 'In progress',
				'Terminé': 'Complete'
			};
			if (progressMap[value]) {
				this.data.data[index]['english-progress'] = progressMap[value];
				const englishSelect = document.getElementById(`english-progress-${index}`);
				if (englishSelect) englishSelect.value = progressMap[value];
			}
		}
	}
	
	getStatusClass(progress) {
		return progress && (progress.toLowerCase().includes('complete') || progress.toLowerCase().includes('terminé')) 
			? 'status-complete' 
			: 'status-pending';
	}
	
	getThemeOptions(selectedValue, isEnglish = true) {
		const themes = isEnglish ? Object.keys(this.themeMapping) : Object.values(this.themeMapping);
		return themes.map(theme => 
			`<option value="${this.escapeHtml(theme)}" ${selectedValue === theme ? 'selected' : ''}>${this.escapeHtml(theme)}</option>`
		).join('');
	}
	
	formatAllDateInputs() {
		const dateInputs = document.querySelectorAll('input[type="date"]');
		dateInputs.forEach(input => {
			this.formatDateInput(input);
		});
	}
	
	initializeQuillEditors() {
		if (typeof Quill === 'undefined') return;
		
		// Clean up old instances first
		this.quillInstances.forEach((quill, id) => {
			if (!document.getElementById(id)) {
				this.quillInstances.delete(id);
			}
		});
		
		// Register custom formats for abbr tag (only once)
		if (!Quill.imports['formats/abbr']) {
			const Inline = Quill.import('blots/inline');
			class AbbrBlot extends Inline {
				static blotName = 'abbr';
				static tagName = 'abbr';
			}
			Quill.register(AbbrBlot);
		}
		
		// Override italic to use cite tag instead of em
		if (!Quill.imports['formats/cite']) {
			const Inline = Quill.import('blots/inline');
			class CiteBlot extends Inline {
				static blotName = 'italic';
				static tagName = 'cite';
			}
			Quill.register(CiteBlot, true);
		}
		
		// Initialize Quill for all summary and update fields
		document.querySelectorAll('.quill-editor').forEach(container => {
			const editorId = container.getAttribute('data-editor-id');
			const field = container.getAttribute('data-field');
			const recordIndex = parseInt(container.getAttribute('data-record-index'));
			
			// Skip if already initialized
			if (this.quillInstances.has(editorId)) return;
			
			const quill = new Quill(container, {
				theme: 'snow',
				modules: {
					toolbar: [
						['bold', 'italic'],
						['link']
					],
					clipboard: {
						matchVisual: false
					}
				}
			});
			
			this.quillInstances.set(editorId, quill);
			
			// Set initial content preserving HTML
			const record = this.data.data[recordIndex];
			if (record && record[field]) {
				const content = record[field] || '';
				if (content) {
					// Use pasteHTML method to properly insert HTML content
					quill.clipboard.dangerouslyPasteHTML(content);
				}
			}
			
			// Handle content changes
			quill.on('text-change', () => {
				let html = quill.root.innerHTML;
				
				// Clean up empty paragraph tags
				if (html === '<p><br></p>') {
					html = '';
				}
				
				// Preserve abbr tags and links
				this.updateRecord(recordIndex, field, html);
			});
		});
	}
	
	render() {
		const container = document.getElementById('records-container');
		
		// Store focused element to restore later
		const activeElement = document.activeElement;
		const focusedElementId = activeElement ? activeElement.id : null;
		
		if (this.data.data.length === 0) {
			container.innerHTML = `
				<div class="no-records" role="status">
					<h3 data-en="No records found" data-fr="Aucun enregistrement trouvé">No records found</h3>
					<p data-en="Upload a JSON file or add a new record to get started." data-fr="Téléversez un fichier JSON ou ajoutez un nouvel enregistrement pour commencer.">Upload a JSON file or add a new record to get started.</p>
				</div>
			`;
			
			// Apply current language to the newly rendered content
			if (window.languageSwitcher) {
				window.languageSwitcher.switchLanguage(window.languageSwitcher.currentLang);
			}
			
			this.formatAllDateInputs();
			return;
		}
		
		// Create document fragment to minimize reflows
		const fragment = document.createDocumentFragment();
		const tempDiv = document.createElement('div');
		
		tempDiv.innerHTML = this.data.data.map((record, index) => `
			<div class="record-card">
				<div class="record-header">
					<div>
						<h2 class="h4 mb-1" data-en="Record ${index + 1}${record['english-title'] ? ` - ${record['english-title']}` : ''}" data-fr="Enregistrement ${index + 1}${record['french-title'] ? ` - ${record['french-title']}` : ''}">Record ${index + 1}${record['english-title'] ? ` - ${this.escapeHtml(record['english-title'])}` : ''}</h2>
						<span class="status-badge ${this.getStatusClass(record['english-progress'])}">
							<span data-en="${this.escapeHtml(record['english-progress'] || 'Unknown status')}" data-fr="${this.escapeHtml(record['french-progress'] || 'Statut inconnu')}">${window.languageSwitcher?.currentLang === 'fr' ? this.escapeHtml(record['french-progress'] || 'Statut inconnu') : this.escapeHtml(record['english-progress'] || 'Unknown status')}</span>
						</span>
						<small class="text-muted d-block mt-1" data-en="Updated: ${this.escapeHtml(record['last-updated'] || 'Not set')}" data-fr="Mis à jour : ${this.escapeHtml(record['last-updated'] || 'Non défini')}">Updated: ${this.escapeHtml(record['last-updated'] || 'Not set')}</small>
					</div>
					<button class="btn btn-danger btn-sm" 
							data-action="delete-record" 
							data-index="${index}"
							aria-label="Delete record ${index + 1}"
							data-en="Delete" 
							data-fr="Supprimer">Delete</button>
				</div>
				
				<div class="record-body">
					<div class="mb-3">
						<label for="last-updated-${index}" class="form-label" data-en="Last updated" data-fr="Dernière mise à jour">Last updated</label>
						<input type="date" 
							   class="form-control" 
							   id="last-updated-${index}" 
							   value="${record['last-updated'] || ''}"
							   data-field="last-updated"
							   data-record-index="${index}"
							   pattern="\\d{4}-\\d{2}-\\d{2}" 
							   placeholder="YYYY-MM-DD"
							   aria-label="Last updated date for record ${index + 1}"
							   data-en-lang="en-CA" 
							   data-fr-lang="fr-CA">
					</div>

					<div class="form-row mb-3">
						<div>
							<label for="english-theme-${index}" class="form-label" data-en="English theme" data-fr="Thème anglais">English theme</label>
							<select class="form-select" 
									id="english-theme-${index}" 
									data-field="english-theme"
									data-record-index="${index}"
									aria-label="English theme for record ${index + 1}">
								<option value="">Select a theme...</option>
								${this.getThemeOptions(record['english-theme'], true)}
							</select>
						</div>
						<div>
							<label for="french-theme-${index}" class="form-label" data-en="French theme" data-fr="Thème français">French theme</label>
							<select class="form-select" 
									id="french-theme-${index}" 
									data-field="french-theme"
									data-record-index="${index}"
									aria-label="French theme for record ${index + 1}">
								<option value="">Sélectionner un thème...</option>
								${this.getThemeOptions(record['french-theme'], false)}
							</select>
						</div>
					</div>

					<div class="form-row mb-3">
						<div>
							<label for="english-title-${index}" class="form-label" data-en="English title" data-fr="Titre anglais">English title</label>
							<textarea class="form-control" 
									  id="english-title-${index}" 
									  rows="3" 
									  data-field-debounced="english-title"
									  data-record-index="${index}"
									  aria-label="English title for record ${index + 1}">${this.escapeHtml(record['english-title'] || '')}</textarea>
						</div>
						<div>
							<label for="french-title-${index}" class="form-label" data-en="French title" data-fr="Titre français">French title</label>
							<textarea class="form-control" 
									  id="french-title-${index}" 
									  rows="3" 
									  data-field-debounced="french-title"
									  data-record-index="${index}"
									  aria-label="French title for record ${index + 1}">${this.escapeHtml(record['french-title'] || '')}</textarea>
						</div>
					</div>

					<div class="form-row mb-3">
						<div>
							<label for="english-summary-${index}" class="form-label" data-en="English summary" data-fr="Résumé anglais">English summary</label>
							<div class="quill-editor" 
								 id="english-summary-${index}" 
								 data-editor-id="english-summary-${index}" 
								 data-field="english-summary" 
								 data-record-index="${index}"
								 role="textbox"
								 aria-label="English summary for record ${index + 1}"></div>
						</div>
						<div>
							<label for="french-summary-${index}" class="form-label" data-en="French summary" data-fr="Résumé français">French summary</label>
							<div class="quill-editor" 
								 id="french-summary-${index}" 
								 data-editor-id="french-summary-${index}" 
								 data-field="french-summary" 
								 data-record-index="${index}"
								 role="textbox"
								 aria-label="French summary for record ${index + 1}"></div>
						</div>
					</div>

					<div class="form-row mb-3">
						<div>
							<label for="english-progress-${index}" class="form-label" data-en="English progress" data-fr="Progrès anglais">English progress</label>
							<select class="form-select" 
									id="english-progress-${index}" 
									data-field="english-progress"
									data-record-index="${index}"
									aria-label="English progress status for record ${index + 1}">
								<option value="In progress" ${record['english-progress'] === 'In progress' ? 'selected' : ''}>In progress</option>
								<option value="Complete" ${record['english-progress'] === 'Complete' ? 'selected' : ''}>Complete</option>
							</select>
						</div>
						<div>
							<label for="french-progress-${index}" class="form-label" data-en="French progress" data-fr="Progrès français">French progress</label>
							<select class="form-select" 
									id="french-progress-${index}" 
									data-field="french-progress"
									data-record-index="${index}"
									aria-label="French progress status for record ${index + 1}">
								<option value="En cours" ${record['french-progress'] === 'En cours' ? 'selected' : ''}>En cours</option>
								<option value="Terminé" ${record['french-progress'] === 'Terminé' ? 'selected' : ''}>Terminé</option>
							</select>
						</div>
					</div>

					<div class="recommendation-section">
						<h3 class="h5" data-en="Recommendations" data-fr="Recommandations">Recommendations</h3>
						
						${[1, 2, 3].map(recNum => {
							const hasRecommendation = recNum === 1 || record[`recommendations-${recNum}`] || record[`english-recommendation-summary-${recNum}`] || record[`french-recommendation-summary-${recNum}`];
							return hasRecommendation ? `
								<div class="recommendation-item mb-3">
									${recNum > 1 ? `
										<div class="d-flex justify-content-end mb-2">
											<button class="btn btn-outline-danger btn-sm" 
													data-action="delete-recommendation" 
													data-index="${index}" 
													data-rec-num="${recNum}"
													aria-label="Delete recommendation ${recNum}"
													data-en="Delete" 
													data-fr="Supprimer">Delete</button>
										</div>
									` : ''}
									
									<div class="mb-3">
										<label for="recommendations-${recNum}-${index}" class="form-label" data-en="Recommendation ${recNum}" data-fr="Recommandation ${recNum}">Recommendation ${recNum}</label>
										<input type="text" 
											   class="form-control" 
											   id="recommendations-${recNum}-${index}" 
											   value="${this.escapeHtml(record[`recommendations-${recNum}`] || '')}"
											   data-field-debounced="recommendations-${recNum}"
											   data-record-index="${index}"
											   aria-label="Recommendation ${recNum} number for record ${index + 1}">
									</div>

									<div class="form-row mb-3">
										<div>
											<label for="english-recommendation-summary-${recNum}-${index}" class="form-label" data-en="English recommendation summary ${recNum}" data-fr="Résumé des recommandations ${recNum} anglais">English recommendation summary ${recNum}</label>
											<div class="quill-editor" 
												 id="english-recommendation-summary-${recNum}-${index}" 
												 data-editor-id="english-recommendation-summary-${recNum}-${index}" 
												 data-field="english-recommendation-summary-${recNum}" 
												 data-record-index="${index}"
												 role="textbox"
												 aria-label="English recommendation summary ${recNum} for record ${index + 1}"></div>
										</div>
										<div>
											<label for="french-recommendation-summary-${recNum}-${index}" class="form-label" data-en="French recommendation summary ${recNum}" data-fr="Résumé des recommandations ${recNum} français">French recommendation summary ${recNum}</label>
											<div class="quill-editor" 
												 id="french-recommendation-summary-${recNum}-${index}" 
												 data-editor-id="french-recommendation-summary-${recNum}-${index}" 
												 data-field="french-recommendation-summary-${recNum}" 
												 data-record-index="${index}"
												 role="textbox"
												 aria-label="French recommendation summary ${recNum} for record ${index + 1}"></div>
										</div>
									</div>
								</div>
							` : '';
						}).join('')}
						
						<button class="btn btn-outline-secondary btn-sm" 
								data-action="add-recommendation" 
								data-index="${index}"
								aria-label="Add new recommendation to record ${index + 1}"
								data-en="Add recommendation" 
								data-fr="Ajouter une recommandation">Add recommendation</button>
						<div id="recommendation-alerts-${index}" class="mt-2" role="alert" aria-live="polite"></div>
					</div>

					<div class="update-section form-row mb-3">
						<div>
							<label for="english-mcc-actions-${index}" class="form-label" data-en="English MCC action titles (one per line)" data-fr="Titres d'action MCC anglais (un par ligne)">English <abbr>MCC</abbr> action titles (one per line)</label>
							<textarea class="form-control" 
									  id="english-mcc-actions-${index}" 
									  rows="5" 
									  placeholder="Enter each action title on a new line&#10;Each line will become a bullet point"
									  data-field="english-mcc-actions"
									  data-record-index="${index}"
									  aria-label="English MCC action titles for record ${index + 1}"
									  aria-describedby="english-mcc-actions-help-${index}">${this.convertMCCActionsToTextarea(record['english-mcc-actions'])}</textarea>
							<small id="english-mcc-actions-help-${index}" class="form-text text-muted" data-en="Each line will be displayed as a bullet point" data-fr="Chaque ligne sera affichée comme une puce">Each line will be displayed as a bullet point</small>
						</div>
						<div>
							<label for="french-mcc-actions-${index}" class="form-label" data-en="French MCC action titles (one per line)" data-fr="Titres d'action CPM français (un par ligne)">Titre(s) de l'action Commission des pertes massives (<abbr>CPM</abbr>) pertinent(s) (un par ligne)</label>
							<textarea class="form-control" 
									  id="french-mcc-actions-${index}" 
									  rows="5" 
									  placeholder="Entrez chaque titre d'action sur une nouvelle ligne&#10;Chaque ligne deviendra une puce"
									  data-field="french-mcc-actions"
									  data-record-index="${index}"
									  aria-label="French MCC action titles for record ${index + 1}"
									  aria-describedby="french-mcc-actions-help-${index}">${this.convertMCCActionsToTextarea(record['french-mcc-actions'])}</textarea>
							<small id="french-mcc-actions-help-${index}" class="form-text text-muted" data-en="Each line will be displayed as a bullet point" data-fr="Chaque ligne sera affichée comme une puce">Chaque ligne sera affichée comme une puce</small>
						</div>
					</div>

					<div class="update-section">
						<h3 class="h5" data-en="Progress updates" data-fr="Mises à jour du progrès">Progress updates</h3>
						${[1, 2, 3, 4, 5, 6].map(updateNum => {
							const hasUpdate = record[`update-${updateNum}-date`] || record[`english-update-${updateNum}`] || record[`french-update-${updateNum}`];
							return hasUpdate ? `
								<div class="update-item">
									<div class="d-flex justify-content-between align-items-center mb-3">
										<h4 class="h6 mb-0" data-en="Update ${updateNum}" data-fr="Mise à jour ${updateNum}">Update ${updateNum}</h4>
										<button class="btn btn-outline-danger btn-sm" 
												data-action="delete-update" 
												data-index="${index}" 
												data-update-num="${updateNum}"
												aria-label="Delete update ${updateNum}"
												data-en="Delete" 
												data-fr="Supprimer">Delete</button>
									</div>
									
									<div class="mb-3">
										<label for="update-${updateNum}-date-${index}" class="form-label" data-en="Date" data-fr="Date">Date</label>
										<input type="date" 
											   class="form-control" 
											   id="update-${updateNum}-date-${index}" 
											   value="${record[`update-${updateNum}-date`] || ''}"
											   data-field="update-${updateNum}-date"
											   data-record-index="${index}"
											   pattern="\\d{4}-\\d{2}-\\d{2}" 
											   placeholder="YYYY-MM-DD"
											   aria-label="Date for update ${updateNum} of record ${index + 1}"
											   data-en-lang="en-CA" 
											   data-fr-lang="fr-CA">
									</div>
									
									<div class="form-row">
										<div>
											<label for="english-update-${updateNum}-${index}" class="form-label" data-en="English update" data-fr="Mise à jour anglaise">English update</label>
											<div class="quill-editor" 
												 id="english-update-${updateNum}-${index}" 
												 data-editor-id="english-update-${updateNum}-${index}" 
												 data-field="english-update-${updateNum}" 
												 data-record-index="${index}"
												 role="textbox"
												 aria-label="English update ${updateNum} for record ${index + 1}"></div>
										</div>
										<div>
											<label for="french-update-${updateNum}-${index}" class="form-label" data-en="French update" data-fr="Mise à jour française">French update</label>
											<div class="quill-editor" 
												 id="french-update-${updateNum}-${index}" 
												 data-editor-id="french-update-${updateNum}-${index}" 
												 data-field="french-update-${updateNum}" 
												 data-record-index="${index}"
												 role="textbox"
												 aria-label="French update ${updateNum} for record ${index + 1}"></div>
										</div>
									</div>
								</div>
							` : '';
						}).join('')}
						
						<button class="btn btn-outline-secondary btn-sm" 
								data-action="add-update" 
								data-index="${index}"
								aria-label="Add new update to record ${index + 1}"
								data-en="Add update" 
								data-fr="Ajouter une mise à jour">Add update</button>
						<div id="update-alerts-${index}" class="mt-2" role="alert" aria-live="polite"></div>
					</div>
				</div>
			</div>
		`).join('');
		
		// Move nodes from temp div to fragment
		while (tempDiv.firstChild) {
			fragment.appendChild(tempDiv.firstChild);
		}
		
		// Batch DOM update
		container.innerHTML = '';
		container.appendChild(fragment);
		
		// Format all date inputs after rendering
		this.formatAllDateInputs();
		
		// Set today's date for new update date fields
		const todayFormatted = this.getCurrentDateFormatted();
		const newDateInputs = container.querySelectorAll('input[type="date"]:not([data-initialized])');
		newDateInputs.forEach(input => {
			if (!input.value && input.id.includes('update-') && input.id.includes('-date-')) {
				// Check if this is a newly added update by looking at the record data
				const matches = input.id.match(/update-(\d+)-date-(\d+)/);
				if (matches) {
					const updateNum = matches[1];
					const recordIndex = matches[2];
					const record = this.data.data[recordIndex];
					if (record && record[`update-${updateNum}-date`] === todayFormatted) {
						input.value = todayFormatted;
					}
				}
			}
			input.setAttribute('data-initialized', 'true');
		});
		
		// Restore focus if it was on a form element
		if (focusedElementId) {
			requestAnimationFrame(() => {
				const elementToFocus = document.getElementById(focusedElementId);
				if (elementToFocus && typeof elementToFocus.focus === 'function') {
					elementToFocus.focus();
				}
			});
		}
		
		// Apply current language to the newly rendered content
		if (window.languageSwitcher) {
			window.languageSwitcher.switchLanguage(window.languageSwitcher.currentLang);
		}
		
		// Initialize Quill editors
		this.initializeQuillEditors();
	}
	
	updateMCCActions(index, field, value) {
		if (!this.data.data[index]) return;
		
		// Convert textarea lines to <li> tags
		if (value) {
			const lines = value.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0);
			
			if (lines.length > 0) {
				const listItems = lines.map(line => `<li>${this.escapeHtml(line)}</li>`).join('');
				this.data.data[index][field] = listItems;
			} else {
				this.data.data[index][field] = '';
			}
		} else {
			this.data.data[index][field] = '';
		}
	}
	
	convertMCCActionsToTextarea(htmlList) {
		if (!htmlList) return '';
		
		// Convert <li>tags</li> back to newline-separated text for textarea
		return htmlList
			.replace(/<li>/g, '')
			.replace(/<\/li>/g, '\n')
			.trim();
	}
	
	addUpdate(recordIndex) {
		const record = this.data.data[recordIndex];
		if (!record) return;
		
		// Clear any existing update alerts for this record first
		const alertContainer = document.getElementById(`update-alerts-${recordIndex}`);
		if (alertContainer) {
			alertContainer.innerHTML = '';
		}
		
		for (let i = 1; i <= this.MAX_UPDATES; i++) {
			if (!record[`update-${i}-date`] && !record[`english-update-${i}`] && !record[`french-update-${i}`]) {
				const todaysDate = this.getCurrentDateFormatted();
				record[`update-${i}-date`] = todaysDate;
				record[`english-update-${i}`] = '';
				record[`french-update-${i}`] = '';
				this.render();
				
				// Ensure the new date input gets today's date
				setTimeout(() => {
					const dateInput = document.getElementById(`update-${i}-date-${recordIndex}`);
					if (dateInput) {
						dateInput.value = todaysDate;
					}
				}, 0);
				
				const successMsg = window.languageSwitcher?.currentLang === 'fr' 
					? `Mise à jour ${i} ajoutée à l'enregistrement ${recordIndex + 1} !` 
					: `Update ${i} added to record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
				return;
			}
		}
		
		// More robust language detection for error message
		const isFrench = (window.languageSwitcher?.currentLang === 'fr') 
			|| document.documentElement.lang === 'fr' 
			|| document.documentElement.getAttribute('lang') === 'fr-CA';
		const errorMsg = isFrench 
			? `Nombre maximum de mises à jour (${this.MAX_UPDATES}) atteint pour cet enregistrement.` 
			: `Maximum number of updates (${this.MAX_UPDATES}) reached for this record.`;
		this.showUpdateAlert(recordIndex, errorMsg, 'danger');
	}
	
	deleteUpdate(recordIndex, updateNumber) {
		const confirmMsg = window.languageSwitcher?.currentLang === 'fr' 
			? `Êtes-vous sûr de vouloir supprimer la mise à jour ${updateNumber} ?` 
			: `Are you sure you want to delete update ${updateNumber}?`;
		
		if (confirm(confirmMsg)) {
			const record = this.data.data[recordIndex];
			if (record) {
				record[`update-${updateNumber}-date`] = '';
				record[`english-update-${updateNumber}`] = '';
				record[`french-update-${updateNumber}`] = '';
				this.render();
				
				const successMsg = window.languageSwitcher?.currentLang === 'fr' 
					? `Mise à jour ${updateNumber} supprimée de l'enregistrement ${recordIndex + 1} !` 
					: `Update ${updateNumber} deleted from record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
			}
		}
	}
	
	deleteRecommendation(recordIndex, recNumber) {
		const confirmMsg = window.languageSwitcher?.currentLang === 'fr' 
			? `Êtes-vous sûr de vouloir supprimer la recommandation ${recNumber} ?` 
			: `Are you sure you want to delete recommendation ${recNumber}?`;
		
		if (confirm(confirmMsg)) {
			const record = this.data.data[recordIndex];
			if (record) {
				record[`recommendations-${recNumber}`] = '';
				record[`english-recommendation-summary-${recNumber}`] = '';
				record[`french-recommendation-summary-${recNumber}`] = '';
				this.render();
				
				const successMsg = window.languageSwitcher?.currentLang === 'fr' 
					? `Recommandation ${recNumber} supprimée de l'enregistrement ${recordIndex + 1} !` 
					: `Recommendation ${recNumber} deleted from record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
			}
		}
	}
	
	addRecommendation(recordIndex) {
		const record = this.data.data[recordIndex];
		if (!record) return;
		
		// Clear any existing recommendation alerts for this record first
		const alertContainer = document.getElementById(`recommendation-alerts-${recordIndex}`);
		if (alertContainer) {
			alertContainer.innerHTML = '';
		}
		
		// Check which recommendation slots are available
		// Start from 2 since 1 is always shown
		for (let i = 2; i <= this.MAX_RECOMMENDATIONS; i++) {
			// Check if this slot would be rendered (matches render logic)
			const hasRecommendation = record[`recommendations-${i}`] || 
									record[`english-recommendation-summary-${i}`] || 
									record[`french-recommendation-summary-${i}`];
			
			// If slot wouldn't be rendered (truly doesn't exist or is completely empty), add it
			if (!hasRecommendation) {
				record[`recommendations-${i}`] = ' ';  // Use space instead of empty string so it renders
				record[`english-recommendation-summary-${i}`] = '';
				record[`french-recommendation-summary-${i}`] = '';
				this.render();
				
				const successMsg = window.languageSwitcher?.currentLang === 'fr' 
					? `Recommandation ${i} ajoutée à l'enregistrement ${recordIndex + 1} !` 
					: `Recommendation ${i} added to record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
				return;
			}
		}
		
		// More robust language detection for error message
		const isFrench = (window.languageSwitcher?.currentLang === 'fr') 
			|| document.documentElement.lang === 'fr' 
			|| document.documentElement.getAttribute('lang') === 'fr-CA';
		const errorMsg = isFrench 
			? `Nombre maximum de recommandations (${this.MAX_RECOMMENDATIONS}) atteint pour cet enregistrement.` 
			: `Maximum number of recommendations (${this.MAX_RECOMMENDATIONS}) reached for this record.`;
		this.showRecommendationAlert(recordIndex, errorMsg, 'danger');
	}
	
	updateCalendarLanguage() {
		const currentLang = document.documentElement.lang || 'en-CA';
		const dateInputs = document.querySelectorAll('input[type="date"]');
		dateInputs.forEach(input => {
			input.setAttribute('lang', currentLang);
			this.formatDateInput(input);
		});
	}
	
	formatDateInput(input) {
		if (!input) return;
		
		// Ensure the input shows yyyy-mm-dd format
		input.setAttribute('pattern', '\\d{4}-\\d{2}-\\d{2}');
		input.setAttribute('placeholder', 'YYYY-MM-DD');
		
		// Only add event listener once
		if (!input.hasAttribute('data-formatted')) {
			input.addEventListener('change', (e) => {
				this.ensureDateFormat(e.target);
			});
			input.setAttribute('data-formatted', 'true');
		}
	}
	
	ensureDateFormat(input) {
		if (!input.value) return;
		
		// Only reformat if not already in yyyy-mm-dd
		if (!/^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
			const d = new Date(input.value);
			if (!isNaN(d.getTime())) {
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				input.value = `${year}-${month}-${day}`;
			}
		}
	}
	
	waitForLanguageInitialization() {
		if (window.languageSwitcher) {
			this.init();
		} else {
			setTimeout(() => this.waitForLanguageInitialization(), 50);
		}
	}
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', function() {
	window.editor = new RCMPDataEditor();
});