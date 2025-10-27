#!/bin/bash

# Install script for Procedural Gradient Background extension

EXTENSION_UUID="procedural-gradient-background@krupickajan.github.io"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Installing $EXTENSION_UUID..."
echo "Building extension..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Copy all files from dist to installation directory
echo "Copying extension files..."
cp -r dist/* "$INSTALL_DIR/"

echo "Extension files copied successfully!"
echo ""
echo "To apply changes, you need to restart GNOME Shell:"
echo "  - On X11: Press Alt+F2, type 'r' and press Enter"
echo "  - On Wayland: Log out and log back in (or run: busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart(\"Restarting…\")')"
echo ""
echo "Then enable the extension with:"
echo "  gnome-extensions enable $EXTENSION_UUID"
