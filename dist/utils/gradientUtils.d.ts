import Gio from 'gi://Gio';
/**
 * Color interpolation and gradient utility functions
 */
export type GradientStop = {
    position: number;
    color: string;
    leftIndex?: number;
    rightIndex?: number;
};
export type RGB = {
    r: number;
    g: number;
    b: number;
};
/**
 * Parse hex color to RGB object
 */
export declare function parseHexColor(hexColor: string): RGB;
/**
 * Convert RGB object to hex color string
 */
export declare function rgbToHex(rgb: RGB): string;
/**
 * Interpolate color between two gradient stops
 * @param {{position: number, color: string}} leftStop - Left gradient stop
 * @param {{position: number, color: string}} rightStop - Right gradient stop
 * @param {number} position - Position to interpolate at (0-1)
 * @returns {string} Interpolated hex color
 */
export declare function interpolateColor(leftStop: GradientStop, rightStop: GradientStop, position: number): string;
/**
 * Load gradient stops from settings
 */
export declare function loadGradientStops(settings: Gio.Settings): GradientStop[];
/**
 * Save gradient stops to settings
 */
export declare function saveGradientStops(settings: Gio.Settings, gradientStops: GradientStop[]): void;
/**
 * Find the best position to add a new gradient stop
*/
export declare function findBestStopPosition(gradientStops: GradientStop[]): GradientStop;
/**
 * Find surrounding stops for a given position
 */
export declare function findSurroundingStops(gradientStops: GradientStop[], position: number): {
    leftStop: GradientStop;
    rightStop: GradientStop;
};
//# sourceMappingURL=gradientUtils.d.ts.map