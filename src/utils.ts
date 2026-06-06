/**
 * Utility functions for GoalSpire Branding System
 */

/**
 * Converts a Google Drive sharing link into a direct, embeddable image URL.
 * Supports file viewer links and query parameter ID links.
 * Returns the converted URL, or the original if it is not a Google Drive link.
 */
export const getDirectImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  if (trimmed.includes('drive.google.com')) {
    // Format 1: file viewer links
    // e.g. https://drive.google.com/file/d/1SdPwUCz54MiIVMvrs41UHUtpVsCJvXmn/view?usp=drive_link
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileDMatch[1]}`;
    }

    // Format 2: open links or viewer links with query parameters
    // e.g. https://drive.google.com/open?id=1SdPwUCz54MiIVMvrs41UHUtpVsCJvXmn
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }
  return trimmed;
};
