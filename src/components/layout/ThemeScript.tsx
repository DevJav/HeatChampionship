export const THEME_STORAGE_KEY = "theme";

/**
 * Runs before first paint to set data-theme on <html> from the stored choice,
 * defaulting to dark (the retro broadcast look). Avoids a theme flash on load.
 */
const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      // Inert on the client so React doesn't warn about rendering scripts
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
