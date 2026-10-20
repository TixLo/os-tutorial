const STORAGE_KEY = 'os-tutorial.about-seen';

// Whether this visitor has already seen the About dialog, remembered in the browser.
export class AboutModel {
  get seen() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
  }
}
