import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import { GradientStop, parseHexColor } from '../utils/gradientUtils.js';

// Custom Gradient Preview Widget with draggable handles
export const GradientPreviewWidget = GObject.registerClass({
    GTypeName: 'GradientPreviewWidget',
    Signals: {
        'stop-selected': { param_types: [GObject.TYPE_INT] },
        'stop-position-changed': { param_types: [GObject.TYPE_INT, GObject.TYPE_DOUBLE] },
        'stop-added': { param_types: [GObject.TYPE_DOUBLE] },
    },
}, class GradientPreviewWidget extends Gtk.DrawingArea {

    _gradientStops: GradientStop[];
    _angle: number;
    _selectedStop: number;
    _draggedStop: number;
    _hoverStop: number;
    _dragStartX?: number;
    _dragStartPosition?: number;


    constructor(gradientStops: GradientStop[], angle = 90) {
        super({
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

    updateGradient(stops: GradientStop[], angle: number) {
        this._gradientStops = stops;
        this._angle = angle;
        this.queue_draw();
    }

    setSelectedStop(index: number) {
        this._selectedStop = index;
        this.queue_draw();
    }

    _draw(_area: Gtk.DrawingArea, cairoContext: any, width: number, height: number) {
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
        cairoContext.save();
        // Rounded rect path
        cairoContext.newPath();
        cairoContext.arc(barX + barW - radius, barY + radius, radius, -Math.PI / 2, 0);
        cairoContext.arc(barX + barW - radius, barY + barHeight - radius, radius, 0, Math.PI / 2);
        cairoContext.arc(barX + radius, barY + barHeight - radius, radius, Math.PI / 2, Math.PI);
        cairoContext.arc(barX + radius, barY + radius, radius, Math.PI, 3 * Math.PI / 2);
        cairoContext.closePath();
        cairoContext.clip();

        // Draw gradient bar using multiple rectangles (simple approach)
        const steps = 200; // More steps for smoother gradient
        for (let i = 0; i <= steps; i++) {
            const pos = i / steps;
            const x = barX + barW * pos;
            const w = Math.ceil(barW / steps) + 1; // Ceiling to prevent gaps

            let color;

            // Handle edge case: if position is before or at first stop
            if (pos <= sortedStops[0].position) {
                color = parseHexColor(sortedStops[0].color);
            }
            // Handle edge case: if position is after or at last stop
            else if (pos >= sortedStops[sortedStops.length - 1].position) {
                color = parseHexColor(sortedStops[sortedStops.length - 1].color);
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

                const leftColor = parseHexColor(leftStop.color);
                const rightColor = parseHexColor(rightStop.color);

                const r = leftColor.r + (rightColor.r - leftColor.r) * t;
                const g = leftColor.g + (rightColor.g - leftColor.g) * t;
                const b = leftColor.b + (rightColor.b - leftColor.b) * t;

                color = { r, g, b };
            }

                // parseHexColor returns 0..255 integers in the original codebase;
                // make sure we pass normalized 0..1 values to Cairo.
                const nr = color.r > 1 ? color.r / 255 : color.r;
                const ng = color.g > 1 ? color.g / 255 : color.g;
                const nb = color.b > 1 ? color.b / 255 : color.b;
                cairoContext.setSourceRGB(nr, ng, nb);
            cairoContext.rectangle(x, barY, w, barHeight);
            cairoContext.fill();
        }

        cairoContext.restore();

        // Draw rounded border around gradient bar
        cairoContext.setSourceRGB(0, 0, 0);
        cairoContext.setLineWidth(0.1);
        cairoContext.newPath();
        cairoContext.arc(barX + barW - radius, barY + radius, radius, -Math.PI / 2, 0);
        cairoContext.arc(barX + barW - radius, barY + barHeight - radius, radius, 0, Math.PI / 2);
        cairoContext.arc(barX + radius, barY + barHeight - radius, radius, Math.PI / 2, Math.PI);
        cairoContext.arc(barX + radius, barY + radius, radius, Math.PI, 3 * Math.PI / 2);
        cairoContext.closePath();
        cairoContext.stroke();

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
                cairoContext.setSourceRGBA(0, 0, 0, 0.3);
                cairoContext.arc(x, y, handleRadius + 4, 0, 2 * Math.PI);
                cairoContext.fill();
            }

            // Draw the handle
            const color = parseHexColor(stop.color);
            const hr = color.r > 1 ? color.r / 255 : color.r;
            const hg = color.g > 1 ? color.g / 255 : color.g;
            const hb = color.b > 1 ? color.b / 255 : color.b;
            cairoContext.setSourceRGB(hr, hg, hb);
            cairoContext.arc(x, y, handleRadius, 0, 2 * Math.PI);
            cairoContext.fill();

            // Draw handle border
            if (isSelected) {
                cairoContext.setSourceRGB(0.2, 0.6, 1.0); // Blue for selected
                cairoContext.setLineWidth(3);
            } else {
                cairoContext.setSourceRGB(0, 0, 0);
                cairoContext.setLineWidth(2);
            }
            cairoContext.arc(x, y, handleRadius, 0, 2 * Math.PI);
            cairoContext.stroke();

            // Draw inner white ring
            cairoContext.setSourceRGB(1, 1, 1);
            cairoContext.setLineWidth(1.5);
            cairoContext.arc(x, y, handleRadius - 2, 0, 2 * Math.PI);
            cairoContext.stroke();

            // Draw position indicator below handle
            cairoContext.setSourceRGB(0.3, 0.3, 0.3);
            cairoContext.selectFontFace('Sans', 0, 0); // CAIRO_FONT_SLANT_NORMAL, CAIRO_FONT_WEIGHT_NORMAL
            cairoContext.setFontSize(10);
            const text = `${Math.round(stop.position * 100)}%`;
            const extents = cairoContext.textExtents(text);
            cairoContext.moveTo(x - extents.width / 2, barY + barHeight + 15);
            cairoContext.showText(text);
        });

        print('[GradientPreview] Drawing complete');
    }

    _getStopAtPosition(x: number, y: number): number {
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

    _onPressed(_gesture: Gtk.GestureClick, nPress: number, x: number, y: number) {
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

    _onReleased(_gesture: Gtk.GestureClick, _nPress: number, _x: number, _y: number) {
        this._draggedStop = -1;
        this.queue_draw();
    }

    _onDragBegin(_gesture: Gtk.GestureClick, startX: number, startY: number) {
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

    _onDragUpdate(_gesture: Gtk.GestureClick, offsetX: number, _offsetY: number) {
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

    _onDragEnd(_gesture: Gtk.GestureClick, _offsetX: number, _offsetY: number) {
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

    _onMotion(_controller: Gtk.EventControllerMotion, x: number, y: number) {
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

    _onLeave(_controller: Gtk.EventControllerMotion) {
        if (this._hoverStop !== -1) {
            this._hoverStop = -1;
            this.queue_draw();
        }
        this.set_cursor(null);
    }
});
