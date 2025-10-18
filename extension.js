import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as SVGGenerators from './generators/svgGenerators.js';

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

    // Create custom SVG icon
    const svgIcon = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">  
  
  <!-- 3x3 grid with diagonal gradient and spacing -->
  <!-- Row 1: Blue to cyan shades -->
  <rect x="35" y="35" width="40" height="40" rx="9" fill="#272727ff"/>
  <rect x="80" y="35" width="40" height="40" rx="9" fill="#494949ff"/>
  <rect x="125" y="35" width="40" height="40" rx="9" fill="#bebebeff"/>
  
  <!-- Row 2: Transitional shades -->
  <rect x="35" y="80" width="40" height="40" rx="9" fill="#494949ff"/>
  <rect x="80" y="80" width="40" height="40" rx="9" fill="#ecececff"/>
  <rect x="125" y="80" width="40" height="40" rx="9" fill="#494949ff"/>
  
  <!-- Row 3: Purple to red shades -->
  <rect x="35" y="125" width="40" height="40" rx="9" fill="#bebebeff"/>
  <rect x="80" y="125" width="40" height="40" rx="9" fill="#494949ff"/>
  <rect x="125" y="125" width="40" height="40" rx="9" fill="#272727ff"/>
</svg>`;

    const bytes = new GLib.Bytes(svgIcon);
    const gicon = Gio.BytesIcon.new(bytes);

    let icon = new St.Icon({
      gicon: gicon,
      style_class: 'system-status-icon',
      icon_size: 24,
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
          svgGradient = SVGGenerators.generateLinearSVG(gradientStops, angle, scale);
          break;
        case 'radial':
          svgGradient = SVGGenerators.generateRadialSVG(gradientStops, scale);
          break;
        case 'noise':
          svgGradient = SVGGenerators.generateNoiseSVG(gradientStops, noiseOctaves, scale, seed);
          break;
        default:
          svgGradient = SVGGenerators.generateLinearSVG(gradientStops, angle, scale);
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
}
