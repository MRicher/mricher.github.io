/**
 * NEGOTIUM.JS - Word to HTML Converter
 * Converts Microsoft Word content to clean HTML
 */

// ===================================================================
// CONSTANTS AND VERSION INFO
// ===================================================================

const NEGOTIUM_VERSION = "1.0.0";
const NEGOTIUM_VERSION_STRING = `Version ${NEGOTIUM_VERSION}`;

/**
 * Update version info dynamically on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version-info");
  if (versionElement) {
    versionElement.textContent = NEGOTIUM_VERSION_STRING;
  }
});

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate and sanitize href attribute
 */
function sanitizeHref(href) {
  if (!href) return null;
  // Remove javascript: and data: URLs for security
  const lowerHref = href.toLowerCase().trim();
  if (lowerHref.startsWith("javascript:") || lowerHref.startsWith("data:")) {
    return null;
  }
  return href;
}

// ===================================================================
// QUILL EDITOR
// ===================================================================

// Initialize Quill editor
let quill;

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  initializeQuillEditor();
  setupEventListeners();
  updatePlaceholderText();

  // Listen for language changes to update placeholder
  document.addEventListener("languageChanged", () => {
    updatePlaceholderText();
  });
});

/**
 * Initialize Quill rich text editor
 */
function initializeQuillEditor() {
  const toolbarOptions = [
    ["bold", "italic"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }], // Add indent/outdent buttons
    [{ header: [2, 3, false] }],
    ["link"], // Add link button
    ["clean"],
    ["view-html"], // Add view HTML button
  ];

  quill = new Quill("#editor", {
    modules: {
      toolbar: toolbarOptions,
      clipboard: {
        matchVisual: false,
      },
    },
    theme: "snow",
    placeholder: "Paste your Word document content here...",
  });

  // Add custom paste handler to clean pasted content
  quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
    // Clean the delta operations to only include allowed formats
    const cleanDelta = delta.ops.map((op) => {
      if (op.insert && typeof op.insert === "string") {
        // For text insertions, only keep allowed attributes
        const cleanAttributes = {};
        if (op.attributes) {
          // Only allow: bold, italic, list, indent, header, link
          if (op.attributes.bold) cleanAttributes.bold = op.attributes.bold;
          if (op.attributes.italic) cleanAttributes.italic = op.attributes.italic;
          if (op.attributes.list) cleanAttributes.list = op.attributes.list;
          if (op.attributes.indent) cleanAttributes.indent = op.attributes.indent;
          if (op.attributes.header) cleanAttributes.header = op.attributes.header;
          if (op.attributes.link) cleanAttributes.link = op.attributes.link;
        }
        return { insert: op.insert, attributes: Object.keys(cleanAttributes).length > 0 ? cleanAttributes : undefined };
      }
      return op;
    });

    return new Quill.imports.delta(cleanDelta);
  });

  // Add custom handler for view-html button
  const viewHtmlButton = document.querySelector(".ql-view-html");
  if (viewHtmlButton) {
    viewHtmlButton.innerHTML = "&lt;/&gt;"; // HTML icon
    viewHtmlButton.title = "View HTML";
    // Add click handler directly to the button
    viewHtmlButton.addEventListener("click", function(e) {
      e.preventDefault();
      toggleHTMLView();
    });
  }

  // Style the custom button
  const viewHtmlButton = document.querySelector(".ql-view-html");
  if (viewHtmlButton) {
    viewHtmlButton.innerHTML = "&lt;/&gt;"; // HTML icon
    viewHtmlButton.title = "View HTML";
    // Add click handler directly to the button
    viewHtmlButton.addEventListener("click", function(e) {
      e.preventDefault();
      toggleHTMLView();
    });
  }

/**
 * Toggle between rich text editor and HTML source view
 */
