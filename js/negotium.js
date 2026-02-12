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
  const toolbarOptions = [["bold", "italic"], [{ list: "ordered" }, { list: "bullet" }], [{ header: [2, 3, false] }], ["clean"]];

  quill = new Quill("#editor", {
    modules: {
      toolbar: toolbarOptions,
    },
    theme: "snow",
    placeholder: "Paste your Word document content here...",
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
 * Clean HTML content
 * - Remove unnecessary attributes and styles
 * - Keep only <strong>, <em>, <p>, <ul>, <ol>, <li>, <h2>, <h3> tags
 * - Convert bold to <strong>, italic to <em>
 * - Convert H1 to H2
 * - Remove <br> and empty <p> tags
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
      // Keep allowed block-level tags (p, ul, ol, li, h2, h3)
      else if (["p", "ul", "ol", "li", "h2", "h3"].includes(tagName)) {
        const content = processElements(node);
        // Don't include empty paragraphs, but keep list items
        if (content.trim() || tagName === "li") {
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
      navigator.clipboard
        .writeText(outputTextarea.value)
        .then(() => {
          // Show success feedback
          if (copyFeedback) {
            const successMessage = currentLang === "fr" ? "HTML copié dans le presse-papiers !" : "HTML copied to clipboard!";
            copyFeedback.textContent = successMessage;
            copyFeedback.style.display = "block";

            // Hide feedback after 3 seconds
            setTimeout(() => {
              copyFeedback.style.display = "none";
            }, 3000);
          }
        })
        .catch((err) => {
          console.error("Failed to copy:", err);

          // Fallback for older browsers
          try {
            document.execCommand("copy");
            if (copyFeedback) {
              const successMessage = currentLang === "fr" ? "HTML copié dans le presse-papiers !" : "HTML copied to clipboard!";
              copyFeedback.textContent = successMessage;
              copyFeedback.style.display = "block";

              setTimeout(() => {
                copyFeedback.style.display = "none";
              }, 3000);
            }
          } catch (fallbackErr) {
            const errorMessage =
              currentLang === "fr"
                ? "Impossible de copier. Veuillez sélectionner et copier manuellement."
                : "Failed to copy. Please select and copy manually.";
            alert(errorMessage);
          }
        });
    } catch (err) {
      const errorMessage =
        currentLang === "fr"
          ? "Impossible de copier. Veuillez sélectionner et copier manuellement."
          : "Failed to copy. Please select and copy manually.";
      alert(errorMessage);
    }
  }
}

/**
 * Helper function to strip all HTML tags (for plain text extraction if needed)
 */
function stripHTML(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
}
