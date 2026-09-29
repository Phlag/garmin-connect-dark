(() => {
  const ATTR = "data-gcn-off";
  const KEY = "gcnEnabled";

  // Garmin reinjects light design tokens after load — force critical ones.
  const TOKENS = {
    "--text-default": "#e8eef6",
    "--text-secondary": "#a8b6c8",
    "--text-action": "#6ec8ff",
    "--icon-default": "#e8eef6",
    "--icon-secondary": "#a8b6c8",
    "--icon-action": "#2ee6a6",
    "--inverse-bg-surface-02-inverse": "#e8eef6",
    "--inverse-text-default-inverse": "#e8eef6",
    "--inverse-text-action-inverse": "#6ec8ff",
    "--button-stroke-primary": "#2ee6a6",
    "--button-fill-primary": "#2ee6a6",
    "--button-fill-secondary": "#1e2b3d",
    "--button-fill-secondary-hover": "#243447",
    "--button-fill-secondary-press": "#2e4056",
    "--bg-background-void": "#0c1118",
    "--bg-card": "#121a24",
    "--stroke-container": "rgba(140,180,210,0.12)",
    "--bg-surface-01": "#121a24",
    "--bg-surface-02": "#172231",
    "--bg-background-default": "#0c1118",
    "--color-darkui-surface-1": "#070a0f",
    "--color-darkui-surface-2": "#0c1118",
    "--color-darkui-surface-3": "#0c1118",
    "--color-darkui-surface-4": "#121a24",
    "--color-108": "#2e4056",
    "--color-107": "#2e4056",
    "--stroke-divider": "rgba(140,180,210,0.22)",
    "--input-fill-input": "#172231",
    "--input-fill-input-focus": "#1e2b3d",
    "--input-fill-input-hover": "#1e2b3d",
    "--input-stroke-input": "rgba(140,180,210,0.14)",
    "--input-stroke-input-focus": "#2ee6a6",
    "--input-stroke-input-hover": "rgba(140,180,210,0.28)",
    "--menu-fill-menu": "#172231",
    "--menu-fill-menu-hover": "rgba(46,230,166,0.14)",
    "--fill-subtle": "#243447",
    "--fill-primary": "#2ee6a6",
    "--data-viz-neutral-primary": "#6ec8ff",
    "--data-viz-neutral-secondary": "#4a6078",
    "--data-viz-green-primary": "#2ee6a6",
    "--data-viz-green-secondary": "#1fc98f",
    "--data-viz-blue-primary": "#6ec8ff",
  };

  function forceTokens(enabled) {
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(TOKENS)) {
      if (enabled) root.style.setProperty(prop, value, "important");
      else root.style.removeProperty(prop);
    }
  }

  function patchHeaderIcons(enabled) {
    const svgs = document.querySelectorAll(
      "header svg, [class*='TopHeaderBarView_header'] svg, [class*='Button_iconButton'] svg"
    );
    svgs.forEach((svg) => {
      if (!enabled) {
        if (svg.dataset.gcnFill) {
          svg.setAttribute("fill", svg.dataset.gcnFill);
          delete svg.dataset.gcnFill;
        }
        return;
      }
      const fill = svg.getAttribute("fill");
      if (fill && fill.startsWith("var(") && !svg.dataset.gcnFill) {
        svg.dataset.gcnFill = fill;
      }
      svg.setAttribute("fill", "#e8eef6");
      svg.querySelectorAll("path, circle, rect").forEach((p) => {
        const pf = p.getAttribute("fill");
        if (!pf || pf.startsWith("var(")) {
          p.setAttribute("fill", "currentColor");
        }
      });
    });
  }

  function patchCharts(enabled) {
    if (!enabled) return;
    document.querySelectorAll(".recharts-cartesian-grid line").forEach((line) => {
      const stroke = line.getAttribute("stroke");
      if (stroke === "#ccc" || stroke === "#eee" || stroke === "#e5e5e5") {
        line.setAttribute("stroke", "rgba(140,180,210,0.14)");
      }
    });
    document.querySelectorAll("feFlood").forEach((flood) => {
      const c = flood.getAttribute("flood-color") || "";
      if (c.includes("bg-background-void") || c === "#efefef" || c === "#ffffff") {
        flood.setAttribute("flood-color", "#0c1118");
      }
    });
    // Nudge Recharts ResponsiveContainer after CSS height change
    window.dispatchEvent(new Event("resize"));
  }

  function apply(enabled) {
    const root = document.documentElement;
    if (enabled) root.removeAttribute(ATTR);
    else root.setAttribute(ATTR, "");
    forceTokens(enabled);
    patchHeaderIcons(enabled);
    patchCharts(enabled);
  }

  function ensureFont() {
    if (document.getElementById("gcn-font")) return;
    const link = document.createElement("link");
    link.id = "gcn-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap";
    (document.head || document.documentElement).appendChild(link);
  }

  chrome.storage.sync.get({ [KEY]: true }, (data) => {
    apply(!!data[KEY]);
    if (data[KEY]) ensureFont();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[KEY]) return;
    apply(!!changes[KEY].newValue);
    if (changes[KEY].newValue) ensureFont();
  });

  const reassert = () => {
    chrome.storage.sync.get({ [KEY]: true }, (data) => {
      if (!data[KEY]) return;
      forceTokens(true);
      patchHeaderIcons(true);
      patchCharts(true);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      ensureFont();
      reassert();
    });
  } else {
    ensureFont();
    reassert();
  }
  window.addEventListener("load", reassert);
  setTimeout(reassert, 500);
  setTimeout(reassert, 2000);

  const mo = new MutationObserver(() => {
    if (mo._t) clearTimeout(mo._t);
    mo._t = setTimeout(reassert, 100);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
