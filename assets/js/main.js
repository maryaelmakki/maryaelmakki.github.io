try{
/* If the page is shown inside a viewer that scrolls an inner element instead of the window, relay those scrolls so every scroll-linked animation still runs */
document.addEventListener("scroll", function (e) { if (e.target !== document) window.dispatchEvent(new Event("scroll")); }, { capture: true, passive: true });

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 0: "+(e&&e.message||e))}
try{
(function(){
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
  function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}

  /* navigation: short hops glide; long jumps dip through a soft veil so the page never whips past */
  var veil = document.createElement("div"); veil.className = "nav-veil"; veil.setAttribute("aria-hidden", "true"); document.body.appendChild(veil);
  var jumping = false;
  function glide(y, dur){
    var y0 = window.scrollY, t0 = performance.now(), d = y - y0;
    (function f(now){ var k = Math.min(1, (now - t0) / dur); k = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; window.scrollTo(0, y0 + d * k); if (k < 1) requestAnimationFrame(f) })(t0);
  }
  function goTo(el){
    if (!el || jumping) return;
    var y = el === document.body ? 0 : el.getBoundingClientRect().top + window.scrollY;
    var dist = Math.abs(y - window.scrollY);
    if (reduce) { window.scrollTo(0, y); return }
    if (dist < innerHeight * 1.6) { glide(y, 700); return }
    jumping = true; veil.classList.add("on");
    setTimeout(function(){
      window.scrollTo(0, y);
      window.dispatchEvent(new Event("scroll"));
      setTimeout(function(){ veil.classList.remove("on"); jumping = false }, 420);
    }, 380);
  }
  var lenis = null;
  /* ---------- nav ---------- */
  var nav = $("#nav"), menuBtn = $("#menuBtn");
  function closeMenu(){ nav.classList.remove("open"); document.documentElement.classList.remove("idx-open"); menuBtn.setAttribute("aria-expanded","false"); menuBtn.textContent="Index"; if(lenis) lenis.start() }
  menuBtn.addEventListener("click", function(){
    var open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Index"; document.documentElement.classList.toggle("idx-open", open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(e){
      var id = a.getAttribute("href").slice(1);
      var t = id === "top" ? document.body : document.getElementById(id);
      if (!t) return;
      e.preventDefault(); closeMenu(); goTo(t);
    });
  });

  /* ---------- review system ---------- */
  var flags = $$(".flag, .flag-note, .add");
  var list = $("#flagList");
  flags.forEach(function(f, i){
    var n = i + 1;
    f.setAttribute("data-n", n);
    var note = f.getAttribute("data-note") || f.textContent.trim();
    if (!f.getAttribute("title")) f.setAttribute("title", note);
    var sec = f.closest("[data-name]");
    var li = document.createElement("li");
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="n"></span><span><span class="sec"></span><span class="t"></span></span>';
    b.querySelector(".n").textContent = n;
    b.querySelector(".sec").textContent = sec ? sec.getAttribute("data-name") : "";
    b.querySelector(".t").textContent = note;
    if (f.classList.contains("add")) b.classList.add("is-add");
    b.addEventListener("click", function(){
      if (window.innerWidth < 700) togglePanel(false);
      var target = f.closest(".hs") ? f.closest("article") || f : f;
      goTo(target);
      setTimeout(function(){ f.classList.remove("pulse"); void f.offsetWidth; f.classList.add("pulse") }, 900);
    });
    li.appendChild(b); list.appendChild(li);
  });
  $("#flagCount").textContent = flags.length;
  $("#flagCount2").textContent = flags.length;
  if (!flags.length) $("#reviewBtn").hidden = true;
  var nAdd = $$(".add").length; if (nAdd) { $("#flagCount").textContent = nAdd + " added"; if (nAdd === flags.length) $("#reviewBtn").classList.add("adds"); }

  function tag(host, text){
    var s = document.createElement("span");
    s.className = "standin-tag"; s.textContent = "Stand-in · " + text;
    host.appendChild(s);
  }
  $$("[data-standin]").forEach(function(el){
    var host = (el.classList.contains("slides") || el.classList.contains("ov-bg") || el.classList.contains("cd") || el.classList.contains("cover-girl")) ? el.parentNode : el;
    tag(host, el.getAttribute("data-standin"));
  });
  $$("[data-standin-img]").forEach(function(im){ tag(im.parentNode, im.getAttribute("data-standin-img")) });
  $$("[data-standin-group]").forEach(function(g){
    var first = g.querySelector(".media"); if (first) tag(first, g.getAttribute("data-standin-group"));
  });

  var panel = $("#reviewPanel"), rBtn = $("#reviewBtn");
  function togglePanel(force){
    var open = typeof force === "boolean" ? force : panel.hidden;
    panel.hidden = !open; rBtn.setAttribute("aria-expanded", String(open));
  }
  rBtn.addEventListener("click", function(){ togglePanel() });
  document.addEventListener("keydown", function(e){
    if ((e.key === "r" || e.key === "R") && !/input|textarea/i.test(e.target.tagName) && !e.metaKey && !e.ctrlKey) togglePanel();
    if (e.key === "Escape") { togglePanel(false); closeMenu() }
  });
  var cleanBtn = $("#toggleClean"), standBtn = $("#toggleStandins");
  function setClean(on){ root.classList.toggle("clean", on); cleanBtn.setAttribute("aria-pressed", String(on)); store("mem-clean", on ? "1" : "0") }
  function setStand(on){ root.classList.toggle("no-standins", !on); standBtn.setAttribute("aria-pressed", String(on)) }
  cleanBtn.addEventListener("click", function(){ setClean(!root.classList.contains("clean")) });
  standBtn.addEventListener("click", function(){ setStand(root.classList.contains("no-standins")) });
  if (store("mem-clean") === "1") setClean(true);

  /* ---------- copy ---------- */
  $$("[data-copy]").forEach(function(b){
    b.addEventListener("click", function(){
      var v = b.getAttribute("data-copy");
      var done = function(){ b.textContent = "Copied"; setTimeout(function(){ b.textContent = "Copy email" }, 1600) };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, function(){ selectText(b.previousElementSibling) });
      else selectText(b.previousElementSibling);
    });
  });
  function selectText(el){ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r) }

  /* ---------- film players: add data-src="assets/video/x.mp4" (plays here) or data-href="https://vimeo..." (opens link) ---------- */
  $$('.is-video[data-mode="film"]').forEach(function(fig){
    fig.setAttribute("tabindex","0"); fig.setAttribute("role","button");
    function go(){
      var src = fig.getAttribute("data-src"), href = fig.getAttribute("data-href");
      if (href) { window.open(href, "_blank", "noopener"); return }
      if (!src || fig.querySelector("video")) return;
      var v = document.createElement("video");
      v.src = src; v.controls = true; v.playsInline = true; v.autoplay = true;
      var img = fig.querySelector("img"); if (img) v.poster = img.src;
      fig.innerHTML = ""; fig.appendChild(v); v.play().catch(function(){});
    }
    fig.addEventListener("click", go);
    fig.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go() } });
  });
  /* ---------- film lightbox: set data-src="assets/video/x.mp4" on a .play-film button when the file arrives ---------- */
  var lb = $("#lb"), stage = $("#lbStage");
  function closeLb(){ if (!lb) return; lb.hidden = true; stage.innerHTML = ""; }
  $$(".play-film").forEach(function(btn){
    btn.addEventListener("click", function(){
      var src = btn.getAttribute("data-src"), href = btn.getAttribute("data-href"), title = btn.getAttribute("data-film"), yt = btn.getAttribute("data-yt");
      if (yt) { stage.innerHTML = '<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&rel=0" title="' + title.replace(/"/g, "") + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p class="yt-alt"><a class="ul" href="https://www.youtube.com/watch?v=' + yt + '" target="_blank" rel="noopener">Open on YouTube ↗</a></p>'; lb.hidden = false; $("#lbClose").focus(); return }
      if (href) { window.open(href, "_blank", "noopener"); return }
      stage.innerHTML = "";
      if (src) { var v = document.createElement("video"); v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true; stage.appendChild(v); }
      else { stage.textContent = title + " · the film file is not uploaded yet. It will play here."; }
      lb.hidden = false; $("#lbClose").focus();
    });
  });
  if (lb) { $("#lbClose").addEventListener("click", closeLb); lb.addEventListener("click", function(e){ if (e.target === lb) closeLb() }); document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeLb() }); }

  $$('a[data-pending]').forEach(function(a){ a.addEventListener("click", function(e){ e.preventDefault() }) });

  /* ---------- video slots: add data-src="assets/video/x.mp4" to a .is-video figure ---------- */
  var vids = [];
  $$('.is-video[data-src]:not([data-mode="film"])').forEach(function(fig){
    var img = fig.querySelector("img");
    var v = document.createElement("video");
    v.src = fig.getAttribute("data-src"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
    if (img) { v.poster = img.src; img.replaceWith(v) }
    var p = fig.querySelector(".play"); if (p) p.remove();
    vids.push(v);
  });
  if ("IntersectionObserver" in window && vids.length) {
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ e.isIntersecting ? e.target.play().catch(function(){}) : e.target.pause() }) }, { threshold: 0.35 });
    vids.forEach(function(v){ io.observe(v) });
  }

  /* ---------- section counter ---------- */
  var cNum = $("#cNum"), links = $$(".nav a.link");
  function setActive(sec){
    cNum.textContent = sec.getAttribute("data-idx") || "00";
    var name = sec.getAttribute("data-name");
    links.forEach(function(a){
      var t = document.getElementById(a.getAttribute("href").slice(1));
      a.classList.toggle("on", !!t && t.getAttribute("data-name") === name);
    });
  }

  /* ---------- hero slideshow ---------- */
  var slides = $$(".hero .slides img"), si = 0;
  if (slides.length > 1 && !reduce) {
    setInterval(function(){
      slides[si].classList.remove("on"); si = (si + 1) % slides.length; slides[si].classList.add("on");
    }, 5200);
  }

  /* ---------- counter + active nav ---------- */
  var io2 = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) setActive(e.target) }) }, { rootMargin: "-48% 0px -48% 0px" });
  $$("[data-idx]").forEach(function(s){ io2.observe(s) });

  if (reduce) return;
  root.classList.add("js");

  /* ---------- entrances ---------- */
  $$(".pillars > div, .cards > div").forEach(function(d){ d.classList.add("rise") });
  $$(".pillars, .cards, .cols3, .cols4").forEach(function(g){
    $$(".rise", g).forEach(function(d, i){ d.style.setProperty("--d", (i * 0.08) + "s") });
  });
  var io3 = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("in"); io3.unobserve(e.target) } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  $$(".reveal, .rise, #steps, .stamp").forEach(function(el){ io3.observe(el) });

  /* ---------- scroll scenes ---------- */
  var vh = window.innerHeight, scenes = [];
  function clamp(v){ return v < 0 ? 0 : v > 1 ? 1 : v }
  function ease(t){ return 1 - Math.pow(1 - t, 3) }

  // chapter title cards
  $$(".chapter").forEach(function(ch){
    var h = ch.querySelector("h2.split");
    if (h) h.innerHTML = h.textContent.split("").map(function(c){ return c === " " ? " " : '<span class="ch">' + c + "</span>" }).join("");
    var chars = $$(".ch", ch), n = chars.length;
    var bg = ch.querySelector(".bg"), num = ch.querySelector(".num"), sub = ch.querySelector(".sub"), wrap = ch.querySelector(".wrap");
    chars.forEach(function(c, i){ c.style.transitionDelay = (i * 0.035) + "s" });
    if ("IntersectionObserver" in window) new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) ch.classList.add("on") }) }, { rootMargin: "0px 0px -15% 0px" }).observe(ch); else ch.classList.add("on");
    scenes.push({ el: ch, run: function(p){
      if (bg) bg.style.transform = "scale(" + (1.12 - 0.12 * p) + ")";
      /* slim chapter header: the title no longer fades out, the next project follows straight on */
    }});
  });

  // sideways scenes: film strips (>800px) and the illustration walk (>900px)
  function sideways(sec, track, minW){
    var s = { el: sec, dist: 0, on: false, run: function(p){
      if (!s.on) return;
      track.style.transform = "translate3d(" + (-s.dist * p) + "px,0,0)";
      if (s.each) s.each(p);
    }, layout: function(){
      s.on = window.innerWidth >= minW;
      sec.classList.toggle("scene", s.on);
      if (!s.on) { sec.style.height = ""; track.style.transform = ""; return }
      s.dist = Math.max(0, track.scrollWidth - window.innerWidth);
      var sp = parseFloat(sec.getAttribute("data-speed")) || 1;   // >1: the tape runs faster than the page scrolls
      sec.style.height = (vh + s.dist / sp) + "px";
    }};
    scenes.push(s); return s;
  }
  $$(".strip-sec").forEach(function(sec){
    if (sec.classList.contains("tape-sec")) return;   // keyframe tapes scroll sideways natively (enhance.js), the page is never pinned
    var sc = sideways(sec, sec.querySelector(".strip"), 801), bar = sec.querySelector(".tape-prog i");
    if (bar) sc.each = function(p){ bar.style.transform = "scaleX(" + p.toFixed(4) + ")" };
  });
  var hs = $(".hs");
  if (hs) {
    var hsScene = sideways(hs, hs.querySelector(".hs-track"), 901);
    var arts = $$(".art", hs);
    hsScene.each = function(){
      arts.forEach(function(a){
        var r = a.getBoundingClientRect();
        var t = clamp(1 - (r.left + r.width * 0.3) / window.innerWidth);
        var img = a.querySelector(".media img"), txt = a.querySelector(".txt");
        img.style.transform = "scale(" + (1.18 - 0.18 * ease(clamp(t * 1.6))) + ")";
        var k = ease(clamp(t * 2.2));
        txt.style.opacity = 0.15 + 0.85 * k; txt.style.transform = "translateX(" + (80 * (1 - k)) + "px)";
      });
    };
  }

  // parallax images and drifting portrait columns
  var par = $$("[data-speed]").filter(function(el){ return el.tagName !== "SECTION" }).map(function(img){ return { img: img, box: img.closest(".media") || img, sp: parseFloat(img.getAttribute("data-speed")) || -5 } });
  var chars = $$(".char-slide").map(function(img){ return { img: img, box: img.parentNode } });
  var cols = $$(".pcols > div"), colMove = [[60, -60], [-60, 80], [120, -100]];
  var bar = $(".progress"), heroWrap = $(".cover-head"), hero = $(".hero");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function seg(p, a, b){ return clamp((p - a) / (b - a)) }
  function pinP(el){ var r = el.getBoundingClientRect(); var span = el.offsetHeight - vh; return span > 0 ? clamp(-r.top / span) : 1 }
  // gorilla: background, girl, then logo
  var gor = $(".gor"), gorBg = gor && $(".gor-bg img", gor), gorGirl = gor && $(".gor-girl img", gor), gorLogo = gor && $(".gor-logo", gor), gorLate = gor ? $$(".gor-sub,.gor-ticks,.gor-eye", gor) : [];
  function runGor(){
    var r = gor.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
    var p = pinP(gor), pre = clamp((vh - r.top) / vh);
    gor.classList.toggle("s1", pre > 0.3);
    gor.classList.toggle("s2", pre > 0.75 || p > 0.02);
    gor.classList.toggle("s3", p > 0.22);
  }
  // pipeline nodes and drawn connectors
  var pipe = $(".pipe"), pns = pipe ? $$(".pn", pipe) : [], pls = pipe ? $$(".pl", pipe) : [], pdot = pipe && $(".pdot", pipe);
  var nodeAt = [[-1, 0], [-1, .02], [.3, .38], [.48, .56], [.66, .74], [.86, .94]], lineAt = [[.13, .3], [.39, .48], [.57, .66], [.75, .87]];
  function runPipe(){
    var r = pipe.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
    var p = pinP(pipe); if (window.innerWidth <= 700) p = clamp(p * 1.1);
    pns.forEach(function(n, i){ var k = ease(seg(p, nodeAt[i][0], nodeAt[i][1])); n.style.opacity = k; n.style.transform = "translateY(" + (18 * (1 - k)) + "px) scale(" + (0.96 + 0.04 * k) + ")" });
    var dotOn = false;
    pls.forEach(function(l, i){ var k = seg(p, lineAt[i][0], lineAt[i][1]); l.style.strokeDashoffset = 1 - k;
      if (k > 0 && k < 1 && l.getTotalLength) { var pt = l.getPointAtLength(l.getTotalLength() * k); pdot.setAttribute("cx", pt.x); pdot.setAttribute("cy", pt.y); dotOn = true } });
    pdot.style.opacity = dotOn ? 1 : 0;
  }
  // metahumans: right one first, all in by centre
  var mh = $(".mh"), mhs = mh ? $$(".mh-i", mh) : [];
  function runMh(){
    var r = mh.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
    var p = clamp((vh - r.top) / (vh / 2 + r.height / 2));
    var n = mhs.length;
    mhs.forEach(function(f, i){
      if (i === n - 1) { var m = ease(seg(p, 0, .25)); f.style.opacity = .4 + .6 * m; f.style.transform = "scale(" + (.96 + .04 * m) + ")"; return }
      var k = n - 2 - i, t = ease(seg(p, .18 + k * .17, .45 + k * .17));
      var dx = parseFloat(f.style.getPropertyValue("--dx")) || 0, sc = parseFloat(f.style.getPropertyValue("--s")) || 1;
      f.style.opacity = (.35 + .65 * t) * (.55 + .45 * sc);
      f.style.transform = "translate3d(" + (dx * (1 - t) * (100 / parseFloat(f.style.width))) + "%,0,0) scale(" + (1 + (sc - 1) * t) + ")";
      f.style.filter = "blur(" + (5 * (1 - t)) + "px)";
    });
  }

  function layout(){
    vh = window.innerHeight;
    scenes.forEach(function(s){ if (s.layout) s.layout() });
    scenes.forEach(function(s){ s.top = s.el.getBoundingClientRect().top + window.scrollY; s.h = s.el.offsetHeight });
    tick(true);
  }
  var last = -1;
  function tick(force){
    var y = window.scrollY;
    if (y === last && force !== true) return; last = y;
    var max = document.documentElement.scrollHeight - vh;
    bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    if (hero && heroWrap) { var hp = clamp(y / hero.offsetHeight); heroWrap.style.transform = "translateY(" + (-80 * hp) + "px)"; heroWrap.style.opacity = 1 - 0.8 * hp }
    if (!reduce) { if (gor) runGor(); if (pipe) runPipe(); if (mh) runMh() }
    scenes.forEach(function(s){
      var span = s.h - vh; if (span <= 0) return;
      var p = clamp((y - s.top) / span);
      if (y + vh < s.top - 200 || y > s.top + s.h + 200) return;
      s.run(p);
    });
    par.forEach(function(o){
      var r = o.box.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var t = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      o.img.style.transform = "translateY(" + (o.sp * t) + "%)";
    });
    if (window.innerWidth > 900 && cols.length) {
      var r = cols[0].parentNode.getBoundingClientRect();
      var t = clamp((vh - r.top) / (vh + r.height));
      /* columns stay put: drift left gaps under the gallery */
    }
  }
  function loop(){ tick(); requestAnimationFrame(loop) }
  layout(); requestAnimationFrame(loop);
  var rt; window.addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(layout, 150) });
  window.addEventListener("load", layout);
  $$("img").forEach(function(im){ if (!im.complete) im.addEventListener("load", function(){ clearTimeout(rt); rt = setTimeout(layout, 200) }, { once: true }) });
})();
/* illustration viewer: FLIP from the artwork to full screen */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 1: "+(e&&e.message||e))}
try{
(function(){
  var iv = document.getElementById("iv"); if (!iv || true) return; /* viewer switched off: artworks are viewed in place */
  var arts = [].slice.call(document.querySelectorAll(".hs .art, .art"));
  arts = arts.filter(function(a, i){ return arts.indexOf(a) === i });
  if (!arts.length) return;
  var img = iv.querySelector(".iv-img"), txt = iv.querySelector(".iv-txt"), cnt = iv.querySelector(".iv-count");
  var cur = -1, busy = false, lastFocus = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function pad(n){ return (n < 10 ? "0" : "") + n }
  function thumb(i){ return arts[i].querySelector(".media img") }
  function fill(i){
    var t = arts[i].querySelector(".txt").cloneNode(true);
    txt.innerHTML = t.innerHTML;
    [].forEach.call(txt.children, function(c, k){ c.style.transitionDelay = (0.18 + k * 0.07) + "s" });
    cnt.textContent = pad(i + 1) + " / " + pad(arts.length);
    var s = thumb(i); img.src = s.currentSrc || s.src; img.alt = s.alt;
  }
  function fly(fromEl, toEl, dur, done){
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (reduce || !a.width || !b.width) { done(); return }
    var f = document.createElement("img"); f.className = "iv-fly"; f.src = img.src;
    f.style.left = b.left + "px"; f.style.top = b.top + "px"; f.style.width = b.width + "px"; f.style.height = b.height + "px";
    f.style.transform = "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + "," + (a.height / b.height) + ")";
    f.style.transitionDuration = dur + "ms";
    document.body.appendChild(f); f.getBoundingClientRect();
    return { el: f, go: function(){ f.style.transform = "none" } , end: function(){ f.remove(); done() } };
  }
  function open(i){
    if (busy) return; busy = true; cur = i; lastFocus = document.activeElement;
    fill(i); iv.hidden = false; document.documentElement.style.overflow = "hidden";
    var th = thumb(i);
    var go = function(){
      var f = fly(th, img, 820, function(){ iv.classList.add("ready"); th.style.visibility = ""; busy = false; iv.querySelector(".iv-x").focus({ preventScroll: true }) });
      requestAnimationFrame(function(){ iv.classList.add("open") });
      if (!f) return;
      th.style.visibility = "hidden";
      requestAnimationFrame(function(){ f.go(); setTimeout(f.end, 840) });
    };
    if (img.complete && img.naturalWidth) go(); else img.onload = function(){ img.onload = null; go() };
  }
  function close(){
    if (busy || cur < 0) return; busy = true;
    var th = thumb(cur), r = th.getBoundingClientRect();
    iv.classList.remove("ready");
    var onScreen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    var finish = function(){ iv.hidden = true; iv.classList.remove("open"); th.style.visibility = ""; document.documentElement.style.overflow = ""; busy = false; cur = -1; if (lastFocus) lastFocus.focus({ preventScroll: true }) };
    if (!onScreen || reduce) { iv.classList.remove("open"); setTimeout(finish, reduce ? 0 : 450); return }
    var a = img.getBoundingClientRect(), f = document.createElement("img");
    f.className = "iv-fly"; f.src = img.src; f.style.left = r.left + "px"; f.style.top = r.top + "px"; f.style.width = r.width + "px"; f.style.height = r.height + "px";
    f.style.transform = "translate(" + (a.left - r.left) + "px," + (a.top - r.top) + "px) scale(" + (a.width / r.width) + "," + (a.height / r.height) + ")";
    document.body.appendChild(f); th.style.visibility = "hidden"; img.style.visibility = "hidden";
    f.getBoundingClientRect();
    requestAnimationFrame(function(){ iv.classList.remove("open"); f.style.transform = "none" });
    setTimeout(function(){ f.remove(); img.style.visibility = ""; finish() }, 820);
  }
  function step(d){
    if (busy || cur < 0) return; busy = true;
    var n = (cur + d + arts.length) % arts.length;
    iv.classList.remove("ready"); img.classList.add("swap");
    setTimeout(function(){
      cur = n; fill(n);
      var show = function(){ img.classList.remove("swap"); iv.classList.add("ready"); busy = false };
      if (img.complete && img.naturalWidth) requestAnimationFrame(show); else img.onload = function(){ img.onload = null; show() };
    }, 380);
  }
  arts.forEach(function(a, i){
    var m = a.querySelector(".media"); if (!m) return;
    m.setAttribute("tabindex", "0"); m.setAttribute("role", "button"); m.setAttribute("aria-label", "Open " + (a.querySelector("h3") || {}).textContent + " full screen");
    m.addEventListener("click", function(e){ if (e.target.closest(".listen-btn")) return; open(i) });
    m.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i) } });
  });
  iv.querySelector(".iv-x").addEventListener("click", close);
  iv.querySelector(".iv-bd").addEventListener("click", close);
  iv.querySelector(".iv-prev").addEventListener("click", function(){ step(-1) });
  iv.querySelector(".iv-next").addEventListener("click", function(){ step(1) });
  iv.querySelector(".iv-stage").addEventListener("click", function(e){ if (e.target === e.currentTarget) close() });
  txt.addEventListener("click", function(e){ var a = e.target.closest("a[data-pending]"); if (a) e.preventDefault() });
  document.addEventListener("keydown", function(e){
    if (iv.hidden) return;
    if (e.key === "Escape") close(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
  });
  var sx = null;
  iv.addEventListener("touchstart", function(e){ sx = e.touches[0].clientX }, { passive: true });
  iv.addEventListener("touchend", function(e){ if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); sx = null });
})();
/* hero video reel + full-screen video sections */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 2: "+(e&&e.message||e))}
try{
(function(){
  var rv = document.querySelector(".reel-v"), cap = document.querySelector(".reel-cap"), capT = cap && cap.querySelector(".reel-t");
  if (rv) {
    var caps = []; try { caps = JSON.parse(rv.getAttribute("data-caps") || "[]") } catch (e) {}
    var last = "";
    rv.addEventListener("timeupdate", function(){
      var t = rv.currentTime, c = caps[0];
      caps.forEach(function(x){ if (t >= x[0]) c = x });
      if (!c) return; var label = c[1] + " · " + c[2];
      if (label !== last) { last = label; capT.classList.add("out"); setTimeout(function(){ capT.textContent = label; capT.classList.remove("out") }, 250); cap.classList.add("show") }
    });
    var p = rv.play(); if (p && p.catch) p.catch(function(){});
    document.addEventListener("scroll", function(){ if (window.scrollY > innerHeight * 1.3) { if (!rv.paused) rv.pause() } else if (rv.paused) { var q = rv.play(); if (q && q.catch) q.catch(function(){}) } }, { passive: true });
  }
  var lazy = [].slice.call(document.querySelectorAll("video[data-src]"));
  if (!lazy.length) return;
  function arm(v){ if (!v.getAttribute("src")) { v.src = v.getAttribute("data-src"); v.load() } }
  if (!("IntersectionObserver" in window)) { lazy.forEach(function(v){ arm(v); v.play().catch(function(){}) }); return }
  var pre = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { arm(e.target); pre.unobserve(e.target) } }) }, { rootMargin: "600px 0px" });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ var v = e.target; if (e.isIntersecting) { arm(v); var q = v.play(); if (q && q.catch) q.catch(function(){}) } else v.pause() }) }, { threshold: 0.2 });
  lazy.forEach(function(v){ pre.observe(v); io.observe(v) });
})();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 3: "+(e&&e.message||e))}
try{
(function(){ var f=[].slice.call(document.querySelectorAll(".fsv")); if(!f.length) return;
  if(!("IntersectionObserver" in window)){ f.forEach(function(x){x.classList.add("in")}); return }
  var o=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); o.unobserve(e.target) } }) },{ rootMargin: "0px 0px -18% 0px", threshold: 0 }); f.forEach(function(x){o.observe(x)}) })();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 4: "+(e&&e.message||e))}
