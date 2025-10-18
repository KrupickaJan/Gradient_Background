/**
 * Color interpolation and gradient utility functions
 */

/**
 * Parse hex color to RGB object
 * @param {string} hexColor - Hex color string (e.g., "#FF6B6B")
 * @returns {{r: number, g: number, b: number}} RGB values from 0-255
 */
export function parseHexColor(hexColor) {
    const hex = hexColor.replace('#', '');
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    };
}

/**
 * Convert RGB object to hex color string
 * @param {{r: number, g: number, b: number}} rgb - RGB values from 0-255
 * @returns {string} Hex color string (e.g., "#ff6b6b")
 */
export function rgbToHex(rgb) {
    const r = Math.round(rgb.r).toString(16).padStart(2, '0');
    const g = Math.round(rgb.g).toString(16).padStart(2, '0');
    const b = Math.round(rgb.b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Interpolate color between two gradient stops
 * @param {{position: number, color: string}} leftStop - Left gradient stop
 * @param {{position: number, color: string}} rightStop - Right gradient stop
 * @param {number} position - Position to interpolate at (0-1)
 * @returns {string} Interpolated hex color
 */
export function interpolateColor(leftStop, rightStop, position) {
    const left = parseHexColor(leftStop.color);
    const right = parseHexColor(rightStop.color);
    
    // Calculate interpolation factor (0 to 1)
    const positionDiff = rightStop.position - leftStop.position;
    let t = 0;
    
    // Only interpolate if stops are at different positions
    if (Math.abs(positionDiff) > 0.0001) {
        t = (position - leftStop.position) / positionDiff;
        t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
    }
    
    // Interpolate RGB values
    const r = Math.round(left.r + (right.r - left.r) * t);
    const g = Math.round(left.g + (right.g - left.g) * t);
    const b = Math.round(left.b + (right.b - left.b) * t);
    
    return rgbToHex({r, g, b});
}

/**
 * Load gradient stops from settings
 * @param {Gio.Settings} settings - Settings object
 * @returns {Array<{position: number, color: string}>} Array of gradient stops
 */
export function loadGradientStops(settings) {
    try {
        const stopsJson = settings.get_string('gradient-stops');
        if (stopsJson && stopsJson !== '[]') {
            return JSON.parse(stopsJson);
        }
    } catch (e) {
        console.error('Failed to load gradient stops:', e);
    }
    
    // Default: create from old color1, color2, color3 settings
    return [
        { position: 0.0, color: settings.get_string('color1') },
        { position: 0.5, color: settings.get_string('color2') },
        { position: 1.0, color: settings.get_string('color3') }
    ];
}

/**
 * Save gradient stops to settings
 * @param {Gio.Settings} settings - Settings object
 * @param {Array<{position: number, color: string}>} gradientStops - Array of gradient stops
 */
export function saveGradientStops(settings, gradientStops) {
    const stopsJson = JSON.stringify(gradientStops);
    settings.set_string('gradient-stops', stopsJson);
}

/**
 * Find the best position to add a new gradient stop
 * @param {Array<{position: number, color: string}>} gradientStops - Array of gradient stops
 * @returns {{position: number, color: string, leftIndex: number, rightIndex: number}} New stop info
 */
export function findBestStopPosition(gradientStops) {
    if (gradientStops.length === 0) {
        return {
            position: 0.5,
            color: '#FF6B6B',
            leftIndex: -1,
            rightIndex: -1
        };
    }

    // Find the largest gap between stops
    let largestGap = 0;
    let gapPosition = 0.5;
    let leftIndex = -1;
    let rightIndex = -1;
    
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
        const gap = sortedStops[i + 1].position - sortedStops[i].position;
        if (gap > largestGap) {
            largestGap = gap;
            gapPosition = (sortedStops[i].position + sortedStops[i + 1].position) / 2;
            leftIndex = gradientStops.indexOf(sortedStops[i]);
            rightIndex = gradientStops.indexOf(sortedStops[i + 1]);
        }
    }
    
    let color = '#FF6B6B';
    if (leftIndex >= 0 && rightIndex >= 0) {
        color = interpolateColor(
            gradientStops[leftIndex],
            gradientStops[rightIndex],
            gapPosition
        );
    }
    
    return {
        position: gapPosition,
        color: color,
        leftIndex: leftIndex,
        rightIndex: rightIndex
    };
}

/**
 * Find surrounding stops for a given position
 * @param {Array<{position: number, color: string}>} gradientStops - Array of gradient stops
 * @param {number} position - Position to find surrounding stops for (0-1)
 * @returns {{leftStop: object, rightStop: object}} Surrounding stops
 */
export function findSurroundingStops(gradientStops, position) {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    
    let leftStop = null;
    let rightStop = null;
    
    // Find the two surrounding stops
    for (let i = 0; i < sortedStops.length - 1; i++) {
        if (sortedStops[i].position <= position && sortedStops[i + 1].position >= position) {
            leftStop = sortedStops[i];
            rightStop = sortedStops[i + 1];
            break;
        }
    }
    
    // Handle edge cases
    if (!leftStop && !rightStop) {
        if (position < sortedStops[0].position) {
            // Before first stop - use first stop's color
            leftStop = sortedStops[0];
            rightStop = sortedStops[0];
        } else {
            // After last stop - use last stop's color
            leftStop = sortedStops[sortedStops.length - 1];
            rightStop = sortedStops[sortedStops.length - 1];
        }
    }
    
    return { leftStop, rightStop };
}
