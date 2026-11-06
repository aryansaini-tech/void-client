/** Apply saved appearance before first paint, including when storage is blocked. */
export function AppearanceScript() {
  return (
    <script
      id="void-appearance"
      dangerouslySetInnerHTML={{
        __html: `(function(){var root=document.documentElement;var theme='dark';var reduced=false;try{theme=localStorage.getItem('void-theme')==='light'?'light':'dark';reduced=localStorage.getItem('void-reduced-motion')==='true';}catch(e){}root.dataset.theme=theme;root.dataset.reducedMotion=String(reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches);})();`,
      }}
    />
  );
}
