import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as SVGGenerators from './generators/svgGenerators.js';
export default class ProceduralGradientExtension extends Extension {
    _settings;
    _settingsChangedId;
    _cacheDir;
    _indicator;
    _updateTimeout;
    constructor(metadata) {
        super(metadata);
        // Only initialize static data - no GObject instances
        this._settings = null;
        this._settingsChangedId = null;
        this._cacheDir = null;
        this._indicator = null;
        this._updateTimeout = null;
    }
    enable() {
        // @ts-ignore - getSettings is provided by Extension base class
        this._settings = this.getSettings();
        // Create cache directory
        this._cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'procedural-gradient']);
        const dir = Gio.File.new_for_path(this._cacheDir);
        try {
            dir.make_directory_with_parents(null);
        }
        catch (e) {
            // Cache directory already exists, continue
        }
        // Create panel indicator
        this._createIndicator();
        // Connect to settings changes with debouncing
        if (this._settings) {
            this._settingsChangedId = this._settings.connect('changed', () => {
                this._scheduleUpdate();
            });
        }
        // Initial wallpaper update
        this._updateWallpaper();
    }
    disable() {
        if (this._updateTimeout) {
            GLib.Source.remove(this._updateTimeout);
            this._updateTimeout = null;
        }
        if (this._settingsChangedId && this._settings) {
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
  
  <rect x="20" y="20" width="160" height="160" rx="24" fill="#7c7a77ff"/>
  <!-- 3x3 grid with diagonal gradient and spacing -->
  <!-- Row 1: Blue to cyan shades -->
  <rect x="35" y="35" width="40" height="40" rx="9" fill="#101b20"/>
  <rect x="80" y="35" width="40" height="40" rx="9" fill="#1f1b1f"/>
  <rect x="125" y="35" width="40" height="40" rx="9" fill="#2e1b1e"/>
  
  <!-- Row 2: Transitional shades -->
  <rect x="35" y="80" width="40" height="40" rx="9" fill="#1f1b1f"/>
  <rect x="80" y="80" width="40" height="40" rx="9" fill="#2e1b1e"/>
  <rect x="125" y="80" width="40" height="40" rx="9" fill="#3d1b1d"/>
  
  <!-- Row 3: Purple to red shades -->
  <rect x="35" y="125" width="40" height="40" rx="9" fill="#2e1b1e"/>
  <rect x="80" y="125" width="40" height="40" rx="9" fill="#3d1b1d"/>
  <rect x="125" y="125" width="40" height="40" rx="9" fill="#4c1b1b"/>
</svg>`;
        // @ts-ignore - TextEncoder is available in GJS
        const svgBytes = new GLib.Bytes(new TextEncoder().encode(svgIcon));
        const gicon = Gio.BytesIcon.new(svgBytes);
        const icon = new St.Icon({
            gicon: gicon,
            style_class: 'system-status-icon',
            icon_size: 24,
        });
        this._indicator.add_child(icon);
        // Connect click event to open preferences directly
        this._indicator.connect('button-press-event', () => {
            // @ts-ignore - openPreferences is provided by Extension base class
            this.openPreferences();
            return Clutter.EVENT_STOP;
        });
        // Add to panel
        Main.panel.addToStatusArea('procedural-gradient-indicator', this._indicator);
    }
    _scheduleUpdate() {
        // Cancel any pending update
        if (this._updateTimeout) {
            GLib.Source.remove(this._updateTimeout);
            this._updateTimeout = null;
        }
        // Schedule update after 300ms of no changes
        this._updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._updateWallpaper();
            this._updateTimeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }
    _updateWallpaper() {
        if (!this._settings || !this._cacheDir) {
            return;
        }
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
                }
                catch (e) {
                    logError(e, 'Failed to parse gradient stops, using defaults');
                    gradientStops = [
                        { color: '#FF6B6B', position: 0 },
                        { color: '#4ECDC4', position: 0.5 },
                        { color: '#45B7D1', position: 1.0 }
                    ];
                }
            }
            else {
                // Use simple 2-3 color mode
                const color1 = this._settings.get_string('color1');
                const color2 = this._settings.get_string('color2');
                const color3 = this._settings.get_string('color3');
                const useThreeColors = this._settings.get_boolean('use-three-colors');
                gradientStops = useThreeColors
                    ? [{ color: color1, position: 0 }, { color: color2, position: 0.5 }, { color: color3, position: 1.0 }]
                    : [{ color: color1, position: 0 }, { color: color2, position: 1.0 }];
            }
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
            // Set wallpaper using gsettings
            const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
            settings.set_string('picture-uri', `file://${wallpaperPath}`);
            settings.set_string('picture-uri-dark', `file://${wallpaperPath}`);
            settings.set_string('picture-options', 'zoom');
        }
        catch (e) {
            logError(e, 'Failed to update wallpaper');
        }
    }
}
