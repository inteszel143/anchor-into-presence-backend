// Keep the loader separate from Next.js-managed metadata. Those link elements
// may be replaced while a route is loading, so restoring a saved node is unsafe.
const iconId = "admin-navigation-icon";
let owners = 0;
let restore: (() => void) | undefined;

export function acquireAdminTabIcon(): () => void {
  if (owners++ === 0) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      let icon = document.getElementById(iconId) as HTMLLinkElement | null;
      if (!icon) {
        icon = document.createElement("link");
        icon.id = iconId;
        icon.rel = "icon";
      }
      const loadingIcon = icon;
      document.head.appendChild(loadingIcon);
      let angle = -Math.PI / 2;
      function draw() {
        context!.clearRect(0, 0, 32, 32);
        context!.lineWidth = 4;
        context!.lineCap = "round";
        context!.strokeStyle = "#ded9ce";
        context!.beginPath();
        context!.arc(16, 16, 11, 0, Math.PI * 2);
        context!.stroke();
        context!.strokeStyle = "#77765f";
        context!.beginPath();
        context!.arc(16, 16, 11, angle, angle + Math.PI * 1.35);
        context!.stroke();
        loadingIcon.type = "image/png";
        loadingIcon.setAttribute("sizes", "32x32");
        loadingIcon.href = canvas.toDataURL("image/png");
        angle += Math.PI / 5;
      }
      draw();
      const timer = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined : window.setInterval(draw, 100);
      restore = () => {
        if (timer !== undefined) window.clearInterval(timer);
        // Read the current route's icon, not a detached element from before navigation.
        const appIcon = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
          .filter(link => link.id !== iconId && link.getAttribute("href") && !link.getAttribute("href")!.startsWith("data:"))
          .pop();
        loadingIcon.href = appIcon?.getAttribute("href") || "/icon.png";
        loadingIcon.type = appIcon?.getAttribute("type") || "image/png";
        const sizes = appIcon?.getAttribute("sizes");
        if (sizes) loadingIcon.setAttribute("sizes", sizes);
        else loadingIcon.removeAttribute("sizes");
        // An explicit normal-icon update makes browsers refresh the tab reliably;
        // removing a temporary favicon alone can leave its last frame cached.
        document.head.appendChild(loadingIcon);
      };
    }
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--owners === 0) {
      restore?.();
      restore = undefined;
    }
  };
}
