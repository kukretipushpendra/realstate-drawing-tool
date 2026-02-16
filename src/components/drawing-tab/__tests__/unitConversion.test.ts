import { pixelsToFeet, feetToPixels, PIXELS_PER_FOOT } from '../unitConversion';

describe('Unit Conversion Utilities', () => {
  describe('Constants', () => {
    it('should define PIXELS_PER_FOOT as 5', () => {
      expect(PIXELS_PER_FOOT).toBe(5);
    });
  });

  describe('feetToPixels', () => {
    it('should convert feet to pixels using PIXELS_PER_FOOT', () => {
      expect(feetToPixels(1)).toBe(5);
      expect(feetToPixels(2)).toBe(10);
      expect(feetToPixels(5)).toBe(25);
    });

    it('should handle zero correctly', () => {
      expect(feetToPixels(0)).toBe(0);
    });

    it('should handle fractional feet', () => {
      expect(feetToPixels(0.5)).toBe(2.5);
      expect(feetToPixels(0.25)).toBe(1.25);
      expect(feetToPixels(1.5)).toBe(7.5);
    });

    it('should handle large values', () => {
      expect(feetToPixels(100)).toBe(500);
      expect(feetToPixels(1000)).toBe(5000);
    });

    it('should handle negative values', () => {
      expect(feetToPixels(-1)).toBe(-5);
      expect(feetToPixels(-10.5)).toBe(-52.5);
    });
  });

  describe('pixelsToFeet', () => {
    it('should convert pixels to feet using PIXELS_PER_FOOT', () => {
      expect(pixelsToFeet(5)).toBe(1);
      expect(pixelsToFeet(10)).toBe(2);
      expect(pixelsToFeet(25)).toBe(5);
    });

    it('should handle zero correctly', () => {
      expect(pixelsToFeet(0)).toBe(0);
    });

    it('should handle fractional pixels', () => {
      expect(pixelsToFeet(2.5)).toBe(0.5);
      expect(pixelsToFeet(1.25)).toBe(0.25);
      expect(pixelsToFeet(7.5)).toBeCloseTo(1.5, 5);
    });

    it('should handle odd pixel values', () => {
      expect(pixelsToFeet(1)).toBe(0.2);
      expect(pixelsToFeet(3)).toBe(0.6);
      expect(pixelsToFeet(7)).toBeCloseTo(1.4, 5);
    });

    it('should handle large values', () => {
      expect(pixelsToFeet(500)).toBe(100);
      expect(pixelsToFeet(5000)).toBe(1000);
    });

    it('should handle negative values', () => {
      expect(pixelsToFeet(-5)).toBe(-1);
      expect(pixelsToFeet(-52.5)).toBe(-10.5);
    });
  });

  describe('Round-trip Conversion', () => {
    it('should preserve values in feet->pixels->feet conversions', () => {
      const originalFeet = 10.5;
      const roundTrip = pixelsToFeet(feetToPixels(originalFeet));
      expect(roundTrip).toBeCloseTo(originalFeet, 5);
    });

    it('should preserve integer pixel values in pixels->feet->pixels', () => {
      const originalPixels = 50;
      const roundTrip = feetToPixels(pixelsToFeet(originalPixels));
      expect(roundTrip).toBe(originalPixels);
    });

    it('should preserve round foot values through conversion', () => {
      [0.25, 0.5, 1, 2, 5, 10, 20].forEach((feet) => {
        const roundTrip = pixelsToFeet(feetToPixels(feet));
        expect(roundTrip).toBeCloseTo(feet, 5);
      });
    });

    it('should handle snap increments correctly', () => {
      // Standard snap increments in feet: 0.25, 0.5, 1, 2, 5
      const snapIncrements = [0.25, 0.5, 1, 2, 5];
      snapIncrements.forEach((feet) => {
        const pixels = feetToPixels(feet);
        const backToFeet = pixelsToFeet(pixels);
        expect(backToFeet).toBeCloseTo(feet, 5);
      });
    });

    it('should accurately convert for typical drawing operations', () => {
      // Move object by 1 foot
      const moveDeltaFeet = 1;
      const moveDeltaPixels = feetToPixels(moveDeltaFeet);
      expect(moveDeltaPixels).toBe(5);

      // Resize object by 2 feet
      const resizeFeet = 2;
      const resizePixels = feetToPixels(resizeFeet);
      expect(resizePixels).toBe(10);

      // Report back to user in feet
      const reportedFeet = pixelsToFeet(resizePixels);
      expect(reportedFeet).toBe(resizeFeet);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small values', () => {
      expect(feetToPixels(0.01)).toBeCloseTo(0.05, 5);
      expect(pixelsToFeet(0.05)).toBeCloseTo(0.01, 5);
    });

    it('should handle infinity gracefully', () => {
      expect(feetToPixels(Infinity)).toBe(Infinity);
      expect(pixelsToFeet(Infinity)).toBe(Infinity);
    });

    it('should handle NaN gracefully', () => {
      expect(isNaN(feetToPixels(NaN))).toBe(true);
      expect(isNaN(pixelsToFeet(NaN))).toBe(true);
    });

    it('should maintain precision for financial/construction measurements', () => {
      // 1/16 of a foot (typical measurement precision)
      const oneEighthInch = 1 / (12 * 8);
      const pixels = feetToPixels(oneEighthInch);
      const backToFeet = pixelsToFeet(pixels);
      expect(backToFeet).toBeCloseTo(oneEighthInch, 8);
    });
  });

  describe('Integration with Grid System', () => {
    it('should align grid snap increments to pixel boundaries', () => {
      // Common snap increments should convert cleanly
      const snapFeet = 0.5;
      const snapPixels = feetToPixels(snapFeet);
      const backToFeet = pixelsToFeet(snapPixels);
      expect(backToFeet).toBe(snapFeet);
    });

    it('should support typical property panel display format', () => {
      const coordinates = { xFt: 12.75, yFt: 8.5, xPx: 63.75, yPx: 42.5 };
      expect(feetToPixels(coordinates.xFt)).toBe(coordinates.xPx);
      expect(feetToPixels(coordinates.yFt)).toBe(coordinates.yPx);
      expect(pixelsToFeet(coordinates.xPx)).toBeCloseTo(coordinates.xFt, 5);
      expect(pixelsToFeet(coordinates.yPx)).toBeCloseTo(coordinates.yFt, 5);
    });
  });
});