try{
(function(){ var c=document.querySelector(".ct-portrait"); if(!c) return;
  if(!("IntersectionObserver" in window)){ c.classList.add("in"); return }
  var o=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ c.classList.add("in"); o.disconnect() } }) },{ rootMargin: "0px 0px -18% 0px", threshold: 0 }); o.observe(c) })();
/* proposal system diagram: scroll-driven */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 5: "+(e&&e.message||e))}
try{
(function(){
  var pm = document.querySelector(".pm"); if (!pm) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage = pm.querySelector(".pm-stage"), svg = pm.querySelector(".pm-svg");
  var lines = [].slice.call(pm.querySelectorAll(".pm-l")), imgs = [].slice.call(pm.querySelectorAll(".pm-imgs i"));
  var tiles = [].slice.call(pm.querySelectorAll(".pm-t")), fly = [].slice.call(pm.querySelectorAll(".pm-fly i"));
  var deck = [].slice.call(pm.querySelectorAll(".pm-deck i")), scan = pm.querySelector(".pm-scan"), ok = pm.querySelector(".pm-ok");
  var rail = [].slice.call(pm.querySelectorAll(".pm-rail li")), bar = pm.querySelector(".pm-bar i");
  var days = pm.querySelector(".pm-days"), mins = pm.querySelector(".pm-min"), outW = pm.querySelector(".pm-o");
  var selIdx = [1, 13, 26, 22], wires = [], flyFrom = [], flyTo = [];
  function clamp(v){ return v < 0 ? 0 : v > 1 ? 1 : v }
  function seg(p, a, b){ return clamp((p - a) / (b - a)) }
  function ease(t){ return 1 - Math.pow(1 - t, 3) }
  function geo(){
    var S = stage.getBoundingClientRect(); if (!S.width) return;
    var k = 1600 / S.width;
    function pt(r, fx, fy){ return [(r.left - S.left + r.width * fx) * k, (r.top - S.top + r.height * fy) * k] }
    wires.forEach(function(w){ w.remove() }); wires = [];
    selIdx.forEach(function(ti, n){
      var a = pt(lines[n + 1].getBoundingClientRect(), 1, .5), b = pt(tiles[ti].getBoundingClientRect(), 0, .5);
      a[0] = pt(lines[0].parentNode.getBoundingClientRect(), 1, 0)[0];
      var mx = (a[0] + b[0]) / 2, path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M" + a[0] + "," + a[1] + " C" + mx + "," + a[1] + " " + mx + "," + b[1] + " " + b[0] + "," + b[1]);
      path.setAttribute("pathLength", "1"); path.setAttribute("class", "pm-w"); svg.insertBefore(path, outW); wires.push(path);
    });
    var L = pm.querySelector(".pm-lib").getBoundingClientRect(), O = pm.querySelector(".pm-out").getBoundingClientRect();
    var a = pt(L, 1, .5), b = pt(O, 0, .5);
    outW.setAttribute("d", "M" + (a[0] + 10) + "," + a[1] + " L" + (b[0] - 10) + "," + b[1]); outW.setAttribute("pathLength", "1");
    flyFrom = imgs.map(function(im){ var r = im.getBoundingClientRect(); return [r.left - S.left, r.top - S.top] });
    flyTo = [0, 1, 2].map(function(n){ var r = tiles[selIdx[n]].getBoundingClientRect(); return [r.left - S.left + r.width * .2, r.top - S.top + r.height * .45] });
  }
  function run(){
    var r = pm.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -50 || r.top > vh + 50) return;
    var span = pm.offsetHeight - vh, p = reduce ? 1 : clamp(-r.top / span);
    // step 1: content in
    lines.forEach(function(l, i){ l.style.transform = "scaleX(" + ease(seg(p, .02 + i * .025, .08 + i * .025)) + ")" });
    imgs.forEach(function(im, i){ var t = ease(seg(p, .14 + i * .02, .2 + i * .02)); im.style.opacity = t; im.style.transform = "scale(" + (.6 + .4 * t) + ")" });
    tiles.forEach(function(t, i){ var k = ease(seg(p, .05 + (i % 8) * .008 + Math.floor(i / 8) * .01, .16 + (i % 8) * .008 + Math.floor(i / 8) * .01)); t.style.opacity = .35 + .65 * k * (p > .3 && selIdx.indexOf(i) < 0 ? .45 : 1); t.style.transform = "translateY(" + (1 - k) + "cqw)" });
    // step 2: layout mapping
    wires.forEach(function(w, i){ w.style.strokeDashoffset = 1 - ease(seg(p, .27 + i * .03, .38 + i * .03)) });
    selIdx.forEach(function(ti, i){ tiles[ti].classList.toggle("sel", p > .34 + i * .03) });
    // step 3: visuals added
    fly.forEach(function(f, i){
      if (!flyFrom[i]) return; var t = ease(seg(p, .5 + i * .04, .6 + i * .04));
      var x = flyFrom[i][0] + (flyTo[i][0] - flyFrom[i][0]) * t, y = flyFrom[i][1] + (flyTo[i][1] - flyFrom[i][1]) * t - Math.sin(t * Math.PI) * 40;
      f.style.opacity = t > 0 && t < 1 ? 1 : 0; f.style.transform = "translate(" + x + "px," + y + "px) scale(" + (1 - .35 * t) + ")";
      tiles[selIdx[i]].classList.toggle("fill", t >= 1);
    });
    tiles[selIdx[3]].classList.toggle("fill", p > .66);
    outW.style.strokeDashoffset = 1 - ease(seg(p, .68, .74));
    // step 4: designer review, deck fans out
    deck.forEach(function(d, i){ var t = ease(seg(p, .72 + i * .03, .8 + i * .03)); var fan = ease(seg(p, .84, .94));
      d.style.opacity = t; d.style.transform = "translate(" + ((i - 1.5) * 5 * fan) + "%," + (8 * (1 - t) - Math.abs(i - 1.5) * 2 * fan) + "%) rotate(" + ((i - 1.5) * 3.5 * fan) + "deg)" });
    var sc = seg(p, .8, .9); scan.style.opacity = sc > 0 && sc < 1 ? 1 : 0; scan.style.top = (sc * 100) + "%";
    ok.style.opacity = ease(seg(p, .88, .94));
    var st = p < .24 ? 0 : p < .46 ? 1 : p < .7 ? 2 : 3; rail.forEach(function(li, i){ li.classList.toggle("on", i <= st) });
    bar.style.transform = "scaleX(" + p + ")";
    var d = ease(seg(p, .82, .95)); days.style.opacity = 1 - .7 * d; days.style.textDecoration = d > .5 ? "line-through" : "none"; mins.style.opacity = .3 + .7 * d;
  }
  geo(); run();
  window.addEventListener("scroll", function(){ requestAnimationFrame(run) }, { passive: true });
  window.addEventListener("resize", function(){ geo(); run() });
  window.addEventListener("load", function(){ geo(); run() });
})();
/* sound toggle on full-screen videos with audio */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 6: "+(e&&e.message||e))}
try{
(function(){
  [].forEach.call(document.querySelectorAll(".fsv-snd"), function(btn){
    var sec = btn.closest(".fsv"), v = sec.querySelector("video");
    btn.addEventListener("click", function(){
      if (!v.getAttribute("src") && v.getAttribute("data-src")) { v.src = v.getAttribute("data-src"); v.load() }
      var on = v.muted; v.muted = !on; v.volume = 1;
      if (on) { v.currentTime = v.currentTime; var q = v.play(); if (q && q.catch) q.catch(function(){}) }
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.querySelector(".lbl").textContent = on ? "Sound off" : "Sound on";
      sec.classList.toggle("sound", on);
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(function(es){ es.forEach(function(e){ if (!e.isIntersecting && !v.muted) { v.muted = true; btn.setAttribute("aria-pressed","false"); btn.querySelector(".lbl").textContent = "Sound on"; sec.classList.remove("sound") } }) }, { threshold: 0.1 }).observe(sec);
  });
})();
/* brand project dialog */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 7: "+(e&&e.message||e))}
try{
(function(){
  var pd = document.getElementById("pd"); if (!pd) return;
  var inn = pd.querySelector(".pd-in"), last = null;
  function open(id){
    var t = document.getElementById("pd-" + id); if (!t) return;
    last = document.activeElement; inn.innerHTML = ""; inn.appendChild(t.content.cloneNode(true));
    pd.hidden = false; document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function(){ pd.classList.add("open") });
    pd.querySelector(".pd-x").focus({ preventScroll: true });
  }
  function close(){ pd.classList.remove("open"); setTimeout(function(){ pd.hidden = true; document.documentElement.style.overflow = ""; if (last) last.focus({ preventScroll: true }) }, 450) }
  [].forEach.call(document.querySelectorAll(".bbox"), function(b){
    b.addEventListener("click", function(){ open(b.getAttribute("data-proj")) });
    b.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(b.getAttribute("data-proj")) } });
  });
  pd.querySelector(".pd-x").addEventListener("click", close);
  pd.querySelector(".pd-bd").addEventListener("click", close);
  document.addEventListener("keydown", function(e){ if (!pd.hidden && e.key === "Escape") close() });
  inn.addEventListener("click", function(e){ var th = e.target.closest(".pd-th"); if (!th) return;
    var m = inn.querySelector(".pd-main"); m.style.opacity = 0; setTimeout(function(){ m.src = th.getAttribute("data-src"); m.style.opacity = 1 }, 250);
    [].forEach.call(inn.querySelectorAll(".pd-th"), function(x){ x.classList.toggle("on", x === th) }) });
})();
/* chess flow: a line runs from the full board down to the top view, then to the pieces */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 8: "+(e&&e.message||e))}
try{
(function(){
  var sec = document.querySelector(".chess-flow"); if (!sec) return;
  var path = sec.querySelector(".cf-line"), dot = sec.querySelector(".cf-dot"), svg = sec.querySelector(".cf-svg");
  var pins = [].slice.call(sec.querySelectorAll(".cf-pin")), board = sec.querySelector(".cf-board"), sets = [].slice.call(sec.querySelectorAll(".cf-set"));
  var len = 0, stops = [];
  function geo(){
    var S = sec.getBoundingClientRect(); svg.setAttribute("viewBox", "0 0 " + S.width + " " + S.height);
    function c(el, fy){ var r = el.getBoundingClientRect(); return [r.left - S.left + r.width / 2, r.top - S.top + r.height * fy] }
    var p0 = [S.width / 2, 0], a = c(pins[0], .5), b0 = c(board, 0), b1 = c(board, 1), n1 = c(pins[1], .5), s0 = c(sets[0], 0), s1 = c(sets[1], 0);
    var mid = n1[1] + 50;
    var d = "M" + p0[0] + "," + p0[1] + " L" + a[0] + "," + a[1] + " L" + b0[0] + "," + (b0[1] - 8) + " M" + b1[0] + "," + (b1[1] + 60) + " L" + n1[0] + "," + n1[1] +
      " L" + n1[0] + "," + mid + " Q" + n1[0] + "," + (mid + 20) + " " + (n1[0] - 20) + "," + (mid + 20) + " L" + (s0[0] + 20) + "," + (mid + 20) + " Q" + s0[0] + "," + (mid + 20) + " " + s0[0] + "," + (mid + 40) + " L" + s0[0] + "," + (s0[1] - 8) +
      " M" + n1[0] + "," + mid + " Q" + n1[0] + "," + (mid + 20) + " " + (n1[0] + 20) + "," + (mid + 20) + " L" + (s1[0] - 20) + "," + (mid + 20) + " Q" + s1[0] + "," + (mid + 20) + " " + s1[0] + "," + (mid + 40) + " L" + s1[0] + "," + (s1[1] - 8);
    path.setAttribute("d", d); len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    stops = [a[1], n1[1]];
    run();
  }
  function run(){
    if (!len) return; var r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < 0 || r.top > vh) return;
    var p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height - vh * 0.2)));
    path.style.strokeDashoffset = len * (1 - p);
    var pt = path.getPointAtLength(len * p); dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y); dot.style.opacity = p > 0 && p < 1 ? 1 : 0;
    var headY = pt.y; pins.forEach(function(pn, i){ pn.classList.toggle("lit", headY >= stops[i] - 4 || p >= 1) });
  }
  window.addEventListener("scroll", function(){ requestAnimationFrame(run) }, { passive: true });
  window.addEventListener("resize", geo); window.addEventListener("load", geo);
  [].forEach.call(sec.querySelectorAll("img"), function(im){ if (!im.complete) im.addEventListener("load", geo) });
  geo();
})();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 9: "+(e&&e.message||e))}
try{
(function(){ var st=document.querySelector(".coll-stage"); if(!st) return; if(!("IntersectionObserver" in window)){st.classList.add("in");return}
 new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting) st.classList.add("in") })},{ rootMargin: "0px 0px -18% 0px", threshold: 0 }).observe(st) })();
