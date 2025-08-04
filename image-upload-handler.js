/**
 * 📸 IMAGE UPLOAD HANDLER
 * Maneja la carga y procesamiento de imágenes/screenshots para el AI Chat
 */

class ImageUploadHandler {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5; // Máximo 5 imágenes por mensaje
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.compressionQuality = 0.8; // Calidad de compresión
        this.maxDimensions = { width: 1920, height: 1080 }; // Dimensiones máximas
        
        console.log('📸 Image Upload Handler inicializado');
    }

    // ✅ VALIDAR ARCHIVO
    validateFile(file) {
        const errors = [];
        
        // Verificar tipo de archivo
        if (!this.allowedTypes.includes(file.type)) {
            errors.push(`Tipo de archivo no permitido: ${file.type}`);
        }
        
        // Verificar tamaño
        if (file.size > this.maxFileSize) {
            errors.push(`Archivo muy grande: ${this.formatFileSize(file.size)} (máx: ${this.formatFileSize(this.maxFileSize)})`);
        }
        
        // Verificar nombre de archivo
        if (!file.name || file.name.length > 100) {
            errors.push('Nombre de archivo inválido');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // 🔄 PROCESAR ARCHIVO
    async processFile(file) {
        try {
            // Validar archivo
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            // Leer archivo como imagen
            const image = await this.loadImage(file);
            
            // Redimensionar si es necesario
            const processedImage = await this.resizeImage(image, file.type);
            
            // Convertir a base64
            const base64Data = processedImage.canvas ? 
                processedImage.canvas.toDataURL(file.type, this.compressionQuality) :
                await this.fileToBase64(file);
            
            return {
                success: true,
                data: {
                    base64: base64Data,
                    filename: file.name,
                    originalSize: file.size,
                    processedSize: this.estimateBase64Size(base64Data),
                    dimensions: processedImage.dimensions || { width: 0, height: 0 },
                    type: file.type
                }
            };
            
        } catch (error) {
            console.error('❌ Error procesando archivo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🖼️ CARGAR IMAGEN
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Error cargando imagen'));
            };
            
            img.src = url;
        });
    }

    // 📐 REDIMENSIONAR IMAGEN
    async resizeImage(img, mimeType) {
        const { width, height } = img;
        const { width: maxWidth, height: maxHeight } = this.maxDimensions;
        
        // Verificar si necesita redimensionamiento
        if (width <= maxWidth && height <= maxHeight) {
            return {
                canvas: null,
                dimensions: { width, height },
                resized: false
            };
        }
        
        // Calcular nuevas dimensiones manteniendo proporción
        let newWidth, newHeight;
        const aspectRatio = width / height;
        
        if (width > height) {
            newWidth = Math.min(width, maxWidth);
            newHeight = newWidth / aspectRatio;
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * aspectRatio;
            }
        } else {
            newHeight = Math.min(height, maxHeight);
            newWidth = newHeight * aspectRatio;
            
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth / aspectRatio;
            }
        }
        
        // Crear canvas y redimensionar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        // Configurar calidad de renderizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        return {
            canvas: canvas,
            dimensions: { width: canvas.width, height: canvas.height },
            resized: true,
            originalDimensions: { width, height }
        };
    }

    // 📋 ARCHIVO A BASE64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Error leyendo archivo'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // 📦 PROCESAR MÚLTIPLES ARCHIVOS
    async processMultipleFiles(files) {
        const results = [];
        const fileArray = Array.from(files).slice(0, this.maxFiles);
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            console.log(`📦 Procesando archivo ${i + 1}/${fileArray.length}: ${file.name}`);
            
            const result = await this.processFile(file);
            results.push({
                ...result,
                index: i,
                filename: file.name
            });
        }
        
        return results;
    }

    // 🎨 CREAR PREVIEW
    createImagePreview(imageData, container) {
        const previewHTML = `
            <div class="image-preview" data-filename="${imageData.filename}">
                <div class="preview-image">
                    <img src="${imageData.base64}" alt="${imageData.filename}" 
                         title="${imageData.filename} (${this.formatFileSize(imageData.processedSize)})">
                </div>
                <div class="preview-info">
                    <div class="preview-filename">${this.truncateFilename(imageData.filename, 20)}</div>
                    <div class="preview-details">
                        ${imageData.dimensions.width}×${imageData.dimensions.height} • 
                        ${this.formatFileSize(imageData.processedSize)}
                    </div>
                </div>
                <button class="preview-remove" onclick="this.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', previewHTML);
    }

    // 🗜️ COMPRIMIR IMAGEN ADICIONAL
    async compressImage(base64Data, quality = 0.7) {
        try {
            return new Promise((resolve) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                
                img.src = base64Data;
            });
        } catch (error) {
            console.error('❌ Error comprimiendo imagen:', error);
            return base64Data; // Retornar original si falla
        }
    }

    // 📸 CAPTURAR SCREENSHOT (si está disponible)
    async captureScreenshot() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screen capture no soportado en este navegador');
            }
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen'
                }
            });
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            return new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    ctx.drawImage(video, 0, 0);
                    
                    // Detener el stream
                    stream.getTracks().forEach(track => track.stop());
                    
                    const base64Data = canvas.toDataURL('image/png');
                    resolve({
                        success: true,
                        data: {
                            base64: base64Data,
                            filename: `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
                            dimensions: { width: canvas.width, height: canvas.height },
                            type: 'image/png',
                            processedSize: this.estimateBase64Size(base64Data)
                        }
                    });
                };
            });
            
        } catch (error) {
            console.error('❌ Error capturando screenshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🔍 EXTRAER METADATOS DE IMAGEN
    extractImageMetadata(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        dimensions: {
                            width: img.width,
                            height: img.height
                        },
                        aspectRatio: (img.width / img.height).toFixed(2),
                        lastModified: new Date(file.lastModified)
                    });
                };
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }

    // 🛠️ UTILIDADES
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    estimateBase64Size(base64String) {
        // Aproximar tamaño del base64 (sin el prefijo data:image/...)
        const base64Data = base64String.split(',')[1] || base64String;
        return Math.round((base64Data.length * 3) / 4);
    }

    truncateFilename(filename, maxLength) {
        if (filename.length <= maxLength) return filename;
        
        const extension = filename.split('.').pop();
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
        
        return `${truncatedName}...${extension}`;
    }

    // 🎛️ CONFIGURACIÓN
    setMaxFileSize(sizeInMB) {
        this.maxFileSize = sizeInMB * 1024 * 1024;
        console.log(`📏 Tamaño máximo de archivo configurado: ${sizeInMB}MB`);
    }

    setMaxFiles(count) {
        this.maxFiles = Math.max(1, Math.min(10, count));
        console.log(`📦 Máximo de archivos configurado: ${this.maxFiles}`);
    }

    setCompressionQuality(quality) {
        this.compressionQuality = Math.max(0.1, Math.min(1.0, quality));
        console.log(`🗜️ Calidad de compresión configurada: ${this.compressionQuality}`);
    }

    setMaxDimensions(width, height) {
        this.maxDimensions = {
            width: Math.max(100, Math.min(4000, width)),
            height: Math.max(100, Math.min(4000, height))
        };
        console.log(`📐 Dimensiones máximas configuradas: ${this.maxDimensions.width}×${this.maxDimensions.height}`);
    }

    // 🧹 LIMPIAR RECURSOS
    cleanup() {
        // Limpiar cualquier URL de objeto que pueda estar en uso
        console.log('🧹 Limpiando recursos del Image Upload Handler');
    }
}

// 🌍 DISPONIBILIDAD GLOBAL
window.ImageUploadHandler = ImageUploadHandler;
console.log('✅ Image Upload Handler cargado correctamente');
