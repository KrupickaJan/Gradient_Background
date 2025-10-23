#!/bin/bash

# Create release package for extensions.gnome.org
# This script creates a clean package with only the necessary files

set -e

EXTENSION_NAME="procedural-gradient-background@jan_krupicka"
RELEASE_DIR="release"
PACKAGE_NAME="${EXTENSION_NAME}-v1.0.0"

echo "Creating release package for extensions.gnome.org..."

# Clean up any existing release directory
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/$PACKAGE_NAME"

# Build the extension
echo "Building extension..."
npm run build

# Copy essential files to release directory
echo "Copying files to release package..."

# Core extension files
cp dist/extension.js "$RELEASE_DIR/$PACKAGE_NAME/"
cp dist/prefs.js "$RELEASE_DIR/$PACKAGE_NAME/"
cp metadata.json "$RELEASE_DIR/$PACKAGE_NAME/"
cp stylesheet.css "$RELEASE_DIR/$PACKAGE_NAME/"
cp icon.svg "$RELEASE_DIR/$PACKAGE_NAME/"

# Copy schemas directory
cp -r dist/schemas "$RELEASE_DIR/$PACKAGE_NAME/"

# Create README for the package
cat > "$RELEASE_DIR/$PACKAGE_NAME/README.md" << 'EOF'
# Procedural Gradient Background

A GNOME Shell extension that generates procedural gradient wallpapers in real-time for your desktop.

## Features

- **Multiple Gradient Types:** Linear, Radial, and Noise gradients
- **Advanced Color Control:** Dynamic color stops with visual position sliders
- **Smart UI:** Context-sensitive settings and real-time updates
- **4K Ready:** Generates 3840×2160 resolution wallpapers

## Installation

1. Download this extension package
2. Extract it to `~/.local/share/gnome-shell/extensions/procedural-gradient-background@jan_krupicka/`
3. Log out and log back in
4. Enable the extension using GNOME Extensions or:
   ```bash
   gnome-extensions enable procedural-gradient-background@jan_krupicka
   ```

## Usage

Click the wallpaper icon in the top panel to open preferences and customize your gradient.

## Requirements

- GNOME Shell 45+
- Wayland or X11 session

## License

MIT License
EOF

# Create the zip package
cd "$RELEASE_DIR"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME"
cd ..

echo "Release package created: $RELEASE_DIR/${PACKAGE_NAME}.zip"
echo "Package contents:"
ls -la "$RELEASE_DIR/$PACKAGE_NAME/"

echo ""
echo "✅ Release package ready for extensions.gnome.org submission!"
echo "📦 Package location: $RELEASE_DIR/${PACKAGE_NAME}.zip"
