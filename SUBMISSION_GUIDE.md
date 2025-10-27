# Extensions.gnome.org Submission Guide

## Your Extension is Ready! 🎉

Your extension package has been created and is ready for submission to extensions.gnome.org.

## Package Details

- **Package Location**: `release/procedural-gradient-background@jan_krupicka-v1.0.0.zip`
- **Extension UUID**: `procedural-gradient-background@jan_krupicka`
- **Version**: 1.0.0
- **Supported Shell Versions**: 45, 46, 47, 48

## How to Submit to Extensions.gnome.org

### Step 1: Create an Account
1. Go to [extensions.gnome.org](https://extensions.gnome.org)
2. Click "Sign in" in the top right
3. Sign in with your GNOME account (or create one if you don't have it)

### Step 2: Upload Your Extension
1. Once logged in, click "Upload Extension" or go to [extensions.gnome.org/upload/](https://extensions.gnome.org/upload/)
2. Upload the file: `release/procedural-gradient-background@jan_krupicka-v1.0.0.zip`

### Step 3: Fill Out the Submission Form

#### Required Information:
- **Name**: Procedural Gradient Background
- **Description**: 
  ```
  Set beautiful procedural gradients as your workspace background with advanced color control and multiple gradient types. Features linear, radial, and noise gradients with dynamic color stops, real-time updates, and 4K support.
  ```
- **Tags**: wallpaper, gradient, background, procedural, customization
- **License**: MIT
- **Homepage**: https://github.com/KrupickaJan/Gradient_Background
- **Bug Reports**: https://github.com/KrupickaJan/Gradient_Background/issues

#### Screenshots (Required):
You'll need to provide screenshots showing:
1. The extension preferences window
2. Different gradient types in action
3. The panel indicator
4. The generated wallpapers

### Step 4: Review and Submit
1. Review all information carefully
2. Submit for review
3. Wait for approval (usually 1-3 days)

## Pre-Submission Checklist ✅

- [x] Extension builds without errors
- [x] Extension installs correctly
- [x] Extension can be enabled/disabled
- [x] All required files are included in package
- [x] Metadata.json is properly formatted
- [x] GSettings schema is compiled
- [x] README.md is included
- [x] Icon is present and valid SVG
- [x] No development files in package
- [x] Extension works on supported shell versions

## What Happens After Submission

1. **Review Process**: GNOME team reviews your extension for:
   - Code quality and security
   - Proper metadata
   - Functionality
   - Compliance with guidelines

2. **Approval**: If approved, your extension will be:
   - Published on extensions.gnome.org
   - Available for users to install
   - Listed in GNOME Extensions app

3. **Updates**: You can update your extension by:
   - Incrementing version number in metadata.json
   - Creating new release package
   - Re-uploading to extensions.gnome.org

## Important Notes

- **Version Numbers**: Use semantic versioning (1.0.0, 1.0.1, 1.1.0, etc.)
- **Shell Compatibility**: Test on multiple GNOME Shell versions
- **User Support**: Be prepared to respond to user issues and feedback
- **Updates**: Keep your extension updated for new GNOME Shell versions

## Troubleshooting Common Issues

### Extension Rejected
- Check the rejection reason in your account
- Fix the issues mentioned
- Re-submit with corrected version

### Installation Issues
- Ensure all files are in the correct locations
- Verify metadata.json format

### Functionality Issues
- Test on clean GNOME installation
- Check for missing dependencies
- Review error logs

## Next Steps

1. **Take Screenshots**: Capture images of your extension in action
2. **Test Thoroughly**: Ensure it works on different GNOME versions
3. **Submit**: Upload to extensions.gnome.org
4. **Monitor**: Check for feedback and user reviews
5. **Maintain**: Keep the extension updated and respond to issues

## Support Resources

- [GNOME Shell Extensions Documentation](https://gjs.guide/extensions/)
- [Extensions.gnome.org Guidelines](https://extensions.gnome.org/about/)
- [GNOME Developer Documentation](https://developer.gnome.org/)

Good luck with your submission! 🚀
