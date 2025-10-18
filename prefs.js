import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ProceduralGradientPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        this._settings = settings;
        this._gradientStops = this._loadGradientStops();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Gradient Type Group
        const gradientGroup = new Adw.PreferencesGroup({
            title: 'Gradient Type',
            description: 'Choose the type of procedural gradient',
        });
        page.add(gradientGroup);

        // Gradient type selector
        const gradientTypeRow = new Adw.ComboRow({
            title: 'Gradient Type',
            subtitle: 'Select gradient algorithm',
        });
        
        const gradientModel = new Gtk.StringList();
        gradientModel.append('Linear');
        gradientModel.append('Radial');
        gradientModel.append('Noise');
        
        gradientTypeRow.set_model(gradientModel);
        
        const types = ['linear', 'radial', 'noise'];
        gradientTypeRow.set_selected(types.indexOf(settings.get_string('gradient-type')));
        
        gradientTypeRow.connect('notify::selected', (widget) => {
            settings.set_string('gradient-type', types[widget.selected]);
        });
        
        gradientGroup.add(gradientTypeRow);

        // Color Stops Group
        const colorGroup = new Adw.PreferencesGroup({
            title: 'Gradient Color Stops',
            description: 'Add, remove, and adjust color stops',
        });
        page.add(colorGroup);
        
        this._colorStopsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        colorGroup.add(this._colorStopsListBox);

        // Populate initial color stops
        this._rebuildColorStopsList();

        // Add Color Stop Button
        const addStopButton = new Gtk.Button({
            label: 'Add Color Stop',
            icon_name: 'list-add-symbolic',
            css_classes: ['suggested-action'],
            margin_top: 12,
        });
        addStopButton.connect('clicked', () => {
            this._addColorStop();
        });
        colorGroup.add(addStopButton);

        // Parameters Group
        const paramsGroup = new Adw.PreferencesGroup({
            title: 'Parameters',
            description: 'Adjust gradient parameters',
        });
        page.add(paramsGroup);

        // Angle (for linear gradients only)
        const angleRow = new Adw.SpinRow({
            title: 'Angle',
            subtitle: 'Gradient direction (degrees)',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 360,
                step_increment: 1,
                page_increment: 10,
            }),
        });
        angleRow.set_value(settings.get_int('angle'));
        angleRow.connect('notify::value', (widget) => {
            settings.set_int('angle', widget.value);
        });
        
        // Show/hide angle based on gradient type
        const updateAngleVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            angleRow.set_visible(currentType === 'linear');
        };
        updateAngleVisibility();
        
        // Update visibility when gradient type changes
        gradientTypeRow.connect('notify::selected', () => {
            updateAngleVisibility();
        });
        
        paramsGroup.add(angleRow);

        //Noise seed (for noise gradients only)
        const seedRow = new Adw.SpinRow({
            title: 'Noise Seed',
            subtitle: 'Seed for noise generation',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 20,
                step_increment: 1,
            }),
        });
        seedRow.set_value(settings.get_int('noise-seed'));
        seedRow.connect('notify::value', (widget) => {
            settings.set_int('noise-seed', widget.value);
        });
        
        // Show/hide seed based on gradient type
        const updateSeedVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            seedRow.set_visible(currentType === 'noise');
        };
        updateSeedVisibility();
        
        // Update visibility when gradient type changes
        gradientTypeRow.connect('notify::selected', () => {
            updateSeedVisibility();
        });
        
        paramsGroup.add(seedRow);

        // Noise octaves (for noise gradients only)
        const noiseOctavesRow = new Adw.SpinRow({
            title: 'Octaves',
            subtitle: 'Detail level for noise',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 8,
                step_increment: 1,
            }),
        });
        noiseOctavesRow.set_value(settings.get_int('noise-octaves'));
        noiseOctavesRow.connect('notify::value', (widget) => {
            settings.set_int('noise-octaves', widget.value);
        });
        
        // Show/hide noise octaves based on gradient type
        const updateNoiseVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            noiseOctavesRow.set_visible(currentType === 'noise');
        };
        updateNoiseVisibility();
        
        // Update visibility when gradient type changes
        gradientTypeRow.connect('notify::selected', () => {
            updateNoiseVisibility();
        });
        
        paramsGroup.add(noiseOctavesRow);

        // Scale (for all gradients)
        const scaleRow = new Adw.SpinRow({
            title: 'Scale',
            subtitle: 'Scale factor for all gradients',
            adjustment: new Gtk.Adjustment({
                lower: 1.0,
                upper: 5.0,
                step_increment: 0.2,
                page_increment: 1.0,
            }),
            digits: 1,
        });
        scaleRow.set_value(settings.get_double('scale'));
        scaleRow.connect('notify::value', (widget) => {
            settings.set_double('scale', widget.value);
        });
        paramsGroup.add(scaleRow);
    }

    _loadGradientStops() {
        try {
            const stopsJson = this._settings.get_string('gradient-stops');
            if (stopsJson && stopsJson !== '[]') {
                return JSON.parse(stopsJson);
            }
        } catch (e) {
            console.error('Failed to load gradient stops:', e);
        }
        
        // Default: create from old color1, color2, color3 settings
        return [
            { position: 0.0, color: this._settings.get_string('color1') },
            { position: 0.5, color: this._settings.get_string('color2') },
            { position: 1.0, color: this._settings.get_string('color3') }
        ];
    }

    _saveGradientStops() {
        const stopsJson = JSON.stringify(this._gradientStops);
        this._settings.set_string('gradient-stops', stopsJson);
    }

    _rebuildColorStopsList() {
        // Clear existing rows
        let child = this._colorStopsListBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._colorStopsListBox.remove(child);
            child = next;
        }

        // Sort stops by position
        this._gradientStops.sort((a, b) => a.position - b.position);

        // Add rows for each stop
        this._gradientStops.forEach((stop, index) => {
            const row = this._createColorStopRow(stop, index);
            this._colorStopsListBox.append(row);
        });
    }

    _createColorStopRow(stop, index) {
        const row = new Adw.ActionRow({
            title: `Color Stop ${index + 1}`,
        });

        // Position slider
        const positionBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_end: 8,
        });

        const positionLabel = new Gtk.Label({
            label: `${Math.round(stop.position * 100)}%`,
            width_chars: 4,
        });

        const positionScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
                value: stop.position * 100,
            }),
            draw_value: false,
            width_request: 250,
        });

        positionScale.connect('value-changed', (widget) => {
            const newPosition = widget.get_value() / 100;
            this._gradientStops[index].position = newPosition;
            positionLabel.set_label(`${Math.round(newPosition * 100)}%`);
            this._saveGradientStops();
        });

        positionBox.append(positionScale);
        positionBox.append(positionLabel);
        row.add_suffix(positionBox);

        // Color button
        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse(stop.color);
        colorButton.set_rgba(rgba);

        colorButton.connect('color-set', (widget) => {
            const color = widget.get_rgba();
            const hexColor = `#${Math.round(color.red * 255).toString(16).padStart(2, '0')}${Math.round(color.green * 255).toString(16).padStart(2, '0')}${Math.round(color.blue * 255).toString(16).padStart(2, '0')}`;
            this._gradientStops[index].color = hexColor;
            this._saveGradientStops();
        });

        row.add_suffix(colorButton);

        // Delete button
        if (this._gradientStops.length > 2) {
            const deleteButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['destructive-action'],
            });

            deleteButton.connect('clicked', () => {
                this._gradientStops.splice(index, 1);
                this._saveGradientStops();
                this._rebuildColorStopsList();
            });

            row.add_suffix(deleteButton);
        }

        return row;
    }

    _addColorStop() {
        // Find a gap to add the new stop
        let newPosition = 0.5;
        let newColor = '#FF6B6B';
        
        if (this._gradientStops.length > 0) {
            // Add in the middle of the largest gap
            let largestGap = 0;
            let gapPosition = 0.5;
            let leftIndex = -1;
            let rightIndex = -1;
            
            for (let i = 0; i < this._gradientStops.length - 1; i++) {
                const gap = this._gradientStops[i + 1].position - this._gradientStops[i].position;
                if (gap > largestGap) {
                    largestGap = gap;
                    gapPosition = (this._gradientStops[i].position + this._gradientStops[i + 1].position) / 2;
                    leftIndex = i;
                    rightIndex = i + 1;
                }
            }
            newPosition = gapPosition;
            
            // Interpolate color between the two stops
            if (leftIndex >= 0 && rightIndex >= 0) {
                const leftColor = this._gradientStops[leftIndex].color;
                const rightColor = this._gradientStops[rightIndex].color;
                const leftPos = this._gradientStops[leftIndex].position;
                const rightPos = this._gradientStops[rightIndex].position;
                
                // Calculate interpolation factor (0 to 1)
                const t = (newPosition - leftPos) / (rightPos - leftPos);
                
                // Parse hex colors
                const parseHex = (hex) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return {r, g, b};
                };
                
                const left = parseHex(leftColor);
                const right = parseHex(rightColor);
                
                // Interpolate RGB values
                const r = Math.round(left.r + (right.r - left.r) * t);
                const g = Math.round(left.g + (right.g - left.g) * t);
                const b = Math.round(left.b + (right.b - left.b) * t);
                
                // Convert back to hex
                newColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
        }

        this._gradientStops.push({
            position: newPosition,
            color: newColor
        });

        this._saveGradientStops();
        this._rebuildColorStopsList();
    }
}
