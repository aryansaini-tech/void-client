import { useEffect, useRef, useState } from "react";

const assetLoads = new Map();

function loadAsset(kind, url, isReady) {
  if (isReady?.()) return Promise.resolve();
  if (assetLoads.has(url)) return assetLoads.get(url);

  if (kind === "stylesheet") {
    const loaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .some((link) => link.href === new URL(url, document.baseURI).href && link.sheet);
    if (loaded) return Promise.resolve();
  }

  const element = document.createElement(kind === "stylesheet" ? "link" : "script");
  element.dataset.nativePreviewAsset = "true";
  if (kind === "stylesheet") {
    element.rel = "stylesheet";
    element.href = url;
  } else {
    element.src = url;
    element.async = true;
  }

  const request = new Promise((resolve, reject) => {
    element.addEventListener("load", () => {
      if (isReady && !isReady()) reject(new Error(`Preview asset did not initialize: ${url}`));
      else resolve();
    }, { once: true });
    element.addEventListener("error", () => reject(new Error(`Preview asset could not load: ${url}`)), { once: true });
    document.head.appendChild(element);
  });

  assetLoads.set(url, request);
  request.catch(() => {
    assetLoads.delete(url);
    element.remove();
  });
  return request;
}

async function loadPreviewAssets() {
  await Promise.all([
    loadAsset("stylesheet", "/void/native-ui.css"),
    loadAsset("script", "/void/native-ui-data.js", () => Array.isArray(window.__voidNativeData?.modules)),
  ]);
  await loadAsset("script", "/void/native-ui.js", () => typeof window.createVoidNativeUI === "function");
}

function openModule(api, host, moduleId) {
  if (!moduleId) return;
  const module = api.modules.find((item) => item.id === moduleId);
  if (!module) return;

  api.openCategory(api.getCatalog().categories[module.category]);
  const trigger = Array.from(host.querySelectorAll('[data-action="module"][data-module]'))
    .find((button) => button.dataset.module === module.id);
  trigger?.click();
}

export default function NativePreview({ moduleId }) {
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const requestedModule = useRef(moduleId);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;
    let api;
    setStatus("loading");

    loadPreviewAssets().then(() => {
      if (cancelled) return;
      api = window.createVoidNativeUI(host);
      apiRef.current = api;
      openModule(api, host, requestedModule.current);
      setStatus("ready");
    }).catch(() => {
      if (cancelled) return;
      api?.dispose();
      api = undefined;
      apiRef.current = null;
      host.replaceChildren();
      setStatus("error");
    });

    return () => {
      cancelled = true;
      api?.dispose();
      if (apiRef.current === api) apiRef.current = null;
      host.replaceChildren();
    };
  }, [attempt]);

  useEffect(() => {
    requestedModule.current = moduleId;
    if (apiRef.current) openModule(apiRef.current, hostRef.current, moduleId);
  }, [moduleId]);

  return (
    <section className="native-preview" aria-label="Interactive client preview" aria-busy={status === "loading"}>
      {status === "loading" && <p className="native-preview__status" role="status">Loading client preview…</p>}
      {status === "error" && (
        <div className="native-preview__status" role="alert">
          <p>The client preview could not load.</p>
          <button className="native-preview__retry" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry preview
          </button>
        </div>
      )}
      <div id="module-preview" className="native-preview__host" ref={hostRef} />
    </section>
  );
}
