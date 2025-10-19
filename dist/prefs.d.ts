import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
export default class extends ExtensionPreferences {
    #private;
    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void>;
}
//# sourceMappingURL=prefs.d.ts.map