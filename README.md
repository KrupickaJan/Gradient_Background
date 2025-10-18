# Procedural Gradient Background

A GNOME Shell extension that generates procedural gradient wallpapers in real-time for your desktop.

## Features

- **Multiple Gradient Types:**
  - **Linear gradients** with adjustable angle (0-360°)
  - **Radial gradients**
  - **Noise gradients** with procedural patterns and adjustable octaves

- **Advanced Color Control:**
  - Dynamic color stops - add, remove, and position unlimited color stops
  - Visual position sliders for precise control (0-100%)
  - Automatic color interpolation when adding new stops
  - Interactive color picker for each stop
  - Minimum 2 color stops required for smooth gradients

- **Smart UI:**
  - Context-sensitive settings (Angle shown only for Linear, Octaves only for Noise)
  - Panel indicator for quick access to preferences
  - Real-time wallpaper updates (debounced to prevent system lag)

- **4K Ready:**
  - Generates 3840×2160 (4K UHD) resolution wallpapers
  - SVG-based for crisp, scalable output
  - Efficient file caching

## Requirements

- GNOME Shell 45+ (tested on 48.5)
- Fedora or any GNOME-based Linux distribution
- Wayland or X11 session

## Installation

### Quick Install

1. Clone or download this repository
2. Navigate to the extension directory
3. Run the installation script:

```bash
chmod +x install.sh
./install.sh
```

4. **Log out and log back in** (required on Wayland to reload extension code)
5. Enable the extension:

```bash
gnome-extensions enable procedural-gradient-background@jan_krupicka
```

### Manual Installation

1. Copy the extension to your local extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/procedural-gradient-background@jan_krupicka
cp -r * ~/.local/share/gnome-shell/extensions/procedural-gradient-background@jan_krupicka/
```

2. Compile the GSettings schema:

```bash
cd ~/.local/share/gnome-shell/extensions/procedural-gradient-background@jan_krupicka
glib-compile-schemas schemas/
```

3. **Log out and log back in**, then enable the extension

## Configuration

Click the wallpaper icon in the top panel, or open GNOME Extensions and click the settings icon next to "Procedural Gradient Background".

### Settings Options:

- **Gradient Type**: Choose between Linear, Radial, or Noise
- **Color Stops**: Add/remove/adjust unlimited color stops with position sliders and color pickers
- **Angle** (Linear only): Set gradient direction (0-360 degrees)
- **Octaves** (Noise only): Control detail level for noise patterns (1-8)
- **Scale**: Global scale factor for all gradients (1.0-5.0)

## Usage Examples

### Linear Sunset Gradient
1. Select **Linear** gradient type
2. Set **Angle** to 135°
3. Add 3 color stops:
   - 0%: #FF6B6B (coral red)
   - 50%: #FFD93D (golden yellow)
   - 100%: #6BCB77 (soft green)

### Radial Ocean Gradient
1. Select **Radial** gradient type
2. Add 4 color stops:
   - 0%: #1A237E (deep navy)
   - 33%: #3949AB (royal blue)
   - 66%: #5C6BC0 (sky blue)
   - 100%: #90CAF9 (light blue)

### Noise Abstract Pattern
1. Select **Noise** gradient type
2. Set **Octaves** to 6
3. Set **Scale** to 1.5
4. Add vibrant color stops for an abstract artistic effect

## How It Works

1. Extension monitors GSettings for any preference changes
2. After 300ms of no changes (debouncing), wallpaper generation begins
3. SVG is generated with your chosen gradient type and color stops
4. File is saved to `~/.cache/procedural-gradient/wallpaper.svg`
5. Wallpaper is automatically applied via GNOME desktop background settings

## Troubleshooting

### Extension not showing up
- Make sure you've **logged out and back in** after installation
- Check if listed: `gnome-extensions list`
- View logs: `journalctl -f /usr/bin/gnome-shell | grep ProcGrad`

### Changes not applying
- On **Wayland**: Log out and log back in (required for code changes)
- On **X11**: Press `Alt+F2`, type `r`, press Enter
- Check extension is enabled: `gnome-extensions info procedural-gradient-background@jan_krupicka`

## Uninstallation

Run the uninstall script:

```bash
chmod +x uninstall.sh
./uninstall.sh
```

Or manually remove:

```bash
rm -rf ~/.local/share/gnome-shell/extensions/procedural-gradient-background@jan_krupicka
```

Then log out and back in.

## Development

### File Structure
```
procedural-gradient-background@jan_krupicka/
├── extension.js          # Main extension logic and SVG generators
├── prefs.js             # Preferences UI with dynamic color stops
├── metadata.json        # Extension metadata
├── stylesheet.css       # Panel indicator styles
├── schemas/             # GSettings schemas
│   ├── org.gnome.shell.extensions.procedural-gradient-background.gschema.xml
│   └── gschemas.compiled
├── install.sh           # Installation script
├── uninstall.sh         # Uninstallation script
└── README.md            # This file
```

### Testing Changes

After modifying the code:

1. Run `./install.sh` to copy files
2. **Log out and log back in** (Wayland) or restart GNOME Shell (X11: `Alt+F2` → `r`)
3. Check logs: `journalctl -f /usr/bin/gnome-shell | grep ProcGrad`

### Key Technical Details

- **Debouncing**: 300ms delay prevents rapid-fire updates when dragging sliders
- **Color Interpolation**: New stops automatically blend between adjacent colors
- **Auto-sorting**: Gradient stops always sorted by position for valid SVG
- **4K Output**: 3840×2160 SVG with proper aspect ratio and scaling

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions are welcome! Please:
- Test on GNOME Shell 45+ before submitting PRs

## Credits

Created by Jan Krupicka for GNOME desktop environments.
