/**
 * File Utilities
 * 
 * Helpers for handling file attachments (image uploads)
 * 
 * @module lib/file-utils
 */

import { ATTACHMENT_LIMITS, type AttachmentMediaType } from '../types';

/**
 * Converts a File to a base64 data URL string
 */
export function convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Validates a file against attachment constraints
 * Returns an error message if invalid, null if valid
 */
export function validateAttachment(file: File): string | null {
    // Check file type
    if (!ATTACHMENT_LIMITS.ALLOWED_TYPES.includes(file.type as AttachmentMediaType)) {
        return `Unsupported file type: ${file.type}. Allowed: PNG, JPEG, WEBP.`;
    }

    // Check file size
    if (file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return `File too large: ${sizeMB}MB. Maximum: 5MB.`;
    }

    return null;
}

/**
 * Extracts the pure base64 string from a data URL
 * e.g., "data:image/png;base64,iVBORw0KGg..." -> "iVBORw0KGg..."
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
    const base64Index = dataUrl.indexOf(',');
    return base64Index !== -1 ? dataUrl.substring(base64Index + 1) : dataUrl;
}

/**
 * Generates a unique ID for attachments
 */
export function generateAttachmentId(): string {
    return `attach_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
