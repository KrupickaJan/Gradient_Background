import { GradientStop } from '../utils/gradientUtils';
/**
 * SVG gradient generators for wallpaper creation
 */
/**
 * Generate linear gradient SVG
 */
export declare function generateLinearSVG(gradientStops: GradientStop[], angle: number, scale: number): string;
/**
 * Generate radial gradient SVG
 */
export declare function generateRadialSVG(gradientStops: GradientStop[], scale: number): string;
/**
 * Generate noise gradient SVG
 */
export declare function generateNoiseSVG(gradientStops: GradientStop[], octaves: number, globalScale: number, seedBase: number): string;
//# sourceMappingURL=svgGenerators.d.ts.map