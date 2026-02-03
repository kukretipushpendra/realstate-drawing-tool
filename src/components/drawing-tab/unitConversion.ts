/**
 * Unit conversion utilities for converting between pixels and feet
 * Conversion factor: 1 foot = 5 pixels (allows 22 columns and 8 rows visible)
 */

const PIXELS_PER_FOOT = 5;

/**
 * Convert pixels to feet
 * @param pixels - Distance in pixels
 * @returns Distance in feet
 */
export const pixelsToFeet = (pixels: number): number => {
  return pixels / PIXELS_PER_FOOT;
};

/**
 * Convert feet to pixels
 * @param feet - Distance in feet
 * @returns Distance in pixels
 */
export const feetToPixels = (feet: number): number => {
  return feet * PIXELS_PER_FOOT;
};

/**
 * Format feet value as a string showing only digits
 * @param feet - Distance in feet
 * @param decimalPlaces - Number of decimal places (default: 0)
 * @returns Formatted string with only digits
 */
export const formatFeet = (feet: number, decimalPlaces: number = 0): string => {
  const formatted = feet.toFixed(decimalPlaces);
  return formatted.replace(/[^\d.]/g, ''); // Remove any non-digit characters except decimal point
};

/**
 * Format feet value as a display string
 * @param feet - Distance in feet
 * @param decimalPlaces - Number of decimal places (default: 0)
 * @returns Formatted string for display (just the number)
 */
export const displayFeet = (feet: number, decimalPlaces: number = 0): string => {
  return feet.toFixed(decimalPlaces);
};

export { PIXELS_PER_FOOT };
