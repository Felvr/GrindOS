export type ThemeName = "hud" | "pipboy";

const THEME_KEY = "grindos:theme";
const CALM_KEY = "grindos:crtCalm";

export function getTheme(): ThemeName {
  try {
    return localStorage.getItem(THEME_KEY) === "pipboy" ? "pipboy" : "hud";
  } catch {
    return "hud";
  }
}

export function getCalm(): boolean {
  try {
    return localStorage.getItem(CALM_KEY) === "true";
  } catch {
    return false;
  }
}

// Reflect the current theme onto <html> so the CSS variables swap.
export function applyTheme(theme: ThemeName, calm: boolean): void {
  const el = document.documentElement;
  el.dataset.theme = theme;
  el.dataset.crtCalm = calm ? "true" : "false";
}

export function setTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme, getCalm());
}

export function setCalm(calm: boolean): void {
  try {
    localStorage.setItem(CALM_KEY, String(calm));
  } catch {
    /* ignore */
  }
  applyTheme(getTheme(), calm);
}

// Inline snippet run before paint (in layout <head>) to avoid a theme flash.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')==='pipboy'?'pipboy':'hud';var c=localStorage.getItem('${CALM_KEY}')==='true';var e=document.documentElement;e.dataset.theme=t;e.dataset.crtCalm=c?'true':'false';}catch(e){}})();`;