/* level map: CSS 3D wireframe blocks, drag to orbit, route playback */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 10: "+(e&&e.message||e))}
try{
(function(){
  var scene = document.getElementById("lvScene"), world = document.getElementById("lvWorld"); if (!scene) return;
  var C = { clue: "#39ffb0", none: "#ff6b9a", env: "#ffd36b", off: "#ffa24c", spawn: "#39ffb0" };
  var rooms = [
    ["WC", 48, 30, 215, 135, "off", 34], ["WC", 48, 150, 215, 250, "off", 34],
    ["Canteen", 305, 30, 473, 175, "none", 64], ["Storage room", 490, 30, 657, 175, "clue", 82],
    ["Co-working space", 672, 30, 840, 410, "none", 64], ["CFO office", 415, 268, 580, 413, "env", 56],
    ["IT office", 415, 503, 570, 648, "clue", 82], ["CEO office", 600, 503, 840, 648, "clue", 82],
    ["Elevator", 287, 662, 345, 718, "spawn", 22]
  ];
  var kind = { clue: "Interactive clue zone", none: "Non-clue area", env: "Interactive environment", off: "Non-accessible area", spawn: "Spawn · start" };
  var h = '<div class="lv-grid"></div><div class="lv-floor" style="left:230px;top:30px;width:610px;height:618px"></div>';
  rooms.forEach(function(r){
    var w = r[3] - r[1], d = r[4] - r[2];
    h += '<div class="lv-box" data-name="' + r[0] + '" data-kind="' + kind[r[5]] + '" style="left:' + r[1] + 'px;top:' + r[2] + 'px;width:' + w + 'px;height:' + d + 'px;--h:' + r[6] + 'px;--d:' + d + 'px;--w:' + w + 'px;--c:' + C[r[5]] + '">' +
      '<i class="f"></i><i class="n"></i><i class="s"></i><i class="w"></i><i class="e"></i><i class="t"><b>' + r[0] + '</b></i></div>';
  });
  [[235, 244], [395, 272], [650, 196], [832, 433]].forEach(function(c){ h += '<span class="lv-cam" style="left:' + c[0] + 'px;top:' + c[1] + 'px"></span>' });
  var route = "M316,690 L316,455 L316,345 M316,455 L625,455 M627,555 L627,150 M338,237 L627,237 M338,237 L338,145 M627,378 L712,378 M495,455 L495,505";
  var walk = "M316,690 L316,455 L316,300 L316,237 L338,237 L338,145 L338,237 L627,237 L627,150 L627,237 L627,378 L712,378 L627,378 L627,455 L495,455 L495,505 L495,455 L627,455 L627,555";
  h += '<svg class="lv-svg" viewBox="0 0 870 750"><path class="lv-route" d="' + route + '"/><circle class="lv-player" r="9"><animateMotion id="lvMove" dur="14s" repeatCount="indefinite" begin="indefinite" path="' + walk + '"/></circle></svg>';
  world.innerHTML = h; scene.classList.add("ready");
  // chapter opener: slow first-person walkthrough of the same map
  var bgS = document.getElementById("lvBg");
  if (bgS) {
    var bgW = bgS.firstElementChild; bgW.innerHTML = h.replace(/<animateMotion[^>]*\/>/, "");
    var loop = [[316,455],[627,455],[627,237],[338,237],[316,300],[316,455]], segs = [], total = 0;
    for (var i = 0; i < loop.length - 1; i++) { var a = loop[i], b = loop[i+1], L = Math.hypot(b[0]-a[0], b[1]-a[1]); segs.push([a, b, L]); total += L }
    var bz = null, bt0 = performance.now(), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cam = function (now) {
      var r = bgS.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && !document.hidden) {
        var dist = still ? 0 : (((now - bt0) / 1000) * 55) % total, k = 0;
        while (dist > segs[k][2]) { dist -= segs[k][2]; k++ }
        var sg = segs[k], f = dist / sg[2], x = sg[0][0] + (sg[1][0]-sg[0][0]) * f, y = sg[0][1] + (sg[1][1]-sg[0][1]) * f;
        var want = -90 - Math.atan2(sg[1][1]-sg[0][1], sg[1][0]-sg[0][0]) * 180 / Math.PI;
        if (bz === null) bz = want; var dz = ((want - bz + 540) % 360) - 180; bz += dz * 0.03;
        var S = Math.max(bgS.clientWidth / 870, bgS.clientHeight / 750) * 1.15;
        bgW.style.transform = "scale(" + S.toFixed(3) + ") rotateX(64deg) rotateZ(" + bz.toFixed(2) + "deg) translate(" + (435 - x).toFixed(1) + "px," + (375 - y).toFixed(1) + "px)";
      }
      requestAnimationFrame(cam);
    };
    requestAnimationFrame(cam);
  }
  var rx = 56, rz = -32, sc = 0.72, idle = true, t0 = performance.now();
  function fit(){ var W = scene.clientWidth, H = scene.clientHeight; return Math.min(W / 1000, H / 820) }
  function apply(){ world.style.transform = "scale(" + (sc * fit() / 0.72) + ") rotateX(" + rx + "deg) rotateZ(" + rz + "deg)" }
  apply();
  // gentle idle sway
  (function sway(now){ if (idle && !document.hidden) { var r = scene.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) { world.style.transition = "none"; rz = -32 + ((now - t0) / 1000) * 6; apply() } } requestAnimationFrame(sway) })(t0);
  var drag = null;
  scene.addEventListener("pointerdown", function(e){ if (e.target.closest(".lv-ctrl")) return; idle = false; drag = { x: e.clientX, y: e.clientY, rx: rx, rz: rz }; scene.classList.add("drag"); scene.setPointerCapture(e.pointerId) });
  scene.addEventListener("pointermove", function(e){ if (!drag) return; rz = drag.rz + (e.clientX - drag.x) * 0.3; rx = Math.max(0, Math.min(78, drag.rx - (e.clientY - drag.y) * 0.25)); apply() });
  function end(){ drag = null; scene.classList.remove("drag") }
  scene.addEventListener("pointerup", end); scene.addEventListener("pointercancel", end);
  var tip = document.getElementById("lvTip");
  world.addEventListener("pointerover", function(e){ var b = e.target.closest(".lv-box"); if (!b) return; tip.hidden = false; tip.textContent = b.getAttribute("data-name") + " · " + b.getAttribute("data-kind") });
  world.addEventListener("pointerout", function(e){ if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".lv-box")) tip.hidden = true });
  var btns = document.querySelectorAll(".lv-ctrl button"), mv = document.getElementById("lvMove");
  [].forEach.call(btns, function(b){ b.addEventListener("click", function(){
    idle = false; world.style.transition = "";
    var v = b.getAttribute("data-v"), z = b.getAttribute("data-z"), rr = b.getAttribute("data-r");
    if (rr) { rz += (+rr) * 45; apply(); return }
    if (z) { sc = Math.max(0.45, Math.min(1.4, sc + (+z) * 0.12)); apply(); return }
    if (v === "route") { var on = !scene.classList.contains("play"); scene.classList.toggle("play", on); b.classList.toggle("on", on); if (on && mv.beginElement) mv.beginElement(); return }
    [].forEach.call(document.querySelectorAll(".lv-ctrl [data-v='3d'],.lv-ctrl [data-v='top']"), function(x){ x.classList.toggle("on", x === b) });
    if (v === "top") { rx = 0; rz = 0 } else { rx = 56; rz = -32 }
    apply();
  }) });
  window.addEventListener("resize", apply);
})();
/* music: official Spotify or YouTube embeds in a floating glass player (no audio is hosted here) */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 11: "+(e&&e.message||e))}
try{
(function(){
  var mp = document.getElementById("mp"); if (!mp) return;
  var body = document.getElementById("mpB"), title = document.getElementById("mpT");
  function close(){ mp.classList.remove("open"); setTimeout(function(){ mp.hidden = true; body.innerHTML = "" }, 400) }
  document.getElementById("mpX").addEventListener("click", close);
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest(".listen-btn"); if (!b) return; e.preventDefault();
    var sp = b.getAttribute("data-spotify"), yt = b.getAttribute("data-yt"), st = +b.getAttribute("data-start") || 0, en = b.getAttribute("data-end");
    title.textContent = b.getAttribute("data-track") || "Track";
    if (sp) body.innerHTML = '<iframe src="https://open.spotify.com/embed/track/' + sp + '?utm_source=generator&theme=0" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
    else if (yt) body.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&start=' + st + (en ? "&end=" + en : "") + '&rel=0" height="152" allow="autoplay; encrypted-media" loading="lazy"></iframe>';
    else body.innerHTML = '<p class="mp-empty">This track plays here once its Spotify or YouTube link is added.</p>';
    mp.hidden = false; requestAnimationFrame(function(){ mp.classList.add("open") });
  });
})();
/* instinct gallery: clip reveal, slow zoom, stagger */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 12: "+(e&&e.message||e))}
try{
(function(){
  var figs = [].slice.call(document.querySelectorAll(".pcols figure")); if (!figs.length) return;
  figs.forEach(function(f, i){ f.classList.add("px"); f.style.setProperty("--d", (i % 3) * 0.12 + Math.floor(i / 3) * 0.08 + "s") });
  if (!("IntersectionObserver" in window)) { figs.forEach(function(f){ f.classList.add("in") }); return }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }) }, { rootMargin: "0px 0px -18% 0px", threshold: 0 });
  figs.forEach(function(f){ io.observe(f) });
})();

