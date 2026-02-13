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
 * - Keep only <strong>, <em>, <p>, <ul>, <ol>, <li>, <a> tags with proper nesting
 * - Convert bold to <strong>, italic to <em>
 * - Convert H1 to H2
 * - Remove <br> and empty <p> tags
 * - Maintain proper list structure (ul for bullets, ol for ordered)
 * - Convert Quill lists to proper HTML lists (checking data-list attribute)
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
      // Preserve spacing but normalize multiple spaces to single space
      let text = node.textContent.replace(/\s+/g, " ");
      // Only trim if this is at the very start or end of the parent element
      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }
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
      // Handle links
      else if (tagName === "a") {
        const href = node.getAttribute("href");
        const content = processElements(node);
        if (content.trim() && href) {
          result += '<a href="' + href + '">' + content + "</a>";
        } else if (content.trim()) {
          // If no href, just keep the content
          result += content;
        }
      }
      // Handle lists - check data-list attribute to determine type
      else if (tagName === "ul" || tagName === "ol") {
        // Check first child li to determine actual list type
        const firstLi = node.querySelector("li");
        const dataList = firstLi ? firstLi.getAttribute("data-list") : null;

        // Determine if this should be ul or ol based on data-list attribute
        const shouldBeUnordered = dataList === "bullet";
        const listTag = shouldBeUnordered ? "ul" : "ol";

        const content = processListItems(node);
        if (content.trim()) {
          result += "<" + listTag + ">" + content + "</" + listTag + ">";
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
  let listItems = Array.from(listElement.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "li");

  let i = 0;
  while (i < listItems.length) {
    const node = listItems[i];
    const currentIndent = getIndentLevel(node);
    const dataList = node.getAttribute("data-list");

    // Check if this li contains a nested list already
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
            liContent += processElements(child);
          } else {
            liContent += processInlineContent(child);
          }
        }
      }
      result += "<li>" + liContent + "</li>";
      i++;
    } else if (currentIndent === 0) {
      // No indent - regular list item
      const content = processInlineContent(node);
      result += "<li>" + content + "</li>";
      i++;
    } else {
      // This item has indent - need to create nested list
      // Look ahead to collect all items at this indent level or higher
      let nestedItems = [];
      let j = i;

      while (j < listItems.length) {
        const nextIndent = getIndentLevel(listItems[j]);
        if (nextIndent < currentIndent) {
          break; // Back to lower indent level
        }
        nestedItems.push(listItems[j]);
        j++;
      }

      // Create nested list
      const nestedListType = dataList === "bullet" ? "ul" : "ol";
      result += "<li><" + nestedListType + ">";

      // Process nested items
      for (let nestedItem of nestedItems) {
        const nestedContent = processInlineContent(nestedItem);
        result += "<li>" + nestedContent + "</li>";
      }

      result += "</" + nestedListType + "></li>";
      i = j;
    }
  }

  return result;
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
  let result = "";
  const childNodes = Array.from(element.childNodes);

  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    const nextNode = childNodes[i + 1];

    if (node.nodeType === Node.TEXT_NODE) {
      // Preserve spacing but normalize multiple spaces to single space
      let text = node.textContent.replace(/\s+/g, " ");
      // Only trim if this is at the very start or end of the parent element
      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }
      if (text) {
        result += text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (tagName === "b" || tagName === "strong") {
        const content = processInlineContent(node);
        if (content.trim()) {
          result += "<strong>" + content + "</strong>";
          // Remove leading space from next text node if it exists
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            nextNode.textContent = nextNode.textContent.replace(/^\s+/, "");
          }
        }
      } else if (tagName === "i" || tagName === "em") {
        const content = processInlineContent(node);
        if (content.trim()) {
          result += "<em>" + content + "</em>";
          // Remove leading space from next text node if it exists
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            nextNode.textContent = nextNode.textContent.replace(/^\s+/, "");
          }
        }
      } else if (tagName === "a") {
        const href = node.getAttribute("href");
        const content = processInlineContent(node);
        if (content.trim() && href) {
          result += '<a href="' + href + '">' + content + "</a>";
          // Remove leading space from next text node if it exists
          if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            nextNode.textContent = nextNode.textContent.replace(/^\s+/, "");
          }
        } else if (content.trim()) {
          // If no href, just keep the content
          result += content;
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
