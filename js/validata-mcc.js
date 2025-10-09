const ORCAVIA_APP_VERSION = "1.0.2";
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
		this.data = {
			data: []
		};
		this.themeMapping = {
			'Culture and accountability': 'Culture et reddition de comptes',
			'Firearms': 'Armes à feu',
			'Gender-based violence and intimate partner violence': 'La violence fondée sur le sexe et la violence exercée par les partenaires intimes',
			'Governance': 'Gouvernance',
			'Information sharing': 'Communication d\'information',
			'Managing crises': 'Gestion de crises',
			'Organizational standards': 'Normes organisationnelles',
			'Partnerships and engagement': 'Partenariats et engagement',
			'Resourcing and recruitment': 'Ressources et recrutement',
			'Training': 'Formation'
		};
		this.reversedThemeMapping = Object.fromEntries(Object.entries(this.themeMapping).map(([key, value]) => [value, key]));
		this.waitForLanguageInitialization();
	}
	init() {
		document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));
		document.getElementById('add-record-btn').addEventListener('click', () => this.addNewRecord());
		document.getElementById('download-btn').addEventListener('click', () => this.downloadData());
		document.getElementById('load-from-url-btn').addEventListener('click', () => this.loadFromURL());
		this.render();
	}
	showAlert(message, type = 'success') {
		const container = document.getElementById('alerts-container');
		const alert = document.createElement('div');
		alert.className = `alert alert-${type} alert-dismissible fade show`;
		const closeButtonLabel = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Fermer' : 'Close';
		// Handle both string messages and object messages with en/fr properties
		let messageContent;
		if (typeof message === 'object' && message.en && message.fr) {
			const currentLang = window.languageSwitcher ? window.languageSwitcher.currentLang : 'en';
			const displayMessage = currentLang === 'fr' ? message.fr : message.en;
			messageContent = `<span data-en="${message.en}" data-fr="${message.fr}">${displayMessage}</span>`;
		} else {
			messageContent = message;
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
		}, 5000);
	}
	showUpdateAlert(recordIndex, message, type = 'danger') {
		const container = document.getElementById(`update-alerts-${recordIndex}`);
		if (!container) return;
		// Clear any existing alerts in this container
		container.innerHTML = '';
		const alert = document.createElement('div');
		alert.className = `alert alert-${type} alert-dismissible fade show`;
		const closeButtonLabel = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Fermer' : 'Close';
		alert.innerHTML = `
			${message}
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="${closeButtonLabel}"></button>
		`;
		container.appendChild(alert);
		// Auto-dismiss after 5 seconds
		setTimeout(() => {
			if (alert.parentNode) {
				alert.remove();
			}
		}, 5000);
	}
	sanitizeText(text) {
		if (!text || typeof text !== 'string') return text;
		let sanitized = text;
		// Replace smart apostrophes with straight apostrophes
		sanitized = sanitized.replace(/'/g, "'");
		
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
		
		// Only add abbr tags to plain text, not Quill content (which preserves them)
		if (!isQuillContent) {
			// Handle RCMP acronym (not already wrapped in abbr tags)
			sanitized = sanitized.replace(/(?<!<abbr[^>]*>)RCMP(?!<\/abbr>)/g, (match, offset, string) => {
				const beforeText = string.substring(0, offset);
				const afterText = string.substring(offset + match.length);
				const lastAbbrOpen = beforeText.lastIndexOf('<abbr');
				const lastAbbrClose = beforeText.lastIndexOf('</abbr>');
				if (lastAbbrOpen > lastAbbrClose && afterText.includes('</abbr>')) {
					return match;
				}
				return `<abbr>RCMP</abbr>`;
			});
			// Handle GRC acronym (not already wrapped in abbr tags)
			sanitized = sanitized.replace(/(?<!<abbr[^>]*>)GRC(?!<\/abbr>)/g, (match, offset, string) => {
				const beforeText = string.substring(0, offset);
				const afterText = string.substring(offset + match.length);
				const lastAbbrOpen = beforeText.lastIndexOf('<abbr');
				const lastAbbrClose = beforeText.lastIndexOf('</abbr>');
				if (lastAbbrOpen > lastAbbrClose && afterText.includes('</abbr>')) {
					return match;
				}
				return `<abbr>GRC</abbr>`;
			});
		}
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
		return { ...this.data,
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
		const url = 'mcc.json';
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
				const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Structure JSON invalide depuis l\'URL' : 'Invalid JSON structure from URL';
				throw new Error(errorMsg);
			}
		} catch (error) {
			const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Erreur lors du chargement des données depuis le site web : ' + error.message : 'Error loading data from website: ' + error.message;
			this.showAlert(errorMsg, 'error');
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
					const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Structure JSON invalide' : 'Invalid JSON structure';
					throw new Error(errorMsg);
				}
			} catch (error) {
				const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Erreur lors du chargement du fichier JSON : ' + error.message : 'Error loading JSON file: ' + error.message;
				this.showAlert(errorMsg, 'error');
			}
		};
		reader.readAsText(file);
	}
	addNewRecord() {
		const newRecord = {
			"last-updated": this.getCurrentDateFormatted(),
			"english-theme": "",
			"french-theme": "",
			"english-commitment": "",
			"french-commitment": "",
			"english-title": "",
			"french-title": "",
			"english-summary": "",
			"french-summary": "",
			"english-progress": "To be actioned",
			"french-progress": "À mettre en œuvre",
			"recommendations-1": "",
			"recommendations-2": "",
			"recommendations-3": "",
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
		const confirmMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cet enregistrement ?' : 'Are you sure you want to delete this record?';
		if (confirm(confirmMsg)) {
			this.data.data.splice(index, 1);
			this.render();
			this.showAlert({
				en: 'Enregistrement supprimé avec succès !',
				fr: 'Record deleted successfully!'
			});
		}
	}
	downloadData() {
		const sanitizedData = this.sanitizeAllData();
		const dataStr = JSON.stringify(sanitizedData, null, 2);
		const dataBlob = new Blob([dataStr], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `rcmp-data-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? 'Données téléchargées avec succès avec formatage assaini !' : 'Data downloaded successfully with sanitized formatting!';
		this.showAlert(successMsg);
	}
	updateRecord(index, field, value) {
		if (!this.data.data[index]) return;
		// For date fields, just store the string as-is if it matches yyyy-mm-dd
		if ((field.includes('date') || field === 'last-updated') && value) {
			if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
				this.data.data[index][field] = value;
			} else {
				// Try to parse and reformat if needed
				const d = new Date(value);
				if (!isNaN(d.getTime())) {
					const year = d.getFullYear();
					const month = String(d.getMonth() + 1).padStart(2, '0');
					const day = String(d.getDate()).padStart(2, '0');
					this.data.data[index][field] = `${year}-${month}-${day}`;
				} else {
					this.data.data[index][field] = value;
				}
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
				'To be actioned': 'À mettre en œuvre',
				'In progress': 'En cours',
				'Complete': 'Terminé',
				'Re-envisioned': 'Reconsidérée'
			};
			if (progressMap[value]) {
				this.data.data[index]['french-progress'] = progressMap[value];
				const frenchSelect = document.getElementById(`french-progress-${index}`);
				if (frenchSelect) frenchSelect.value = progressMap[value];
			}
		} else if (field === 'french-progress') {
			const progressMap = {
				'À mettre en œuvre': 'To be actioned',
				'En cours': 'In progress',
				'Terminé': 'Complete',
				'Reconsidérée': 'Re-envisioned'
			};
			if (progressMap[value]) {
				this.data.data[index]['english-progress'] = progressMap[value];
				const englishSelect = document.getElementById(`english-progress-${index}`);
				if (englishSelect) englishSelect.value = progressMap[value];
			}
		}
	}
	getStatusClass(progress) {
		return progress && (progress.toLowerCase().includes('complete') || progress.toLowerCase().includes('terminé')) ? 'status-complete' : 'status-pending';
	}
	getThemeOptions(selectedValue, isEnglish = true) {
		const themes = isEnglish ? Object.keys(this.themeMapping) : Object.values(this.themeMapping);
		return themes.map(theme => `<option value="${theme}" ${selectedValue === theme ? 'selected' : ''}>${theme}</option>`).join('');
	}
	// Fixed: Added the missing formatAllDateInputs method
formatAllDateInputs() {
		const dateInputs = document.querySelectorAll('input[type="date"]');
		dateInputs.forEach(input => {
			this.formatDateInput(input);
		});
	}
	
	initializeQuillEditors() {
		if (typeof Quill === 'undefined') return;
		
		// Register custom formats for abbr tag
		const Inline = Quill.import('blots/inline');
		class AbbrBlot extends Inline {
			static blotName = 'abbr';
			static tagName = 'abbr';
		}
		Quill.register(AbbrBlot);
		
		// Initialize Quill for all summary and update fields
		document.querySelectorAll('.quill-editor').forEach(container => {
			const editorId = container.getAttribute('data-editor-id');
			const field = container.getAttribute('data-field');
			const recordIndex = parseInt(container.getAttribute('data-record-index'));
			
			// Skip if already initialized
			if (container.querySelector('.ql-toolbar')) return;
			
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
			
			// Set initial content preserving HTML
			const record = this.data.data[recordIndex];
			if (record && record[field]) {
				// Use clipboard to paste HTML with custom tags preserved
				const delta = quill.clipboard.convert(record[field]);
				quill.setContents(delta, 'silent');
			}
			
			// Handle content changes
			quill.on('text-change', () => {
				let html = quill.root.innerHTML;
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
                <div class="no-records">
                    <h3 data-en="No records found" data-fr="Aucun enregistrement trouvé">No records found</h3>
                    <p data-en="Upload a JSON file or add a new record to get started." data-fr="Téléversez un fichier JSON ou ajoutez un nouvel enregistrement pour commencer.">Upload a JSON file or add a new record to get started.</p>
                </div>
            `;
			// Apply current language to the newly rendered content
			if (window.languageSwitcher) {
				window.languageSwitcher.switchLanguage(window.languageSwitcher.currentLang);
			}
			// Fixed: Moved formatAllDateInputs call before the return and made it a method call
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
                        <h2 class="h4 mb-1" data-en="Record ${index + 1}${record['english-title'] ? ` - ${record['english-title']}` : ''}" data-fr="Enregistrement ${index + 1}${record['french-title'] ? ` - ${record['french-title']}`  : ''}">Record ${index + 1}${record['english-title'] ? ` - ${record['english-title']}` : ''}</h2>
                        <span class="status-badge ${this.getStatusClass(record['english-progress'])}" data-en="${record['english-progress'] || 'Unknown Status'}" data-fr="${record['french-progress'] || 'Statut inconnu'}">
                            ${record['english-progress'] || 'Unknown Status'}
                        </span>
                        <small class="text-muted d-block mt-1" data-en="Updated: ${record['last-updated'] || 'Not set'}" data-fr="Mis à jour : ${record['last-updated'] || 'Non défini'}">Updated: ${record['last-updated'] || 'Not set'}</small>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="editor.deleteRecord(${index})" data-en="Delete" data-fr="Supprimer">Delete</button>
                </div>
                
                <div class="record-body">
                    <div class="mb-3">
                        <label for="last-updated-${index}" class="form-label" data-en="Last updated" data-fr="Dernière mise à jour">Last updated</label>
                        <input type="date" class="form-control" id="last-updated-${index}" value="${record['last-updated'] || ''}"
                               onchange="editor.updateRecord(${index}, 'last-updated', this.value)"
                               pattern="\\d{4}-\\d{2}-\\d{2}" placeholder="YYYY-MM-DD"
                               data-en-lang="en-CA" data-fr-lang="fr-CA">
                    </div>

                    <div class="form-row mb-3">
                        <div>
                            <label for="english-theme-${index}" class="form-label" data-en="English theme" data-fr="Thème anglais">English theme</label>
                            <select class="form-select" id="english-theme-${index}" onchange="editor.updateRecord(${index}, 'english-theme', this.value)">
                                <option value="">Select a theme...</option>
                                ${this.getThemeOptions(record['english-theme'], true)}
                            </select>
                        </div>
                        <div>
                            <label for="french-theme-${index}" class="form-label" data-en="French theme" data-fr="Thème français">French theme</label>
                            <select class="form-select" id="french-theme-${index}" onchange="editor.updateRecord(${index}, 'french-theme', this.value)">
                                <option value="">Sélectionner un thème...</option>
                                ${this.getThemeOptions(record['french-theme'], false)}
                            </select>
                        </div>
                    </div>

                    <div class="form-row mb-3">
                        <div>
                            <label for="english-title-${index}" class="form-label" data-en="English title" data-fr="Titre anglais">English title</label>
                            <textarea class="form-control" id="english-title-${index}" rows="3" onchange="editor.updateRecord(${index}, 'english-title', this.value)">${record['english-title'] || ''}</textarea>
                        </div>
                        <div>
                            <label for="french-title-${index}" class="form-label" data-en="French title" data-fr="Titre français">French title</label>
                            <textarea class="form-control" id="french-title-${index}" rows="3" onchange="editor.updateRecord(${index}, 'french-title', this.value)">${record['french-title'] || ''}</textarea>
                        </div>
                    </div>

					<div class="form-row mb-3">
                        <div>
                            <label for="english-summary-${index}" class="form-label" data-en="English summary" data-fr="Résumé anglais">English summary</label>
                            <div class="quill-editor" id="english-summary-${index}" data-editor-id="english-summary-${index}" data-field="english-summary" data-record-index="${index}"></div>
                        </div>
                        <div>
                            <label for="french-summary-${index}" class="form-label" data-en="French summary" data-fr="Résumé français">French summary</label>
                            <div class="quill-editor" id="french-summary-${index}" data-editor-id="french-summary-${index}" data-field="french-summary" data-record-index="${index}"></div>
                        </div>
                    </div>

                    <div class="form-row mb-3">
                        <div>
                            <label for="english-progress-${index}" class="form-label" data-en="English progress" data-fr="Progrès anglais">English progress</label>
                            <select class="form-select" id="english-progress-${index}" onchange="editor.updateRecord(${index}, 'english-progress', this.value)">
                                <option value="To be actioned" ${record['english-progress'] === 'To be actioned' ? 'selected' : ''}>To be actioned</option>
                                <option value="In progress" ${record['english-progress'] === 'In progress' ? 'selected' : ''}>In progress</option>
                                <option value="Complete" ${record['english-progress'] === 'Complete' ? 'selected' : ''}>Complete</option>
                                <option value="Re-envisioned" ${record['english-progress'] === 'Re-envisioned' ? 'selected' : ''}>Re-envisioned</option>
                            </select>
                        </div>
                        <div>
                            <label for="french-progress-${index}" class="form-label" data-en="French progress" data-fr="Progrès français">French progress</label>
                            <select class="form-select" id="french-progress-${index}" onchange="editor.updateRecord(${index}, 'french-progress', this.value)">
                                <option value="À mettre en œuvre" ${record['french-progress'] === 'À mettre en œuvre' ? 'selected' : ''}>À mettre en œuvre</option>
                                <option value="En cours" ${record['french-progress'] === 'En cours' ? 'selected' : ''}>En cours</option>
                                <option value="Terminé" ${record['french-progress'] === 'Terminé' ? 'selected' : ''}>Terminé</option>
                                <option value="Reconsidérée" ${record['french-progress'] === 'Reconsidérée' ? 'selected' : ''}>Reconsidérée</option>
                            </select>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="recommendations-${index}" class="form-label" data-en="Recommendations" data-fr="Recommandations">Recommendations</label>
                        <input type="text" class="form-control" id="recommendations-${index}" value="${record['recommendations-1'] || ''}"
                               onchange="editor.updateRecord(${index}, 'recommendations-1', this.value)">
                    </div>

                    <div class="update-section">
                        <h3 class="h5" data-en="Progress updates" data-fr="Mises à jour du progrès">Progress updates</h3>
                        ${[1, 2, 3, 4, 5, 6].map(updateNum => {
                            const hasUpdate = record[`update-${updateNum}-date`] || record[`english-update-${updateNum}`] || record[`french-update-${updateNum}`];
                            return hasUpdate ? `
                                <div class="update-item">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h4 class="h6 mb-0" data-en="Update ${updateNum}" data-fr="Mise à jour ${updateNum}">Update ${updateNum}</h4>
                                        <button class="btn btn-outline-danger btn-sm" onclick="editor.deleteUpdate(${index}, ${updateNum})" data-en="Delete" data-fr="Supprimer">Delete</button>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="update-${updateNum}-date-${index}" class="form-label" data-en="Date" data-fr="Date">Date</label>
                                        <input type="date" class="form-control" id="update-${updateNum}-date-${index}" value="${record[`update-${updateNum}-date`] || ''}"
                                               onchange="editor.updateRecord(${index}, 'update-${updateNum}-date', this.value)"
                                               pattern="\\d{4}-\\d{2}-\\d{2}" placeholder="YYYY-MM-DD"
                                               data-en-lang="en-CA" data-fr-lang="fr-CA">
                                    </div>
                                    
									<div class="form-row">
                                        <div>
                                            <label for="english-update-${updateNum}-${index}" class="form-label" data-en="English update" data-fr="Mise à jour anglaise">English update</label>
                                            <div class="quill-editor" id="english-update-${updateNum}-${index}" data-editor-id="english-update-${updateNum}-${index}" data-field="english-update-${updateNum}" data-record-index="${index}"></div>
                                        </div>
                                        <div>
                                            <label for="french-update-${updateNum}-${index}" class="form-label" data-en="French update" data-fr="Mise à jour française">French update</label>
                                            <div class="quill-editor" id="french-update-${updateNum}-${index}" data-editor-id="french-update-${updateNum}-${index}" data-field="french-update-${updateNum}" data-record-index="${index}"></div>
                                        </div>
                                    </div>
                                </div>
                            ` : '';
                        }).join('')}
                        
                        <button class="btn btn-outline-secondary btn-sm" onclick="editor.addUpdate(${index})" data-en="Add update" data-fr="Ajouter une mise à jour">Add update</button>
			<div id="update-alerts-${index}" class="mt-2"></div>
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
	addUpdate(recordIndex) {
		const record = this.data.data[recordIndex];
		if (!record) return;
		// Clear any existing update alerts for this record first
		const alertContainer = document.getElementById(`update-alerts-${recordIndex}`);
		if (alertContainer) {
			alertContainer.innerHTML = '';
		}
		for (let i = 1; i <= 6; i++) {
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
				const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? `Mise à jour ${i} ajoutée à l'enregistrement ${recordIndex + 1} !` : `Update ${i} added to record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
				return;
			}
		}
		// More robust language detection for error message
		const isFrench = (window.languageSwitcher && window.languageSwitcher.currentLang === 'fr') || document.documentElement.lang === 'fr' || document.documentElement.getAttribute('lang') === 'fr-CA';
		const errorMsg = isFrench ? 'Nombre maximum de mises à jour (6) atteint pour cet enregistrement.' : 'Maximum number of updates (6) reached for this record.';
		this.showUpdateAlert(recordIndex, errorMsg, 'danger');
	}
	deleteUpdate(recordIndex, updateNumber) {
		const confirmMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? `Êtes-vous sûr de vouloir supprimer la mise à jour ${updateNumber} ?` : `Are you sure you want to delete update ${updateNumber}?`;
		if (confirm(confirmMsg)) {
			const record = this.data.data[recordIndex];
			if (record) {
				record[`update-${updateNumber}-date`] = '';
				record[`english-update-${updateNumber}`] = '';
				record[`french-update-${updateNumber}`] = '';
				this.render();
				const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' ? `Mise à jour ${updateNumber} supprimée de l'enregistrement ${recordIndex + 1} !` : `Update ${updateNumber} deleted from record ${recordIndex + 1}!`;
				this.showAlert(successMsg);
			}
		}
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