/* brand showcases: reveal + depth parallax */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 13: "+(e&&e.message||e))}
try{
(function(){
  var shows = [].slice.call(document.querySelectorAll(".show")); if (!shows.length) return;
  if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) } }) }, { rootMargin: "0px 0px -18% 0px", threshold: 0 }); shows.forEach(function(x){ io.observe(x) }) } else shows.forEach(function(x){ x.classList.add("in") });
  var lys = [].slice.call(document.querySelectorAll(".show [data-depth]"));
  function par(){ lys.forEach(function(l){ var sec = l.closest(".show"); if (!sec.classList.contains("in")) return; var r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    var t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight, d = parseFloat(l.getAttribute("data-depth")); l.style.translate = "0 " + (t * d * -400) + "px" }) }
  window.addEventListener("scroll", function(){ requestAnimationFrame(par) }, { passive: true }); par();
})();
/* even, smooth wheel scrolling across the whole site (touch and keyboard untouched) */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 14: "+(e&&e.message||e))}
try{
(function(){
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var target = window.scrollY, cur = window.scrollY, raf = null;
  function max(){ return document.documentElement.scrollHeight - innerHeight }
  var lastT = 0; function step(now){ var dt = lastT ? Math.min(64, now - lastT) : 16.7; lastT = now; cur += (target - cur) * (1 - Math.pow(1 - 0.24, dt / 16.7)); if (Math.abs(target - cur) < 0.5) cur = target; window.scrollTo(0, cur); raf = cur !== target ? requestAnimationFrame(step) : (lastT = 0, null) }
  window.addEventListener("wheel", function(e){
    if (e.ctrlKey || e.defaultPrevented) return;
    var el = e.target; if (el.closest && el.closest(".pd-card,.mp,.iv,.lb,textarea,select")) return;
    if (document.documentElement.style.overflow === "hidden") return;
    if (document.documentElement.scrollHeight <= innerHeight + 2) return;   // page is not the scroller (embedded viewer): leave native scrolling alone
    // sideways gestures (trackpad swipe, shift + wheel) and trackpads in general stay native, like Apple's pages: only notched mouse wheels are smoothed
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.deltaMode === 0 && Math.abs(e.deltaY) < 40) return;
    e.preventDefault();
    var d = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1);
    d = Math.max(-280, Math.min(280, d));
    if (!raf) { cur = window.scrollY; target = cur }
    target = Math.max(0, Math.min(max(), target + d));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
  window.addEventListener("scroll", function(){ if (!raf) { cur = target = window.scrollY } }, { passive: true });
})();

/* Majesty board: top view tilts into 3D perspective while scrolling */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 15: "+(e&&e.message||e))}
try{
(function () {
  var t = document.querySelector(".cf-tilt"); if (!t) return;
  var sh = document.querySelector(".cf-shadow"), fig = t.closest(".cf-3d");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var ticking = false;
  function up() {
    ticking = false;
    var r = fig.getBoundingClientRect(), vh = innerHeight;
    var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.9)));
    var e = p * p * (3 - 2 * p);
    t.style.setProperty("--p", e.toFixed(3));
    t.style.setProperty("--gp", p.toFixed(3));
    sh.style.setProperty("--sp", e.toFixed(3));
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(up); } }, { passive: true });
  up();
})();

