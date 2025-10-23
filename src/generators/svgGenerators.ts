import {GradientStop} from '../utils/gradientUtils';
/**
 * SVG gradient generators for wallpaper creation
 */

/**
 * Generate linear gradient SVG
 */
export function generateLinearSVG(gradientStops: GradientStop[], angle: number, scale: number): string {
    if (!gradientStops || gradientStops.length < 2) {
        return getFallbackSVG();
    }
    
    const safeScale = Math.max(0.1, Math.min(10, scale || 1));
    const rad = (angle * Math.PI) / 180;
    
    // Calculate gradient direction based on angle and scale
    const centerX = 1920;
    const centerY = 1080;
    const distanceX = 1920 * safeScale;
    const distanceY = 1080 * safeScale;
    const x1 = centerX - distanceX * Math.cos(rad);
    const y1 = centerY - distanceY * Math.sin(rad);
    const x2 = centerX + distanceX * Math.cos(rad);
    const y2 = centerY + distanceY * Math.sin(rad);

    // Generate stops from array
    const stops = gradientStops
        .map(stop => `      <stop offset="${(stop.position * 100).toFixed(1)}%" stop-color="${stop.color}"/>`)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
${stops}
    </linearGradient>
  </defs>
  <rect width="3840" height="2160" fill="url(#grad)"/>
</svg>`;
}

/**
 * Generate radial gradient SVG
 */
export function generateRadialSVG(gradientStops: GradientStop[], scale: number) {
    if (!gradientStops || gradientStops.length < 2) {
        return getFallbackSVG();
    }
    
    const safeScale = Math.max(0.1, Math.min(10, scale || 1));
    
    // Use userSpaceOnUse to avoid stretching
    const centerX = 1920; // Half of 3840
    const centerY = 1080; // Half of 2160
    const radius = 1080 * safeScale; // Base radius on height to ensure it fits

    // Generate stops from array
    const stops = gradientStops
        .map(stop => `      <stop offset="${(stop.position * 100).toFixed(1)}%" stop-color="${stop.color}"/>`)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad" cx="${centerX}" cy="${centerY}" r="${radius}" gradientUnits="userSpaceOnUse">
${stops}
    </radialGradient>
  </defs>
  <rect width="3840" height="2160" fill="url(#grad)"/>
</svg>`;
}

/**
 * Generate noise gradient SVG
 */
export function generateNoiseSVG(gradientStops: GradientStop[], octaves: number, globalScale: number, seedBase: number) {
    if (!gradientStops || gradientStops.length < 2) {
        return getFallbackSVG();
    }
    
    const safeOctaves = Math.max(1, Math.min(8, octaves || 1));
    const safeScale = Math.max(0.1, Math.min(10, globalScale || 1));

    // Use octaves to control number of gradients and globalScale to control size
    const baseRadius = 1080 * 0.4 * safeScale; // Base on height in pixels
    const gradientCount = Math.min(safeOctaves + 2, 8);

    let gradientDefs = '';
    let gradientRects = '';

    // Create base fill with last stop color
    const baseColor = gradientStops[gradientStops.length - 1].color;
    gradientRects += `  <rect width="3840" height="2160" fill="${baseColor}"/>\n`;

    // Generate gradient definitions and rects based on octaves with randomized positions
    for (let i = 0; i < gradientCount; i++) {
        const seed = i * seedBase;
        const rand1 = Math.sin(seed) * 43758.5453;
        const rand2 = Math.sin(seed + 78.233) * 43758.5453;

        // Use actual pixel coordinates
        const cx = (rand1 - Math.floor(rand1)) * 3840;
        const cy = (rand2 - Math.floor(rand2)) * 2160;
        const r = baseRadius + ((rand1 - Math.floor(rand1)) * 1080 * 0.3 * safeScale);

        const color = gradientStops[i % gradientStops.length].color;
        const opacity = 0.4 + ((rand2 - Math.floor(rand2)) * 0.5);

        gradientDefs += `    <radialGradient id="g${i}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">\n`;
        gradientDefs += `      <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>\n`;
        gradientDefs += `      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>\n`;
        gradientDefs += `    </radialGradient>\n`;

        gradientRects += `  <rect width="3840" height="2160" fill="url(#g${i})"/>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg">
  <defs>
${gradientDefs}  </defs>
${gradientRects}</svg>`;
}

function getFallbackSVG(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="3840" y2="2160" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF6B6B"/>
      <stop offset="100%" stop-color="#4ECDC4"/>
    </linearGradient>
  </defs>
  <rect width="3840" height="2160" fill="url(#grad)"/>
</svg>`;
}
