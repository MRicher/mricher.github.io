// =================================================================
// MAGICODO.JS — Word-to-HTML Converter
// =================================================================

const MAGICODO_VERSION = "1.0.0";

// -----------------------------------------------------------------
// STATE
// -----------------------------------------------------------------

let savedRange = null; // preserved caret range before dialogs open

// -----------------------------------------------------------------
// INIT
// -----------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log(`Magicodo v${MAGICODO_VERSION} loaded`);

    // Version footer
    const versionEl = document.getElementById("version-info");
    if (versionEl) versionEl.textContent = `Version ${MAGICODO_VERSION}`;

    initTabs();
    initToolbar();
    initEditorEvents();
    initLinkDialog();
    initImageDialog();
    initActionBar();
    initHtmlPanel();
    updateCounts();

    // Sync placeholder language on language change
    document.addEventListener("languageChanged", () => {
      updateToolbarLang();
    });
  } catch (err) {
    console.error("Magicodo init error:", err);
  }
});

// -----------------------------------------------------------------
// TABS
// -----------------------------------------------------------------

function initTabs() {
  const tabVisual = document.getElementById("tab-visual");
  const tabHtml   = document.getElementById("tab-html");
  const panelVisual = document.getElementById("panel-visual");
  const panelHtml   = document.getElementById("panel-html");

  tabVisual.addEventListener("click", () => {
    activateTab("visual");
    // Sync HTML → visual when switching back
    const htmlArea = document.getElementById("html-editor");
    const visualArea = document.getElementById("visual-editor");
    if (htmlArea.value.trim() !== "") {
      visualArea.innerHTML = htmlArea.value;
      updateCounts();
    }
  });

  tabHtml.addEventListener("click", () => {
    activateTab("html");
    // Sync visual → HTML when switching to source
    const visualArea = document.getElementById("visual-editor");
    const htmlArea   = document.getElementById("html-editor");
    htmlArea.value = cleanHtml(visualArea.innerHTML);
  });
}

function activateTab(name) {
  const tabs   = document.querySelectorAll(".editor-tab");
  const panels = document.querySelectorAll(".editor-panel");

  tabs.forEach(t => {
    const isActive = t.id === `tab-${name}`;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  panels.forEach(p => {
    const isActive = p.id === `panel-${name}`;
    p.classList.toggle("active", isActive);
    if (isActive) {
      p.removeAttribute("hidden");
    } else {
      p.setAttribute("hidden", "");
    }
  });
}

// -----------------------------------------------------------------
// TOOLBAR — INLINE COMMANDS
// -----------------------------------------------------------------

function initToolbar() {
  // Exec-command buttons
  document.querySelectorAll(".toolbar-btn[data-cmd]").forEach(btn => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent focus loss in editor
      document.execCommand(btn.dataset.cmd, false, null);
      updateToolbarState();
    });
  });

  // Block format selector
  document.getElementById("block-format").addEventListener("change", function () {
    document.getElementById("visual-editor").focus();
    document.execCommand("formatBlock", false, this.value);
    updateToolbarState();
  });

  // Special buttons
  document.getElementById("btn-link").addEventListener("mousedown", (e) => {
    e.preventDefault();
    openLinkDialog();
  });

  document.getElementById("btn-unlink").addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.execCommand("unlink", false, null);
  });

  document.getElementById("btn-image").addEventListener("mousedown", (e) => {
    e.preventDefault();
    openImageDialog();
  });

  document.getElementById("btn-table").addEventListener("mousedown", (e) => {
    e.preventDefault();
    insertTable();
  });

  document.getElementById("btn-hr").addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.execCommand("insertHorizontalRule", false, null);
  });

  document.getElementById("btn-clean-inline").addEventListener("click", () => {
    cleanInlineStyles();
  });

  document.getElementById("btn-clear-all").addEventListener("click", () => {
    if (confirm(getLang() === "fr" ? "Effacer tout le contenu ?" : "Clear all content?")) {
      document.getElementById("visual-editor").innerHTML = "";
      document.getElementById("html-editor").value = "";
      updateCounts();
    }
  });
}