/* Statement character: slides in from the right and lights up as the section comes into view, both directions, with inertia so it glides */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 16: "+(e&&e.message||e))}
try{
(function () {
  var w = document.querySelector(".statement .char-wrap"); if (!w) return;
  var img = w.querySelector(".char-slide"), sec = w.closest(".statement");
  w.classList.add("lit", "scrub");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cur = 0, raf = null;
  function target() {
    var r = w.getBoundingClientRect(), vh = innerHeight;     // follow the character itself, not the whole section
    var d = (r.top + r.height / 2 - vh / 2) / vh;            // 0 when centred
    var k = 1 - Math.max(0, Math.abs(d) - 0.28) / 0.45;      // full across a wide middle band
    return Math.max(0, Math.min(1, k));
  }
  function paint(k) {
    var e = 1 - Math.pow(1 - k, 3);                            // ease-out
    img.style.transform = "translate3d(" + ((1 - e) * 30).toFixed(2) + "%,0,0) scale(" + (1.03 - 0.03 * e).toFixed(4) + ")";
    img.style.opacity = (e).toFixed(3);
    img.style.filter = e > 0.995 ? "none" : "brightness(" + (0.2 + 0.8 * e).toFixed(3) + ")";
    w.style.setProperty("--glow", e.toFixed(3));
  }
  function loop() {
    raf = null; var t = target();
    cur += (t - cur) * 0.12; if (Math.abs(t - cur) < 0.001) cur = t; else raf = requestAnimationFrame(loop);
    paint(cur);
  }
  addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(loop); });
  cur = target(); paint(cur);
})();