function toggleHTMLView() {
  const editorContainer = document.querySelector(".ql-container");
  const editor = document.querySelector(".ql-editor");
  const viewHtmlButton = document.querySelector(".ql-view-html");

  if (!editorContainer || !editor) return;

  // Check if we're currently in HTML view
  const isHTMLView = editorContainer.classList.contains("html-view");

  if (isHTMLView) {
    // Switch back to rich text view
    const htmlContent = editor.textContent;
    quill.root.innerHTML = htmlContent;
    editorContainer.classList.remove("html-view");
    editor.contentEditable = "true";
    if (viewHtmlButton) {
      viewHtmlButton.classList.remove("ql-active");
    }
  } else {
    // Switch to HTML view
    const htmlContent = quill.root.innerHTML;
    editor.textContent = htmlContent;
    editorContainer.classList.add("html-view");
    editor.contentEditable = "true";
    if (viewHtmlButton) {
      viewHtmlButton.classList.add("ql-active");
    }
  }
}

/**
 * Update placeholder text based on current language
 */
function updatePlaceholderText() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";
  const placeholder = currentLang === "fr" ? "Collez le contenu de votre document Word ici..." : "Paste your Word document content here...";

  const editorElement = document.querySelector(".ql-editor");
  if (editorElement) {
    editorElement.setAttribute("data-placeholder", placeholder);
  }
}

/**
 * Setup event listeners for buttons
 */
function setupEventListeners() {
  // Convert button
  const convertBtn = document.getElementById("convert-btn");
  if (convertBtn) {
    convertBtn.addEventListener("click", convertToHTML);
  }

  // Clear button
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearEditor);
  }

  // Copy button
  const copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyToClipboard);
  }
}

/**
 * Convert Word content to clean HTML
 */
function convertToHTML() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";

  // Get HTML content from Quill
  const rawHTML = quill.root.innerHTML;

  // Check if editor is empty
  if (!rawHTML || rawHTML.trim() === "<p><br></p>" || rawHTML.trim() === "") {
    const message =
      currentLang === "fr"
        ? "Veuillez coller du contenu dans l'éditeur avant de convertir."
        : "Please paste content into the editor before converting.";
    alert(message);
    return;
  }

  // Clean the HTML
  const cleanedHTML = cleanHTML(rawHTML);

  // Display the output
  displayOutput(cleanedHTML);
}

/**
 * Clean HTML content and output as single line
 */
function cleanHTML(html) {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Process all elements
  const processedHTML = processElements(tempDiv);

  // Convert to single line (remove extra whitespace and newlines)
  const singleLine = processedHTML
    .replace(/>\s+</g, "><") // Remove whitespace between tags
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return singleLine;
}

/**
 * Process HTML elements recursively
 * Keep only allowed tags and clean attributes
 */
