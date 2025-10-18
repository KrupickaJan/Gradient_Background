#!/bin/bash#!/bin/bash



# GNOME Shell Extension Uninstaller for Procedural Gradient Background# GNOME Shell Extension Uninstaller for Procedural Gradient Background



EXTENSION_UUID="procedural-gradient-background@jan_krupicka"EXTENSION_UUID="procedural-gradient-background@jan_krupicka"

EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"



echo "Uninstalling Procedural Gradient Background Extension..."echo "Uninstalling Procedural Gradient Background Extension..."



# Disable the extension first# Disable the extension first

gnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || truegnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || true



# Remove extension directory# Remove extension directory

if [ -d "$EXTENSION_DIR" ]; thenif [ -d "$EXTENSION_DIR" ]; then

    rm -rf "$EXTENSION_DIR"    rm -rf "$EXTENSION_DIR"

    echo "✓ Extension uninstalled successfully!"    echo "✓ Extension uninstalled successfully!"

elseelse

    echo "Extension not found in $EXTENSION_DIR"    echo "Extension not found in $EXTENSION_DIR"

fifi



echo ""echo ""

echo "You may need to restart GNOME Shell (Alt+F2, type 'r', press Enter)"echo "You may need to restart GNOME Shell (Alt+F2, type 'r', press Enter)"

echo "or log out and log back in for changes to take effect."echo "or log out and log back in for changes to take effect."

echo ""echo ""