/* BoJack: reveal blocks, draw the gold thread through the process */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 17: "+(e&&e.message||e))}
try{
(function () {
  var bj = document.querySelector(".bj"); if (!bj) return;
  var proc = bj.querySelector(".bj-proc"), th = bj.querySelector(".bj-thread path");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -18% 0px", threshold: 0 });
    io.observe(bj.querySelector(".bj-hero")); io.observe(proc);
    bj.querySelector(".bj-hero").classList.remove("in");
  } else { bj.classList.add("in"); proc.classList.add("in"); }
  // hero reveal classes live on .bj so the CSS can use .bj.in
  new IntersectionObserver(function (es, ob) { es.forEach(function (e) { if (e.isIntersecting) { bj.classList.add("in"); ob.disconnect(); } }); }, { rootMargin: "0px 0px -18% 0px", threshold: 0 }).observe(bj);
  var tick = false;
  function up() { tick = false; if (!th) return; var r = proc.getBoundingClientRect(), vh = innerHeight;
    var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9))); th.style.setProperty("--th", (1 - p).toFixed(3)); }
  addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(up); } }, { passive: true }); up();
})();

/* Brand pages: scroll-synced. Regions light up one after another as the page scrolls in, and reverse on the way back */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 18: "+(e&&e.message||e))}
try{
(function () {
  var pgs = [].slice.call(document.querySelectorAll(".pg")).map(function (pg) {
    return { el: pg, st: pg.querySelector(".pg-stage"), base: pg.querySelector(".pg-base"), rs: [].slice.call(pg.querySelectorAll(".pg-r")), cur: 0 };
  });
  if (!pgs.length) return;
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  pgs.forEach(function (o) { o.el.classList.add("sync"); });
  function paint(o, p) {
    var n = o.rs.length, span = 0.45, gap = (1 - span) / Math.max(1, n - 1);
    o.rs.forEach(function (r, i) {
      var k = Math.max(0, Math.min(1, (p - i * gap) / span)); k = k * k * (3 - 2 * k);
      r.style.opacity = k.toFixed(3);
      r.style.transform = "translate3d(0," + ((1 - k) * 26).toFixed(1) + "px,0) scale(" + (1 + (1 - k) * 0.03).toFixed(4) + ")";
    });
    var b = Math.max(0, Math.min(1, (p - 0.75) / 0.25));
    o.base.style.filter = b >= 1 ? "none" : "brightness(" + (0.72 + 0.28 * b).toFixed(3) + ") blur(" + (3 * (1 - b)).toFixed(2) + "px)";
    o.base.style.opacity = 1;
    o.el.classList.toggle("done", p >= 0.999);
    if (innerWidth > 900) o.st.style.setProperty("--z", (1.05 - 0.05 * p).toFixed(4));
  }
  if (still) { pgs.forEach(function (o) { paint(o, 1); }); return; }
  var raf = null;
  function loop() {
    raf = null; var vh = innerHeight, moving = false;
    pgs.forEach(function (o) {
      var r = o.st.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return;
      var target = Math.max(0, Math.min(1, (vh * 0.95 - r.top) / (vh * 0.75)));
      o.cur += (target - o.cur) * 0.18; if (Math.abs(target - o.cur) < 0.002) o.cur = target; else moving = true;
      paint(o, o.cur);
    });
    if (moving) raf = requestAnimationFrame(loop);
  }
  addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(loop); });
  loop();
})();

