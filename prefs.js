import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {GradientPreviewWidget} from './widgets/GradientPreviewWidget.js';
import * as GradientUtils from './utils/gradientUtils.js';

export default class ProceduralGradientPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        this._settings = settings;
        this._gradientStops = GradientUtils.loadGradientStops(settings);
        this._positionLabels = [];  // Store references to position labels

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
            title: 'Gradient Preview',
            description: 'Drag handles to adjust positions, double-click bar to add stops',
        });
        page.add(colorGroup);

        // Add the gradient preview widget
        this._gradientPreview = new GradientPreviewWidget(this._gradientStops, settings.get_int('angle'));
        
        // Connect signals from gradient preview
        this._gradientPreview.connect('stop-selected', (widget, index) => {
            // Save to settings when drag ends (not during drag!)
            GradientUtils.saveGradientStops(this._settings, this._gradientStops);
            // Rebuild list when selection changes (after drag ends)
            this._rebuildColorStopsList();
        });
        
        this._gradientPreview.connect('stop-position-changed', (widget, index, position) => {
            this._gradientStops[index].position = position;
            // DON'T save here - it causes hundreds of I/O operations during drag!
            // Saving is deferred until drag ends (stop-selected signal)
            
            // Update the position label during drag without rebuilding the list
            if (this._positionLabels[index]) {
                this._positionLabels[index].set_label(`${Math.round(position * 100)}%`);
            }
            // Don't rebuild during drag - it causes the "pushing" visual effect
            // List will rebuild when drag ends via stop-selected signal
        });
        
        this._gradientPreview.connect('stop-added', (widget, position) => {
            this._addColorStopAtPosition(position);
        });
        
        const previewBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
        });
        previewBox.append(this._gradientPreview);
        colorGroup.add(previewBox);

        // Color Stops List Group
        const colorListGroup = new Adw.PreferencesGroup({
            title: 'Color Stops',
            description: 'Fine-tune color stops',
        });
        page.add(colorListGroup);
        
        this._colorStopsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        colorListGroup.add(this._colorStopsListBox);

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
        colorListGroup.add(addStopButton);

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

    _rebuildColorStopsList() {
        // Clear existing rows
        let child = this._colorStopsListBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._colorStopsListBox.remove(child);
            child = next;
        }

        // Clear position labels array
        this._positionLabels = [];

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
            title: stop.color.toUpperCase(),
        });

        // Position label in the center
        const positionLabel = new Gtk.Label({
            label: `${Math.round(stop.position * 100)}%`,
            halign: Gtk.Align.START,
            hexpand: true,
            css_classes: ['dim-label'],
        });
        
        // Store reference to the label for later updates
        this._positionLabels[index] = positionLabel;
        
        row.add_suffix(positionLabel);

        // Color button
        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse(stop.color);
        colorButton.set_rgba(rgba);

        colorButton.connect('color-set', (widget) => {
            const color = widget.get_rgba();
            const hexColor = `#${Math.round(color.red * 255).toString(16).padStart(2, '0')}${Math.round(color.green * 255).toString(16).padStart(2, '0')}${Math.round(color.blue * 255).toString(16).padStart(2, '0')}`;
            this._gradientStops[index].color = hexColor;
            row.set_title(hexColor.toUpperCase());
            GradientUtils.saveGradientStops(this._settings, this._gradientStops);
            this._updateGradientPreview();
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
                GradientUtils.saveGradientStops(this._settings, this._gradientStops);
                this._rebuildColorStopsList();
                this._updateGradientPreview();
            });

            row.add_suffix(deleteButton);
        }

        return row;
    }

    _addColorStop() {
        const stopInfo = GradientUtils.findBestStopPosition(this._gradientStops);
        
        this._gradientStops.push({
            position: stopInfo.position,
            color: stopInfo.color
        });

        GradientUtils.saveGradientStops(this._settings, this._gradientStops);
        this._rebuildColorStopsList();
        this._updateGradientPreview();
    }

    _addColorStopAtPosition(position) {
        const { leftStop, rightStop } = GradientUtils.findSurroundingStops(this._gradientStops, position);
        const newColor = GradientUtils.interpolateColor(leftStop, rightStop, position);

        this._gradientStops.push({
            position: position,
            color: newColor
        });

        GradientUtils.saveGradientStops(this._settings, this._gradientStops);
        this._rebuildColorStopsList();
        this._updateGradientPreview();
    }

    _updateGradientPreview() {
        if (this._gradientPreview) {
            this._gradientPreview.updateGradient(this._gradientStops, this._settings.get_int('angle'));
        }
    }
}
