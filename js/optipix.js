const BISOLUX_APP_VERSION = "1.2.0";
const BISOLUX_VERSION_STRING = `Version ${BISOLUX_APP_VERSION}`;

// ===================================================================
// GLOBAL VARIABLES
// ===================================================================

let cropper = null;
let currentCategory = null;
let currentPresetWidth = null;
let currentPresetHeight = null;
let currentPresetName = null;
let originalImageData = null;
let selectedPreset = null;
let activePresetButton = null;

// ===================================================================
// INITIALIZATION
// ===================================================================

/**
 * Initialize version info display
 */
document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version-info");
  if (versionElement) {
    versionElement.textContent = BISOLUX_VERSION_STRING;
  }
});

/**
 * Initialize image cropper when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
  initializeImageCropper();
});

/**
 * Initialize the image cropper functionality
 * Sets up event listeners for file upload, drag and drop
 */
function initializeImageCropper() {
  const uploadArea = document.getElementById("upload-area");
  const imageInput = document.getElementById("image-input");

  if (!uploadArea || !imageInput) return;

  // File input change handler
  imageInput.addEventListener("change", handleFileSelect);

  // Drag and drop handlers
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);
  uploadArea.addEventListener("click", () => imageInput.click());

  // Handle button click within upload area
  const selectButton = uploadArea.querySelector("button");
  if (selectButton) {
    selectButton.addEventListener("click", (e) => {
      e.stopPropagation();
      imageInput.click();
    });
  }
}

// ===================================================================
// FILE UPLOAD HANDLERS
// ===================================================================

/**
 * Handle file selection from input
 * @param {Event} event - The change event from file input
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    loadImage(file);
  }
}

/**
 * Handle drag over event
 * @param {DragEvent} event - The dragover event
 */
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add("dragover");
}

/**
 * Handle drag leave event
 * @param {DragEvent} event - The dragleave event
 */
function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("dragover");
}

/**
 * Handle file drop event
 * @param {DragEvent} event - The drop event
 */
function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("dragover");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      loadImage(file);
    }
  }
}

/**
 * Load and validate image file
 * Validates file type and size, then displays category selection
 * @param {File} file - The image file to load
 */