function processElements(element) {
  const parts = [];

  // Iterate through child nodes
  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Normalize whitespace
      let text = node.textContent.replace(/\s+/g, " ");

      // Trim leading space if first child
      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      // Trim trailing space if last child
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }

      // Convert non-breaking spaces to proper entity
      text = text.replace(/\u00A0/g, "&nbsp;");

      if (text) {
        parts.push(escapeHTML(text));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Convert H1 to H2
      if (tagName === "h1") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<h2>${content}</h2>`);
        }
      }
      // Convert bold (b) to strong
      else if (tagName === "b" || tagName === "strong") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<strong>${content}</strong>`);
        }
      }
      // Convert italic (i) to em
      else if (tagName === "i" || tagName === "em") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<em>${content}</em>`);
        }
      }
      // Handle links
      else if (tagName === "a") {
        const href = sanitizeHref(node.getAttribute("href"));
        const content = processElements(node);
        if (content.trim() && href) {
          parts.push(`<a href="${escapeHTML(href)}">${content}</a>`);
        } else if (content.trim()) {
          // If no valid href, just keep the content
          parts.push(content);
        }
      }
      // Handle lists - check data-list attribute to determine type
      else if (tagName === "ul" || tagName === "ol") {
        const content = processListItems(node);
        if (content.trim()) {
          // Determine list type from first li's data-list attribute
          const firstLi = node.querySelector("li");
          const dataList = firstLi ? firstLi.getAttribute("data-list") : null;
          const listTag = dataList === "bullet" ? "ul" : "ol";
          parts.push(`<${listTag}>${content}</${listTag}>`);
        }
      }
      // Keep allowed block-level tags (p, h2, h3)
      else if (["p", "h2", "h3"].includes(tagName)) {
        const content = processElements(node);
        // Don't include empty paragraphs
        if (content.trim()) {
          parts.push(`<${tagName}>${content}</${tagName}>`);
        }
      }
      // Skip br tags completely
      else if (tagName === "br") {
        // Do nothing - remove br tags
      }
      // For underline, span, div and other formatting tags, just keep the content
      else if (["u", "span", "div"].includes(tagName)) {
        parts.push(processElements(node));
      }
      // Skip all other tags but keep their content
      else {
        parts.push(processElements(node));
      }
    }
  }

  return parts.join("");
}

/**
 * Process list items, maintaining proper structure
 */
function processListItems(listElement) {
  const parts = [];
  const listItems = Array.from(listElement.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "li");

  let i = 0;
  while (i < listItems.length) {
    const node = listItems[i];
    const currentIndent = getIndentLevel(node);

    // Check if this li already contains a nested list
    const hasNestedList = Array.from(node.children).some((child) => child.tagName === "UL" || child.tagName === "OL");

    if (hasNestedList) {
      // Process li with existing nested list
      const liContent = processListItemWithNestedList(node);
      parts.push(`<li>${liContent}</li>`);
      i++;
    } else if (currentIndent === 0) {
      // No indent - regular list item
      const content = processInlineContent(node);

      // Look ahead for indented children
      let j = i + 1;
      let nestedHTML = "";

      if (j < listItems.length && getIndentLevel(listItems[j]) > 0) {
        // Collect indented items
        const indentedItems = [];
        while (j < listItems.length && getIndentLevel(listItems[j]) > 0) {
          indentedItems.push(listItems[j]);
          j++;
        }

        // Create nested list
        const nestedListType = indentedItems[0].getAttribute("data-list") === "bullet" ? "ul" : "ol";
        const nestedContent = processNestedIndentedItems(indentedItems);
        nestedHTML = `<${nestedListType}>${nestedContent}</${nestedListType}>`;
      }

      parts.push(`<li>${content}${nestedHTML}</li>`);
      i = j;
    } else {
      // Skip - handled as part of parent's nested list
      i++;
    }
  }

  return parts.join("");
}

/**
 * Process list item that contains a nested list
 */
function processListItemWithNestedList(node) {
  const parts = [];

  for (let child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim();
      if (text) {
        parts.push(escapeHTML(text));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childTag = child.tagName.toLowerCase();
      if (childTag === "ul" || childTag === "ol") {
        // Add nested list
        parts.push(processElements(child));
      } else {
        // Process other inline content
        parts.push(processInlineContent(child));
      }
    }
  }

  return parts.join("");
}

/**
 * Process nested indented items recursively
 */
function processNestedIndentedItems(items) {
  const parts = [];
  let i = 0;

  while (i < items.length) {
    const node = items[i];
    const currentIndent = getIndentLevel(node);
    const content = processInlineContent(node);

    // Look ahead for further nested items
    let j = i + 1;
    let nestedHTML = "";

    if (j < items.length && getIndentLevel(items[j]) > currentIndent) {
      // Collect nested items
      const nestedItems = [];
      const nestedIndent = getIndentLevel(items[j]);

      while (j < items.length && getIndentLevel(items[j]) >= nestedIndent) {
        nestedItems.push(items[j]);
        j++;
      }

      // Create nested list
      const nestedListType = nestedItems[0].getAttribute("data-list") === "bullet" ? "ul" : "ol";
      const nestedContent = processNestedIndentedItems(nestedItems);
      nestedHTML = `<${nestedListType}>${nestedContent}</${nestedListType}>`;
    }

    parts.push(`<li>${content}${nestedHTML}</li>`);
    i = j > i + 1 ? j : i + 1;
  }

  return parts.join("");
}

/**
 * Get indent level from Quill's class name
 */
function getIndentLevel(element) {
  const classList = element.className || "";
  const match = classList.match(/ql-indent-(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Process inline content (for list items and paragraphs)
 * This preserves <strong>, <em>, and <a> tags
 */
function processInlineContent(element) {
  const parts = [];

  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Normalize whitespace
      let text = node.textContent.replace(/\s+/g, " ");

      // Trim leading space if first child
      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      // Trim trailing space if last child
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }

      // Convert non-breaking spaces
      text = text.replace(/\u00A0/g, "&nbsp;");

      if (text) {
        parts.push(escapeHTML(text));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (tagName === "b" || tagName === "strong") {
        const content = processInlineContent(node);
        if (content.trim()) {
          parts.push(`<strong>${content}</strong>`);
        }
      } else if (tagName === "i" || tagName === "em") {
        const content = processInlineContent(node);
        if (content.trim()) {
          parts.push(`<em>${content}</em>`);
        }
      } else if (tagName === "a") {
        const href = sanitizeHref(node.getAttribute("href"));
        const content = processInlineContent(node);
        if (content.trim() && href) {
          parts.push(`<a href="${escapeHTML(href)}">${content}</a>`);
        } else if (content.trim()) {
          // If no valid href, just keep the content
          parts.push(content);
        }
      } else if (tagName === "br") {
        // Skip br tags
      } else {
        // For other tags, just get the content
        parts.push(processInlineContent(node));
      }
    }
  }

  return parts.join("");
}

/**
 * Display the output HTML
 */
function displayOutput(html) {
  const outputSection = document.getElementById("output-section");
  const outputTextarea = document.getElementById("output");

  if (outputSection && outputTextarea) {
    outputTextarea.value = html;
    outputSection.style.display = "block";

    // Scroll to output section
    outputSection.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Hide copy feedback if it was showing
    const copyFeedback = document.getElementById("copy-feedback");
    if (copyFeedback) {
      copyFeedback.style.display = "none";
    }
  }
}

/**
 * Clear the editor
 */
function clearEditor() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";

  const message = currentLang === "fr" ? "Êtes-vous sûr de vouloir effacer le contenu ?" : "Are you sure you want to clear the content?";

  if (confirm(message)) {
    // Clear Quill editor
    quill.setText("");

    // Hide output section
    const outputSection = document.getElementById("output-section");
    if (outputSection) {
      outputSection.style.display = "none";
    }

    // Clear output textarea
    const outputTextarea = document.getElementById("output");
    if (outputTextarea) {
      outputTextarea.value = "";
    }

    // Focus back to editor
    quill.focus();
  }
}

/**
 * Copy HTML to clipboard
 */
function copyToClipboard() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";
  const outputTextarea = document.getElementById("output");
  const copyFeedback = document.getElementById("copy-feedback");

  if (outputTextarea && outputTextarea.value) {
    // Select the text
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999); // For mobile devices

    try {
      // Copy to clipboard
      navigator.clipboard.writeText(outputTextarea.value).then(
        () => {
          // Show success feedback
          if (copyFeedback) {
            const successMessage = currentLang === "fr" ? "HTML copié dans le presse-papiers !" : "HTML copied to clipboard!";
            copyFeedback.textContent = successMessage;
            copyFeedback.style.display = "block";

            setTimeout(() => {
              copyFeedback.style.display = "none";
            }, 3000);
          }
        },
        (fallbackErr) => {
          const errorMessage =
            currentLang === "fr"
              ? "Impossible de copier. Veuillez sélectionner et copier manuellement."
              : "Failed to copy. Please select and copy manually.";
          alert(errorMessage);
        },
      );
    } catch (err) {
      const errorMessage =
        currentLang === "fr"
          ? "Impossible de copier. Veuillez sélectionner et copier manuellement."
          : "Failed to copy. Please select and copy manually.";
      alert(errorMessage);
    }
  }
}
