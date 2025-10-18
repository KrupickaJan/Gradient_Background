import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Custom Gradient Preview Widget with draggable handles
const GradientPreviewWidget = GObject.registerClass({
    GTypeName: 'GradientPreviewWidget',
    Signals: {
        'stop-selected': {param_types: [GObject.TYPE_INT]},
        'stop-position-changed': {param_types: [GObject.TYPE_INT, GObject.TYPE_DOUBLE]},
        'stop-added': {param_types: [GObject.TYPE_DOUBLE]},
    },
}, class GradientPreviewWidget extends Gtk.DrawingArea {
    _init(gradientStops, angle = 90) {
        super._init({
            content_height: 80,
            content_width: 400,
            hexpand: true,
            vexpand: false,
        });

        this._gradientStops = gradientStops;
        this._angle = angle;
        this._selectedStop = -1;
        this._draggedStop = -1;
        this._hoverStop = -1;
        this._dragStartX = undefined;
        this._dragStartPosition = undefined;

        print('[GradientPreview] Initializing with', this._gradientStops.length, 'stops');
        
        this.set_draw_func(this._draw.bind(this));

        // Add gesture controllers for interaction
        const clickGesture = new Gtk.GestureClick();
        clickGesture.connect('pressed', this._onPressed.bind(this));
        clickGesture.connect('released', this._onReleased.bind(this));
        this.add_controller(clickGesture);

        const dragGesture = new Gtk.GestureDrag();
        dragGesture.connect('drag-begin', this._onDragBegin.bind(this));
        dragGesture.connect('drag-update', this._onDragUpdate.bind(this));
        dragGesture.connect('drag-end', this._onDragEnd.bind(this));
        this.add_controller(dragGesture);

        const motionController = new Gtk.EventControllerMotion();
        motionController.connect('motion', this._onMotion.bind(this));
        motionController.connect('leave', this._onLeave.bind(this));
        this.add_controller(motionController);
        
        print('[GradientPreview] Widget initialized');
    }

    updateGradient(stops, angle) {
        this._gradientStops = stops;
        this._angle = angle;
        this.queue_draw();
    }

    setSelectedStop(index) {
        this._selectedStop = index;
        this.queue_draw();
    }

    _draw(area, cr, width, height) {
        print('[GradientPreview] Drawing, width:', width, 'height:', height, 'stops:', this._gradientStops.length);
        
        const barHeight = 40;
        const barY = 20;
        const handleRadius = 8;

        // Sort stops by position for rendering
        const sortedStops = [...this._gradientStops].sort((a, b) => a.position - b.position);

        // Bar geometry
        const barX = 10;
        const barW = Math.max(0, width - 20);
        const radius = Math.min(barHeight / 2, 12);

        // Create rounded-rect clip (pill shape) and draw gradient inside it
        cr.save();
        // Rounded rect path
        cr.newPath();
        cr.arc(barX + barW - radius, barY + radius, radius, -Math.PI / 2, 0);
        cr.arc(barX + barW - radius, barY + barHeight - radius, radius, 0, Math.PI / 2);
        cr.arc(barX + radius, barY + barHeight - radius, radius, Math.PI / 2, Math.PI);
        cr.arc(barX + radius, barY + radius, radius, Math.PI, 3 * Math.PI / 2);
        cr.closePath();
        cr.clip();

        // Draw gradient bar using multiple rectangles (simple approach)
        const steps = 200; // More steps for smoother gradient
        for (let i = 0; i <= steps; i++) {
            const pos = i / steps;
            const x = barX + barW * pos;
            const w = Math.ceil(barW / steps) + 1; // Ceiling to prevent gaps

            let color;

            // Handle edge case: if position is before or at first stop
            if (pos <= sortedStops[0].position) {
                color = this._parseColor(sortedStops[0].color);
            }
            // Handle edge case: if position is after or at last stop
            else if (pos >= sortedStops[sortedStops.length - 1].position) {
                color = this._parseColor(sortedStops[sortedStops.length - 1].color);
            }
            // Normal case: find surrounding stops and interpolate
            else {
                let leftStop = sortedStops[0];
                let rightStop = sortedStops[sortedStops.length - 1];

                for (let j = 0; j < sortedStops.length - 1; j++) {
                    if (sortedStops[j].position <= pos && sortedStops[j + 1].position >= pos) {
                        leftStop = sortedStops[j];
                        rightStop = sortedStops[j + 1];
                        break;
                    }
                }

                // Interpolate color
                let t = 0;
                const positionDiff = rightStop.position - leftStop.position;
                if (Math.abs(positionDiff) > 0.0001) { // Stops are at different positions
                    t = (pos - leftStop.position) / positionDiff;
                    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
                }

                const leftColor = this._parseColor(leftStop.color);
                const rightColor = this._parseColor(rightStop.color);

                const r = leftColor.r + (rightColor.r - leftColor.r) * t;
                const g = leftColor.g + (rightColor.g - leftColor.g) * t;
                const b = leftColor.b + (rightColor.b - leftColor.b) * t;

                color = {r, g, b};
            }

            cr.setSourceRGB(color.r, color.g, color.b);
            cr.rectangle(x, barY, w, barHeight);
            cr.fill();
        }

        cr.restore();

        // Draw rounded border around gradient bar
        cr.setSourceRGB(0, 0, 0);
        cr.setLineWidth(0.1);
        cr.newPath();
        cr.arc(barX + barW - radius, barY + radius, radius, -Math.PI / 2, 0);
        cr.arc(barX + barW - radius, barY + barHeight - radius, radius, 0, Math.PI / 2);
        cr.arc(barX + radius, barY + barHeight - radius, radius, Math.PI / 2, Math.PI);
        cr.arc(barX + radius, barY + radius, radius, Math.PI, 3 * Math.PI / 2);
        cr.closePath();
        cr.stroke();

        // Draw handles for each color stop
        this._gradientStops.forEach((stop, index) => {
            const x = barX + barW * stop.position;
            const y = barY + barHeight / 2;

            // Determine handle color based on state
            const isSelected = index === this._selectedStop;
            const isHovered = index === this._hoverStop;
            const isDragged = index === this._draggedStop;

            // Draw handle shadow/glow for hover
            if (isHovered || isDragged) {
                cr.setSourceRGBA(0, 0, 0, 0.3);
                cr.arc(x, y, handleRadius + 4, 0, 2 * Math.PI);
                cr.fill();
            }

            // Draw the handle
            const color = this._parseColor(stop.color);
            cr.setSourceRGB(color.r, color.g, color.b);
            cr.arc(x, y, handleRadius, 0, 2 * Math.PI);
            cr.fill();

            // Draw handle border
            if (isSelected) {
                cr.setSourceRGB(0.2, 0.6, 1.0); // Blue for selected
                cr.setLineWidth(3);
            } else {
                cr.setSourceRGB(0, 0, 0);
                cr.setLineWidth(2);
            }
            cr.arc(x, y, handleRadius, 0, 2 * Math.PI);
            cr.stroke();

            // Draw inner white ring
            cr.setSourceRGB(1, 1, 1);
            cr.setLineWidth(1.5);
            cr.arc(x, y, handleRadius - 2, 0, 2 * Math.PI);
            cr.stroke();

            // Draw position indicator below handle
            cr.setSourceRGB(0.3, 0.3, 0.3);
            cr.selectFontFace('Sans', 0, 0); // CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_NORMAL
            cr.setFontSize(10);
            const text = `${Math.round(stop.position * 100)}%`;
            const extents = cr.textExtents(text);
            cr.moveTo(x - extents.width / 2, barY + barHeight + 15);
            cr.showText(text);
        });
        
        print('[GradientPreview] Drawing complete');
    }

    _parseColor(hexColor) {
        const hex = hexColor.replace('#', '');
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
        };
    }

    _getStopAtPosition(x, y) {
        const width = this.get_allocated_width();
        const barY = 20;
        const barHeight = 40;
        const handleRadius = 8;

        for (let i = 0; i < this._gradientStops.length; i++) {
            const stop = this._gradientStops[i];
            const stopX = 10 + (width - 20) * stop.position;
            const stopY = barY + barHeight / 2;

            const distance = Math.sqrt(Math.pow(x - stopX, 2) + Math.pow(y - stopY, 2));
            if (distance <= handleRadius + 2) {
                return i;
            }
        }
        return -1;
    }

    _onPressed(gesture, nPress, x, y) {
        const stopIndex = this._getStopAtPosition(x, y);
        
        if (stopIndex >= 0) {
            this._selectedStop = stopIndex;
            this.emit('stop-selected', stopIndex);
            this.queue_draw();
        } else {
            // Double-click on empty area to add new stop
            if (nPress === 2) {
                const width = this.get_width();
                const barY = 20;
                const barHeight = 40;
                
                if (y >= barY && y <= barY + barHeight && x >= 10 && x <= width - 10) {
                    const position = (x - 10) / (width - 20);
                    this.emit('stop-added', Math.max(0, Math.min(1, position)));
                }
            }
        }
    }

    _onReleased(gesture, nPress, x, y) {
        this._draggedStop = -1;
        this.queue_draw();
    }

    _onDragBegin(gesture, startX, startY) {
        const stopIndex = this._getStopAtPosition(startX, startY);
        if (stopIndex >= 0) {
            this._draggedStop = stopIndex;
            this._selectedStop = stopIndex;
            this._dragStartX = startX;
            this._dragStartPosition = this._gradientStops[stopIndex].position;
            this.emit('stop-selected', stopIndex);
            print('[GradientPreview] Drag begin at', startX, 'for stop', stopIndex, 'at position', this._dragStartPosition);
        }
    }

    _onDragUpdate(gesture, offsetX, offsetY) {
        if (this._draggedStop >= 0 && this._dragStartPosition !== undefined) {
            const width = this.get_allocated_width();
            const barWidth = width - 20;
            
            // Calculate position based on offset from start
            const pixelOffset = offsetX;
            const positionOffset = pixelOffset / barWidth;
            let newPosition = this._dragStartPosition + positionOffset;
            newPosition = Math.max(0, Math.min(1, newPosition));
            
            this._gradientStops[this._draggedStop].position = newPosition;
            this.emit('stop-position-changed', this._draggedStop, newPosition);
            // Only redraw the preview, don't rebuild the list during drag
            this.queue_draw();
        }
    }

    _onDragEnd(gesture, offsetX, offsetY) {
        const draggedIndex = this._draggedStop;
        this._draggedStop = -1;
        this._dragStartX = undefined;
        this._dragStartPosition = undefined;
        
        // Emit stop-selected to trigger list rebuild after drag
        if (draggedIndex >= 0) {
            this.emit('stop-selected', draggedIndex);
        }
        
        this.queue_draw();
    }

    _onMotion(controller, x, y) {
        const stopIndex = this._getStopAtPosition(x, y);
        if (stopIndex !== this._hoverStop) {
            this._hoverStop = stopIndex;
            this.queue_draw();
            
            // Change cursor when hovering over handle
            if (stopIndex >= 0) {
                this.set_cursor(Gdk.Cursor.new_from_name('grab', null));
            } else {
                this.set_cursor(null);
            }
        }
    }

    _onLeave(controller) {
        if (this._hoverStop !== -1) {
            this._hoverStop = -1;
            this.queue_draw();
        }
        this.set_cursor(null);
    }
});

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
            title: 'Gradient Preview',
            description: 'Drag handles to adjust positions, double-click bar to add stops',
        });
        page.add(colorGroup);

        // Add the gradient preview widget
        this._gradientPreview = new GradientPreviewWidget(this._gradientStops, settings.get_int('angle'));
        
        // Connect signals from gradient preview
        this._gradientPreview.connect('stop-selected', (widget, index) => {
            // Rebuild list when selection changes (after drag ends)
            this._rebuildColorStopsList();
        });
        
        this._gradientPreview.connect('stop-position-changed', (widget, index, position) => {
            this._gradientStops[index].position = position;
            this._saveGradientStops();
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
            this._updateGradientPreview();
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
                this._saveGradientStops();
                this._rebuildColorStopsList();
                this._updateGradientPreview();
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
                newColor = this._interpolateColor(
                    this._gradientStops[leftIndex],
                    this._gradientStops[rightIndex],
                    newPosition
                );
            }
        }

        this._gradientStops.push({
            position: newPosition,
            color: newColor
        });

        this._saveGradientStops();
        this._rebuildColorStopsList();
        this._updateGradientPreview();
    }

    _addColorStopAtPosition(position) {
        // Find surrounding stops for color interpolation
        const sortedStops = [...this._gradientStops].sort((a, b) => a.position - b.position);
        
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
            // Position is outside all stops
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

        const newColor = this._interpolateColor(leftStop, rightStop, position);

        this._gradientStops.push({
            position: position,
            color: newColor
        });

        this._saveGradientStops();
        this._rebuildColorStopsList();
        this._updateGradientPreview();
    }

    _interpolateColor(leftStop, rightStop, position) {
        const parseHex = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return {r, g, b};
        };
        
        const left = parseHex(leftStop.color);
        const right = parseHex(rightStop.color);
        
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
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    _updateGradientPreview() {
        if (this._gradientPreview) {
            this._gradientPreview.updateGradient(this._gradientStops, this._settings.get_int('angle'));
        }
    }
}
