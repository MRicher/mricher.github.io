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
        this.data = { data: [] };
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
        this.reversedThemeMapping = Object.fromEntries(
            Object.entries(this.themeMapping).map(([key, value]) => [value, key])
        );
        
        this.waitForLanguageInitialization();
    }

    init() {
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('add-record-btn').addEventListener('click', () => this.addNewRecord());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadData());
        document.getElementById('load-from-url-btn').addEventListener('click', () => this.loadFromURL());
        this.render();
    }

	scrollToRecord(recordIndex, smooth = true) {
		const recordCard = document.querySelector(`.record-card:nth-child(${recordIndex + 1})`);
		if (recordCard) {
			recordCard.scrollIntoView({
				behavior: smooth ? 'smooth' : 'instant',
				block: 'center',
				inline: 'nearest'
			});
			
			// Optional: Add visual highlight
			recordCard.classList.add('updating');
			setTimeout(() => {
				recordCard.classList.remove('updating');
			}, 1000);
		}
	}

    showAlert(message, type = 'success') {
        const container = document.getElementById('alerts-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.appendChild(alert);
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
        
        // Handle email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        sanitized = sanitized.replace(emailRegex, (match) => {
            const lowercaseEmail = match.toLowerCase();
            const beforeMatch = sanitized.substring(0, sanitized.indexOf(match));
            const afterMatch = sanitized.substring(sanitized.indexOf(match) + match.length);
            
            if (beforeMatch.includes('<a href="mailto:') && !beforeMatch.includes('</a>') && afterMatch.includes('</a>')) {
                return lowercaseEmail;
            }
            
            return `<a href="mailto:${lowercaseEmail}">${lowercaseEmail}</a>`;
        });
        
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
				
				const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
					? `${jsonData.data.length} enregistrements chargés avec succès depuis le site web !`
					: `Successfully loaded ${jsonData.data.length} records from website!`;
				this.showAlert(successMsg);
			} else {
				const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
					? 'Structure JSON invalide depuis l\'URL'
					: 'Invalid JSON structure from URL';
				throw new Error(errorMsg);
			}
		} catch (error) {
			const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' 
				? 'Erreur lors du chargement des données depuis le site web : ' + error.message
				: 'Error loading data from website: ' + error.message;
			this.showAlert(errorMsg, 'error');
		} finally {
			button.textContent = originalText;
			button.disabled = false;
		}
	}

	 handleFileUpload(event) {
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
					
					// Enhanced scroll restoration
					await this.restoreScrollPosition(currentScrollPosition);
					
					const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
						? 'Fichier JSON chargé avec succès !'
						: 'JSON file loaded successfully!';
					this.showAlert(successMsg);
				} else {
					const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
						? 'Structure JSON invalide'
						: 'Invalid JSON structure';
					throw new Error(errorMsg);
				}
			} catch (error) {
				const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr' 
					? 'Erreur lors du chargement du fichier JSON : ' + error.message
					: 'Error loading JSON file: ' + error.message;
				this.showAlert(errorMsg, 'error');
			}
		};
		reader.readAsText(file);
	}

    addNewRecord() {
		const newRecordIndex = this.data.data.length;
        const newRecord = {
            "last-updated": new Date().toISOString().split('T')[0],
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

		// Scroll to new record after render
		requestAnimationFrame(() => {
			this.scrollToRecord(newRecordIndex);
		});

        const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
            ? 'Nouvel enregistrement ajouté avec succès !'
            : 'New record added successfully!';
        this.showAlert(successMsg);
		
    }

    deleteRecord(index) {
        const confirmMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
            ? 'Êtes-vous sûr de vouloir supprimer cet enregistrement ?'
            : 'Are you sure you want to delete this record?';
        if (confirm(confirmMsg)) {
            this.data.data.splice(index, 1);
            this.render();
            const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
                ? 'Enregistrement supprimé avec succès !'
                : 'Record deleted successfully!';
            this.showAlert(successMsg);
        }
    }

    downloadData() {
        const sanitizedData = this.sanitizeAllData();
        const dataStr = JSON.stringify(sanitizedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `rcmp-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
            ? 'Données téléchargées avec succès avec formatage assaini !'
            : 'Data downloaded successfully with sanitized formatting!';
        this.showAlert(successMsg);
    }

    updateRecord(index, field, value) {
        if (!this.data.data[index]) return;
        
        this.data.data[index][field] = value;
        
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
                'Complete': 'Terminé'
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
            `<option value="${theme}" ${selectedValue === theme ? 'selected' : ''}>${theme}</option>`
        ).join('');
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
							<textarea class="form-control" id="english-summary-${index}" rows="4" onchange="editor.updateRecord(${index}, 'english-summary', this.value)">${record['english-summary'] || ''}</textarea>
						</div>
						<div>
							<label for="french-summary-${index}" class="form-label" data-en="French summary" data-fr="Résumé français">French summary</label>
							<textarea class="form-control" id="french-summary-${index}" rows="4" onchange="editor.updateRecord(${index}, 'french-summary', this.value)">${record['french-summary'] || ''}</textarea>
						</div>
					</div>

					<div class="form-row mb-3">
						<div>
							<label for="english-progress-${index}" class="form-label" data-en="English progress" data-fr="Progrès anglais">English progress</label>
							<select class="form-select" id="english-progress-${index}" onchange="editor.updateRecord(${index}, 'english-progress', this.value)">
								<option value="To be actioned" ${record['english-progress'] === 'To be actioned' ? 'selected' : ''}>To be actioned</option>
								<option value="In progress" ${record['english-progress'] === 'In progress' ? 'selected' : ''}>In progress</option>
								<option value="Complete" ${record['english-progress'] === 'Complete' ? 'selected' : ''}>Complete</option>
							</select>
						</div>
						<div>
							<label for="french-progress-${index}" class="form-label" data-en="French progress" data-fr="Progrès français">French progress</label>
							<select class="form-select" id="french-progress-${index}" onchange="editor.updateRecord(${index}, 'french-progress', this.value)">
								<option value="À mettre en œuvre" ${record['french-progress'] === 'À mettre en œuvre' ? 'selected' : ''}>À mettre en œuvre</option>
								<option value="En cours" ${record['french-progress'] === 'En cours' ? 'selected' : ''}>En cours</option>
								<option value="Terminé" ${record['french-progress'] === 'Terminé' ? 'selected' : ''}>Terminé</option>
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
										   data-en-lang="en-CA" data-fr-lang="fr-CA">
									</div>
									
									<div class="form-row">
										<div>
											<label for="english-update-${updateNum}-${index}" class="form-label" data-en="English update" data-fr="Mise à jour anglaise">English update</label>
											<textarea class="form-control" id="english-update-${updateNum}-${index}" rows="4" 
													  onchange="editor.updateRecord(${index}, 'english-update-${updateNum}', this.value)">${record[`english-update-${updateNum}`] || ''}</textarea>
										</div>
										<div>
											<label for="french-update-${updateNum}-${index}" class="form-label" data-en="French update" data-fr="Mise à jour française">French update</label>
											<textarea class="form-control" id="french-update-${updateNum}-${index}" rows="4"
													  onchange="editor.updateRecord(${index}, 'french-update-${updateNum}', this.value)">${record[`french-update-${updateNum}`] || ''}</textarea>
										</div>
									</div>
								</div>
							` : '';
						}).join('')}
						
						<button class="btn btn-outline-secondary btn-sm" onclick="editor.addUpdate(${index})" data-en="Add update" data-fr="Ajouter une mise à jour">Add update</button>
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
	}

    addUpdate(recordIndex) {
        const record = this.data.data[recordIndex];
        if (!record) return;

        for (let i = 1; i <= 6; i++) {
            if (!record[`update-${i}-date`] && !record[`english-update-${i}`] && !record[`french-update-${i}`]) {
                record[`update-${i}-date`] = new Date().toISOString().split('T')[0];
                record[`english-update-${i}`] = '';
                record[`french-update-${i}`] = '';
                this.render();
                const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
                    ? `Mise à jour ${i} ajoutée à l'enregistrement ${recordIndex + 1} !`
                    : `Update ${i} added to record ${recordIndex + 1}!`;
                this.showAlert(successMsg);
                return;
            }
        }
        const errorMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
            ? 'Nombre maximum de mises à jour (6) atteint pour cet enregistrement.'
            : 'Maximum number of updates (6) reached for this record.';
        this.showAlert(errorMsg, 'error');
    }

    deleteUpdate(recordIndex, updateNumber) {
        const confirmMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
            ? `Êtes-vous sûr de vouloir supprimer la mise à jour ${updateNumber} ?`
            : `Are you sure you want to delete update ${updateNumber}?`;
        if (confirm(confirmMsg)) {
            const record = this.data.data[recordIndex];
            if (record) {
                record[`update-${updateNumber}-date`] = '';
                record[`english-update-${updateNumber}`] = '';
                record[`french-update-${updateNumber}`] = '';
                this.render();
                const successMsg = window.languageSwitcher && window.languageSwitcher.currentLang === 'fr'
                    ? `Mise à jour ${updateNumber} supprimée de l'enregistrement ${recordIndex + 1} !`
                    : `Update ${updateNumber} deleted from record ${recordIndex + 1}!`;
                this.showAlert(successMsg);
            }
        }
    }
    
    updateCalendarLanguage() {
        const currentLang = document.documentElement.lang || 'en-CA';
        const dateInputs = document.querySelectorAll('input[type="date"]');
        
        dateInputs.forEach(input => {
            input.setAttribute('lang', currentLang);
            // Force browser to recognize language change
            input.blur();
            input.focus();
            input.blur();
        });
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
