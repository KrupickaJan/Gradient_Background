import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ProceduralGradientExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._settings = null;
    this._cacheDir = null;
    this._indicator = null;
    this._updateTimeout = null;
  }

  enable() {
    console.log('[ProcGrad] Enabling extension');
    this._settings = this.getSettings();

    // Create cache directory
    this._cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'procedural-gradient']);
    const dir = Gio.File.new_for_path(this._cacheDir);

    try {
      dir.make_directory_with_parents(null);
    } catch (e) {
      console.log('[ProcGrad] Cache dir already exists');
    }

    // Create panel indicator
    this._createIndicator();

    // Connect to settings changes with debouncing
    this._settingsChangedId = this._settings.connect('changed', () => {
      // Cancel any pending update
      if (this._updateTimeout) {
        GLib.Source.remove(this._updateTimeout);
        this._updateTimeout = null;
      }

      // Schedule update after 300ms of no changes
      this._updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
        console.log('[ProcGrad] Settings changed, updating wallpaper');
        this._updateWallpaper();
        this._updateTimeout = null;
        return GLib.SOURCE_REMOVE;
      });
    });

    // Initial wallpaper update
    console.log('[ProcGrad] Setting initial wallpaper');
    this._updateWallpaper();

    console.log('[ProcGrad] Extension enabled successfully');
  }

  disable() {
    console.log('[ProcGrad] Disabling extension');

    if (this._updateTimeout) {
      GLib.Source.remove(this._updateTimeout);
      this._updateTimeout = null;
    }

    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    this._settings = null;
  }

  _createIndicator() {
    this._indicator = new PanelMenu.Button(0.0, 'Procedural Gradient', false);

    // Create icon
    let icon = new St.Icon({
      icon_name: 'media-playback-stop-symbolic',
      style_class: 'system-status-icon',
    });
    this._indicator.add_child(icon);

    // Connect click event to open preferences directly
    this._indicator.connect('button-press-event', () => {
      this.openPreferences();
      return Clutter.EVENT_STOP;
    });

    // Add to panel
    Main.panel.addToStatusArea('procedural-gradient-indicator', this._indicator);
  }

  _updateWallpaper() {
    try {
      const gradientType = this._settings.get_string('gradient-type');
      const angle = this._settings.get_int('angle');
      const noiseOctaves = this._settings.get_int('noise-octaves');
      const scale = this._settings.get_double('scale');
      const useAdvancedMode = this._settings.get_boolean('use-advanced-mode');
      const seed = this._settings.get_int('noise-seed');

      let gradientStops;
      if (useAdvancedMode) {
        // Parse gradient stops from JSON
        try {
          const stopsJson = this._settings.get_string('gradient-stops');
          gradientStops = JSON.parse(stopsJson);
          // Sort stops by position for correct SVG rendering
          gradientStops.sort((a, b) => a.position - b.position);
        } catch (e) {
          console.error('[ProcGrad] Failed to parse gradient stops, using defaults: ' + e.message);
          gradientStops = [
            { color: '#FF6B6B', position: 0 },
            { color: '#4ECDC4', position: 50 },
            { color: '#45B7D1', position: 100 }
          ];
        }
      } else {
        // Use simple 2-3 color mode
        const color1 = this._settings.get_string('color1');
        const color2 = this._settings.get_string('color2');
        const color3 = this._settings.get_string('color3');
        const useThreeColors = this._settings.get_boolean('use-three-colors');

        gradientStops = useThreeColors
          ? [{ color: color1, position: 0 }, { color: color2, position: 50 }, { color: color3, position: 100 }]
          : [{ color: color1, position: 0 }, { color: color2, position: 100 }];
      }

      console.log('[ProcGrad] Creating wallpaper: ' + gradientType + ' with ' + gradientStops.length + ' stops and scale ' + scale);

      let svgGradient;
      switch (gradientType) {
        case 'linear':
          svgGradient = this._generateLinearSVG(gradientStops, angle, scale);
          break;
        case 'radial':
          svgGradient = this._generateRadialSVG(gradientStops, scale);
          break;
        case 'noise':
          svgGradient = this._generateNoiseSVG(gradientStops, noiseOctaves, scale, seed);
          break;
        default:
          svgGradient = this._generateLinearSVG(gradientStops, angle, scale);
      }

      const wallpaperPath = GLib.build_filenamev([this._cacheDir, 'wallpaper.svg']);
      const file = Gio.File.new_for_path(wallpaperPath);

      const stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
      stream.write_all(svgGradient, null);
      stream.close(null);

      console.log('[ProcGrad] Wallpaper saved to: ' + wallpaperPath);

      // Set wallpaper using gsettings
      const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
      settings.set_string('picture-uri', 'file://' + wallpaperPath);
      settings.set_string('picture-uri-dark', 'file://' + wallpaperPath);
      settings.set_string('picture-options', 'zoom');

      console.log('[ProcGrad] Wallpaper set successfully');
    } catch (e) {
      console.error('[ProcGrad] Error: ' + e.message);
      console.error('[ProcGrad] Stack: ' + e.stack);
    }
  }

  _generateLinearSVG(gradientStops, angle, scale) {
    const rad = (angle * Math.PI) / 180;
    // Calculate gradient direction based on angle and scale
    // angle 0 = right, 90 = down, 180 = left, 270 = up
    const centerX = 1920;
    const centerY = 1080;
    const distanceX = 1920 * scale;
    const distanceY = 1080 * scale;
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

  _generateRadialSVG(gradientStops, scale) {
    // Use userSpaceOnUse to avoid stretching
    const centerX = 1920; // Half of 3840
    const centerY = 1080; // Half of 2160
    const radius = 1080 * scale; // Base radius on height to ensure it fits


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

  _generateNoiseSVG(gradientStops, octaves, globalScale, seedBase) {
    // Use octaves to control number of gradients and globalScale to control size
    const baseRadius = 1080 * 0.4 * globalScale; // Base on height in pixels
    const gradientCount = Math.min(octaves + 2, 8);

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
      const r = baseRadius + ((rand1 - Math.floor(rand1)) * 1080 * 0.3 * globalScale);

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

}
