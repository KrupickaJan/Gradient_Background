#!/bin/bash

# Install script for Procedural Gradient Background extension

EXTENSION_UUID="procedural-gradient-background@jan_krupicka"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Installing $EXTENSION_UUID..."

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy extension files
cp extension.js "$INSTALL_DIR/"
cp prefs.js "$INSTALL_DIR/"
cp metadata.json "$INSTALL_DIR/"
cp stylesheet.css "$INSTALL_DIR/"

# Copy schemas
mkdir -p "$INSTALL_DIR/schemas"
cp schemas/*.xml "$INSTALL_DIR/schemas/"
cp schemas/gschemas.compiled "$INSTALL_DIR/schemas/"

echo "Extension files copied successfully!"
echo ""
echo "To apply changes, you need to restart GNOME Shell:"
echo "  - On X11: Press Alt+F2, type 'r' and press Enter"
echo "  - On Wayland: Log out and log back in (or run: busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart(\"Restarting…\")')"
echo ""
echo "Then enable the extension with:"
echo "  gnome-extensions enable $EXTENSION_UUID"
