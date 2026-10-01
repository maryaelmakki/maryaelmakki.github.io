try{
/* =====================================================================
   ENHANCEMENT LAYER · motion choreography
   Vanilla, no libraries: the site already runs its own inertial scroller and
   pinned scenes, so GSAP/Lenis would only fight them. Everything here animates
   transform, opacity or filter, and stands down for prefers-reduced-motion.
   ===================================================================== */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 0: "+(e&&e.message||e))}
try{
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  var pending = [];
  function once(els, cb, margin) {
    if (!("IntersectionObserver" in window) || reduce) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) fire(e.target); });
    }, { rootMargin: margin || "0px 0px -12% 0px", threshold: 0 });
    function fire(el) { if (el.__done) return; el.__done = true; io.unobserve(el); cb(el); }
    els.forEach(function (el) { io.observe(el); pending.push({ el: el, fire: fire }); });
  }
  // safety net: a fast flick or a menu jump can skip past an element between observer ticks;
  // anything whose top has already passed the bottom of the screen gets revealed
  var sweepT = null;
  function sweep() {
    sweepT = null; var vh = innerHeight;
    pending = pending.filter(function (p) {
      if (p.el.__done) return false;
      if (p.el.getBoundingClientRect().top < vh * 0.92) { p.fire(p.el); return false; }
      return true;
    });
  }
  addEventListener("scroll", function () { if (!sweepT) sweepT = setTimeout(sweep, 120); }, { passive: true });

  /* ---------- film grain (signature) ---------- */
  /* (film grain removed: a full-screen animated layer cost too much on everyday laptops) */

  /* ---------- word splitter: wraps words in text nodes, keeps <em>, <br>, links ---------- */
  function split(el, cls) {
    var n = 0, walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (t) {
      if (!t.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span"); w.className = cls;
        var i = document.createElement("span"); i.textContent = part; i.style.setProperty("--wi", n++);
        w.appendChild(i); frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
    return n;
  }

  /* ---------- hero: cinematic title, then labels, rule, caption and cue in sequence ---------- */
  var hero = document.querySelector(".hero.cover"), title = hero && hero.querySelector(".cover-title");
  if (title) {
    $$(".ln > span", title).forEach(function (s) { split(s, "cw"); });
    // continue the word index across both lines so the stagger reads as one sentence
    $$(".cw > span", title).forEach(function (s, i) { s.style.setProperty("--wi", i); });
    title.classList.add("split-ready");
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("go"); }); });
  }

  /* ---------- section headings: word-by-word reveal ---------- */
  var heads = $$("main h3.d1, main h3.d2, main h4.d2, main h2.d2, main .pg-h, main .bj-h, main .eco-h, main .bj-facts h4, main .tagline")
    .filter(function (h) { return !h.closest(".chapter, .gor, .hero, template"); });
  heads.forEach(function (h) {
    h.classList.remove("rise"); h.classList.add("in");   // the word reveal replaces the old block fade
    split(h, "hw");
  });
  once(heads, function (h) { h.classList.add("words-in"); }, "0px 0px -8% 0px");

  /* ---------- staggered entrances for grids of cards ---------- */
  var groups = [".crs-grid", ".cards", ".bb-grid", ".mhl-grid", ".eco-pts", ".feat3", ".lv-legend", ".bj-pass dl", ".pillars", ".sus-row"];
  groups.forEach(function (sel) {
    $$(sel).forEach(function (g) {
      var kids = [].filter.call(g.children, function (k) { return k.offsetParent !== null || k.tagName !== "TEMPLATE"; });
      kids.forEach(function (k, i) {
        k.classList.remove("rise"); k.classList.add("in", "st-item"); k.style.setProperty("--si", i);
      });
      once([g], function (x) { x.classList.add("st-on"); });
    });
  });

  /* ---------- grid-break: giant chapter numerals, drifting against the scroll ---------- */
  var ghosts = [];
  $$(".chapter").forEach(function (ch) {
    var num = ch.querySelector(".num"), inn = ch.querySelector(".chapter-in"); if (!num || !inn) return;
    var gn = document.createElement("span"); gn.className = "ghost-num"; gn.setAttribute("aria-hidden", "true");
    gn.textContent = num.textContent.trim();
    inn.insertBefore(gn, inn.querySelector(".wrap"));
    ghosts.push({ el: gn, sec: ch });
  });
  if (!reduce && ghosts.length) {
    var tk = false;
    var drift = function () {
      tk = false; var vh = innerHeight;
      ghosts.forEach(function (o) {
        var r = o.sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;          // -1..1 around the centre
        o.el.style.setProperty("--gy", (p * 90).toFixed(1) + "px");
      });
    };
    addEventListener("scroll", function () { if (!tk) { tk = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }


  /* =====================================================================
     STORY LAYER · between the hand and the machine
     One visual language, used three times: a hand line (wobbly, drawn) and a
     machine line (ruled, ticked). Hero underlines, the title block in the
     corner (like an architectural drawing sheet), and the path in About.
     ===================================================================== */
  var SVGNS = "http://www.w3.org/2000/svg";
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e;
  }
  // a hand line: deterministic wobble so it looks drawn, not random every load
  function wob(t, seed) { return Math.sin(t * 0.21 + seed) * 0.55 + Math.sin(t * 0.083 + seed * 2.1) * 0.9 + Math.sin(t * 0.47 + seed * .7) * 0.25; }

  /* ---------- hero: a pen stroke under "hand", a ruler under "machine" ---------- */
  function heroMarks() {
    if (!title) return;
    $$(".hm-mark", title).forEach(function (m) { m.remove(); });
    var words = $$(".cw", title);
    function find(w) { return words.filter(function (c) { return c.textContent.trim().toLowerCase() === w; })[0]; }
    [["hand", "hand"], ["machine", "machine"]].forEach(function (pair) {
      var cw = find(pair[0]); if (!cw) return;
      var host = cw.parentNode, hr = host.getBoundingClientRect(), r = cw.getBoundingClientRect();
      var w = r.width, fs = parseFloat(getComputedStyle(title).fontSize);
      var svg = mk("svg", { "class": "hm-mark hm-" + pair[1], "aria-hidden": "true", viewBox: "0 0 " + w.toFixed(0) + " 24", preserveAspectRatio: "none" });
      svg.style.left = (r.left - hr.left) + "px"; svg.style.width = w + "px";
      svg.style.top = (r.bottom - hr.top - fs * (pair[1] === "hand" ? 0.1 : 0.02)) + "px";
      if (pair[1] === "hand") {
        var d = "M" + (w * .01) + ",14 C" + (w * .22) + ",8 " + (w * .52) + ",15 " + (w * .8) + ",10 S" + (w * 1.0) + ",7 " + (w * 1.05) + ",9 Q" + (w * .8) + ",15 " + (w * .46) + ",17";
        mk("path", { d: d, pathLength: 1, "class": "hm-draw" }, svg);
      } else {
        mk("path", { d: "M0,8 H" + w, pathLength: 1, "class": "hm-draw" }, svg);
        var t = "", n = 16;
        for (var i = 0; i <= n; i++) { var x = (w * i / n).toFixed(1), h = i % 4 === 0 ? 16 : 12; t += "M" + x + ",8 V" + h + " "; }
        mk("path", { d: t, "class": "hm-ticks" }, svg);
      }
      host.appendChild(svg);
    });
  }
  /* (hero underlines removed at Marya's request) */

  /* ---------- title block: the corner of every drawing sheet ---------- */
  var tbSecs = [];   /* title block removed at Marya's request; the plain counter is back */
  if (tbSecs.length) {
    var tb = document.createElement("aside");
    tb.className = "tb"; tb.setAttribute("aria-label", "Current project and how it was made"); tb.tabIndex = 0;
    tb.innerHTML =
      '<div class="tb-r1"><b class="tb-p"></b><span class="tb-n"><span class="tb-i">00</span> of 10</span></div>' +
      '<div class="tb-scale"><span>Hand</span><span class="tb-track"><svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true"></svg><i class="tb-mk"></i></span><span>Machine</span></div>' +
      '<div class="tb-more"><div><p class="tb-m"></p><p class="tb-s"></p></div></div>';
    document.body.appendChild(tb);
    // the scale: wobbly on the hand side, calming into a ruled, ticked line on the machine side
    var sv = tb.querySelector("svg"), d = "M0," + (8 + wob(0, 1) * 2.4).toFixed(2);
    for (var x = 3; x <= 200; x += 3) {
      var a = 2.6 * Math.pow(Math.max(0, 1 - x / 120), 1.4);
      d += " L" + x + "," + (8 + wob(x * 1.6, 1) * a).toFixed(2);
    }
    mk("path", { d: d, "class": "tb-line" }, sv);
    var tk = "";
    for (var x2 = 110; x2 <= 200; x2 += 10) { var h2 = (x2 % 50 === 0) ? 4.5 : 2.6; tk += "M" + x2 + "," + (8 - h2) + " V" + (8 + h2) + " "; }
    mk("path", { d: tk, "class": "tb-ticks" }, sv);

    var elP = tb.querySelector(".tb-p"), elI = tb.querySelector(".tb-i"), elM = tb.querySelector(".tb-m"),
        elS = tb.querySelector(".tb-s"), mkr = tb.querySelector(".tb-mk"), track = tb.querySelector(".tb-track");
    var cur = null, openT = null, pinned = false, hover = false;
    // a project inherits the chapter's reading until it sets its own
    function reading(sec) {
      var i = tbSecs.indexOf(sec), o = { p: sec.dataset.tb, hm: +sec.dataset.hm, m: sec.dataset.tbm || "", s: sec.dataset.tbs || "" };
      for (var j = i; j >= 0 && (!o.m); j--) {
        var c = tbSecs[j];
        if (c.dataset.tbm) o.m = c.dataset.tbm;
        else if (c.classList.contains("chapter")) { var sub = c.querySelector(".sub"); if (sub) o.m = sub.textContent.trim(); }
      }
      o.i = sec.getAttribute("data-idx") || "00";
      return o;
    }
    function place() { mkr.style.transform = "translateX(" + (cur ? 6 + cur.hm * (track.clientWidth - 12) : 6).toFixed(1) + "px)"; }
    function openFor(ms) {
      tb.classList.add("open"); clearTimeout(openT);
      if (!pinned) openT = setTimeout(function () { if (!hover && !pinned) tb.classList.remove("open"); }, ms);
    }
    function show(sec) {
      if (!sec) { tb.classList.remove("on"); cur = null; return; }
      var o = reading(sec);
      if (cur && cur.p === o.p && cur.m === o.m) return;
      var first = !cur; cur = o;
      tb.classList.add("on", "swap");
      setTimeout(function () {
        elP.textContent = o.p; elI.textContent = o.i; elM.textContent = o.m; elS.textContent = o.s;
        tb.classList.toggle("no-s", !o.s); tb.classList.remove("swap"); place();
      }, first ? 0 : 160);
      openFor(first ? 4200 : 3200);
    }
    var tbTick = false;
    function scan() {
      tbTick = false; var mid = innerHeight * 0.55, found = null;
      var hero0 = document.querySelector(".hero");
      if (hero0 && hero0.getBoundingClientRect().bottom > innerHeight * 0.4) { show(null); return; }
      for (var i = 0; i < tbSecs.length; i++) { if (tbSecs[i].getBoundingClientRect().top <= mid) found = tbSecs[i]; else break; }
      show(found);
    }
    addEventListener("scroll", function () { if (!tbTick) { tbTick = true; requestAnimationFrame(scan); } }, { passive: true });
    addEventListener("resize", place);
    tb.addEventListener("pointerenter", function () { hover = true; tb.classList.add("open"); });
    tb.addEventListener("pointerleave", function () { hover = false; if (!pinned) openFor(900); });
    tb.addEventListener("focus", function () { tb.classList.add("open"); });
    tb.addEventListener("blur", function () { if (!pinned) tb.classList.remove("open"); });
    tb.addEventListener("click", function () { pinned = !pinned; tb.classList.toggle("pinned", pinned); if (pinned) tb.classList.add("open"); else openFor(600); });
    setTimeout(scan, 300);
  }

  /* ---------- About: two lines, hand and structure, that meet in 2024 ---------- */
  $$(".path").forEach(function (box) {
    var grid = box.querySelector(".path-grid"), svg = box.querySelector(".path-svg"), key = box.querySelector(".path-key");
    var items = $$(".path-list > li", box);
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var g = grid.getBoundingClientRect(), W = g.width, H = g.height;
      svg.setAttribute("viewBox", "0 0 " + W.toFixed(0) + " " + H.toFixed(0));
      var vertical = getComputedStyle(grid).getPropertyValue("--path-dir").trim() === "v";
      var fin = items[items.length - 1], fr = fin.getBoundingClientRect();
      var hand = "", rule = "", ticks = "", dots = [];
      if (!vertical) {
        var rr = box.querySelector(".on-rule").getBoundingClientRect();
        var band = rr.top - g.top - 70, yh = band + 20, yr = band + 50, yf = band + 35;
        key.style.top = band + "px";
        var x0 = key.getBoundingClientRect().right - g.left + 10, xf = fr.left - g.left, xm = xf - 64;
        hand = "M" + x0 + "," + (yh + wob(x0, 2) * 1.6).toFixed(1);
        for (var x = x0 + 5; x <= xm; x += 5) hand += " L" + x.toFixed(0) + "," + (yh + wob(x, 2) * 1.6).toFixed(1);
        hand += " C" + (xm + 36) + "," + yh + " " + (xf - 30) + "," + yf + " " + xf + "," + yf;
        rule = "M" + x0 + "," + yr + " H" + xm + " L" + xf + "," + yf;
        for (var t = x0, n = 0; t <= xm; t += 16, n++) { var h = n % 5 === 0 ? 7 : 4; ticks += "M" + t.toFixed(0) + "," + yr + " V" + (yr + h) + " "; }
        items.forEach(function (li) {
          var lx = li.getBoundingClientRect().left - g.left;
          if (li.classList.contains("on-hand")) dots.push([lx, yh + wob(lx, 2) * 1.6, 0]);
          else if (li.classList.contains("on-rule")) dots.push([lx, yr, 0]);
          else dots.push([lx, yf, 1]);
        });
      } else {
        key.style.top = ""; var xh = 12, xr = 38, xfv = 25, y0 = items[0].getBoundingClientRect().top - g.top + 4;
        var yfv = fr.top - g.top + 14, ymv = yfv - 64;
        hand = "M" + (xh + wob(y0 * .5, 3) * .9).toFixed(1) + "," + y0;
        for (var y = y0 + 5; y <= ymv; y += 5) hand += " L" + (xh + wob(y * .5, 3) * .9).toFixed(1) + "," + y.toFixed(0);
        hand += " C" + xh + "," + (ymv + 36) + " " + xfv + "," + (yfv - 30) + " " + xfv + "," + yfv;
        rule = "M" + xr + "," + y0 + " V" + ymv + " L" + xfv + "," + yfv;
        for (var t2 = y0, n2 = 0; t2 <= ymv; t2 += 16, n2++) { var h3 = n2 % 5 === 0 ? 7 : 4; ticks += "M" + xr + "," + t2.toFixed(0) + " H" + (xr + h3) + " "; }
        items.forEach(function (li) {
          var ly = li.getBoundingClientRect().top - g.top + 14;
          if (li.classList.contains("on-hand")) dots.push([xh + wob(ly * .5, 3) * .9, ly, 0]);
          else if (li.classList.contains("on-rule")) dots.push([xr, ly, 0]);
          else dots.push([xfv, yfv, 1]);
        });
      }
      mk("path", { d: hand, pathLength: 1, "class": "pl pl-hand" }, svg);
      mk("path", { d: rule, pathLength: 1, "class": "pl pl-rule" }, svg);
      mk("path", { d: ticks, "class": "pl-ticks" }, svg);
      dots.forEach(function (p, i) {
        var c = mk("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: p[2] ? 6.5 : 3.6, "class": p[2] ? "pd pd-f" : "pd" }, svg);
        c.style.setProperty("--di", i);
      });
    }
    draw();
    var pT; addEventListener("resize", function () { clearTimeout(pT); pT = setTimeout(draw, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    once([box], function (b) { draw(); b.classList.add("drawn"); }, "0px 0px -18% 0px");
  });



  /* ---------- Index: full-screen list, a still from each chapter follows the hover ---------- */
  (function () {
    var nav = document.getElementById("nav"), prev = nav && nav.querySelector(".idx-prev"), pim = prev && prev.querySelector("img");
    if (!prev) return;
    $$("#navList a.link").forEach(function (a, i) {
      a.style.setProperty("--i", i);
      a.addEventListener("pointerenter", function () { var u = a.getAttribute("data-img"); if (u && pim.getAttribute("src") !== u) { prev.classList.remove("on"); pim.onload = function () { prev.classList.add("on"); }; pim.src = u; } else prev.classList.add("on"); });
      a.addEventListener("pointerleave", function () { prev.classList.remove("on"); });
    });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) document.getElementById("menuBtn").click(); });
  })();

  /* ---------- Gorilla wall: two columns drifting at different speeds, copy lights up in step ---------- */
  $$(".gw").forEach(function (sec) {
    var cols = $$(".gw-col[data-par]", sec), pts = $$(".pt", sec), wall = sec.querySelector(".gw-wall");
    var wide = matchMedia("(min-width: 901px)");
    var tick = false;
    function run() {
      tick = false; var vh = innerHeight, r = wall.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      if (!reduce && wide.matches) cols.forEach(function (c) {
        var cr = c.getBoundingClientRect(), off = (cr.top + cr.height / 2 - vh / 2);
        c.style.transform = "translate3d(0," + (off * +c.dataset.par).toFixed(1) + "px,0)";
      }); else cols.forEach(function (c) { c.style.transform = ""; });
      if (wide.matches && pts.length) {
        var p = (vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.3);
        var i = Math.max(0, Math.min(pts.length - 1, Math.floor(p * pts.length)));
        sec.classList.add("reading");
        pts.forEach(function (x, k) { x.classList.toggle("now", k === i); });
      }
    }
    addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    addEventListener("resize", run); run();
  });


  /* ---------- keyframe tapes: compact, native sideways scrolling (trackpad, shift + wheel, drag, arrows),
     the page keeps scrolling down normally, so the viewer chooses ---------- */
  $$(".tape-sec").forEach(function (sec) {
    var wrap = sec.querySelector(".strip-wrap"), strip = sec.querySelector(".strip"), frames = $$(".kfr", strip);
    var bar = sec.querySelector(".tape-prog i"), head = sec.querySelector(".strip-head");
    if (!wrap || !frames.length) return;
    sec.classList.add("tape-native");
    wrap.tabIndex = 0; wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", (head && head.querySelector(".eyebrow") ? head.querySelector(".eyebrow").textContent : "Keyframes") + ", scroll sideways");
    // controls: counter + previous / next
    var ctl = document.createElement("div"); ctl.className = "tape-ctl";
    ctl.innerHTML = '<span class="tape-n"><b>01</b> / ' + String(frames.length).padStart(2, "0") + '</span>' +
      '<button type="button" class="tape-b prev" aria-label="Previous keyframe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="tape-b next" aria-label="Next keyframe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
    (head || sec).appendChild(ctl);
    var num = ctl.querySelector("b"), prev = ctl.querySelector(".prev"), next = ctl.querySelector(".next");
    function step() { return frames.length > 1 ? frames[1].offsetLeft - frames[0].offsetLeft : wrap.clientWidth * 0.6; }
    var cur = 0;
    function goTo(i) {
      i = Math.max(0, Math.min(frames.length - 1, i));
      var f = frames[i], left = f.offsetLeft + f.offsetWidth / 2 - wrap.clientWidth / 2;
      wrap.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
    }
    prev.addEventListener("click", function () { goTo(cur - 1); });
    next.addEventListener("click", function () { goTo(cur + 1); });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });
    // focus effect: the frame nearest the middle is full size and bright, the others step back a little
    var ticking = false;
    function paint() {
      ticking = false;
      var w = wrap.getBoundingClientRect(), mid = w.left + w.width / 2, best = 0, bd = 1e9;
      frames.forEach(function (f, i) {
        var r = f.getBoundingClientRect(), c = r.left + r.width / 2, d = Math.abs(c - mid);
        if (d < bd) { bd = d; best = i; }
        var k = Math.min(1, d / (w.width * 0.55));
        f.style.setProperty("--k", k.toFixed(3));
      });
      cur = best; num.textContent = String(best + 1).padStart(2, "0");
      var max = wrap.scrollWidth - wrap.clientWidth;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? wrap.scrollLeft / max : 0).toFixed(4) + ")";
      prev.disabled = wrap.scrollLeft < 4; next.disabled = wrap.scrollLeft > max - 4;
    }
    wrap.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener("resize", paint);
    // mouse drag with a little momentum (touch and trackpads are already native)
    var down = false, sx = 0, sl = 0, lx = 0, lt = 0, v = 0, moved = false;
    wrap.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = lx = e.clientX; sl = wrap.scrollLeft; lt = performance.now(); v = 0;
      wrap.classList.add("dragging");
    });
    addEventListener("pointermove", function (e) {
      if (!down) return;
      var now = performance.now(); v = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
      if (Math.abs(e.clientX - sx) > 4) moved = true;
      wrap.scrollLeft = sl - (e.clientX - sx);
    });
    addEventListener("pointerup", function () {
      if (!down) return; down = false;
      var vel = -v * 16;
      (function glide() {
        if (Math.abs(vel) < 0.5 || reduce) { wrap.classList.remove("dragging"); return; }
        wrap.scrollLeft += vel; vel *= 0.92; requestAnimationFrame(glide);
      })();
    });
    wrap.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    wrap.addEventListener("dragstart", function (e) { e.preventDefault(); });
    // entrance: the tape slides in from the right as the section arrives
    once([sec], function (x) { x.classList.add("tape-in"); setTimeout(paint, 50); }, "0px 0px -10% 0px");
    paint();
  });

  /* ---------- ambient light: a soft glow behind the page that takes on each project's colour as you scroll ---------- */
  var AMB = {
    "AI Film": ["oklch(26% .07 305)", "oklch(18% .02 300)"],
    "From Toba With Love": ["oklch(26% .07 305)", "oklch(18% .02 300)"],
    "Lover's Shell": ["oklch(25% .08 300)", "oklch(17% .02 290)"],
    "The Copper Stranger": ["oklch(34% .08 45)", "oklch(22% .05 320)"],
    "Systems and Training": ["oklch(30% .045 80)", "oklch(22% .05 305)"],
    "Proposal system": ["oklch(30% .045 80)", "oklch(22% .05 305)"],
    "Masterclasses": ["oklch(30% .05 80)", "oklch(24% .05 305)"],
    "Visual Direction": ["oklch(26% .05 320)", "oklch(20% .04 305)"],
    "Gorilla Energy Drink": ["oklch(28% .07 40)", "oklch(22% .07 305)"],
    "Instinct": ["oklch(36% .06 65)", "oklch(26% .03 40)"],
    "Evolution": ["oklch(36% .06 65)", "oklch(26% .03 40)"],
    "A model": ["oklch(32% .05 15)", "oklch(26% .04 300)"],
    "Liwa Festival teaser": ["oklch(38% .08 62)", "oklch(28% .06 10)"],
    "Between Two Worlds": ["oklch(32% .1 300)", "oklch(28% .08 330)"],
    "Handmade Rugs": ["oklch(30% .09 20)", "oklch(26% .04 60)"],
    "Remember": ["oklch(30% .09 20)", "oklch(26% .04 60)"],
    "Branding": ["oklch(30% .06 150)", "oklch(22% .05 305)"],
    "EcoFurChild": ["oklch(34% .07 150)", "oklch(28% .04 120)"],
    "Majesty": ["oklch(32% .02 80)", "oklch(26% .015 250)"],
    "Concept to print-ready": ["oklch(30% .08 350)", "oklch(22% .05 305)"],
    "3D Design": ["oklch(24% .06 300)", "oklch(18% .02 300)"],
    "Digital characters": ["oklch(28% .08 300)", "oklch(18% .02 300)"],
    "Level Concept": ["oklch(22% .05 305)", "oklch(16% .015 300)"],
    "Detective VR": ["oklch(22% .05 305)", "oklch(16% .015 300)"],
    "About": ["oklch(30% .08 310)", "oklch(26% .04 80)"],
    "Contact": ["oklch(32% .1 315)", "oklch(26% .05 280)"]
  };
  var ambSecs = $$("main section[data-tb]").filter(function (x) { return AMB[x.dataset.tb]; });
  if (ambSecs.length && CSS.supports && CSS.supports("color", "oklch(50% .1 200)")) {
    var amb = document.createElement("div"); amb.className = "amb"; amb.setAttribute("aria-hidden", "true");
    amb.innerHTML = "<i></i><i></i>";
    document.body.insertBefore(amb, document.body.firstChild);
    document.documentElement.classList.add("has-amb");
    // colours blend with the scroll itself: between two sections the light is mixed by how far you are
    function parse(str) { var m = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(str); return m ? [+m[1], +m[2], +m[3]] : [28, .04, 300]; }
    var pal = ambSecs.map(function (x) { var c = AMB[x.dataset.tb]; return [parse(c[0]), parse(c[1])]; });
    function mixH(a, b, t) { var d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, mixH(a[2], b[2], t)]; }
    function css(c, l, k) { return "oklch(" + (l != null ? l : c[0]).toFixed(1) + "% " + (c[1] * (k || 1)).toFixed(3) + " " + c[2].toFixed(1) + ")"; }
    var aT = false;
    function ambRun() {
      aT = false; var mid = innerHeight * 0.5, i = -1;
      for (var k = 0; k < ambSecs.length; k++) { if (ambSecs[k].getBoundingClientRect().top <= mid) i = k; else break; }
      var A = pal[Math.max(0, i)], e = 0;
      if (i >= 0) {
        var top = ambSecs[i].getBoundingClientRect().top, nx = ambSecs[i + 1];
        var end = nx ? nx.getBoundingClientRect().top : ambSecs[i].getBoundingClientRect().bottom;
        var sm = function (a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
        // colour lives inside a project; every hand-over passes through black, over about half a screen each side
        var r = innerHeight * 0.55, len = end - top;
        if (len < r * 2.2) r = len / 2.2;
        e = sm(0, r, mid - top) * (1 - sm(-r, 0, mid - end));
      }
      var base = 15, lift = function (c, L) { return [base, 0, c[2]]; };
      amb.style.setProperty("--a0", css(lift(A[0], 16.5), null, 0.38));
      amb.style.setProperty("--a1", css(lift(A[0], A[0][0])));
      amb.style.setProperty("--a2", css(lift(A[1], A[1][0])));
      amb.style.setProperty("--ae", e.toFixed(3));
      amb.style.setProperty("--smk", (-scrollY * 0.04 % 400).toFixed(1) + "px"); amb.style.setProperty("--smk2", (-scrollY * 0.07 % 500).toFixed(1) + "px");
    }
    addEventListener("scroll", function () { if (!aT) { aT = true; requestAnimationFrame(ambRun); } }, { passive: true });
    addEventListener("resize", ambRun);
    ambRun();
  }


  /* ---------- Gorilla campaign gallery: mask reveal once + gentle parallax ---------- */
  var gxs = $$(".gx");
  once(gxs, function (g) { g.classList.add("gx-in"); }, "0px 0px -6% 0px");
  if (!reduce && gxs.length) {
    var gT = false;
    var gRun = function () {
      gT = false; var vh = innerHeight;
      gxs.forEach(function (g) {
        var r = g.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;   // -1..1
        g.style.setProperty("--py", (p * -28).toFixed(1) + "px");
      });
    };
    addEventListener("scroll", function () { if (!gT) { gT = true; requestAnimationFrame(gRun); } }, { passive: true });
    gRun();
  }

  /* ---------- failsafe: nothing stays hidden. Anything already on or above the screen is revealed,
     whatever the observers did (embedded viewers, fast jumps, odd browsers) ---------- */
  function failsafe() {
    var vh = innerHeight;
    $$(".reveal:not(.in), .rise:not(.in), .gx:not(.gx-in)").forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.98) el.classList.add(el.classList.contains("gx") ? "gx-in" : "in");
    });
    $$(".crs-grid, .cards, .bb-grid, .mhl-grid, .eco-pts, .feat3, .lv-legend, .pillars").forEach(function (g) {
      if (!g.classList.contains("st-on") && g.getBoundingClientRect().top < vh * 0.98) g.classList.add("st-on");
    });
    $$(".words-in").length;
    $$("h3, h4, h2, .tagline").forEach(function (h) { if (h.querySelector(".hw") && !h.classList.contains("words-in") && h.getBoundingClientRect().top < vh * 0.98) h.classList.add("words-in"); });
  }
  var fsT = null;
  addEventListener("scroll", function () { clearTimeout(fsT); fsT = setTimeout(failsafe, 180); }, { passive: true });
  setInterval(failsafe, 1500);
  addEventListener("load", function () { setTimeout(failsafe, 600); });

  if (!fine || reduce) return;

  /* ---------- spotlight cards (signature) ---------- */
  $$(".crs, .cards > div, .bbox, .eco-sys").forEach(function (c) {
    c.classList.add("spot-host");
    var s = document.createElement("span"); s.className = "spot"; s.setAttribute("aria-hidden", "true"); c.appendChild(s);
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- magnetic CTAs (signature): pull toward the cursor, spring back ---------- */
  $$(".cta, .ab-ctas a, .ff-play, .now-playing").forEach(function (b) {
    b.setAttribute("data-magnetic", "");
    var strength = b.classList.contains("ff-play") ? 0.45 : 0.28;
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * strength, y = (e.clientY - r.top - r.height / 2) * strength;
      b.classList.add("is-pulling"); b.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px";
    });
    b.addEventListener("pointerleave", function () { b.classList.remove("is-pulling"); b.style.translate = "0px 0px"; });
  });
})();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 1: "+(e&&e.message||e))}
