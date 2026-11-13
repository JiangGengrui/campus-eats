// Google Fonts 属于非关键资源：运行时异步注入样式表。
// 若在 index.html 同步引用，离线/受限网络下该请求会挂起到超时（约 10s），阻塞 window load 事件，
// 造成整页加载白屏与 E2E 导航超时。字体加载失败时按 font-family 回退栈降级，不影响功能。
const WEBFONT_HREF =
  "https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&family=Noto+Sans+SC:wght@400;500;700&family=Silkscreen:wght@400;700&display=swap";

export function loadWebFonts(): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = WEBFONT_HREF;
  link.dataset.webfonts = "google";
  document.head.appendChild(link);
}
