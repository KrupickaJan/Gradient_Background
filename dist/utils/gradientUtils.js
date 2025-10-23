/**
 * Parse hex color to RGB object
 */
export function parseHexColor(hexColor) {
    const hex = (hexColor || '').replace('#', '');
    if (hex.length !== 6) {
        return { r: 0, g: 0, b: 0 }; // Default to black
    }
    return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0,
    };
}
/**
 * Convert RGB object to hex color string
 */
export function rgbToHex(rgb) {
    const r = Math.max(0, Math.min(255, Math.round(rgb.r || 0))).toString(16).padStart(2, '0');
    const g = Math.max(0, Math.min(255, Math.round(rgb.g || 0))).toString(16).padStart(2, '0');
    const b = Math.max(0, Math.min(255, Math.round(rgb.b || 0))).toString(16).padStart(2, '0');
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
    if (!leftStop || !rightStop || position < 0 || position > 1) {
        return '#000000'; // Default to black
    }
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
    return rgbToHex({ r, g, b });
}
/**
 * Load gradient stops from settings
 */
export function loadGradientStops(settings) {
    if (!settings) {
        return getDefaultGradientStops();
    }
    try {
        const stopsJson = settings.get_string('gradient-stops');
        if (stopsJson && stopsJson !== '[]') {
            const parsed = JSON.parse(stopsJson);
            if (Array.isArray(parsed) && parsed.length >= 2) {
                return parsed;
            }
        }
    }
    catch (e) {
        logError(e, 'Failed to parse gradient stops from settings');
    }
    // Default: create from old color1, color2, color3 settings
    try {
        return [
            { position: 0.0, color: settings.get_string('color1') },
            { position: 0.5, color: settings.get_string('color2') },
            { position: 1.0, color: settings.get_string('color3') }
        ];
    }
    catch (e) {
        logError(e, 'Failed to load default gradient stops');
        return getDefaultGradientStops();
    }
}
function getDefaultGradientStops() {
    return [
        { position: 0.0, color: '#FF6B6B' },
        { position: 0.5, color: '#4ECDC4' },
        { position: 1.0, color: '#45B7D1' }
    ];
}
/**
 * Save gradient stops to settings
 */
export function saveGradientStops(settings, gradientStops) {
    if (!settings || !Array.isArray(gradientStops) || gradientStops.length < 2) {
        return;
    }
    try {
        const stopsJson = JSON.stringify(gradientStops);
        settings.set_string('gradient-stops', stopsJson);
    }
    catch (e) {
        logError(e, 'Failed to save gradient stops');
    }
}
/**
 * Find the best position to add a new gradient stop
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
        color = interpolateColor(gradientStops[leftIndex], gradientStops[rightIndex], gapPosition);
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
        }
        else {
            // After last stop - use last stop's color
            leftStop = sortedStops[sortedStops.length - 1];
            rightStop = sortedStops[sortedStops.length - 1];
        }
    }
    return { leftStop: leftStop, rightStop: rightStop };
}