function loadImage(file) {
  // Validate file type
  if (!file.type.match(/^image\/(png|jpe?g)$/i)) {
    const currentLang = document.documentElement.lang || "en-CA";
    const message = currentLang === "fr-CA" ? "Veuillez sélectionner une image PNG ou JPG." : "Please select a PNG or JPG image.";
    alert(message);
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    const currentLang = document.documentElement.lang || "en-CA";
    const message = currentLang === "fr-CA" ? "La taille du fichier doit être inférieure à 10 Mo." : "File size must be less than 10MB.";
    alert(message);
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const imageData = event.target.result;
    originalImageData = imageData;

    // Hide upload section and show category selection section
    const uploadSection = document.getElementById("upload-section");
    const categorySection = document.getElementById("category-section");
    const cropperSection = document.getElementById("cropper-section");
    const presetSection = document.getElementById("preset-section");
    const freeCropSection = document.getElementById("free-crop-section");
    const previewSection = document.getElementById("preview-section");

    if (uploadSection) uploadSection.style.display = "none";

    if (categorySection) {
      categorySection.style.display = "block";
      categorySection.scrollIntoView({ behavior: "smooth" });
    }

    if (cropperSection) cropperSection.style.display = "none";
    if (presetSection) presetSection.style.display = "none";
    if (freeCropSection) freeCropSection.style.display = "none";
    if (previewSection) previewSection.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// ===================================================================
// CATEGORY AND PRESET SELECTION
// ===================================================================

/**
 * Handle category selection (RCMP, Infoweb, or Free crop)
 * @param {string} category - The selected category ('rcmp', 'infoweb', or 'free')
 */
function selectCategory(category) {
  currentCategory = category;

  const categorySection = document.getElementById("category-section");
  const presetSection = document.getElementById("preset-section");
  const freeCropSection = document.getElementById("free-crop-section");
  const rcmpPresets = document.getElementById("rcmp-presets");
  const infowebPresets = document.getElementById("infoweb-presets");
  const presetTitle = document.getElementById("preset-section-title");

  // Hide category section
  if (categorySection) categorySection.style.display = "none";

  const currentLang = document.documentElement.lang || "en-CA";

  if (category === "rcmp") {
    // Show RCMP preset section
    if (presetSection) {
      presetSection.style.display = "block";
      presetSection.scrollIntoView({ behavior: "smooth" });
    }
    if (rcmpPresets) rcmpPresets.style.display = "block";
    if (infowebPresets) infowebPresets.style.display = "none";
    if (presetTitle) {
      presetTitle.setAttribute("data-en", "RCMP.ca preset sizes");
      presetTitle.setAttribute("data-fr", "Formats prédéfinis GRC.ca");
      presetTitle.textContent = currentLang === "fr-CA" ? "Formats prédéfinis GRC.ca" : "RCMP.ca preset sizes";
    }
  } else if (category === "infoweb") {
    // Show Infoweb preset section
    if (presetSection) {
      presetSection.style.display = "block";
      presetSection.scrollIntoView({ behavior: "smooth" });
    }
    if (rcmpPresets) rcmpPresets.style.display = "none";
    if (infowebPresets) infowebPresets.style.display = "block";
    if (presetTitle) {
      presetTitle.setAttribute("data-en", "Infoweb preset sizes");
      presetTitle.setAttribute("data-fr", "Formats prédéfinis Infoweb");
      presetTitle.textContent = currentLang === "fr-CA" ? "Formats prédéfinis Infoweb" : "Infoweb preset sizes";
    }
  } else if (category === "free") {
    // Show free crop dimension input
    if (freeCropSection) {
      freeCropSection.style.display = "block";
      freeCropSection.scrollIntoView({ behavior: "smooth" });
    }
  }
}

/**
 * Go back to category selection
 * Destroys the cropper and resets category-related state
 */
function backToCategory() {
  const uploadSection = document.getElementById("upload-section");
  const categorySection = document.getElementById("category-section");
  const presetSection = document.getElementById("preset-section");
  const freeCropSection = document.getElementById("free-crop-section");
  const cropperSection = document.getElementById("cropper-section");

  if (uploadSection) uploadSection.style.display = "none";
  if (categorySection) {
    categorySection.style.display = "block";
    categorySection.scrollIntoView({ behavior: "smooth" });
  }
  if (presetSection) presetSection.style.display = "none";
  if (freeCropSection) freeCropSection.style.display = "none";
  if (cropperSection) cropperSection.style.display = "none";

  // Destroy cropper if it exists
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  currentCategory = null;
  currentPresetWidth = null;
  currentPresetHeight = null;
  currentPresetName = null;
}

/**
 * Go back to preset selection or category
 * Navigates back one step in the workflow
 */
function backToPresetOrCategory() {
  const presetSection = document.getElementById("preset-section");
  const freeCropSection = document.getElementById("free-crop-section");
  const cropperSection = document.getElementById("cropper-section");

  if (cropperSection) cropperSection.style.display = "none";

  // Destroy cropper if it exists
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  if (currentCategory === "free") {
    if (freeCropSection) {
      freeCropSection.style.display = "block";
      freeCropSection.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    if (presetSection) {
      presetSection.style.display = "block";
      presetSection.scrollIntoView({ behavior: "smooth" });
    }
  }
}

/**
 * Set preset size and continue to cropper
 * @param {number} width - The preset width in pixels
 * @param {number} height - The preset height in pixels
 * @param {string} name - The preset name (e.g., 'Landing', 'Square')
 * @param {HTMLElement} buttonElement - The button that was clicked
 */
function setPresetAndContinue(width, height, name, buttonElement) {
  currentPresetWidth = width;
  currentPresetHeight = height;
  currentPresetName = name;

  // Hide preset section and show cropper
  const presetSection = document.getElementById("preset-section");
  const cropperSection = document.getElementById("cropper-section");

  if (presetSection) presetSection.style.display = "none";
  if (cropperSection) {
    cropperSection.style.display = "block";
    cropperSection.scrollIntoView({ behavior: "smooth" });
  }

  // Update preset info display
  updatePresetInfo();

  // Initialize cropper with preset
  initializeCropperWithPreset(width, height);
}

/**
 * Apply free crop dimensions and continue
 * Validates user input and initializes cropper with custom dimensions
 */
function applyFreeCropDimensions() {
  const widthInput = document.getElementById("free-width");
  const heightInput = document.getElementById("free-height");

  const width = parseInt(widthInput.value);
  const height = parseInt(heightInput.value);

  const currentLang = document.documentElement.lang || "en-CA";

  // Validate width
  if (!width || width < 1 || width > 5000) {
    const message = currentLang === "fr-CA" ? "Veuillez entrer une largeur valide (1-5000 pixels)." : "Please enter a valid width (1-5000 pixels).";
    alert(message);
    return;
  }

  // Validate height
  if (!height || height < 1 || height > 5000) {
    const message = currentLang === "fr-CA" ? "Veuillez entrer une hauteur valide (1-5000 pixels)." : "Please enter a valid height (1-5000 pixels).";
    alert(message);
    return;
  }

  currentPresetWidth = width;
  currentPresetHeight = height;
  currentPresetName = currentLang === "fr-CA" ? `Libre (${width}×${height})` : `Free (${width}×${height})`;

  // Hide free crop section and show cropper
  const freeCropSection = document.getElementById("free-crop-section");
  const cropperSection = document.getElementById("cropper-section");

  if (freeCropSection) freeCropSection.style.display = "none";
  if (cropperSection) {
    cropperSection.style.display = "block";
    cropperSection.scrollIntoView({ behavior: "smooth" });
  }

  // Update preset info display
  updatePresetInfo();

  // Initialize cropper with preset
  initializeCropperWithPreset(width, height);
}

/**
 * Update preset info display
 * Shows the currently selected preset dimensions
 */
function updatePresetInfo() {
  const presetText = document.getElementById("current-preset-text");
  if (presetText && currentPresetName) {
    presetText.textContent = `${currentPresetName} (${currentPresetWidth}×${currentPresetHeight})`;
  }
}

// ===================================================================
// CROPPER INITIALIZATION
// ===================================================================

/**
 * Initialize cropper with preset dimensions
 * Creates a new Cropper.js instance with the specified aspect ratio
 * @param {number} width - The preset width in pixels
 * @param {number} height - The preset height in pixels
 */
function initializeCropperWithPreset(width, height) {
  if (!originalImageData) return;

  const cropperImage = document.getElementById("cropper-image");
  if (!cropperImage) return;

  // Destroy existing cropper if it exists
  if (cropper) {
    cropper.destroy();
  }

  // Set image source
  cropperImage.src = originalImageData;

  // Initialize cropper with aspect ratio
  cropper = new Cropper(cropperImage, {
    aspectRatio: width / height,
    viewMode: 0,
    dragMode: "move",
    autoCropArea: 0.8,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
    responsive: true,
    checkOrientation: false,
    minCropBoxWidth: 50,
    minCropBoxHeight: 50,
    ready: function () {
      // Set crop box to match aspect ratio
      const containerData = cropper.getContainerData();
      const aspectRatio = width / height;

      let newWidth, newHeight;

      if (containerData.width / containerData.height > aspectRatio) {
        // Container is wider than aspect ratio, height is limiting
        newHeight = Math.min(containerData.height - 40, 400);
        newWidth = newHeight * aspectRatio;
      } else {
        // Container is taller than aspect ratio, width is limiting
        newWidth = Math.min(containerData.width - 40, 600);
        newHeight = newWidth / aspectRatio;
      }

      cropper.setCropBoxData({
        left: (containerData.width - newWidth) / 2,
        top: (containerData.height - newHeight) / 2,
        width: newWidth,
        height: newHeight,
      });
    },
  });

  // Store preset dimensions on the cropper instance
  cropper.presetWidth = width;
  cropper.presetHeight = height;
}

// ===================================================================
// IMAGE MANIPULATION FUNCTIONS
// ===================================================================

/**
 * Flip image horizontally
 * Mirrors the image along the vertical axis
 */
function flipHorizontal() {
  if (!cropper) return;

  const imageData = cropper.getImageData();
  const currentScaleX = imageData.scaleX || 1;
  cropper.scaleX(-currentScaleX);
}

/**
 * Flip image vertically
 * Mirrors the image along the horizontal axis
 */
function flipVertical() {
  if (!cropper) return;

  const imageData = cropper.getImageData();
  const currentScaleY = imageData.scaleY || 1;
  cropper.scaleY(-currentScaleY);
}

// ===================================================================
// ZOOM CONTROL FUNCTIONS
// ===================================================================

/**
 * Zoom in on the image
 * Increases the zoom level by 10%
 */
function zoomIn() {
  if (!cropper) return;
  cropper.zoom(0.1);
}

/**
 * Zoom out on the image
 * Decreases the zoom level by 10%
 */
function zoomOut() {
  if (!cropper) return;
  cropper.zoom(-0.1);
}

/**
 * Reset zoom to default level
 * Returns the image to 100% zoom (1:1)
 */
function resetZoom() {
  if (!cropper) return;
  cropper.zoomTo(1);
}

// ===================================================================
// IMAGE MOVEMENT FUNCTIONS
// ===================================================================

/**
 * Move the image within the crop area
 * @param {string} direction - The direction to move ('up', 'down', 'left', 'right')
 */
function moveImage(direction) {
  if (!cropper) return;

  const moveStep = 10; // pixels to move

  switch (direction) {
    case "up":
      cropper.move(0, -moveStep);
      break;
    case "down":
      cropper.move(0, moveStep);
      break;
    case "left":
      cropper.move(-moveStep, 0);
      break;
    case "right":
      cropper.move(moveStep, 0);
      break;
  }
}

/**
 * Move the crop box/area
 * @param {string} direction - The direction to move ('up', 'down', 'left', 'right')
 */
function moveCropBox(direction) {
  if (!cropper) return;

  const moveStep = 10; // pixels to move
  const cropBoxData = cropper.getCropBoxData();

  switch (direction) {
    case "up":
      cropper.setCropBoxData({
        left: cropBoxData.left,
        top: cropBoxData.top - moveStep,
        width: cropBoxData.width,
        height: cropBoxData.height,
      });
      break;
    case "down":
      cropper.setCropBoxData({
        left: cropBoxData.left,
        top: cropBoxData.top + moveStep,
        width: cropBoxData.width,
        height: cropBoxData.height,
      });
      break;
    case "left":
      cropper.setCropBoxData({
        left: cropBoxData.left - moveStep,
        top: cropBoxData.top,
        width: cropBoxData.width,
        height: cropBoxData.height,
      });
      break;
    case "right":
      cropper.setCropBoxData({
        left: cropBoxData.left + moveStep,
        top: cropBoxData.top,
        width: cropBoxData.width,
        height: cropBoxData.height,
      });
      break;
  }
}

// ===================================================================
// CROP AND PREVIEW FUNCTIONS
// ===================================================================

/**
 * Crop the image with the current settings
 * Generates a canvas with the cropped image at the preset dimensions
 */
function cropImage() {
  if (!cropper) return;

  // Use stored preset dimensions
  let canvasOptions = {
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    maxWidth: 2000,
    maxHeight: 2000,
  };

  // Force exact dimensions based on preset
  if (currentPresetWidth && currentPresetHeight) {
    canvasOptions.width = currentPresetWidth;
    canvasOptions.height = currentPresetHeight;
  }

  const canvas = cropper.getCroppedCanvas(canvasOptions);

  if (!canvas) {
    const currentLang = document.documentElement.lang || "en-CA";
    const message = currentLang === "fr-CA" ? "Échec du recadrage de l'image. Veuillez réessayer." : "Failed to crop image. Please try again.";
    alert(message);
    return;
  }

  // Use current preset name for the filename
  selectedPreset = currentPresetName || `${canvas.width}x${canvas.height}`;

  // Show preview
  displayPreview(canvas);

  // Show preview section and scroll to it
  const previewSection = document.getElementById("preview-section");
  if (previewSection) {
    previewSection.style.display = "block";
    previewSection.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Display the cropped image preview
 * Shows the preview image and displays its dimensions
 * @param {HTMLCanvasElement} canvas - The canvas containing the cropped image
 */
function displayPreview(canvas) {
  const previewImage = document.getElementById("preview-image");
  const dimensionsElement = document.getElementById("image-dimensions");

  if (!previewImage) return;

  // Convert canvas to data URL
  const dataURL = canvas.toDataURL("image/png", 0.9);
  previewImage.src = dataURL;

  // Update dimensions info
  if (dimensionsElement) {
    const currentLang = document.documentElement.lang || "en-CA";
    const dimensionsText =
      currentLang === "fr-CA" ? `Dimensions : ${canvas.width} × ${canvas.height} pixels` : `Dimensions: ${canvas.width} × ${canvas.height} pixels`;
    dimensionsElement.textContent = dimensionsText;
  }

  // Store canvas for download
  previewImage.canvas = canvas;
}

// ===================================================================
// DOWNLOAD FUNCTIONS
// ===================================================================

/**
 * Download the processed image
 * @param {string} format - The file format ('png' or 'jpg')
 */
function downloadImage(format) {
  const previewImage = document.getElementById("preview-image");
  const canvas = previewImage?.canvas;

  if (!canvas) {
    const currentLang = document.documentElement.lang || "en-CA";
    const message =
      currentLang === "fr-CA"
        ? "Aucune image à télécharger. Veuillez d'abord recadrer une image."
        : "No image to download. Please crop an image first.";
    alert(message);
    return;
  }

  // Generate filename based on dimensions
  const baseFilename = selectedPreset ? `image-${selectedPreset}` : `image-${canvas.width}x${canvas.height}`;

  // Set quality and mime type based on format
  let mimeType, quality, filename;

  if (format === "png") {
    mimeType = "image/png";
    quality = 1.0;
    filename = `${baseFilename}.png`;
  } else {
    mimeType = "image/jpeg";
    quality = 0.85;
    filename = `${baseFilename}.jpg`;

    // For JPEG, we need to add white background since JPEG doesn't support transparency
    const jpegCanvas = document.createElement("canvas");
    const jpegCtx = jpegCanvas.getContext("2d");
    jpegCanvas.width = canvas.width;
    jpegCanvas.height = canvas.height;

    // Fill with white background
    jpegCtx.fillStyle = "#FFFFFF";
    jpegCtx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);

    // Draw the original image on top
    jpegCtx.drawImage(canvas, 0, 0);

    // Use the JPEG canvas for download
    jpegCanvas.toBlob(
      function (blob) {
        downloadBlob(blob, filename);
      },
      mimeType,
      quality,
    );
    return;
  }

  // Convert canvas to blob (for PNG, preserve transparency)
  canvas.toBlob(
    function (blob) {
      downloadBlob(blob, filename);
    },
    mimeType,
    quality,
  );
}

/**
 * Download blob as file
 * Creates a temporary download link and triggers the download
 * @param {Blob} blob - The image blob to download
 * @param {string} filename - The filename for the download
 */
function downloadBlob(blob, filename) {
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

function startOver() {
  // Show upload section and hide all other sections
  const uploadSection = document.getElementById("upload-section");
  const categorySection = document.getElementById("category-section");
  const presetSection = document.getElementById("preset-section");
  const freeCropSection = document.getElementById("free-crop-section");
  const cropperSection = document.getElementById("cropper-section");
  const previewSection = document.getElementById("preview-section");

  if (uploadSection) uploadSection.style.display = "block";
  if (categorySection) categorySection.style.display = "none";
  if (presetSection) presetSection.style.display = "none";
  if (freeCropSection) freeCropSection.style.display = "none";
  if (cropperSection) cropperSection.style.display = "none";
  if (previewSection) previewSection.style.display = "none";

  // Destroy cropper
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  // Reset file input
  const imageInput = document.getElementById("image-input");
  if (imageInput) imageInput.value = "";

  // Clear all state variables
  originalImageData = null;
  selectedPreset = null;
  activePresetButton = null;
  currentCategory = null;
  currentPresetWidth = null;
  currentPresetHeight = null;
  currentPresetName = null;

  // Clear free crop inputs
  const widthInput = document.getElementById("free-width");
  const heightInput = document.getElementById("free-height");
  if (widthInput) widthInput.value = "";
  if (heightInput) heightInput.value = "";

  // Remove active class from all buttons
  const allButtons = document.querySelectorAll(".preset-buttons .btn, .category-buttons .btn");
  allButtons.forEach((btn) => btn.classList.remove("active"));

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Format file size in human readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} Formatted file size string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