/* detective VR frame settles in when seen */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 19: "+(e&&e.message||e))}
try{
(function () { var d = document.querySelector(".dvr"); if (!d) return;
  if (!("IntersectionObserver" in window)) { d.classList.add("in"); return; }
  new IntersectionObserver(function (es, ob) { es.forEach(function (e) { if (e.isIntersecting) { d.classList.add("in"); ob.disconnect(); } }); }, { rootMargin: "0px 0px -18% 0px", threshold: 0 }).observe(d); })();

/* keyframe boards: frames settle in, gold timeline draws with scroll */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 20: "+(e&&e.message||e))}
try{
(function () {
  var secs = [].slice.call(document.querySelectorAll(".kf-sec")); if (!secs.length) return;
  secs.forEach(function (s) {
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es, ob) { es.forEach(function (e) { if (e.isIntersecting) { s.classList.add("in"); ob.disconnect(); } }); }, { rootMargin: "0px 0px -18% 0px", threshold: 0 }).observe(s);
    else s.classList.add("in");
  });
  var tick = false;
  function up() { tick = false; var vh = innerHeight;
    secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (r.height * 0.9))); s.querySelector(".kf-line").style.setProperty("--kp", p.toFixed(3)); }); }
  addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(up); } }, { passive: true }); up();
})();

