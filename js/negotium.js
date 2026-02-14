const NEGOTIUM_VERSION = "1.0.0";
const NEGOTIUM_VERSION_STRING = `Version ${NEGOTIUM_VERSION}`;

document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version-info");
  if (versionElement) {
    versionElement.textContent = NEGOTIUM_VERSION_STRING;
  }
});

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeHref(href) {
  if (!href) return null;
  const lowerHref = href.toLowerCase().trim();
  if (lowerHref.startsWith("javascript:") || lowerHref.startsWith("data:")) {
    return null;
  }
  return href;
}

let quill;

document.addEventListener("DOMContentLoaded", () => {
  initializeQuillEditor();
  setupEventListeners();
  updatePlaceholderText();

  document.addEventListener("languageChanged", () => {
    updatePlaceholderText();
  });
});

function initializeQuillEditor() {
  const toolbarOptions = [
    ["bold", "italic"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ header: [2, 3, false] }],
    ["link"],
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

  quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
    const cleanDelta = delta.ops.map((op) => {
      if (op.insert && typeof op.insert === "string") {
        const cleanAttributes = {};
        if (op.attributes) {
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

function updatePlaceholderText() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";
  const placeholder = currentLang === "fr" ? "Collez le contenu de votre document Word ici..." : "Paste your Word document content here...";

  const editorElement = document.querySelector(".ql-editor");
  if (editorElement) {
    editorElement.setAttribute("data-placeholder", placeholder);
  }
}

function setupEventListeners() {
  const convertBtn = document.getElementById("convert-btn");
  if (convertBtn) {
    convertBtn.addEventListener("click", convertToHTML);
  }

  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearEditor);
  }

  const copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyToClipboard);
  }
}

function convertToHTML() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";

  const rawHTML = quill.root.innerHTML;

  if (!rawHTML || rawHTML.trim() === "<p><br></p>" || rawHTML.trim() === "") {
    const message =
      currentLang === "fr"
        ? "Veuillez coller du contenu dans l'éditeur avant de convertir."
        : "Please paste content into the editor before converting.";
    alert(message);
    return;
  }

  const cleanedHTML = cleanHTML(rawHTML);

  displayOutput(cleanedHTML);
}

function cleanHTML(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const processedHTML = processElements(tempDiv);

  const singleLine = processedHTML.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

  return singleLine;
}

