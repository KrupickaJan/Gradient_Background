import Gio from 'gi://Gio';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    version: number;
    'shell-version': string[];
}
export default class ProceduralGradientExtension extends Extension {
    _settings: Gio.Settings | null;
    _settingsChangedId: number | null;
    _cacheDir: string | null;
    _indicator: PanelMenu.Button | null;
    _updateTimeout: number | null;
    constructor(metadata: ExtensionMetadata);
    enable(): void;
    disable(): void;
    _createIndicator(): void;
    _scheduleUpdate(): void;
    _updateWallpaper(): void;
}
export {};
//# sourceMappingURL=extension.d.ts.map