/* systems opener: orthogonal connectors entering from every edge, ending in nodes, pulses running along them */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 21: "+(e&&e.message||e))}
try{
(function () {
  var svg = document.querySelector(".sys-net svg"); if (!svg) return;
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var R = 14, out = "", lines = [
    // [start x,y, then alternating h/v targets...]
    [[0,120],["h",260],["v",220],["h",420]], [[0,380],["h",180],["v",300],["h",330]], [[0,640],["h",300],["v",720],["h",470]],
    [[0,820],["h",120],["v",760],["h",210]], [[1600,90],["h",1380],["v",200],["h",1190]], [[1600,330],["h",1450],["v",260],["h",1300]],
    [[1600,600],["h",1320],["v",690],["h",1150]], [[1600,850],["h",1480],["v",780],["h",1380]], [[360,0],["v",90],["h",560],["v",150]],
    [[1200,0],["v",60],["h",1010],["v",140]], [[520,900],["v",820],["h",690],["v",760]], [[1080,900],["v",840],["h",930],["v",770]],
    [[800,0],["v",40]], [[760,900],["v",860]]
  ];
  lines.forEach(function (L, i) {
    var x = L[0][0], y = L[0][1], d = "M" + x + "," + y, pts = [[x, y]];
    for (var k = 1; k < L.length; k++) { var t = L[k]; if (t[0] === "h") x = t[1]; else y = t[1]; pts.push([x, y]); }
    // rounded corners
    d = "M" + pts[0][0] + "," + pts[0][1];
    for (var j = 1; j < pts.length; j++) {
      var p0 = pts[j - 1], p1 = pts[j], p2 = pts[j + 1];
      if (!p2) { d += " L" + p1[0] + "," + p1[1]; break; }
      var dx1 = Math.sign(p1[0] - p0[0]), dy1 = Math.sign(p1[1] - p0[1]), dx2 = Math.sign(p2[0] - p1[0]), dy2 = Math.sign(p2[1] - p1[1]);
      d += " L" + (p1[0] - dx1 * R) + "," + (p1[1] - dy1 * R) + " Q" + p1[0] + "," + p1[1] + " " + (p1[0] + dx2 * R) + "," + (p1[1] + dy2 * R);
    }
    var delay = (i * 0.12).toFixed(2) + "s", end = pts[pts.length - 1], dur = (4 + rnd() * 4).toFixed(1) + "s";
    out += '<path class="w" pathLength="1" style="--d:' + delay + '" d="' + d + '"/>';
    out += '<g class="nd" style="--d:' + delay + '"><rect x="' + (end[0] - 22) + '" y="' + (end[1] - 10) + '" width="44" height="20" rx="6"/><circle cx="' + (end[0] - 11) + '" cy="' + end[1] + '" r="2.5"/></g>';
    out += '<circle class="pl" r="2.6"><animateMotion dur="' + dur + '" begin="' + (rnd() * 3).toFixed(1) + 's" repeatCount="indefinite" path="' + d + '"/></circle>';
  });
  svg.innerHTML = out;
})();

/* Section blends: wherever two neighbouring sections have different background colours,
   the top of the lower one fades in from the colour above, so the page reads as one continuous surface */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 22: "+(e&&e.message||e))}
try{
(function () {
  var main = document.querySelector("main"); if (!main) return;
  // resolve any CSS colour (hex, rgb or oklch tokens) to sRGB by painting one pixel
  var cv = document.createElement("canvas"); cv.width = cv.height = 1; var cx = cv.getContext("2d", { willReadFrequently: true });
  function rgb(el) {
    var c = getComputedStyle(el).backgroundColor;
    if (!c || c === "transparent" || /rgba\(0, 0, 0, 0\)/.test(c) || /\/ 0\)$/.test(c)) return null;
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    var d = cx.getImageData(0, 0, 1, 1).data; if (d[3] === 0) return null;
    return [d[0], d[1], d[2]];
  }
  var base = rgb(document.body) || rgb(document.documentElement) || [11, 11, 12];
  function hex(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function edge(el, side) { var d = el.getAttribute(side === "top" ? "data-edge-top" : "data-edge-bottom"); return d ? hex(d) : (rgb(el) || base); }
  function build() {
    [].forEach.call(document.querySelectorAll(".sec-blend"), function (b) { b.remove(); });
    var kids = [].filter.call(main.children, function (k) { return /^(SECTION|DIV)$/.test(k.tagName) && k.offsetHeight > 40; });
    for (var i = 1; i < kids.length; i++) {
      var a = edge(kids[i - 1], "bottom"), b = edge(kids[i], "top");
      var diff = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (diff < 6 || kids[i].classList.contains("to-light") || kids[i - 1].classList.contains("to-light")) continue;
      // sections you can jump to from the menu keep a clean top edge: their blend is painted at the bottom of the section above instead
      var intoPrev = !!kids[i].id, el = intoPrev ? kids[i - 1] : kids[i], c = intoPrev ? b : a;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var d = document.createElement("div"); d.className = "sec-blend" + (intoPrev ? " up" : ""); d.setAttribute("aria-hidden", "true");
      var big = diff > 120;   // strong colour change: longer, softer blend
      d.style.height = big ? "clamp(120px,20vh,240px)" : "clamp(60px,10vh,130px)";
      d.style.background = "linear-gradient(" + (intoPrev ? "0deg" : "180deg") + ",rgb(" + c.join(",") + ") 0%,rgba(" + c.join(",") + ",.55) 35%,rgba(" + c.join(",") + ",0) 100%)";
      if (intoPrev) el.appendChild(d); else el.insertBefore(d, el.firstChild);
    }
  }
  if (document.readyState === "complete") build(); else addEventListener("load", build);
})();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("main block 23: "+(e&&e.message||e))}