function processElements(element) {
  const parts = [];

  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent.replace(/\s+/g, " ");

      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }

      text = text.replace(/\u00A0/g, "&nbsp;");

      if (text) {
        parts.push(escapeHTML(text));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (tagName === "h1") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<h2>${content}</h2>`);
        }
      } else if (tagName === "b" || tagName === "strong") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<strong>${content}</strong>`);
        }
      } else if (tagName === "i" || tagName === "em") {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<em>${content}</em>`);
        }
      } else if (tagName === "a") {
        const href = sanitizeHref(node.getAttribute("href"));
        const content = processElements(node);
        if (content.trim() && href) {
          parts.push(`<a href="${escapeHTML(href)}">${content}</a>`);
        } else if (content.trim()) {
          parts.push(content);
        }
      } else if (tagName === "ul" || tagName === "ol") {
        const content = processListItems(node);
        if (content.trim()) {
          const firstLi = node.querySelector("li");
          const dataList = firstLi ? firstLi.getAttribute("data-list") : null;
          const listTag = dataList === "bullet" ? "ul" : "ol";
          parts.push(`<${listTag}>${content}</${listTag}>`);
        }
      } else if (["p", "h2", "h3"].includes(tagName)) {
        const content = processElements(node);
        if (content.trim()) {
          parts.push(`<${tagName}>${content}</${tagName}>`);
        }
      } else if (tagName === "br") {
      } else if (["u", "span", "div"].includes(tagName)) {
        parts.push(processElements(node));
      } else {
        parts.push(processElements(node));
      }
    }
  }

  return parts.join("");
}

function processListItems(listElement) {
  const parts = [];
  const listItems = Array.from(listElement.childNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "li");

  let i = 0;
  while (i < listItems.length) {
    const node = listItems[i];
    const currentIndent = getIndentLevel(node);

    const hasNestedList = Array.from(node.children).some((child) => child.tagName === "UL" || child.tagName === "OL");

    if (hasNestedList) {
      const liContent = processListItemWithNestedList(node);
      parts.push(`<li>${liContent}</li>`);
      i++;
    } else if (currentIndent === 0) {
      const content = processInlineContent(node);

      let j = i + 1;
      let nestedHTML = "";

      if (j < listItems.length && getIndentLevel(listItems[j]) > 0) {
        const indentedItems = [];
        while (j < listItems.length && getIndentLevel(listItems[j]) > 0) {
          indentedItems.push(listItems[j]);
          j++;
        }

        const nestedListType = indentedItems[0].getAttribute("data-list") === "bullet" ? "ul" : "ol";
        const nestedContent = processNestedIndentedItems(indentedItems);
        nestedHTML = `<${nestedListType}>${nestedContent}</${nestedListType}>`;
      }

      parts.push(`<li>${content}${nestedHTML}</li>`);
      i = j;
    } else {
      i++;
    }
  }

  return parts.join("");
}

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
        parts.push(processElements(child));
      } else {
        parts.push(processInlineContent(child));
      }
    }
  }

  return parts.join("");
}

function processNestedIndentedItems(items) {
  const parts = [];
  let i = 0;

  while (i < items.length) {
    const node = items[i];
    const currentIndent = getIndentLevel(node);
    const content = processInlineContent(node);

    let j = i + 1;
    let nestedHTML = "";

    if (j < items.length && getIndentLevel(items[j]) > currentIndent) {
      const nestedItems = [];
      const nestedIndent = getIndentLevel(items[j]);

      while (j < items.length && getIndentLevel(items[j]) >= nestedIndent) {
        nestedItems.push(items[j]);
        j++;
      }

      const nestedListType = nestedItems[0].getAttribute("data-list") === "bullet" ? "ul" : "ol";
      const nestedContent = processNestedIndentedItems(nestedItems);
      nestedHTML = `<${nestedListType}>${nestedContent}</${nestedListType}>`;
    }

    parts.push(`<li>${content}${nestedHTML}</li>`);
    i = j > i + 1 ? j : i + 1;
  }

  return parts.join("");
}

function getIndentLevel(element) {
  const classList = element.className || "";
  const match = classList.match(/ql-indent-(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function processInlineContent(element) {
  const parts = [];

  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent.replace(/\s+/g, " ");

      if (node === element.firstChild) {
        text = text.replace(/^\s+/, "");
      }
      if (node === element.lastChild) {
        text = text.replace(/\s+$/, "");
      }

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
          parts.push(content);
        }
      } else if (tagName === "br") {
      } else {
        parts.push(processInlineContent(node));
      }
    }
  }

  return parts.join("");
}

function displayOutput(html) {
  const outputSection = document.getElementById("output-section");
  const outputTextarea = document.getElementById("output");

  if (outputSection && outputTextarea) {
    outputTextarea.value = html;
    outputSection.style.display = "block";

    outputSection.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const copyFeedback = document.getElementById("copy-feedback");
    if (copyFeedback) {
      copyFeedback.style.display = "none";
    }
  }
}

function clearEditor() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";

  const message = currentLang === "fr" ? "Êtes-vous sûr de vouloir effacer le contenu ?" : "Are you sure you want to clear the content?";

  if (confirm(message)) {
    quill.setText("");

    const outputSection = document.getElementById("output-section");
    if (outputSection) {
      outputSection.style.display = "none";
    }

    const outputTextarea = document.getElementById("output");
    if (outputTextarea) {
      outputTextarea.value = "";
    }

    quill.focus();
  }
}

function copyToClipboard() {
  const currentLang = document.documentElement.lang?.split("-")[0] || "en";
  const outputTextarea = document.getElementById("output");
  const copyFeedback = document.getElementById("copy-feedback");

  if (outputTextarea && outputTextarea.value) {
    outputTextarea.select();
    outputTextarea.setSelectionRange(0, 99999);

    try {
      navigator.clipboard.writeText(outputTextarea.value).then(
        () => {
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
