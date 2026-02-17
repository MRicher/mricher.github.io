// ===================================================================
// CONSTANTS AND VERSION INFO
// ===================================================================

const ABBREVO_VERSION = "1.0.0";

// Message constants for consistency and maintainability
const MESSAGES = {
  NO_ABBR_EN: "There are no abbreviations or acronyms for English.",
  NO_ABBR_FR: "Il n'y a pas d'abréviations ou d'acronymes pour le français.",
};

// Counter for previous abbreviation rows
let abbrRowCounter = 0;

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Get current language from document
 * @returns {string} Language code ('en' or 'fr')
 */
function getCurrentLanguage() {
  return document.documentElement.lang?.split("-")[0] || "en";
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('toast-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'toast-notification';
    notification.className = 'toast-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    document.body.appendChild(notification);
  }

  // Set content and type
  notification.textContent = message;
  notification.className = `toast-notification toast-${type} show`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

/**
 * Normalize string for comparison (trim and lowercase)
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  return str ? str.trim().toLowerCase() : '';
}

// ===================================================================
// PREVIOUS ABBREVIATION ROWS MANAGEMENT
// ===================================================================

/**
 * Add a new previous abbreviation row
 */
function addAbbrRow() {
  const container = document.getElementById('additional-abbr-container');
  const rowId = `abbr-row-${abbrRowCounter++}`;
  const currentLang = getCurrentLanguage();
  
  const deleteLabel = currentLang === 'fr' ? 'Supprimer' : 'Delete';
  const enAbbrLabel = currentLang === 'fr' ? 'Abréviation anglaise' : 'English abbreviation';
  const enTitleLabel = currentLang === 'fr' ? 'Titre complet anglais' : 'English full title';
  const frAbbrLabel = currentLang === 'fr' ? 'Abréviation française' : 'French abbreviation';
  const frTitleLabel = currentLang === 'fr' ? 'Titre complet français' : 'French full title';
  
  const rowHTML = `
    <div class="previous-abbr-row mb-3 p-3 border rounded" id="${rowId}">
      <div class="row g-2 mb-2">
        <div class="col-md-6">
          <label class="form-label form-label-sm" data-en="English abbreviation" data-fr="Abréviation anglaise">${enAbbrLabel}</label>
          <input type="text" class="form-control form-control-sm previous-abbr-en" 
                 data-en="English abbreviation" 
                 data-fr="Abréviation anglaise">
        </div>
        <div class="col-md-6">
          <label class="form-label form-label-sm" data-en="French abbreviation" data-fr="Abréviation française">${frAbbrLabel}</label>
          <input type="text" class="form-control form-control-sm previous-abbr-fr"
                 data-en="French abbreviation" 
                 data-fr="Abréviation française">
        </div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-md-6">
          <label class="form-label form-label-sm" data-en="English full title" data-fr="Titre complet anglais">${enTitleLabel}</label>
          <input type="text" class="form-control form-control-sm previous-title-en" 
                 data-en="English full title" 
                 data-fr="Titre complet anglais">
        </div>
        <div class="col-md-6">
          <label class="form-label form-label-sm" data-en="French full title" data-fr="Titre complet français">${frTitleLabel}</label>
          <input type="text" class="form-control form-control-sm previous-title-fr"
                 data-en="French full title" 
                 data-fr="Titre complet français">
        </div>
      </div>
      <div class="row">
        <div class="col-md-12">
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteAbbrRow('${rowId}')">
            <span data-en="Delete" data-fr="Supprimer">${deleteLabel}</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', rowHTML);
  
  // Focus on the new English abbreviation input
  const newRow = document.getElementById(rowId);
  const firstInput = newRow.querySelector('.previous-abbr-en');
  if (firstInput) firstInput.focus();
}

/**
 * Delete a previous abbreviation row
 * @param {string} rowId - ID of the row to delete
 */
function deleteAbbrRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    const currentLang = getCurrentLanguage();
    const message = currentLang === 'fr' ? 'Ligne supprimée' : 'Row deleted';
    showNotification(message, 'info');
  }
}

/**
 * Get all previous abbreviations from form
 * @returns {Array} Array of {abbrEn, abbrFr, titleEn, titleFr} objects
 */
function getPreviousAbbreviations() {
  const container = document.getElementById('additional-abbr-container');
  const rows = container.querySelectorAll('.previous-abbr-row');
  const previousAbbrs = [];
  
  rows.forEach(row => {
    const abbrEn = row.querySelector('.previous-abbr-en').value.trim();
    const abbrFr = row.querySelector('.previous-abbr-fr').value.trim();
    const titleEn = row.querySelector('.previous-title-en').value.trim();
    const titleFr = row.querySelector('.previous-title-fr').value.trim();
    
    // Only add if at least one field has content
    if (abbrEn || abbrFr || titleEn || titleFr) {
      previousAbbrs.push({
        abbrEn: abbrEn || '',
        abbrFr: abbrFr || '',
        titleEn: titleEn || '',
        titleFr: titleFr || ''
      });
    }
  });
  
  return previousAbbrs;
}

/**
 * Clear all previous abbreviation rows
 */
function clearPreviousAbbrRows() {
  const container = document.getElementById('additional-abbr-container');
  container.innerHTML = '';
}

/**
 * Set previous abbreviation rows from data
 * @param {Array} previousAbbrs - Array of previous abbreviations
 */
function setPreviousAbbrRows(previousAbbrs) {
  clearPreviousAbbrRows();
  
  if (previousAbbrs && previousAbbrs.length > 0) {
    previousAbbrs.forEach(abbr => {
      addAbbrRow();
      const lastRow = document.querySelector('.previous-abbr-row:last-child');
      if (lastRow) {
        lastRow.querySelector('.previous-abbr-en').value = abbr.abbrEn || '';
        lastRow.querySelector('.previous-abbr-fr').value = abbr.abbrFr || '';
        lastRow.querySelector('.previous-title-en').value = abbr.titleEn || '';
        lastRow.querySelector('.previous-title-fr').value = abbr.titleFr || '';
      }
    });
  }
}

// ===================================================================
// DATA MANAGEMENT
// ===================================================================

// Store entries
let entries = [];
let entryCounter = 0;

// Log version on load
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log(`Abbrevo v${ABBREVO_VERSION} loaded`);
    
    // Add ARIA live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);

  } catch (error) {
    console.error("Abbrevo initialization error:", error);
    showErrorMessage("An error occurred while loading Abbrevo. Please refresh the page.");
  }
});

// ===================================================================
// ERROR HANDLING
// ===================================================================

/**
 * Display user-friendly error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const currentLang = getCurrentLanguage();
  const errorMsg =
    currentLang === "fr" ? message || "Une erreur est survenue. Veuillez réessayer." : message || "An error occurred. Please try again.";

  alert(errorMsg);
}

/**
 * Announce to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
  const liveRegion = document.getElementById('aria-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}

// ===================================================================
// ENTRY MANAGEMENT FUNCTIONS
// ===================================================================

// Add new entry
function addEntry() {
  const internalOnly = document.getElementById("internal-only").checked;
  let abbrEn = document.getElementById("abbr-en").value.trim();
  let abbrFr = document.getElementById("abbr-fr").value.trim();
  const titleEn = document.getElementById("title-en").value.trim();
  const titleFr = document.getElementById("title-fr").value.trim();
  const titleEnIsFrench = document.getElementById("title-en-is-french").checked;
  const titleFrIsEnglish = document.getElementById("title-fr-is-english").checked;
  const transparentNotes = document.getElementById("transparent-notes").value.trim();
  const previousAbbrs = getPreviousAbbreviations();

  // Validation - at least one abbreviation and both titles required
  if ((!abbrEn && !abbrFr) || !titleEn || !titleFr) {
    const currentLang = getCurrentLanguage();
    const message =
      currentLang === "fr"
        ? "Veuillez remplir au moins une abréviation et les deux titres complets."
        : "Please fill in at least one abbreviation and both full titles.";
    alert(message);
    return;
  }

  // Auto-fill missing abbreviations with message
  if (abbrEn && !abbrFr) {
    abbrFr = MESSAGES.NO_ABBR_FR;
  } else if (abbrFr && !abbrEn) {
    abbrEn = MESSAGES.NO_ABBR_EN;
  }

  // Check for duplicates (only check actual abbreviations, not auto-filled messages)
  const checkAbbrEn = abbrEn !== MESSAGES.NO_ABBR_EN ? abbrEn : null;
  const checkAbbrFr = abbrFr !== MESSAGES.NO_ABBR_FR ? abbrFr : null;

  if (!checkDuplicates(checkAbbrEn, checkAbbrFr)) {
    return; // User chose to cancel
  }

  // Create entry object
  const entry = {
    id: entryCounter++,
    internalOnly,
    abbrEn,
    abbrFr,
    titleEn,
    titleFr,
    titleEnIsFrench,
    titleFrIsEnglish,
    transparentNotes,
    previousAbbrs
  };

  entries.push(entry);
  renderEntries();
  clearForm();
  
  // Success notification
  const currentLang = getCurrentLanguage();
  const successMsg = currentLang === "fr" ? "Entrée ajoutée avec succès" : "Entry added successfully";
  showNotification(successMsg, 'success');
  announceToScreenReader(successMsg);
}

// Clear form
function clearForm() {
  document.getElementById("internal-only").checked = false;
  document.getElementById("abbr-en").value = "";
  document.getElementById("abbr-fr").value = "";
  document.getElementById("title-en").value = "";
  document.getElementById("title-fr").value = "";
  document.getElementById("title-en-is-french").checked = false;
  document.getElementById("title-fr-is-english").checked = false;
  document.getElementById("transparent-notes").value = "";
  clearPreviousAbbrRows();
  document.getElementById("abbr-en").focus();
}

// Delete entry
function deleteEntry(id) {
  const currentLang = getCurrentLanguage();
  const message = currentLang === "fr" ? "Êtes-vous sûr de vouloir supprimer cette entrée?" : "Are you sure you want to delete this entry?";

  if (confirm(message)) {
    entries = entries.filter((e) => e.id !== id);
    renderEntries();
    
    const successMsg = currentLang === "fr" ? "Entrée supprimée" : "Entry deleted";
    showNotification(successMsg, 'success');
    announceToScreenReader(successMsg);
  }
}

// Render all entries
function renderEntries() {
  const container = document.getElementById("entries-container");
  const currentLang = getCurrentLanguage();

  if (entries.length === 0) {
    const noEntriesText =
      currentLang === "fr"
        ? "Aucune entrée pour le moment. Ajoutez votre première abréviation ou acronyme ci-dessus."
        : "No entries yet. Add your first abbreviation or acronym above.";

    container.innerHTML = `<p class="text-muted" data-en="No entries yet. Add your first abbreviation or acronym above." data-fr="Aucune entrée pour le moment. Ajoutez votre première abréviation ou acronyme ci-dessus.">${noEntriesText}</p>`;
    return;
  }

  const labels =
    currentLang === "fr"
      ? {
          num: "#",
          internal: "Interne",
          abbrEn: "Abrév. EN",
          abbrFr: "Abrév. FR",
          titleEn: "Titre EN",
          titleFr: "Titre FR",
          titleEnLang: "EN est FR",
          titleFrLang: "FR est EN",
          previousAbbrs: "Abbr. précédentes",
          transparentNotes: "Notes transp.",
          actions: "Actions",
          edit: "Modifier",
          delete: "Supprimer",
        }
      : {
          num: "#",
          internal: "Internal",
          abbrEn: "Abbr. EN",
          abbrFr: "Abbr. FR",
          titleEn: "Title EN",
          titleFr: "Title FR",
          titleEnLang: "EN is FR",
          titleFrLang: "FR is EN",
          previousAbbrs: "Previous Abbrs.",
          transparentNotes: "Transp. Notes",
          actions: "Actions",
          edit: "Edit",
          delete: "Delete",
        };

  // Sort entries alphabetically by English abbreviation
  const sortedEntries = [...entries].sort((a, b) => {
    return normalizeString(a.abbrEn).localeCompare(normalizeString(b.abbrEn));
  });

  const tableHTML = `
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th scope="col">${labels.num}</th>
                            <th scope="col">${labels.internal}</th>
                            <th scope="col">${labels.abbrEn}</th>
                            <th scope="col">${labels.abbrFr}</th>
                            <th scope="col">${labels.titleEn}</th>
                            <th scope="col">${labels.titleEnLang}</th>
                            <th scope="col">${labels.titleFr}</th>
                            <th scope="col">${labels.titleFrLang}</th>
                            <th scope="col">${labels.previousAbbrs}</th>
                            <th scope="col">${labels.transparentNotes}</th>
                            <th scope="col">${labels.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedEntries
                          .map(
                            (entry, index) => {
                              // Format previous abbreviations
                              let previousAbbrText = '';
                              if (entry.previousAbbrs && entry.previousAbbrs.length > 0) {
                                previousAbbrText = entry.previousAbbrs.map(abbr => {
                                  const parts = [];
                                  if (abbr.abbrEn) parts.push(`EN: ${escapeHtml(abbr.abbrEn)}`);
                                  if (abbr.titleEn) parts.push(`(${escapeHtml(abbr.titleEn)})`);
                                  if (abbr.abbrFr) parts.push(`FR: ${escapeHtml(abbr.abbrFr)}`);
                                  if (abbr.titleFr) parts.push(`(${escapeHtml(abbr.titleFr)})`);
                                  return parts.join(' ');
                                }).join('<br>');
                              }
                              
                              return `
                            <tr>
                                <th scope="row">${index + 1}</th>
                                <td>${entry.internalOnly ? "✓" : ""}</td>
                                <td>${escapeHtml(entry.abbrEn)}</td>
                                <td>${escapeHtml(entry.abbrFr)}</td>
                                <td>${entry.titleEnIsFrench ? `<i lang="fr">${escapeHtml(entry.titleEn)}</i>` : escapeHtml(entry.titleEn)}</td>
                                <td>${entry.titleEnIsFrench ? "✓" : ""}</td>
                                <td>${entry.titleFrIsEnglish ? `<i lang="en">${escapeHtml(entry.titleFr)}</i>` : escapeHtml(entry.titleFr)}</td>
                                <td>${entry.titleFrIsEnglish ? "✓" : ""}</td>
                                <td>${previousAbbrText || '<em class="text-muted">—</em>'}</td>
                                <td>${entry.transparentNotes ? escapeHtml(entry.transparentNotes) : '<em class="text-muted">—</em>'}</td>
                                <td class="text-nowrap">
                                    <button type="button" 
                                            class="btn btn-sm btn-primary me-1" 
                                            onclick="editEntry(${entry.id})"
                                            aria-label="${labels.edit} ${labels.num}${index + 1}">
                                        ${labels.edit}
                                    </button>
                                    <button type="button" 
                                            class="btn btn-sm btn-danger" 
                                            onclick="deleteEntry(${entry.id})"
                                            aria-label="${labels.delete} ${labels.num}${index + 1}">
                                        ${labels.delete}
                                    </button>
                                </td>
                            </tr>
                        `;
                            }
                          )
                          .join("")}
                    </tbody>
                </table>
            `;

  container.innerHTML = tableHTML;
  
  // Announce update to screen readers
  const announcement = currentLang === "fr" 
    ? `Table mise à jour avec ${entries.length} entrée${entries.length > 1 ? 's' : ''}`
    : `Table updated with ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`;
  announceToScreenReader(announcement);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Check for duplicate abbreviations with improved normalization
function checkDuplicates(abbrEn, abbrFr, excludeId = null) {
  const normalizedEn = normalizeString(abbrEn);
  const normalizedFr = normalizeString(abbrFr);
  
  const duplicates = entries.filter((entry) => {
    // Skip the entry being edited
    if (excludeId !== null && entry.id === excludeId) {
      return false;
    }

    // Check if either abbreviation matches (using normalized comparison)
    const enMatch = normalizedEn && normalizeString(entry.abbrEn) === normalizedEn;
    const frMatch = normalizedFr && normalizeString(entry.abbrFr) === normalizedFr;

    return enMatch || frMatch;
  });

  if (duplicates.length > 0) {
    const currentLang = getCurrentLanguage();
    let message = "";

    if (currentLang === "fr") {
      message = "Une entrée avec cette abréviation/acronyme existe déjà:\n\n";
      duplicates.forEach((dup) => {
        message += `• ${dup.abbrEn} / ${dup.abbrFr}\n  ${dup.titleEn} / ${dup.titleFr}\n\n`;
      });
      message += "Voulez-vous continuer quand même?";
    } else {
      message = "An entry with this abbreviation/acronym already exists:\n\n";
      duplicates.forEach((dup) => {
        message += `• ${dup.abbrEn} / ${dup.abbrFr}\n  ${dup.titleEn} / ${dup.titleFr}\n\n`;
      });
      message += "Do you want to continue anyway?";
    }

    return confirm(message);
  }

  return true; // No duplicates found, proceed
}

// Edit entry
function editEntry(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;

  // Populate form with entry data
  document.getElementById("internal-only").checked = entry.internalOnly || false;
  document.getElementById("abbr-en").value = entry.abbrEn;
  document.getElementById("abbr-fr").value = entry.abbrFr;
  document.getElementById("title-en").value = entry.titleEn;
  document.getElementById("title-fr").value = entry.titleFr;
  document.getElementById("title-en-is-french").checked = entry.titleEnIsFrench || false;
  document.getElementById("title-fr-is-english").checked = entry.titleFrIsEnglish || false;
  document.getElementById("transparent-notes").value = entry.transparentNotes || "";
  
  // Set previous abbreviation rows
  setPreviousAbbrRows(entry.previousAbbrs || []);

  // Change Add button to Update button
  const addBtn = document.getElementById("add-entry-btn");
  const currentLang = getCurrentLanguage();
  const updateText = currentLang === "fr" ? "Mettre à jour" : "Update entry";
  const cancelText = currentLang === "fr" ? "Annuler" : "Cancel";

  addBtn.innerHTML = `<span data-en="Update entry" data-fr="Mettre à jour">${updateText}</span>`;
  addBtn.onclick = () => updateEntry(id);

  // Add cancel button if it doesn't exist
  let cancelBtn = document.getElementById("cancel-edit-btn");
  if (!cancelBtn) {
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary ms-2";
    cancelBtn.id = "cancel-edit-btn";
    cancelBtn.innerHTML = `<span data-en="Cancel" data-fr="Annuler">${cancelText}</span>`;
    cancelBtn.onclick = cancelEdit;
    addBtn.parentNode.insertBefore(cancelBtn, addBtn.nextSibling);
  }

  // Scroll to form
  document.getElementById("abbr-en").scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("abbr-en").focus();
  
  // Announce to screen readers
  const announcement = currentLang === "fr" ? "Mode édition activé" : "Edit mode activated";
  announceToScreenReader(announcement);
}

// Update entry
function updateEntry(id) {
  const internalOnly = document.getElementById("internal-only").checked;
  let abbrEn = document.getElementById("abbr-en").value.trim();
  let abbrFr = document.getElementById("abbr-fr").value.trim();
  const titleEn = document.getElementById("title-en").value.trim();
  const titleFr = document.getElementById("title-fr").value.trim();
  const titleEnIsFrench = document.getElementById("title-en-is-french").checked;
  const titleFrIsEnglish = document.getElementById("title-fr-is-english").checked;
  const transparentNotes = document.getElementById("transparent-notes").value.trim();
  const previousAbbrs = getPreviousAbbreviations();

  // Validation - at least one abbreviation and both titles required
  if ((!abbrEn && !abbrFr) || !titleEn || !titleFr) {
    const currentLang = getCurrentLanguage();
    const message =
      currentLang === "fr"
        ? "Veuillez remplir au moins une abréviation et les deux titres complets."
        : "Please fill in at least one abbreviation and both full titles.";
    alert(message);
    return;
  }

  // Auto-fill missing abbreviations with message
  if (abbrEn && !abbrFr) {
    abbrFr = MESSAGES.NO_ABBR_FR;
  } else if (abbrFr && !abbrEn) {
    abbrEn = MESSAGES.NO_ABBR_EN;
  }

  // Check for duplicates (only check actual abbreviations, not auto-filled messages)
  const checkAbbrEn = abbrEn !== MESSAGES.NO_ABBR_EN ? abbrEn : null;
  const checkAbbrFr = abbrFr !== MESSAGES.NO_ABBR_FR ? abbrFr : null;

  if (!checkDuplicates(checkAbbrEn, checkAbbrFr, id)) {
    return; // User chose to cancel
  }

  // Find and update entry
  const entryIndex = entries.findIndex((e) => e.id === id);
  if (entryIndex !== -1) {
    entries[entryIndex] = {
      id,
      internalOnly,
      abbrEn,
      abbrFr,
      titleEn,
      titleFr,
      titleEnIsFrench,
      titleFrIsEnglish,
      transparentNotes,
      previousAbbrs
    };
  }

  renderEntries();
  cancelEdit();
  
  const currentLang = getCurrentLanguage();
  const successMsg = currentLang === "fr" ? "Entrée mise à jour" : "Entry updated";
  showNotification(successMsg, 'success');
  announceToScreenReader(successMsg);
}

// Cancel edit mode
function cancelEdit() {
  const addBtn = document.getElementById("add-entry-btn");
  const currentLang = getCurrentLanguage();
  const addText = currentLang === "fr" ? "Ajouter l'entrée" : "Add entry";

  addBtn.innerHTML = `<span data-en="Add entry" data-fr="Ajouter l'entrée">${addText}</span>`;
  addBtn.onclick = addEntry;

  // Remove cancel button
  const cancelBtn = document.getElementById("cancel-edit-btn");
  if (cancelBtn) {
    cancelBtn.remove();
  }

  clearForm();
}

// Listen for language changes to update displayed entries
document.addEventListener("languageChanged", () => {
  renderEntries();
});

// Save entries to JSON file
function saveToJSON() {
  if (entries.length === 0) {
    const currentLang = getCurrentLanguage();
    const message = currentLang === "fr" ? "Aucune entrée à enregistrer." : "No entries to save.";
    alert(message);
    return;
  }

  // Ensure all fields are present in each entry
  const normalizedEntries = entries.map((entry) => ({
    id: entry.id,
    internalOnly: entry.internalOnly || false,
    abbrEn: entry.abbrEn || "",
    abbrFr: entry.abbrFr || "",
    titleEn: entry.titleEn || "",
    titleFr: entry.titleFr || "",
    titleEnIsFrench: entry.titleEnIsFrench || false,
    titleFrIsEnglish: entry.titleFrIsEnglish || false,
    transparentNotes: entry.transparentNotes || "",
    previousAbbrs: entry.previousAbbrs || []
  }));

  const dataStr = JSON.stringify(normalizedEntries, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "abbrevo-entries.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  const currentLang = getCurrentLanguage();
  const successMsg = currentLang === "fr" ? "JSON enregistré avec succès" : "JSON saved successfully";
  showNotification(successMsg, 'success');
}

// Save entries to HTML file with bilingual tables
function saveToHTML() {
  if (entries.length === 0) {
    const currentLang = getCurrentLanguage();
    const message = currentLang === "fr" ? "Aucune entrée à enregistrer." : "No entries to save.";
    alert(message);
    return;
  }

  // Filter entries - exclude internal-only items
  const publicEntries = entries.filter((entry) => !entry.internalOnly);

  if (publicEntries.length === 0) {
    const currentLang = getCurrentLanguage();
    const message =
      currentLang === "fr"
        ? "Toutes les entrées sont marquées comme internes seulement. Aucune entrée publique à exporter."
        : "All entries are marked as internal only. No public entries to export.";
    alert(message);
    return;
  }

  // Sort entries alphabetically by English abbreviation
  const sortedEntriesEn = [...publicEntries].sort((a, b) => {
    return normalizeString(a.abbrEn).localeCompare(normalizeString(b.abbrEn));
  });

  // Generate English table
  const englishTable = generateEnglishTable(sortedEntriesEn);

  // Sort entries alphabetically by French abbreviation for French table
  const sortedEntriesFr = [...publicEntries].sort((a, b) => {
    return normalizeString(a.abbrFr).localeCompare(normalizeString(b.abbrFr));
  });

  // Generate French table
  const frenchTable = generateFrenchTable(sortedEntriesFr);

  // Combine both tables in one HTML file
  const htmlContent = `<!DOCTYPE html>
<html lang="en-CA">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RCMP Abbreviations and Acronyms / Abréviations et acronymes de la GRC</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .table-container {
            margin-bottom: 60px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        caption {
            font-size: 1.5em;
            font-weight: bold;
            text-align: left;
            margin-bottom: 10px;
            padding: 10px 0;
        }
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            white-space: nowrap;
            border-width: 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .language-section {
            page-break-after: always;
        }
        @media print {
            .language-section {
                page-break-after: always;
            }
        }
        @media (max-width: 768px) {
            table {
                font-size: 0.9em;
            }
            th, td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="language-section">
        <h1>English Version</h1>
        ${englishTable}
    </div>
    
    <div class="language-section">
        <h1>Version française</h1>
        ${frenchTable}
    </div>
</body>
</html>`;

  // Create and download the file
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "abbrevo-bilingual-tables.html";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  const currentLang = getCurrentLanguage();
  const successMsg = currentLang === "fr" ? "HTML enregistré avec succès" : "HTML saved successfully";
  showNotification(successMsg, 'success');
}

// Generate English table
function generateEnglishTable(sortedEntries) {
  const rows = sortedEntries
    .map((entry) => {
      // Handle abbreviations
      const abbrEn = entry.abbrEn === MESSAGES.NO_ABBR_EN ? "" : escapeHtml(entry.abbrEn);
      const abbrFr = entry.abbrFr === MESSAGES.NO_ABBR_FR ? "" : escapeHtml(entry.abbrFr);

      // Handle titles with language tags
      const titleEn = entry.titleEnIsFrench ? `<span lang="fr">${escapeHtml(entry.titleEn)}</span>` : escapeHtml(entry.titleEn);
      const titleFr = entry.titleFrIsEnglish ? `<span lang="en">${escapeHtml(entry.titleFr)}</span>` : escapeHtml(entry.titleFr);

      // Combine notes with previous abbreviations
      let previousNotes = "";
      const noteParts = [];
      
      // Add previous abbreviations if present
      if (entry.previousAbbrs && entry.previousAbbrs.length > 0) {
        entry.previousAbbrs.forEach(abbr => {
          const parts = [];
          if (abbr.abbrEn) {
            parts.push(escapeHtml(abbr.abbrEn));
            if (abbr.titleEn) parts.push(`(${escapeHtml(abbr.titleEn)})`);
          }
          if (abbr.abbrFr) {
            parts.push(`<span lang="fr">${escapeHtml(abbr.abbrFr)}</span>`);
            if (abbr.titleFr) parts.push(`(<span lang="fr">${escapeHtml(abbr.titleFr)}</span>)`);
          }
          if (parts.length > 0) noteParts.push(parts.join(' '));
        });
      }
      
      // Add transparent notes if present
      if (entry.transparentNotes) {
        noteParts.push(escapeHtml(entry.transparentNotes));
      }
      
      previousNotes = noteParts.join(' / ');

      return `\t\t\t<tr>
\t\t\t\t<td>${abbrEn}</td>
\t\t\t\t<td>${titleEn}</td>
\t\t\t\t<td lang="fr">${abbrFr}</td>
\t\t\t\t<td lang="fr">${titleFr}</td>
\t\t\t\t<td>${previousNotes}</td>
\t\t\t</tr>`;
    })
    .join("\n");

  return `<div class="table-container">
\t<table>
\t\t<caption>
\t\t\tBilingual abbreviations and acronyms
\t\t\t<span class="sr-only">This table contains five columns: English abbreviation or acronym, English full form, French abbreviation or acronym, French full form, and previous abbreviations and acronyms</span>
\t\t</caption>
\t\t<thead>
\t\t\t<tr>
\t\t\t\t<th scope="col">English abbreviation or acronym</th>
\t\t\t\t<th scope="col">English full form</th>
\t\t\t\t<th scope="col">French abbreviation or acronym</th>
\t\t\t\t<th scope="col">French full form</th>
\t\t\t\t<th scope="col">Previous abbreviations and acronyms</th>
\t\t\t</tr>
\t\t</thead>
\t\t<tbody>
${rows}
\t\t</tbody>
\t</table>
</div>`;
}

// Generate French table
function generateFrenchTable(sortedEntries) {
  const rows = sortedEntries
    .map((entry) => {
      // Handle abbreviations
      const abbrEn = entry.abbrEn === MESSAGES.NO_ABBR_EN ? "" : escapeHtml(entry.abbrEn);
      const abbrFr = entry.abbrFr === MESSAGES.NO_ABBR_FR ? "" : escapeHtml(entry.abbrFr);

      // Handle titles with language tags
      const titleEn = entry.titleEnIsFrench ? `<span lang="fr">${escapeHtml(entry.titleEn)}</span>` : escapeHtml(entry.titleEn);
      const titleFr = entry.titleFrIsEnglish ? `<span lang="en">${escapeHtml(entry.titleFr)}</span>` : escapeHtml(entry.titleFr);

      // Combine notes with previous abbreviations (French first for French table)
      let previousNotes = "";
      const noteParts = [];
      
      // Add previous abbreviations if present (French first)
      if (entry.previousAbbrs && entry.previousAbbrs.length > 0) {
        entry.previousAbbrs.forEach(abbr => {
          const parts = [];
          if (abbr.abbrFr) {
            parts.push(escapeHtml(abbr.abbrFr));
            if (abbr.titleFr) parts.push(`(${escapeHtml(abbr.titleFr)})`);
          }
          if (abbr.abbrEn) {
            parts.push(`<span lang="en">${escapeHtml(abbr.abbrEn)}</span>`);
            if (abbr.titleEn) parts.push(`(<span lang="en">${escapeHtml(abbr.titleEn)}</span>)`);
          }
          if (parts.length > 0) noteParts.push(parts.join(' '));
        });
      }
      
      // Add transparent notes if present
      if (entry.transparentNotes) {
        noteParts.push(escapeHtml(entry.transparentNotes));
      }
      
      previousNotes = noteParts.join(' / ');

      return `\t\t\t<tr>
\t\t\t\t<td>${abbrFr}</td>
\t\t\t\t<td>${titleFr}</td>
\t\t\t\t<td lang="en">${abbrEn}</td>
\t\t\t\t<td lang="en">${titleEn}</td>
\t\t\t\t<td>${previousNotes}</td>
\t\t\t</tr>`;
    })
    .join("\n");

  return `<div class="table-container">
\t<table>
\t\t<caption>
\t\t\tAbréviations et acronymes bilingues
\t\t\t<span class="sr-only">Ce tableau contient cinq colonnes: abréviation ou acronyme français, forme complète en français, abréviation ou acronyme anglais, forme complète en anglais, et abréviations et acronymes précédents</span>
\t\t</caption>
\t\t<thead>
\t\t\t<tr>
\t\t\t\t<th scope="col">Abréviation ou acronyme français</th>
\t\t\t\t<th scope="col">Forme complète en français</th>
\t\t\t\t<th scope="col">Abréviation ou acronyme anglais</th>
\t\t\t\t<th scope="col">Forme complète en anglais</th>
\t\t\t\t<th scope="col">Abréviations et acronymes précédents</th>
\t\t\t</tr>
\t\t</thead>
\t\t<tbody>
${rows}
\t\t</tbody>
\t</table>
</div>`;
}

// Load entries from JSON file
function loadFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const loadedData = JSON.parse(e.target.result);

      // Validate that it's an array
      if (!Array.isArray(loadedData)) {
        throw new Error("Invalid JSON format");
      }

      // Validate structure of entries
      const isValid = loadedData.every(
        (entry) =>
          entry.hasOwnProperty("abbrEn") && entry.hasOwnProperty("abbrFr") && entry.hasOwnProperty("titleEn") && entry.hasOwnProperty("titleFr"),
      );

      if (!isValid) {
        throw new Error("Invalid entry structure");
      }

      const currentLang = getCurrentLanguage();
      let addedCount = 0;
      let skippedCount = 0;

      // Process each loaded entry
      for (const loadedEntry of loadedData) {
        const checkAbbrEn = loadedEntry.abbrEn !== MESSAGES.NO_ABBR_EN ? loadedEntry.abbrEn : null;
        const checkAbbrFr = loadedEntry.abbrFr !== MESSAGES.NO_ABBR_FR ? loadedEntry.abbrFr : null;

        // Check for duplicates
        const duplicates = entries.filter((entry) => {
          const enMatch = checkAbbrEn && normalizeString(entry.abbrEn) === normalizeString(checkAbbrEn);
          const frMatch = checkAbbrFr && normalizeString(entry.abbrFr) === normalizeString(checkAbbrFr);
          return enMatch || frMatch;
        });

        if (duplicates.length > 0) {
          // Ask user if they want to add duplicate
          let message = "";
          if (currentLang === "fr") {
            message = `Une entrée avec cette abréviation/acronyme existe déjà:\n\n`;
            duplicates.forEach((dup) => {
              message += `• ${dup.abbrEn} / ${dup.abbrFr}\n  ${dup.titleEn} / ${dup.titleFr}\n\n`;
            });
            message += `Voulez-vous ajouter quand même:\n${loadedEntry.abbrEn} / ${loadedEntry.abbrFr}\n${loadedEntry.titleEn} / ${loadedEntry.titleFr}?`;
          } else {
            message = `An entry with this abbreviation/acronym already exists:\n\n`;
            duplicates.forEach((dup) => {
              message += `• ${dup.abbrEn} / ${dup.abbrFr}\n  ${dup.titleEn} / ${dup.titleFr}\n\n`;
            });
            message += `Do you want to add anyway:\n${loadedEntry.abbrEn} / ${loadedEntry.abbrFr}\n${loadedEntry.titleEn} / ${loadedEntry.titleFr}?`;
          }

          if (confirm(message)) {
            // Add entry with new ID
            entries.push({
              ...loadedEntry,
              id: entryCounter++,
            });
            addedCount++;
          } else {
            skippedCount++;
          }
        } else {
          // No duplicate, add entry
          entries.push({
            ...loadedEntry,
            id: entryCounter++,
          });
          addedCount++;
        }
      }

      renderEntries();

      // Show summary message
      let summaryMessage = "";
      if (currentLang === "fr") {
        summaryMessage = `${addedCount} entrée(s) ajoutée(s)`;
        if (skippedCount > 0) {
          summaryMessage += `, ${skippedCount} ignorée(s)`;
        }
        summaryMessage += ".";
      } else {
        summaryMessage = `${addedCount} entry(ies) added`;
        if (skippedCount > 0) {
          summaryMessage += `, ${skippedCount} skipped`;
        }
        summaryMessage += ".";
      }
      alert(summaryMessage);
      showNotification(summaryMessage, 'success');
    } catch (error) {
      const currentLang = getCurrentLanguage();
      const message =
        currentLang === "fr"
          ? "Erreur lors du chargement du fichier JSON. Veuillez vérifier le format."
          : "Error loading JSON file. Please check the format.";
      alert(message);
      showNotification(message, 'error');
      console.error("JSON load error:", error);
    }
  };

  reader.readAsText(file);

  // Reset the file input so the same file can be loaded again if needed
  event.target.value = "";
}
