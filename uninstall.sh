#!/bin/bash

# GNOME Shell Extension Uninstaller for Procedural Gradient Background

EXTENSION_UUID="procedural-gradient-background@krupickajan.github.io"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Uninstalling Procedural Gradient Background Extension..."

# Disable the extension first
gnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || true

# Remove extension directory
if [ -d "$EXTENSION_DIR" ]; then
    rm -rf "$EXTENSION_DIR"
    echo "✓ Extension uninstalled successfully!"
else
    echo "Extension not found in $EXTENSION_DIR"
fi

echo ""
echo "You may need to restart GNOME Shell (Alt+F2, type 'r', press Enter)"
echo "or log out and log back in for changes to take effect."
echo ""