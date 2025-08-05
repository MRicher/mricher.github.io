const BISOLUX_APP_VERSION = "1.1.0";
const BISOLUX_VERSION_STRING = `Version ${BISOLUX_APP_VERSION}`;

// Image Cropper JavaScript - Page-specific functionality only
let cropper = null;
let originalImageData = null;
let selectedPreset = null;
let activePresetButton = null;

// Update version info dynamically
document.addEventListener('DOMContentLoaded', () => {
    const versionElement = document.getElementById('version-info');
    if (versionElement) {
        versionElement.textContent = BISOLUX_VERSION_STRING;
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeImageCropper();
});

function initializeImageCropper() {
    const uploadArea = document.getElementById('upload-area');
    const imageInput = document.getElementById('image-input');
    
    if (!uploadArea || !imageInput) return;
    
    // File input change handler
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => imageInput.click());
    
    // Handle button click within upload area
    const selectButton = uploadArea.querySelector('button');
    if (selectButton) {
        selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            imageInput.click();
        });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadImage(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            loadImage(file);
        }
    }
}

function loadImage(file) {
    // Validate file type
    if (!file.type.match(/^image\/(png|jpe?g)$/i)) {
        alert('Please select a PNG or JPG image.');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const imageData = event.target.result;
        originalImageData = imageData;
        
        // Show cropper section
        const cropperSection = document.getElementById('cropper-section');
        const previewSection = document.getElementById('preview-section');
        
        if (cropperSection) {
            cropperSection.style.display = 'block';
            cropperSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        if (previewSection) {
            previewSection.style.display = 'none';
        }
        
        // Initialize cropper
        initializeCropper(imageData);
    };
    reader.readAsDataURL(file);
}

function initializeCropper(imageSrc) {
    const cropperImage = document.getElementById('cropper-image');
    if (!cropperImage) return;
    
    // Destroy existing cropper if it exists
    if (cropper) {
        cropper.destroy();
    }
    
    // Set image source
    cropperImage.src = imageSrc;
    
    // Initialize cropper
    cropper = new Cropper(cropperImage, {
        aspectRatio: NaN,
        viewMode: 1,
        dragMode: 'move',
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
        ready: function() {
            // Set default "None" preset as active
            const noneButton = document.getElementById('none-preset');
            if (noneButton) {
                setActivePresetButton(noneButton);
                selectedPreset = 'None';
            }
        }
    });
}

function setActivePresetButton(button) {
    // Remove active class from all preset buttons
    const allButtons = document.querySelectorAll('.preset-buttons .btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    if (button) {
        button.classList.add('active');
        activePresetButton = button;
    }
}

function setPresetSize(width, height, buttonElement) {
    if (!cropper) return;
    
    // Set active button
    setActivePresetButton(buttonElement);
    
    // Store the preset dimensions for later use
    cropper.presetWidth = width;
    cropper.presetHeight = height;
    
    // Determine preset name based on dimensions
    selectedPreset = getPresetName(width, height);
    
    // Set aspect ratio
    cropper.setAspectRatio(width / height);
    
    // Get container and current crop box data
    const containerData = cropper.getContainerData();
    const aspectRatio = width / height;
    
    // Calculate new dimensions that fit within the container
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
    
    // Set new crop box centered in container
    cropper.setCropBoxData({
        left: (containerData.width - newWidth) / 2,
        top: (containerData.height - newHeight) / 2,
        width: newWidth,
        height: newHeight
    });
}

function setNonePreset() {
    if (!cropper) return;
    
    // Set active button
    const noneButton = document.getElementById('none-preset');
    setActivePresetButton(noneButton);
    
    // Clear preset dimensions
    cropper.presetWidth = null;
    cropper.presetHeight = null;
    
    // Set preset name to None
    selectedPreset = 'None';
    
    // Remove aspect ratio constraint (free crop)
    cropper.setAspectRatio(NaN);
}

function getPresetName(width, height) {
    return `${width}x${height}`;
}

function flipHorizontal() {
    if (!cropper) return;
    
    const imageData = cropper.getImageData();
    const currentScaleX = imageData.scaleX || 1;
    cropper.scaleX(-currentScaleX);
}

function flipVertical() {
    if (!cropper) return;
    
    const imageData = cropper.getImageData();
    const currentScaleY = imageData.scaleY || 1;
    cropper.scaleY(-currentScaleY);
}

function resetCrop() {
    if (!cropper) return;
    
    // Clear stored preset dimensions and selected preset
    cropper.presetWidth = null;
    cropper.presetHeight = null;
    selectedPreset = null;
    
    // Remove active class from all buttons
    const allButtons = document.querySelectorAll('.preset-buttons .btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // Reset cropper and set None as active
    cropper.reset();
    
    // Wait for reset to complete, then set None as active
    setTimeout(() => {
        setNonePreset();
    }, 100);
}

function cropImage() {
    if (!cropper) return;
    
    // Always get the natural cropped canvas without forcing dimensions
    const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        maxWidth: 2000,
        maxHeight: 2000
    });
    
    if (!canvas) {
        alert('Failed to crop image. Please try again.');
        return;
    }
    
    // If "None" preset was used, update selectedPreset with actual crop dimensions
    if (selectedPreset === 'None') {
        selectedPreset = `${canvas.width}x${canvas.height}`;
    }
    
    // Show preview
    displayPreview(canvas);
    
    // Show preview section and scroll to it
    const previewSection = document.getElementById('preview-section');
    if (previewSection) {
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function displayPreview(canvas) {
    const previewImage = document.getElementById('preview-image');
    const dimensionsElement = document.getElementById('image-dimensions');
    
    if (!previewImage) return;
    
    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/png', 0.9);
    previewImage.src = dataURL;
    
    // Update dimensions info
    if (dimensionsElement) {
        const currentLang = document.documentElement.lang || 'en-CA';
        const dimensionsText = currentLang === 'fr-CA' ? 
            `Dimensions: ${canvas.width} × ${canvas.height} pixels` :
            `Dimensions: ${canvas.width} × ${canvas.height} pixels`;
        dimensionsElement.textContent = dimensionsText;
    }
    
    // Store canvas for download
    previewImage.canvas = canvas;
}

function downloadImage(format) {
    const previewImage = document.getElementById('preview-image');
    const canvas = previewImage?.canvas;
    
    if (!canvas) {
        alert('No image to download. Please crop an image first.');
        return;
    }
    
    // Generate filename based on dimensions
    const baseFilename = selectedPreset ? `image-${selectedPreset}` : `image-${canvas.width}x${canvas.height}`;
    
    // Set quality and mime type based on format
    let mimeType, quality, filename;
    
    if (format === 'png') {
        mimeType = 'image/png';
        quality = 1.0;
        filename = `${baseFilename}.png`;
    } else {
        mimeType = 'image/jpeg';
        quality = 0.85;
        filename = `${baseFilename}.jpg`;
        
        // For JPEG, we need to add white background since JPEG doesn't support transparency
        const jpegCanvas = document.createElement('canvas');
        const jpegCtx = jpegCanvas.getContext('2d');
        jpegCanvas.width = canvas.width;
        jpegCanvas.height = canvas.height;
        
        // Fill with white background
        jpegCtx.fillStyle = '#FFFFFF';
        jpegCtx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
        
        // Draw the original image on top
        jpegCtx.drawImage(canvas, 0, 0);
        
        // Use the JPEG canvas for download
        jpegCanvas.toBlob(function(blob) {
            downloadBlob(blob, filename);
        }, mimeType, quality);
        return;
    }
    
    // Convert canvas to blob (for PNG, preserve transparency)
    canvas.toBlob(function(blob) {
        downloadBlob(blob, filename);
    }, mimeType, quality);
}

function downloadBlob(blob, filename) {
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
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
    // Hide sections
    const cropperSection = document.getElementById('cropper-section');
    const previewSection = document.getElementById('preview-section');
    
    if (cropperSection) cropperSection.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    
    // Destroy cropper
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Reset file input
    const imageInput = document.getElementById('image-input');
    if (imageInput) imageInput.value = '';
    
    // Clear original image data and selected preset
    originalImageData = null;
    selectedPreset = null;
    activePresetButton = null;
    
    // Remove active class from all buttons
    const allButtons = document.querySelectorAll('.preset-buttons .btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Helper function to get file size in human readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
