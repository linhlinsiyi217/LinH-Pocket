/* ============================================================
   LinH Pocket · app.js v0.2（只管逻辑，不写视觉值）
   启动状态机 → 锁屏 → 桌面 / 面板 / 主题 / 壁纸
   ============================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const root = document.documentElement;
  const device = $("#device");
  const splash = $("#splash");
  const island = $("#island");
  const lockScreen = $("#lockScreen");
  const homeScreen = $("#homeScreen");
  const toastEl = $("#toast");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let unlocked = false;
  let editing = false;
  let longTimer = null;
  let startY = 0;
  let startX = 0;
  let toastTimer = null;
  let islandTimer = null;
  let splashDone = false;

  /* ---------- 小弹性反馈（400ms 回弹曲线） ---------- */
  function spring(el) {
    if (reducedMotion || !el.animate) return;
    el.animate(
      [
        { transform: "scale(0.94)" },
        { transform: "scale(1.035)", offset: 0.42 },
        { transform: "scale(1)" }
      ],
      { duration: 430, easing: "cubic-bezier(0.34,1.56,0.64,1)" }
    );
  }

  /* ---------- Toast ---------- */
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1100);
  }

  /* ---------- 灵动岛轻提示 ---------- */
  function pulseIsland(hold = 1000) {
    island.classList.add("active");
    clearTimeout(islandTimer);
    islandTimer = setTimeout(() => island.classList.remove("active"), hold);
  }

  /* ---------- 启动画面：2.2s 自动退场，点击可跳过 ---------- */
  function exitSplash() {
    if (splashDone) return;
    splashDone = true;
    splash.classList.add("splash--out");
    pulseIsland(1500);
    setTimeout(() => { splash.style.display = "none"; }, reducedMotion ? 200 : 420);
    splash.removeEventListener("pointerdown", exitSplash);
  }
  splash.addEventListener("pointerdown", exitSplash);
  setTimeout(exitSplash, reducedMotion ? 1200 : 2200);

  /* ---------- 时钟 / 日期 ---------- */
  const WEEK = "日一二三四五六";
  function tick() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const time = hh + ":" + mm;
    $("#lockTime").textContent = time;
    $("#sbTime").textContent = time;
    $("#lockDate").textContent = `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- 解锁 ---------- */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    device.classList.add("is-unlocked");
    pulseIsland(1500);
  }

  /* ---------- 触摸：上滑解锁 / 左右翻页 / 长按编辑 ---------- */
  document.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    if (unlocked && e.target.closest(".app, .dock-app")) {
      longTimer = setTimeout(() => {
        editing = true;
        device.classList.add("editing");
        toast("桌面编辑");
      }, 650);
    }
  }, { passive: true });
  document.addEventListener("touchmove", () => clearTimeout(longTimer), { passive: true });
  document.addEventListener("touchend", (e) => {
    clearTimeout(longTimer);
    const dy = startY - e.changedTouches[0].clientY;
    const dx = e.changedTouches[0].clientX - startX;
    if (!unlocked && dy > 55) { unlock(); return; }
    if (unlocked && Math.abs(dx) > 75) toast(dx < 0 ? "下一页" : "上一页");
  }, { passive: true });

  /* 桌面端鼠标：按下上抬模拟上滑，长按模拟编辑 */
  document.addEventListener("mousedown", (e) => {
    startY = e.clientY;
    startX = e.clientX;
    if (e.target.closest(".app, .dock-app")) {
      longTimer = setTimeout(() => {
        editing = true;
        device.classList.add("editing");
        toast("桌面编辑");
      }, 650);
    }
  });
  document.addEventListener("mouseup", (e) => {
    clearTimeout(longTimer);
    if (!unlocked && startY - e.clientY > 55) unlock();
  });

  /* ---------- 设置面板 ---------- */
  function openPanel(id) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.add("open");
    spring(panel);
    /* v0.2 面板打开不再触发灵动岛：仅启动欢迎时展开，避免状态栏频繁闪隐 */
  }
  function closePanel(id) {
    document.getElementById(id).classList.remove("open");
  }

  $("#settingsBtn").addEventListener("click", () => {
    if (editing) {
      editing = false;
      device.classList.remove("editing");
      return;
    }
    openPanel("settings");
  });
  $$("[data-open]").forEach((el) =>
    el.addEventListener("click", () => openPanel(el.dataset.open))
  );
  $$("[data-close]").forEach((el) =>
    el.addEventListener("click", () => closePanel(el.dataset.close))
  );

  /* 开发中行 */
  $$("[data-dev]").forEach((el) =>
    el.addEventListener("click", () => toast(`「${el.dataset.dev}」开发中`))
  );

  /* ---------- 应用图标：占位反馈 ---------- */
  $$("[data-app]").forEach((el) =>
    el.addEventListener("click", (e) => {
      clearTimeout(longTimer);
      if (editing) return;
      spring(el);
      toast(`「${el.dataset.app}」开发中`);
    })
  );

  /* ---------- 手电筒：真实可切换 ---------- */
  $("#flashBtn").addEventListener("click", () => {
    const on = $("#flashBtn").classList.toggle("is-on");
    toast(on ? "手电筒已打开" : "手电筒已关闭");
  });

  /* ---------- 日间 / 夜间 ---------- */
  const modeToggle = $("#modeToggle");
  modeToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = modeToggle.classList.toggle("on"); // on = 夜间
    root.dataset.theme = on ? "dark" : "light";
    $("#modeLabel").textContent = on ? "夜间" : "日间";
    syncThemeCards();
    toast(on ? "夜间模式" : "日间模式");
  });

  function syncThemeCards() {
    $$(".theme-card[data-theme]").forEach((card) =>
      card.classList.toggle("selected", card.dataset.theme === root.dataset.theme)
    );
  }

  /* ---------- 个性化：纯黑 / 纯白主题 ---------- */
  $$(".theme-card[data-theme]").forEach((card) =>
    card.addEventListener("click", () => {
      root.dataset.theme = card.dataset.theme;
      syncThemeCards();
      const isDark = card.dataset.theme === "dark";
      modeToggle.classList.toggle("on", isDark);
      $("#modeLabel").textContent = isDark ? "夜间" : "日间";
      toast(isDark ? "纯黑主题已应用" : "纯白主题已应用");
    })
  );

  /* ---------- 壁纸：黑曜 / 白雾 ---------- */
  function syncWallCards() {
    $$(".theme-card[data-wall]").forEach((card) =>
      card.classList.toggle("selected", card.dataset.wall === root.dataset.wall)
    );
  }
  $$(".theme-card[data-wall]").forEach((card) =>
    card.addEventListener("click", () => {
      root.dataset.wall = card.dataset.wall;
      syncWallCards();
      toast(card.dataset.wall === "light" ? "白雾壁纸已应用" : "黑曜壁纸已应用");
    })
  );

  /* ---------- 其余开关：弹性反馈 ---------- */
  $$(".toggle").forEach((t) => {
    if (t.id === "modeToggle") return;
    t.addEventListener("click", (e) => {
      e.stopPropagation();
      t.classList.toggle("on");
      spring(t);
    });
  });
})();