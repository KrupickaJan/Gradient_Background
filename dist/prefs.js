import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { GradientPreviewWidget } from './widgets/GradientPreviewWidget.js';
import * as GradientUtils from './utils/gradientUtils.js';
export default class extends ExtensionPreferences {
    #settings;
    #gradientStops;
    #positionLabels;
    #colorStopsListBox;
    #gradientPreview;
    async fillPreferencesWindow(window) {
        const settings = this.getSettings();
        this.#settings = settings;
        this.#gradientStops = GradientUtils.loadGradientStops(settings);
        this.#positionLabels = [];
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
        this.#gradientPreview = new GradientPreviewWidget(this.#gradientStops, settings.get_int('angle'));
        // Connect signals from gradient preview
        this.#gradientPreview.connect('stop-selected', (_widget, _index) => {
            GradientUtils.saveGradientStops(this.#settings, this.#gradientStops);
            this.#rebuildColorStopsList();
        });
        this.#gradientPreview.connect('stop-position-changed', (_widget, index, position) => {
            this.#gradientStops[index].position = position;
            if (this.#positionLabels[index]) {
                this.#positionLabels[index].set_label(`${Math.round(position * 100)}%`);
            }
        });
        this.#gradientPreview.connect('stop-added', (_widget, position) => {
            this.#addColorStopAtPosition(position);
        });
        const previewBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
        });
        previewBox.append(this.#gradientPreview);
        colorGroup.add(previewBox);
        // Color Stops List Group
        const colorListGroup = new Adw.PreferencesGroup({
            title: 'Color Stops',
            description: 'Fine-tune color stops',
        });
        page.add(colorListGroup);
        this.#colorStopsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        colorListGroup.add(this.#colorStopsListBox);
        this.#rebuildColorStopsList();
        // Add Color Stop Button
        const addStopButton = new Gtk.Button({
            label: 'Add Color Stop',
            icon_name: 'list-add-symbolic',
            css_classes: ['suggested-action'],
            margin_top: 12,
        });
        addStopButton.connect('clicked', () => {
            this.#addColorStop();
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
        const updateAngleVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            angleRow.set_visible(currentType === 'linear');
        };
        updateAngleVisibility();
        gradientTypeRow.connect('notify::selected', () => {
            updateAngleVisibility();
        });
        paramsGroup.add(angleRow);
        // Noise seed (for noise gradients only)
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
        const updateSeedVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            seedRow.set_visible(currentType === 'noise');
        };
        updateSeedVisibility();
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
        const updateNoiseVisibility = () => {
            const currentType = settings.get_string('gradient-type');
            noiseOctavesRow.set_visible(currentType === 'noise');
        };
        updateNoiseVisibility();
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
    #rebuildColorStopsList() {
        if (!this.#colorStopsListBox)
            return;
        // Clear existing rows
        let child = this.#colorStopsListBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this.#colorStopsListBox.remove(child);
            child = next;
        }
        this.#positionLabels = [];
        // Sort stops by position
        this.#gradientStops.sort((a, b) => a.position - b.position);
        // Add rows for each stop
        this.#gradientStops.forEach((stop, index) => {
            const row = this.#createColorStopRow(stop, index);
            this.#colorStopsListBox.append(row);
        });
    }
    #createColorStopRow(stop, index) {
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
        this.#positionLabels[index] = positionLabel;
        row.add_suffix(positionLabel);
        // Color button
        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse(stop.color);
        colorButton.set_rgba(rgba);
        colorButton.connect('color-set', (widget) => {
            const color = widget.get_rgba();
            const hexColor = `#${Math.round(color.red * 255).toString(16).padStart(2, '0')}${Math.round(color.green * 255).toString(16).padStart(2, '0')}${Math.round(color.blue * 255).toString(16).padStart(2, '0')}`;
            this.#gradientStops[index].color = hexColor;
            row.set_title(hexColor.toUpperCase());
            GradientUtils.saveGradientStops(this.#settings, this.#gradientStops);
            this.#updateGradientPreview();
        });
        row.add_suffix(colorButton);
        // Delete button
        if (this.#gradientStops.length > 2) {
            const deleteButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['destructive-action'],
            });
            deleteButton.connect('clicked', () => {
                this.#gradientStops.splice(index, 1);
                GradientUtils.saveGradientStops(this.#settings, this.#gradientStops);
                this.#rebuildColorStopsList();
                this.#updateGradientPreview();
            });
            row.add_suffix(deleteButton);
        }
        return row;
    }
    #addColorStop() {
        const stopInfo = GradientUtils.findBestStopPosition(this.#gradientStops);
        this.#gradientStops.push({
            position: stopInfo.position,
            color: stopInfo.color
        });
        GradientUtils.saveGradientStops(this.#settings, this.#gradientStops);
        this.#rebuildColorStopsList();
        this.#updateGradientPreview();
    }
    #addColorStopAtPosition(position) {
        const { leftStop, rightStop } = GradientUtils.findSurroundingStops(this.#gradientStops, position);
        const newColor = GradientUtils.interpolateColor(leftStop, rightStop, position);
        this.#gradientStops.push({
            position: position,
            color: newColor
        });
        GradientUtils.saveGradientStops(this.#settings, this.#gradientStops);
        this.#rebuildColorStopsList();
        this.#updateGradientPreview();
    }
    #updateGradientPreview() {
        if (this.#gradientPreview && this.#settings) {
            this.#gradientPreview.updateGradient(this.#gradientStops, this.#settings.get_int('angle'));
        }
    }
}
