/* =========================================================================
   projects.js — interface and project interactions
   navigation · index · jumps · project viewer · film player · music player
   keyframe strips · sound toggles · copy email · level map · word field
   Scroll-linked work uses ScrollTrigger (from motion.js), never its own loop.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var ease = "power3.out";

  /* ---------------------------------------------------------------- scroll lock + focus trap (shared by every overlay) */
  var lockDepth = 0, lockY = 0;
  function lock() { if (lockDepth++ === 0) { lockY = scrollY; root.style.setProperty("--sbw", (innerWidth - root.clientWidth) + "px"); root.classList.add("is-locked"); document.body.style.paddingRight = "var(--sbw)"; } }
  function unlock() { if (--lockDepth <= 0) { lockDepth = 0; root.classList.remove("is-locked"); document.body.style.paddingRight = ""; } }
  function trap(box, e) {
    if (e.key !== "Tab") return;
    var f = $$("a[href], button:not([disabled]):not([hidden]), [tabindex]:not([tabindex='-1'])", box).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function tween(target, vars) { if (G && !reduce) return G.to(target, vars); var t = Array.isArray(target) ? target : [target]; t.forEach(function (el) { if (el && vars.opacity !== undefined) el.style.opacity = vars.opacity; }); if (vars.onComplete) vars.onComplete(); return null; }

  /* ---------------------------------------------------------------- navigation bar */
  var nav = $("#nav"), bar = $(".bar", nav), pill = $(".bar-pill", nav), links = $$(".bar-link", nav);
  var owner = { level: "three-d" };                         // Level Concept sits under 3D in the bar
  function setActive(k) {
    k = owner[k] || k;
    var on = null;
    links.forEach(function (a) { var m = a.dataset.k === k; a.classList.toggle("is-on", m); if (m) { on = a; a.setAttribute("aria-current", "true"); } else a.removeAttribute("aria-current"); });
    if (!on) { if (G) G.to(pill, { opacity: 0, duration: reduce ? 0 : .3, overwrite: "auto" }); else pill.style.opacity = 0; return; }
    var x = on.offsetLeft, w = on.offsetWidth;
    if (G && !reduce) G.to(pill, { x: x, width: w, opacity: 1, duration: .5, ease: ease, overwrite: "auto" }); else { pill.style.transform = "translateX(" + x + "px)"; pill.style.width = w + "px"; pill.style.opacity = 1; }
    if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: x - bar.clientWidth / 2 + w / 2, behavior: reduce ? "auto" : "smooth" });
  }
  if (ST) {
    ST.create({ start: function () { return innerHeight * .6; }, end: "max", onToggle: function (st) { nav.classList.toggle("is-solid", st.isActive); } });
    $$(".sector").forEach(function (s) {
      ST.create({ trigger: s, start: "top 55%", end: "bottom 55%", onToggle: function (st) { if (st.isActive) setActive(s.id); } });
    });
    ST.create({ trigger: ".about", start: "top 55%", end: "max", onToggle: function (st) { if (st.isActive) setActive(""); } });
    ST.create({ trigger: ".hero", start: "top top", end: "bottom 55%", onToggle: function (st) { if (st.isActive) setActive(""); } });
  }

  /* ---------------------------------------------------------------- jumps: short hops glide, long ones pass behind a curtain */
  var curtain = $(".curtain"), cT = $(".curtain-t b", curtain), cN = $(".curtain-t span", curtain), jumping = false;
  function targetY(el) { return el.id === "top" ? 0 : el.getBoundingClientRect().top + scrollY + (el.classList.contains("sector") ? innerHeight * .12 : 0); }
  function jump(el) {
    if (!el || jumping) return;
    var y = targetY(el), far = Math.abs(y - scrollY) > innerHeight * 1.8;
    if (reduce || !G) { scrollTo(0, y); focusTarget(el); return; }
    if (!far) { smoothScroll(y, 900); focusTarget(el); return; }
    jumping = true;
    var h = $(".chapter-title", el), n = $(".chapter-num", el);
    cT.textContent = h ? h.textContent.trim() : (el.querySelector("h2") || {}).textContent || "";
    cN.textContent = n ? n.textContent : "";
    G.timeline({ onComplete: function () { jumping = false; focusTarget(el); } })
      .set(curtain, { visibility: "visible", yPercent: 100 })
      .to(curtain, { yPercent: 0, duration: .55, ease: "power3.inOut" })
      .fromTo(".curtain-t", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .45, ease: ease }, .2)
      .add(function () { scrollTo(0, y); if (ST) ST.update(); }, .62)
      .to(".curtain-t", { opacity: 0, y: -16, duration: .3 }, .9)
      .to(curtain, { yPercent: -100, duration: .7, ease: "power3.inOut" }, .95)
      .set(curtain, { visibility: "hidden" });
  }
  function smoothScroll(y, dur) {                       // used only for short hops; native smooth scroll is not reliable everywhere
    var y0 = scrollY, d = y - y0, o = { k: 0 };
    G.to(o, { k: 1, duration: dur / 1000, ease: "power3.inOut", onUpdate: function () { scrollTo(0, y0 + d * o.k); } });
  }
  function focusTarget(el) { var f = el.querySelector("h2, h1") || el; if (!f.hasAttribute("tabindex")) f.setAttribute("tabindex", "-1"); f.focus({ preventScroll: true }); }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1), el = id === "top" ? $("#top") : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (!menu.hidden) closeMenu(true);
      history.replaceState(null, "", "#" + id);
      jump(el);
    });
  });

  /* ---------------------------------------------------------------- index menu */
  var menu = $("#indexMenu"), menuBtn = $(".nav-index"), prev = $(".index-prev", menu), pim = $("img", prev), menuLast = null;
  function openMenu() {
    menuLast = document.activeElement; menu.hidden = false; root.classList.add("menu-open"); lock();
    menuBtn.setAttribute("aria-expanded", "true"); menuBtn.textContent = "Close";
    if (G && !reduce) G.fromTo($$("li", menu), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, stagger: .035, ease: ease });
    $("a", menu).focus();
  }
  function closeMenu(silent) {
    menu.hidden = true; root.classList.remove("menu-open"); unlock();
    menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Index";
    if (!silent && menuLast) menuLast.focus();
  }
  menuBtn.addEventListener("click", function () { menu.hidden ? openMenu() : closeMenu(); });
  menu.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); trap(menu, e); });
  $$("a", menu).forEach(function (a) {
    var show = function () { var u = a.dataset.img; if (!u) return; if (pim.getAttribute("src") !== u) { prev.classList.remove("on"); pim.onload = function () { prev.classList.add("on"); }; pim.src = u; } else prev.classList.add("on"); };
    a.addEventListener("pointerenter", show); a.addEventListener("focus", show);
    a.addEventListener("pointerleave", function () { prev.classList.remove("on"); });
  });

  /* ---------------------------------------------------------------- keyframe and gallery strips: sideways by choice */
  $$(".tape").forEach(function (t) {
    var wrap = $(".tape-wrap", t), frames = $$(".tape-f", t), bar = $(".tape-prog i", t), foot = $(".tape-foot", t);
    if (!wrap || !frames.length) return;
    var ctl = document.createElement("div"); ctl.className = "tape-ctl";
    ctl.innerHTML = '<span class="tape-n"><b>01</b> / ' + String(frames.length).padStart(2, "0") + '</span>' +
      '<button type="button" class="tape-b" data-d="-1" aria-label="Previous frame"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="tape-b" data-d="1" aria-label="Next frame"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
    foot.appendChild(ctl);
    var num = $("b", ctl), btns = $$("button", ctl), cur = 0, raf = 0;
    function goTo(i) { i = Math.max(0, Math.min(frames.length - 1, i)); var f = frames[i]; wrap.scrollTo({ left: Math.max(0, f.offsetLeft + f.offsetWidth / 2 - wrap.clientWidth / 2), behavior: reduce ? "auto" : "smooth" }); }
    function paint() {
      raf = 0; var mid = wrap.scrollLeft + wrap.clientWidth / 2, best = 0, bd = 1e9;
      frames.forEach(function (f, i) { var d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cur = best; num.textContent = String(best + 1).padStart(2, "0");
      var max = wrap.scrollWidth - wrap.clientWidth;
      bar.style.transform = "scaleX(" + (max > 0 ? wrap.scrollLeft / max : 1).toFixed(4) + ")";
      btns[0].disabled = wrap.scrollLeft < 4; btns[1].disabled = wrap.scrollLeft > max - 4;
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { goTo(cur + (+b.dataset.d)); }); });
    wrap.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    wrap.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); goTo(cur + (e.key === "ArrowRight" ? 1 : -1)); } });
    // mouse drag (touch and trackpads scroll natively)
    var down = false, moved = false, sx = 0, sl = 0;
    wrap.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = wrap.scrollLeft; });
    addEventListener("pointermove", function (e) { if (!down) return; if (Math.abs(e.clientX - sx) > 5) { moved = true; wrap.classList.add("is-dragging"); } if (moved) wrap.scrollLeft = sl - (e.clientX - sx); });
    addEventListener("pointerup", function () { if (!down) return; down = false; wrap.classList.remove("is-dragging"); if (moved) goTo(cur); });
    wrap.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    wrap.addEventListener("dragstart", function (e) { e.preventDefault(); });
    addEventListener("resize", paint);
    paint();
  });

  /* ---------------------------------------------------------------- project viewer
     The chosen picture grows from where it sits, the page dims, the words come
     in after the picture settles. Closing reverses it back to the same spot. */
  var V = $("#viewer"), vImgs = $$(".viewer-img", V), vInfo = $(".viewer-info", V), vDim = $(".viewer-dim", V), vUi = $(".viewer-ui", V);
  var vK = $(".viewer-k", V), vT = $(".viewer-title", V), vL = $(".viewer-line", V), vF = $(".viewer-facts", V), vC = $(".viewer-count", V);
  var set = null, idx = 0, front = 0, origin = null, busy = false, vLast = null;

  // frames in reading order; a collage lays them out in columns, so it carries its own order
  function framesOf(t) { var f = $$(".tape-f", t); if (f.length && f[0].dataset.n) f.sort(function (a, b) { return a.dataset.n - b.dataset.n; }); return f; }
  function itemsFromTape(t) {
    return framesOf(t).map(function (f) { var i = $("img", f), c = $("figcaption", f); return { src: i.currentSrc || i.src, alt: i.alt, w: +i.width, h: +i.height, cap: c ? c.textContent : "", el: i }; });
  }
  function fit(w, h) {                                                     // where the picture will sit inside the stage
    var r = $(".viewer-stage", V).getBoundingClientRect(), s = Math.min(r.width / w, r.height / h);
    return { left: r.left + (r.width - w * s) / 2, top: r.top + (r.height - h * s) / 2, width: w * s, height: h * s };
  }
  function fill(meta) {
    vK.textContent = meta.kicker || ""; vT.textContent = meta.title || ""; vL.textContent = meta.line || "";
    vF.innerHTML = meta.facts || ""; vK.hidden = !meta.kicker; vL.hidden = !meta.line; vF.hidden = !meta.facts;
  }
  function counter() {
    var n = set.items.length; vC.textContent = n > 1 ? String(idx + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") + (set.items[idx].cap ? "  ·  " + set.items[idx].cap : "") : "";
    $(".viewer-prev", V).hidden = $(".viewer-next", V).hidden = n < 2;
  }
  function load(src) { return new Promise(function (ok) { var im = new Image(); im.onload = im.onerror = function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () {}).then(ok); }; im.src = src; }); }
  function openViewer(s, i, from) {
    if (busy) return; busy = true; set = s; idx = i; vLast = document.activeElement; origin = from;
    var it = set.items[idx];
    V.classList.toggle("is-plain", !set.meta);
    fill(set.meta || { title: set.title });
    if (!set.meta) vT.textContent = set.title;
    V.hidden = false; lock(); counter();
    vImgs.forEach(function (im) { im.style.opacity = 0; });
    front = 0; vImgs[0].src = it.src; vImgs[0].alt = it.alt;
    var done = function () { busy = false; $(".viewer-x", V).focus(); };
    if (reduce || !G) { vDim.style.opacity = 1; vImgs[0].style.opacity = 1; vUi.style.opacity = 1; $$(".viewer-info > *").forEach(function (x) { x.style.opacity = 1; }); done(); return; }
    var a = from.getBoundingClientRect(), fly = document.createElement("img");
    fly.className = "viewer-fly"; fly.src = from.currentSrc || from.src; fly.alt = "";
    Object.assign(fly.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px" });
    document.body.appendChild(fly); from.style.visibility = "hidden";
    load(it.src).then(function () {
      var b = fit(it.w, it.h);
      G.timeline({ onComplete: function () { vImgs[0].style.opacity = 1; fly.remove(); from.style.visibility = ""; done(); } })
        .to(vDim, { opacity: 1, duration: .5, ease: "power2.out" }, 0)
        .to(fly, { left: b.left, top: b.top, width: b.width, height: b.height, borderRadius: 0, duration: .75, ease: "power3.inOut" }, 0)
        .fromTo($$(".viewer-info > *", V), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: ease }, .62)
        .fromTo(vUi, { opacity: 0 }, { opacity: 1, duration: .4 }, .7);
    });
  }
  function step(d) {
    if (busy || !set || set.items.length < 2) return; busy = true;
    idx = (idx + d + set.items.length) % set.items.length;
    var it = set.items[idx], back = 1 - front;
    load(it.src).then(function () {                      // the next picture is ready before anything moves: no flash
      vImgs[back].src = it.src; vImgs[back].alt = it.alt; counter();
      if (reduce || !G) { vImgs[front].style.opacity = 0; vImgs[back].style.opacity = 1; front = back; busy = false; return; }
      G.timeline({ onComplete: function () { front = back; busy = false; } })
        .fromTo(vImgs[back], { opacity: 0, x: d * 24 }, { opacity: 1, x: 0, duration: .55, ease: ease }, 0)
        .to(vImgs[front], { opacity: 0, x: -d * 24, duration: .45, ease: "power2.in" }, 0);
      origin = set.items[idx].el || origin;
    });
  }
  function closeViewer() {
    if (busy || V.hidden) return; busy = true;
    var target = (set.items[idx] && set.items[idx].el) || origin;
    var finish = function () { V.hidden = true; vImgs.forEach(function (im) { im.style.opacity = 0; G && G.set(im, { x: 0 }); }); unlock(); busy = false; if (vLast) vLast.focus({ preventScroll: true }); };
    if (reduce || !G) { finish(); return; }
    var r = target ? target.getBoundingClientRect() : null, onScreen = r && r.bottom > 0 && r.top < innerHeight && r.width > 0;
    var tl = G.timeline({ onComplete: finish });
    tl.to([vUi].concat($$(".viewer-info > *", V)), { opacity: 0, duration: .25 }, 0);
    if (onScreen) {
      var cur = vImgs[front], it = set.items[idx], b = fit(it.w, it.h), fly = document.createElement("img");
      fly.className = "viewer-fly"; fly.src = cur.src; fly.alt = "";
      Object.assign(fly.style, { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px", borderRadius: "0px" });
      document.body.appendChild(fly); cur.style.opacity = 0; target.style.visibility = "hidden";
      tl.to(fly, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 4, duration: .65, ease: "power3.inOut" }, .1)
        .add(function () { fly.remove(); target.style.visibility = ""; });
    } else tl.to(vImgs[front], { opacity: 0, duration: .3 }, 0);
    tl.to(vDim, { opacity: 0, duration: .45 }, .25);
  }
  $$(".tape").forEach(function (t) {
    var s = { title: t.dataset.gallery, items: null };
    $$(".tape-open", t).forEach(function (b) {
      b.addEventListener("click", function () { s.items = itemsFromTape(t); openViewer(s, framesOf(t).indexOf(b.closest(".tape-f")), $("img", b)); });
    });
  });
  // projects with their own sheet (EcoFurChild): pictures and facts come from a <template>
  $$("[data-project]").forEach(function (btn) {
    var tpl = document.getElementById("project-" + btn.dataset.project); if (!tpl) return;
    var d = tpl.content.firstElementChild, imgs = $$("img", d);
    var s = { title: d.dataset.title, meta: { kicker: d.dataset.kicker, title: d.dataset.title, line: d.dataset.line, facts: $("dl", d).innerHTML },
      items: imgs.map(function (im) { return { src: im.getAttribute("src"), alt: im.alt, w: +im.getAttribute("width"), h: +im.getAttribute("height"), cap: "", el: null }; }) };
    s.items[0].el = $("img", btn);
    btn.addEventListener("click", function () { openViewer(s, 0, $("img", btn)); });
  });
  $(".viewer-x", V).addEventListener("click", closeViewer);
  vDim.addEventListener("click", closeViewer);
  $(".viewer-prev", V).addEventListener("click", function () { step(-1); });
  $(".viewer-next", V).addEventListener("click", function () { step(1); });
  V.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeViewer(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); else trap(V, e);
  });
  var tx = null;
  V.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  V.addEventListener("touchend", function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); tx = null; });

  /* ---------------------------------------------------------------- film player */
  var F = $("#film-dialog"), fBox = $(".film-box", F), fStage = $(".film-stage", F), fTitle = $(".film-title", F), fLast = null;
  function openFilm(btn) {
    fLast = btn; var yt = btn.dataset.yt, src = btn.dataset.src, title = btn.dataset.film || "Film";
    fTitle.textContent = title;
    if (yt) fStage.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&rel=0" title="' + title.replace(/"/g, "") + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    else { fStage.innerHTML = ""; var v = document.createElement("video"); v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true; fStage.appendChild(v); }
    F.hidden = false; lock();
    tween($(".film-dim", F), { opacity: 1, duration: .4 }); if (G && !reduce) G.fromTo(fBox, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, ease: ease, delay: .1 }); else fBox.style.opacity = 1;
    $(".film-x", F).focus();
  }
  function closeFilm() {
    if (F.hidden) return;
    var end = function () { F.hidden = true; fStage.innerHTML = ""; unlock(); if (fLast) fLast.focus({ preventScroll: true }); };
    if (G && !reduce) G.timeline({ onComplete: end }).to(fBox, { opacity: 0, duration: .25 }).to($(".film-dim", F), { opacity: 0, duration: .3 }, 0); else end();
  }
  $$(".play-film").forEach(function (b) { b.addEventListener("click", function () { openFilm(b); }); });
  $(".film-x", F).addEventListener("click", closeFilm);
  $(".film-dim", F).addEventListener("click", closeFilm);
  F.addEventListener("keydown", function (e) { if (e.key === "Escape") closeFilm(); else trap(F, e); });

  /* ---------------------------------------------------------------- Dark: a thin line follows the process film's playback */
  $$(".art-process").forEach(function (a) {
    var v = $(".proc-v", a), bar = $(".proc-bar i", a);
    if (v && bar) v.addEventListener("timeupdate", function () { if (v.duration) bar.style.transform = "scaleX(" + (v.currentTime / v.duration).toFixed(3) + ")"; });
  });

  /* ---------------------------------------------------------------- services: each one opens a side panel with its details */
  var SP = $("#svc-panel");
  if (SP) {
    var sBox = $(".svc-box", SP), sDim = $(".svc-dim", SP), sLast = null;
    var openSvc = function (btn) {
      sLast = btn;
      $$(".svc-s", SP).forEach(function (sec) { sec.hidden = sec.dataset.svc !== btn.dataset.svc; });
      var cur = $('.svc-s[data-svc="' + btn.dataset.svc + '"]', SP);
      SP.setAttribute("aria-labelledby", cur ? $(".svc-h", cur).id : "");
      SP.removeAttribute("aria-label");
      SP.hidden = false; sBox.scrollTop = 0; lock();
      if (G && !reduce) {
        G.timeline().fromTo(sDim, { opacity: 0 }, { opacity: 1, duration: .4, ease: "power2.out" })
          .fromTo(sBox, { xPercent: 100 }, { xPercent: 0, duration: .6, ease: ease }, 0)
          .fromTo(cur ? cur.children : [], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .04, ease: ease }, .25);
      }
      $(".svc-x", SP).focus();
    };
    var closeSvc = function () {
      if (SP.hidden) return;
      var end = function () { SP.hidden = true; unlock(); if (sLast) sLast.focus({ preventScroll: true }); };
      if (G && !reduce) G.timeline({ onComplete: end }).to(sBox, { xPercent: 100, duration: .4, ease: "power2.in" }).to(sDim, { opacity: 0, duration: .35 }, .05);
      else end();
    };
    $$(".svc-b").forEach(function (b) { b.addEventListener("click", function () { openSvc(b); }); });
    $(".svc-x", SP).addEventListener("click", closeSvc);
    sDim.addEventListener("click", closeSvc);
    SP.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSvc(); else trap(SP, e); });
  }

  /* ---------------------------------------------------------------- music: official Spotify embeds, nothing hosted here */
  var P = $("#player"), pT = $(".player-t", P), pB = $(".player-b", P), pBtn = null;
  function closePlayer() { P.classList.remove("is-open"); if (pBtn) pBtn.classList.remove("is-playing"); setTimeout(function () { if (!P.classList.contains("is-open")) { P.hidden = true; pB.innerHTML = ""; } }, 450); }
  $$(".listen").forEach(function (b) {
    b.addEventListener("click", function () {
      if (pBtn) pBtn.classList.remove("is-playing");
      pBtn = b; b.classList.add("is-playing");
      pT.textContent = b.dataset.track || "Track";
      pB.innerHTML = '<iframe title="' + (b.dataset.track || "Track").replace(/"/g, "") + ' on Spotify" src="https://open.spotify.com/embed/track/' + b.dataset.spotify + '?utm_source=generator&theme=0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
      P.hidden = false; requestAnimationFrame(function () { P.classList.add("is-open"); });
    });
  });
  $(".player-x", P).addEventListener("click", closePlayer);

  /* ---------------------------------------------------------------- sound on full-screen films */
  $$(".sound").forEach(function (btn) {
    var box = btn.closest(".film-cut, .proc-fig"), v = $("video", box), lbl = $(".sound-l", btn);
    function set(on) { v.muted = !on; btn.setAttribute("aria-pressed", on ? "true" : "false"); lbl.textContent = on ? "Sound off" : "Sound on"; }
    btn.addEventListener("click", function () {
      if (!v.getAttribute("src") && v.dataset.src) { v.src = v.dataset.src; v.load(); }
      var on = v.muted; set(on); v.volume = 1; if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
    if (ST) ST.create({ trigger: box, start: "top bottom", end: "bottom top", onToggle: function (st) { if (!st.isActive) set(false); } });
  });

  /* ---------------------------------------------------------------- copy email */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.dataset.copy, done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy email"; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, function () {}); else done();
    });
  });


  /* ---------------------------------------------------------------- level map: CSS 3D blocks, drag to orbit, play the route */
  (function () {
    var scene = $("#lvScene"), world = $("#lvWorld"); if (!scene) return;
    var C = { clue: "#39ffb0", none: "#ff6b9a", env: "#ffd36b", off: "#ffa24c", spawn: "#39ffb0" };
    var rooms = [["WC", 48, 30, 215, 135, "off", 34], ["WC", 48, 150, 215, 250, "off", 34], ["Canteen", 305, 30, 473, 175, "none", 64], ["Storage room", 490, 30, 657, 175, "clue", 82],
      ["Co-working space", 672, 30, 840, 410, "none", 64], ["CFO office", 415, 268, 580, 413, "env", 56], ["IT office", 415, 503, 570, 648, "clue", 82], ["CEO office", 600, 503, 840, 648, "clue", 82], ["Elevator", 287, 662, 345, 718, "spawn", 22]];
    var kind = { clue: "Interactive clue zone", none: "Non-clue area", env: "Interactive environment", off: "Non-accessible area", spawn: "Spawn, start" };
    var h = '<div class="lv-grid"></div><div class="lv-floor" style="left:230px;top:30px;width:610px;height:618px"></div>';
    rooms.forEach(function (r) {
      var w = r[3] - r[1], d = r[4] - r[2];
      h += '<div class="lv-box" data-name="' + r[0] + '" data-kind="' + kind[r[5]] + '" style="left:' + r[1] + "px;top:" + r[2] + "px;width:" + w + "px;height:" + d + "px;--h:" + r[6] + "px;--d:" + d + "px;--w:" + w + "px;--c:" + C[r[5]] + '"><i class="f"></i><i class="n"></i><i class="s"></i><i class="w"></i><i class="e"></i><i class="t"><b>' + r[0] + "</b></i></div>";
    });
    [[235, 244], [395, 272], [650, 196], [832, 433]].forEach(function (c) { h += '<span class="lv-cam" style="left:' + c[0] + "px;top:" + c[1] + 'px"></span>'; });
    var route = "M316,690 L316,455 L316,345 M316,455 L625,455 M627,555 L627,150 M338,237 L627,237 M338,237 L338,145 M627,378 L712,378 M495,455 L495,505";
    // the player leaves the lift, turns right along the corridor and steps into every room on the line before moving on
    var walk = "M316,690 L316,455 L495,455 L495,575 L495,455 L627,455 L627,580 L627,455 L627,378 L756,378 L627,378 L627,237 L627,150 L627,237 L338,237 L338,120 L338,237 L316,237 L316,455 L316,690";
    h += '<svg class="lv-svg" viewBox="0 0 870 750"><path class="lv-route" d="' + route + '"/><circle class="lv-player" r="9"><animateMotion id="lvMove" dur="26s" repeatCount="indefinite" begin="indefinite" path="' + walk + '"/></circle></svg>';
    world.innerHTML = h; scene.classList.add("ready");
    var rx = 56, rz = -32, sc = .72;
    function fitS() { return Math.min(scene.clientWidth / 1000, scene.clientHeight / 820); }
    function apply() { world.style.transform = "scale(" + (sc * fitS() / .72).toFixed(3) + ") rotateX(" + rx.toFixed(1) + "deg) rotateZ(" + rz.toFixed(1) + "deg)"; }
    apply();
    // the map wakes into live 3D on the first touch, hover or control; until then a still of this exact view is shown
    function wake() { if (!scene.classList.contains("live")) { scene.classList.add("live"); apply(); } }
    scene.addEventListener("pointerenter", wake);
    var drag = null;
    scene.addEventListener("pointerdown", function (e) { wake(); drag = { x: e.clientX, y: e.clientY, rx: rx, rz: rz }; scene.classList.add("drag"); scene.setPointerCapture(e.pointerId); });
    scene.addEventListener("pointermove", function (e) { if (!drag) return; rz = drag.rz + (e.clientX - drag.x) * .3; rx = Math.max(0, Math.min(78, drag.rx - (e.clientY - drag.y) * .25)); apply(); });
    function end() { drag = null; scene.classList.remove("drag"); }
    scene.addEventListener("pointerup", end); scene.addEventListener("pointercancel", end);
    var tip = $("#lvTip");
    world.addEventListener("pointerover", function (e) { var b = e.target.closest(".lv-box"); if (!b) return; tip.hidden = false; tip.textContent = b.dataset.name + ", " + b.dataset.kind.toLowerCase(); });
    world.addEventListener("pointerout", function (e) { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".lv-box")) tip.hidden = true; });
    var mv = document.getElementById("lvMove");
    $$(".lv-ctrl button").forEach(function (b) {
      b.addEventListener("click", function () {
        wake();
        var v = b.dataset.v, z = b.dataset.z, r = b.dataset.r;
        if (r) { rz += (+r) * 45; apply(); return; }
        if (z) { sc = Math.max(.45, Math.min(1.4, sc + (+z) * .12)); apply(); return; }
        if (v === "route") { var on = !scene.classList.contains("play"); scene.classList.toggle("play", on); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); if (on && mv && mv.beginElement) mv.beginElement(); return; }
        $$(".lv-ctrl [data-v='3d'], .lv-ctrl [data-v='top']").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
        if (v === "top") { rx = 0; rz = 0; } else { rx = 56; rz = -32; }
        apply();
      });
    });
    addEventListener("resize", apply);
  })();

  if (ST) { ST.sort(); ST.refresh(); }
})();