function updateToolbarState() {
  const cmds = ["bold", "italic", "underline", "strikeThrough",
                 "superscript", "subscript",
                 "insertUnorderedList", "insertOrderedList",
                 "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"];
  cmds.forEach(cmd => {
    const btn = document.querySelector(`.toolbar-btn[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle("active", document.queryCommandState(cmd));
  });
}

function updateToolbarLang() {
  // Update data-en/data-fr text content of toolbar buttons that have both attrs
  const lang = getLang();
  document.querySelectorAll(".toolbar-btn[data-en], .toolbar-select option[data-en]").forEach(el => {
    const text = lang === "fr" ? el.getAttribute("data-fr") : el.getAttribute("data-en");
    if (text) el.textContent = text;
  });
}

// -----------------------------------------------------------------
// EDITOR EVENTS
// -----------------------------------------------------------------

function initEditorEvents() {
  const editor = document.getElementById("visual-editor");

  // Toolbar state on selection change
  editor.addEventListener("keyup", () => { updateToolbarState(); updateCounts(); });
  editor.addEventListener("mouseup", () => { updateToolbarState(); });

  // Clean up paste from Word / rich apps
  editor.addEventListener("paste", (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    if (html) {
      const cleaned = scrubWordHtml(html);
      document.execCommand("insertHTML", false, cleaned);
    } else {
      // Plain text: wrap paragraphs
      const paragraphs = text
        .split(/\n\n+/)
        .map(p => `<p>${escapeHtml(p.replace(/\n/g, "<br>"))}</p>`)
        .join("");
      document.execCommand("insertHTML", false, paragraphs || escapeHtml(text));
    }

    updateCounts();
  });

  // Update counts on any input
  editor.addEventListener("input", updateCounts);
}

// -----------------------------------------------------------------
// WORD-PASTE CLEANUP
// -----------------------------------------------------------------

/**
 * Strip Word-specific namespace garbage while keeping semantic structure.
 */
function scrubWordHtml(html) {
  // Use a detached DOM to safely manipulate
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove style, script, meta, link, xml processing elements
  doc.querySelectorAll("style, script, meta, link, xml, o\\:p").forEach(el => el.remove());

  // Walk every element and strip Word/MSO attrs + inline styles
  doc.body.querySelectorAll("*").forEach(el => {
    // Remove MSO/Word attributes
    Array.from(el.attributes).forEach(attr => {
      if (
        attr.name.startsWith("mso-") ||
        attr.name.startsWith("xmlns") ||
        attr.name === "class" ||
        attr.name === "style" ||
        attr.name === "lang" && el.tagName !== "HTML"
      ) {
        el.removeAttribute(attr.name);
      }
    });

    // Unwrap meaningless spans/divs that carry no semantic value
    if ((el.tagName === "SPAN" || el.tagName === "FONT") && el.attributes.length === 0) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });

  return doc.body.innerHTML;
}

// -----------------------------------------------------------------
// HTML CLEANING (visual → source)
// -----------------------------------------------------------------

/**
 * Clean up innerHTML for display in source panel:
 * - Remove empty attributes
 * - Normalize whitespace lightly
 */
function cleanHtml(raw) {
  if (!raw) return "";
  // Remove empty style/class/id attributes
  return raw
    .replace(/ (style|class|id)=""/gi, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// -----------------------------------------------------------------
// HTML PANEL ACTIONS
// -----------------------------------------------------------------

function initHtmlPanel() {
  document.getElementById("btn-format-html").addEventListener("click", () => {
    const ta = document.getElementById("html-editor");
    ta.value = prettifyHtml(ta.value);
    showToast(getLang() === "fr" ? "HTML formaté" : "HTML prettified", "success");
  });

  document.getElementById("btn-minify-html").addEventListener("click", () => {
    const ta = document.getElementById("html-editor");
    ta.value = ta.value.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
    showToast(getLang() === "fr" ? "HTML minifié" : "HTML minified", "success");
  });

  document.getElementById("btn-clear-html").addEventListener("click", () => {
    if (confirm(getLang() === "fr" ? "Effacer le code HTML ?" : "Clear the HTML?")) {
      document.getElementById("html-editor").value = "";
      document.getElementById("visual-editor").innerHTML = "";
      updateCounts();
    }
  });

  document.getElementById("btn-copy-html").addEventListener("click", () => {
    const html = document.getElementById("html-editor").value;
    navigator.clipboard.writeText(html).then(() => {
      showToast(getLang() === "fr" ? "HTML copié !" : "HTML copied!", "success");
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.getElementById("html-editor");
      ta.select();
      document.execCommand("copy");
      showToast(getLang() === "fr" ? "HTML copié !" : "HTML copied!", "success");
    });
  });

  // Live sync: if user edits HTML source manually, reflect on visual on tab switch
  // (handled in initTabs)
}

/**
 * Very simple HTML prettifier — indents block tags.
 */
function prettifyHtml(html) {
  const BLOCK = /^(div|p|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|pre|section|article|header|footer|nav|main|aside|figure|figcaption|hr|br)$/i;
  let indent = 0;
  const lines = [];
  // Tokenize into tags and text
  const tokens = html.match(/<[^>]+>|[^<]+/g) || [];

  tokens.forEach(token => {
    if (token.startsWith("</")) {
      // Closing tag
      const tag = token.match(/<\/(\w+)/)?.[1] || "";
      if (BLOCK.test(tag)) indent = Math.max(0, indent - 1);
      lines.push("  ".repeat(indent) + token.trim());
    } else if (token.startsWith("<")) {
      // Opening tag
      const tag = token.match(/<(\w+)/)?.[1] || "";
      const selfClose = token.endsWith("/>") || /^(br|hr|img|input|meta|link)$/i.test(tag);
      lines.push("  ".repeat(indent) + token.trim());
      if (BLOCK.test(tag) && !selfClose) indent++;
    } else {
      const text = token.trim();
      if (text) lines.push("  ".repeat(indent) + text);
    }
  });

  return lines.join("\n");
}

// -----------------------------------------------------------------
// ACTION BAR
// -----------------------------------------------------------------

function initActionBar() {
  document.getElementById("btn-download-html").addEventListener("click", () => {
    const visual = document.getElementById("visual-editor");
    const html = cleanHtml(visual.innerHTML);
    const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Magicodo export</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    downloadFile(full, "magicodo-export.html", "text/html");
    showToast(getLang() === "fr" ? "HTML téléchargé" : "HTML downloaded", "success");
  });

  document.getElementById("btn-download-txt").addEventListener("click", () => {
    const visual = document.getElementById("visual-editor");
    const text = visual.innerText || visual.textContent || "";
    downloadFile(text, "magicodo-export.txt", "text/plain");
    showToast(getLang() === "fr" ? "Texte téléchargé" : "Text downloaded", "success");
  });
}

// -----------------------------------------------------------------
// LINK DIALOG
// -----------------------------------------------------------------

function initLinkDialog() {
  document.getElementById("link-ok").addEventListener("click", insertLink);
  document.getElementById("link-cancel").addEventListener("click", closeLinkDialog);

  document.getElementById("link-url").addEventListener("keydown", (e) => {
    if (e.key === "Enter") insertLink();
    if (e.key === "Escape") closeLinkDialog();
  });
}

function openLinkDialog() {
  saveSelection();
  const dialog = document.getElementById("link-dialog");
  dialog.removeAttribute("hidden");

  // Pre-fill if selection is already a link
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const anchor = sel.anchorNode?.parentElement?.closest("a");
    if (anchor) {
      document.getElementById("link-url").value  = anchor.href || "";
      document.getElementById("link-text").value = anchor.textContent || "";
    } else {
      document.getElementById("link-url").value  = "";
      document.getElementById("link-text").value = sel.toString() || "";
    }
  }

  document.getElementById("link-url").focus();
}

function closeLinkDialog() {
  document.getElementById("link-dialog").setAttribute("hidden", "");
  restoreSelection();
}

function insertLink() {
  const url  = document.getElementById("link-url").value.trim();
  const text = document.getElementById("link-text").value.trim();
  if (!url) { closeLinkDialog(); return; }

  restoreSelection();

  const sel = window.getSelection();
  if (sel && sel.rangeCount && !sel.isCollapsed) {
    // Wrap existing selection
    document.execCommand("createLink", false, url);
  } else {
    // Insert new link
    const linkHtml = `<a href="${escapeAttr(url)}">${escapeHtml(text || url)}</a>`;
    document.execCommand("insertHTML", false, linkHtml);
  }

  closeLinkDialog();
}

// -----------------------------------------------------------------
// IMAGE DIALOG
// -----------------------------------------------------------------

function initImageDialog() {
  document.getElementById("image-ok").addEventListener("click", insertImage);
  document.getElementById("image-cancel").addEventListener("click", closeImageDialog);

  document.getElementById("image-url").addEventListener("keydown", (e) => {
    if (e.key === "Enter") insertImage();
    if (e.key === "Escape") closeImageDialog();
  });
}

function openImageDialog() {
  saveSelection();
  const dialog = document.getElementById("image-dialog");
  dialog.removeAttribute("hidden");
  document.getElementById("image-url").value = "";
  document.getElementById("image-alt").value = "";
  document.getElementById("image-url").focus();
}

function closeImageDialog() {
  document.getElementById("image-dialog").setAttribute("hidden", "");
  restoreSelection();
}

function insertImage() {
  const url = document.getElementById("image-url").value.trim();
  const alt = document.getElementById("image-alt").value.trim();
  if (!url) { closeImageDialog(); return; }

  restoreSelection();
  document.execCommand("insertHTML", false, `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}">`);
  closeImageDialog();
}

// -----------------------------------------------------------------
// TABLE INSERT
// -----------------------------------------------------------------

function insertTable() {
  const rows = parseInt(prompt(getLang() === "fr" ? "Nombre de lignes :" : "Number of rows:", "3"), 10) || 3;
  const cols = parseInt(prompt(getLang() === "fr" ? "Nombre de colonnes :" : "Number of columns:", "3"), 10) || 3;

  let table = "<table><thead><tr>";
  for (let c = 0; c < cols; c++) table += `<th>Header ${c + 1}</th>`;
  table += "</tr></thead><tbody>";
  for (let r = 0; r < rows; r++) {
    table += "<tr>";
    for (let c = 0; c < cols; c++) table += "<td>&nbsp;</td>";
    table += "</tr>";
  }
  table += "</tbody></table><p><br></p>";

  document.getElementById("visual-editor").focus();
  document.execCommand("insertHTML", false, table);
}

// -----------------------------------------------------------------
// CLEAN INLINE STYLES
// -----------------------------------------------------------------

function cleanInlineStyles() {
  const editor = document.getElementById("visual-editor");
  editor.querySelectorAll("[style]").forEach(el => el.removeAttribute("style"));
  editor.querySelectorAll("[class]").forEach(el => el.removeAttribute("class"));
  editor.querySelectorAll("font").forEach(el => {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  showToast(getLang() === "fr" ? "Styles supprimés" : "Inline styles removed", "success");
}

// -----------------------------------------------------------------
// WORD / CHAR COUNT
// -----------------------------------------------------------------

function updateCounts() {
  const editor = document.getElementById("visual-editor");
  const text = editor.innerText || editor.textContent || "";
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;

  const lang = getLang();
  document.getElementById("word-count").textContent = lang === "fr"
    ? `${words} mot${words !== 1 ? "s" : ""}`
    : `${words} word${words !== 1 ? "s" : ""}`;
  document.getElementById("char-count").textContent = lang === "fr"
    ? `${chars} car.`
    : `${chars} char${chars !== 1 ? "s" : ""}`;
}

// -----------------------------------------------------------------
// SELECTION HELPERS
// -----------------------------------------------------------------

function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  const editor = document.getElementById("visual-editor");
  editor.focus();
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

// -----------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------

function getLang() {
  return document.documentElement.lang?.split("-")[0] || "en";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast-notification toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}
