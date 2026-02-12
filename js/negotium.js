/**
 * NEGOTIUM.JS - Word to HTML Converter
 * Converts Microsoft Word content to clean HTML
 */

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
    ["clean"],
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
          // Only allow: bold, italic, list, indent, header
          if (op.attributes.bold) cleanAttributes.bold = op.attributes.bold;
          if (op.attributes.italic) cleanAttributes.italic = op.attributes.italic;
          if (op.attributes.list) cleanAttributes.list = op.attributes.list;
          if (op.attributes.indent) cleanAttributes.indent = op.attributes.indent;
          if (op.attributes.header) cleanAttributes.header = op.attributes.header;
        }
        return { insert: op.insert, attributes: Object.keys(cleanAttributes).length > 0 ? cleanAttributes : undefined };
      }
      return op;
    });

    return new Quill.imports.delta(cleanDelta);
  });
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
    const message = currentLang === "fr" ? "Veuillez coller du contenu dans l'éditeur avant de convertir." : "Please paste content into the editor before converting.";
    alert(message);
    return;
  }

  // Clean the HTML
  const cleanedHTML = cleanHTML(rawHTML);

  // Display the output
  displayOutput(cleanedHTML);
}

/**
 * Clean HTML content
 * - Remove unnecessary attributes and styles
 * - Keep only <strong>, <em>, <p>, <ul>, <ol>, <li> tags with proper nesting
 * - Convert bold to <strong>, italic to <em>
 * - Convert H1 to H2
 * - Remove <br> and empty <p> tags
 * - Maintain proper list structure (ul for bullets, ol for ordered)
 * - Output as single line
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
  let result = "";

  // Iterate through child nodes
  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Keep text nodes (trim extra whitespace)
      const text = node.textContent.trim();
      if (text) {
        result += text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Convert H1 to H2
      if (tagName === "h1") {
        result += "<h2>" + processElements(node) + "</h2>";
      }
      // Convert bold (b) to strong
      else if (tagName === "b" || tagName === "strong") {
        const content = processElements(node);
        if (content.trim()) {
          result += "<strong>" + content + "</strong>";
        }
      }
      // Convert italic (i) to em
      else if (tagName === "i" || tagName === "em") {
        const content = processElements(node);
        if (content.trim()) {
          result += "<em>" + content + "</em>";
        }
      }
      // Handle lists - preserve the list type
      else if (tagName === "ul") {
        const content = processListItems(node);
        if (content.trim()) {
          result += "<ul>" + content + "</ul>";
        }
      } else if (tagName === "ol") {
        const content = processListItems(node);
        if (content.trim()) {
          result += "<ol>" + content + "</ol>";
        }
      } else if (tagName === "li") {
        // Check if this li contains a nested list
        const hasNestedList = Array.from(node.children).some((child) => child.tagName === "UL" || child.tagName === "OL");

        if (hasNestedList) {
          // Process li with nested list
          let liContent = "";
          for (let child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent.trim();
              if (text) liContent += text;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childTag = child.tagName.toLowerCase();
              if (childTag === "ul" || childTag === "ol") {
                // Add nested list
                liContent += processElements(child);
              } else {
                // Process other inline content
                liContent += processInlineContent(child);
              }
            }
          }
          result += "<li>" + liContent + "</li>";
        } else {
          // Simple list item
          const content = processInlineContent(node);
          result += "<li>" + content + "</li>";
        }
      }
      // Keep allowed block-level tags (p, h2, h3)
      else if (["p", "h2", "h3"].includes(tagName)) {
        const content = processElements(node);
        // Don't include empty paragraphs
        if (content.trim()) {
          result += "<" + tagName + ">" + content + "</" + tagName + ">";
        }
      }
      // Skip br tags (don't convert to space, just remove)
      else if (tagName === "br") {
        // Do nothing - remove br tags completely
      }
      // For underline, span, div and other formatting tags, just keep the content
      else if (["u", "span", "div"].includes(tagName)) {
        result += processElements(node);
      }
      // Skip all other tags but keep their content
      else {
        result += processElements(node);
      }
    }
  }

  return result;
}

/**
 * Process list items, maintaining proper structure
 */
function processListItems(listElement) {
  let result = "";

  for (let node of listElement.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "li") {
      // Check for Quill's data-list attribute to determine type
      const dataList = node.getAttribute("data-list");

      // Check if this li contains a nested list
      const hasNestedList = Array.from(node.children).some((child) => child.tagName === "UL" || child.tagName === "OL");

      if (hasNestedList) {
        // Process li with nested list
        let liContent = "";
        for (let child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent.trim();
            if (text) liContent += text;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childTag = child.tagName.toLowerCase();
            if (childTag === "ul" || childTag === "ol") {
              // Add nested list
              liContent += processElements(child);
            } else {
              // Process other inline content
              liContent += processInlineContent(child);
            }
          }
        }
        result += "<li>" + liContent + "</li>";
      } else {
        // Simple list item
        const content = processInlineContent(node);
        result += "<li>" + content + "</li>";
      }
    }
  }

  return result;
}

/**
 * Process inline content (for list items and paragraphs)
 * This preserves <strong> and <em> tags
 */
function processInlineContent(element) {
  let result = "";

  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        result += text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (tagName === "b" || tagName === "strong") {
        const content = processInlineContent(node);
        if (content.trim()) {
          result += "<strong>" + content + "</strong>";
        }
      } else if (tagName === "i" || tagName === "em") {
        const content = processInlineContent(node);
        if (content.trim()) {
          result += "<em>" + content + "</em>";
        }
      } else if (tagName === "br") {
        // Skip br tags
      } else {
        // For other tags, just get the content
        result += processInlineContent(node);
      }
    }
  }

  return result;
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
          const errorMessage = currentLang === "fr" ? "Impossible de copier. Veuillez sélectionner et copier manuellement." : "Failed to copy. Please select and copy manually.";
          alert(errorMessage);
        }
      );
    } catch (err) {
      const errorMessage = currentLang === "fr" ? "Impossible de copier. Veuillez sélectionner et copier manuellement." : "Failed to copy. Please select and copy manually.";
      alert(errorMessage);
    }
  }
}
