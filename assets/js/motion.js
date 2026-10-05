/* =========================================================================
   motion.js — the only motion system on the site (GSAP + ScrollTrigger).
   Native scrolling; one ticker; every scroll-linked effect is a ScrollTrigger.

   Level 1  global: atmosphere tint, sector transitions, chapter titles
   Level 2  storytelling: one timeline per signature project
   Level 3  interface feedback lives in CSS and projects.js

   CSS holds every scene in its finished state. Timelines here animate *from*
   earlier states, so phones, reduced motion and a failed script still show
   the complete work.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var fallback = setTimeout(function () { root.classList.add("motion-fallback"); }, 4000);
  if (!window.gsap || !window.ScrollTrigger) { root.classList.add("motion-fallback"); return; }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: "power3.out", duration: 1 });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DESKTOP = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
  var MOBILE = "(max-width: 900px) and (prefers-reduced-motion: no-preference)";
  var mm = gsap.matchMedia();
  window.siteMotion = { mm: mm };

  /* ---------------------------------------------------------------- media
     Only the hero film loads at once. Every other video gets its source a
     screen before it arrives and plays only while it is on screen. */
  function arm(v) { if (!v.getAttribute("src") && v.dataset.src) { v.src = v.dataset.src; v.load(); } }
  function play(v) { arm(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  $$("video[data-src]").forEach(function (v) {
    var box = v.closest(".chapter, .film-cut, .proc-fig, .loop, .reel-hero, .reel-f") || v;
    ScrollTrigger.create({ trigger: box, start: "top bottom+=100%", end: "bottom top-=100%", onToggle: function (st) { if (st.isActive) arm(v); } });
    ScrollTrigger.create({ trigger: box, start: "top bottom", end: "bottom top", onToggle: function (st) { st.isActive ? play(v) : v.pause(); } });
  });
  var heroV = $(".hero-v");
  if (heroV) ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: function (st) { st.isActive ? play(heroV) : heroV.pause(); } });

  /* ---------------------------------------------------------------- hero
     Film fades up, the small information arrives, the title rises line by
     line, the scroll cue comes last. */
  (function hero() {
    var h = $(".hero"); if (!h) return;
    clearTimeout(fallback);
    var lines = $$(".hero-title .line > span", h);
    if (reduce) { gsap.set([".hero-film", ".hero-meta", ".hero-by", ".hero-cap", ".hero-cue", lines], { opacity: 1 }); return; }
    var tl = gsap.timeline({ delay: .15 });
    tl.fromTo(".hero-film", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 2.4, ease: "power2.out" })
      .fromTo(".hero-meta", { opacity: 0 }, { opacity: 1, duration: 1 }, .7)
      .fromTo(".hero-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, .8)
      .fromTo(lines, { yPercent: 105, opacity: 1 }, { yPercent: 0, duration: 1.3, stagger: .16, ease: "power4.out" }, 1.1)
      .fromTo(".hero-by", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .9 }, 1.9)
      .fromTo(".hero-cap", { opacity: 0 }, { opacity: 1, duration: .8 }, 2.2)
      .fromTo(".hero-cue", { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .8 }, 2.5);
    // leaving the hero: the title drifts up and the film dims, tied to scroll
    mm.add("(prefers-reduced-motion: no-preference)", function () {
      gsap.to(".hero-head", { yPercent: -18, opacity: .2, ease: "none", scrollTrigger: { trigger: h, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero-v", { opacity: .35, ease: "none", scrollTrigger: { trigger: h, start: "center top", end: "bottom top", scrub: true } });
    });
    // what is playing in the reel
    var cap = $(".hero-cap-t"), caps = [];
    try { caps = JSON.parse(heroV.dataset.caps || "[]"); } catch (e) { caps = []; }
    var last = "";
    if (heroV && cap && caps.length) heroV.addEventListener("timeupdate", function () {
      var t = heroV.currentTime, c = caps[0];
      for (var i = 0; i < caps.length; i++) if (t >= caps[i][0]) c = caps[i];
      var label = c[1] + ", " + c[2].toLowerCase();
      if (label === last) return; last = label;
      cap.classList.add("out");
      setTimeout(function () { cap.textContent = label; cap.classList.remove("out"); }, 300);
    });
  })();

  /* ---------------------------------------------------------------- atmosphere
     One tinted light per sector and per signature project. Opacity follows
     the scroll position directly: no timers, so the colour never lags. */
  var tints = $$("[data-tint]").map(function (el) {
    var d = document.createElement("div");
    d.className = "atmo-tint";
    d.style.setProperty("--c", el.dataset.tint);
    $(".atmo-tints").appendChild(d);
    return { el: el, d: d, top: 0, a: -1 };
  });
  function tintTops() { var y = scrollY; tints.forEach(function (t) { t.top = t.el.getBoundingClientRect().top + y; }); }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function paintTints() {
    var vh = innerHeight, line = scrollY + vh * .62, span = vh * .55, cur = -1;
    for (var i = 0; i < tints.length; i++) if (tints[i].top <= line) cur = i;
    var t = cur < 0 ? 0 : (line - tints[cur].top) / span;
    tints.forEach(function (x, i) {
      var a = 0;
      if (i === cur) a = smooth((t - .25) / .75);          // the next colour comes in a little after the old one leaves
      else if (i === cur - 1) a = 1 - smooth(t * 1.4);     // so the hand-over passes through a darker moment
      if (Math.abs(a - x.a) < .004) return;
      x.a = a; x.d.style.opacity = a.toFixed(3); x.d.style.visibility = a > 0 ? "visible" : "hidden";
    });
  }
  if (tints.length) {
    ScrollTrigger.addEventListener("refresh", function () { tintTops(); paintTints(); });
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: paintTints });
  }

  /* ---------------------------------------------------------------- sector transitions
     As a chapter rises over the end of the previous sector, that sector dims,
     the new picture comes up from the dark and the title arrives with it. */
  function wrapTitle(el) {
    if (!el || el.querySelector(".line")) return;
    var line = document.createElement("span"); line.className = "line";
    var inner = document.createElement("span");
    while (el.firstChild) inner.appendChild(el.firstChild);
    line.appendChild(inner); el.appendChild(line);
  }
  $$(".chapter").forEach(function (ch) { wrapTitle($(".chapter-title", ch)); });

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    $$(".chapter").forEach(function (ch) {
      var sector = ch.closest(".sector"), prev = sector && sector.previousElementSibling;
      var tail = prev ? (prev.classList.contains("sector") ? prev.lastElementChild : prev.firstElementChild) : null;
      var box = $(".chapter-media", ch), media = box && (box.querySelector(".chapter-art") ? box : box.firstElementChild);
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ch, start: "top bottom", end: "center center", scrub: .5 } });
      if (tail) tl.to(tail, { opacity: .18, y: -30, duration: .7 }, 0);
      if (media) tl.fromTo(media, { opacity: 0, scale: 1.1 }, { opacity: media.tagName === "VIDEO" ? .42 : 1, scale: 1.02, duration: 1 }, 0);
      tl.fromTo($(".chapter-num", ch), { opacity: 0 }, { opacity: 1, duration: .25 }, .55)
        .fromTo($(".chapter-title .line > span", ch), { yPercent: 108 }, { yPercent: 0, duration: .4, ease: "power2.out" }, .5)
        .fromTo($(".chapter-sub", ch), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .3 }, .7)
        .fromTo($(".chapter-rule", ch), { scaleX: 0 }, { scaleX: 1, duration: .45 }, .62);
      if (media) gsap.to(media, { scale: 1, ease: "none", scrollTrigger: { trigger: ch, start: "center center", end: "bottom top", scrub: true } });
    });
  });

  /* ---------------------------------------------------------------- reveals
     Calm by default: copy blocks fade in once, pictures settle like a camera
     finding focus. Illustrations get their own ink treatment further down. */
  var reveal = {
    copy: function (els) {
      els.forEach(function (el) {
        gsap.fromTo(el.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .9, stagger: .07,
          scrollTrigger: { trigger: el, start: "top 86%", once: true } });
      });
    },
    title: function (els) {
      els.forEach(function (el) {
        wrapTitle(el);
        gsap.fromTo($(".line > span", el), { yPercent: 104 }, { yPercent: 0, duration: 1.1, ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
    },
    settle: function (els) {
      els.forEach(function (el) {
        gsap.fromTo(el, { scale: 1.08 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
    }
  };
  window.siteMotion.reveal = reveal;

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    reveal.title($$(".project > .wrap.split .project-title, .project > .wrap.split .title-2, .section-head .title-2, .about-copy .title-2, .contact-copy .title-1"));
    reveal.copy($$(".split-b, .section-head, .points, .ba, .svc, .proc-txt, .web-proof, .web-cta, .feature-copy, .film-cut-copy, .btw-copy, .rem-pts, .rem-words, .bj-copy, .bj-brief, .eco-sys, .print-copy, .chair-copy, .lv-notes, .about-copy, .tools-head, .contact-copy, .courses, .chess-spec, .sla-result"));
    reveal.settle($$(".wide-shot img, .rem-cover img, .chair-fig img, .bj-art img, .eco-card-img img"));
    $$(".gor-pt").forEach(function (pt, i) {
      gsap.fromTo(pt.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .9, stagger: .1, delay: i * .12, scrollTrigger: { trigger: ".gor-pts", start: "top 82%", once: true } });
    });
    // supporting pictures: a single soft arrival, no movement
    $$(".bj-step, .loop, .reel-hero, .reel-f, .rem-flat, .tape:not(.tape-collage), .proc-fig").forEach(function (el) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
  });

  /* ---------------------------------------------------------------- statement */
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    gsap.fromTo(".statement-char img", { xPercent: 14, opacity: 0 }, { xPercent: 0, opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".statement", start: "top 80%", end: "center 55%", scrub: true } });
  });


  /* ================================================================ signature projects (desktop) */
  mm.add(DESKTOP, function () {
    var cleanups = [];

    /* Gorilla: one scrubbed shot. The background pushes in, the woman separates
       with depth, the logo lands, then the supporting words. Reverses on the way up. */
    (function () {
      var g = $(".gor"); if (!g) return;
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".gor-pin", start: "top top", end: "+=90%", pin: true, scrub: .6, anticipatePin: 1 } });
      // the logo is part of the opening frame, as on the campaign board; it only settles
      tl.fromTo(".gor-bg img", { scale: 1.2, opacity: .35 }, { scale: 1, opacity: 1, duration: 1 }, 0)
        .fromTo(".gor-logo", { scale: 1.08 }, { scale: 1, duration: .8, ease: "power2.out" }, 0)
        .fromTo(".gor-girl", { xPercent: 10, scale: .94 }, { xPercent: 0, scale: 1, duration: .8, ease: "power2.out" }, .15)
        .fromTo(".gor-girl", { opacity: 0 }, { opacity: 1, duration: .28 }, .17)
        .fromTo(".gor-girl img", { yPercent: 4 }, { yPercent: 0, duration: 1.1 }, .15)
        .fromTo([".gor-kicker", ".gor-sub", ".gor-ticks"], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .3, stagger: .08 }, .75)
        .to({}, { duration: .25 });
    })();

    /* Gorilla, splash to spotlight: the burst through the ice slowly pushes in, the
       tagline leaves, the frame dips into the dark, and the hall opens out of it. */
    (function () {
      var x = $(".gx"); if (!x) return;
      x.classList.add("is-pinned");
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".gx-pin", start: "top top", end: "+=110%", pin: true, scrub: .6, anticipatePin: 1 } });
      tl.fromTo(".gx-a > img", { scale: 1.02 }, { scale: 1.12, duration: .6 }, 0)
        .fromTo(".gx-copy", { opacity: 1, y: 0 }, { opacity: 0, y: -30, duration: .2, ease: "power1.in" }, .22)
        .fromTo(".gx-dim", { opacity: 0 }, { opacity: .92, duration: .22, ease: "power1.inOut" }, .36)
        .fromTo(".gx-b", { opacity: 0 }, { opacity: 1, duration: .01 }, .58)
        .to(".gx-dim", { opacity: 0, duration: .3, ease: "power1.inOut" }, .58)
        .fromTo(".gx-b img", { scale: 1.14 }, { scale: 1, duration: .42, ease: "power2.out" }, .58);
      cleanups.push(function () { x.classList.remove("is-pinned"); });
    })();

    /* Instinct: references appear, connections draw, the references blend into
       the final composition, then the finished frames cross-fade. */
    (function () {
      var w = $(".inw"); if (!w) return;
      var stage = $(".inw-stage", w), svg = $(".inw-links", w), refs = $$(".inw-ref", w), out = $(".inw-out", w);
      var frames = $$(".inw-frames img", w), count = $(".inw-count", w);
      function wires() {
        var s = stage.getBoundingClientRect(), o = $(".inw-frames", w).getBoundingClientRect();
        svg.setAttribute("viewBox", "0 0 " + s.width + " " + s.height);
        svg.innerHTML = refs.map(function (r, i) {
          var b = $(".inw-img", r).getBoundingClientRect();
          var x1 = b.right - s.left, y1 = b.top + b.height / 2 - s.top, x2 = o.left - s.left, y2 = o.top - s.top + o.height * (.3 + i * .2);
          var mx = (x1 + x2) / 2;
          return '<path pathLength="1" d="M' + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2 + '"/>';
        }).join("");
        return $$("path", svg);
      }
      var paths = wires();
      var ghosts = refs.map(function (r) {           // faint copies of each reference that dissolve into the final frame
        var gimg = $("img", r).cloneNode(); gimg.alt = ""; gimg.className = "inw-ghost"; gimg.removeAttribute("loading");
        gimg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none";
        $(".inw-frames", w).appendChild(gimg); return gimg;
      });
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".inw-pin", start: "top top", end: "+=130%", pin: true, scrub: .6, anticipatePin: 1, onRefresh: function () { paths = wires(); } } });
      gsap.fromTo(refs, { opacity: 0, x: -24 }, { opacity: 1, x: 0, stagger: .15, ease: "power2.out", scrollTrigger: { trigger: ".inw-pin", start: "top 85%", end: "top 15%", scrub: .5 } });
      tl.fromTo(out, { opacity: .15 }, { opacity: 1, duration: .3 }, .1)
        .fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: .08, duration: .35 }, .3)
        .fromTo(ghosts, { opacity: 0 }, { opacity: .45, stagger: .06, duration: .2 }, .55)
        .fromTo(frames[0], { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: .45 }, .72)
        .to(ghosts, { opacity: 0, duration: .35 }, .8)
        .to(refs, { opacity: .35, duration: .3 }, .85);
      for (var i = 1; i < frames.length; i++) tl.fromTo(frames[i], { opacity: 0 }, { opacity: 1, duration: .28 }, 1.15 + (i - 1) * .32);
      tl.eventCallback("onUpdate", function () {
        var p = tl.time(), n = p < 1.29 ? 1 : Math.min(frames.length, 2 + Math.floor((p - 1.29) / .32));
        if (count) count.textContent = String(n).padStart(2, "0") + " / " + String(frames.length).padStart(2, "0");
      });
      cleanups.push(function () { ghosts.forEach(function (g) { g.remove(); }); svg.innerHTML = ""; });
    })();

    /* Sla: three beats. Atmosphere, the packaging system, the result in the café. */
    (function () {
      var s = $(".sla"); if (!s) return;
      s.classList.add("is-pinned");
      var steps = $$(".sla-steps li", s);
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".sla-pin", start: "top top", end: "+=160%", pin: true, scrub: .6, anticipatePin: 1,
        onUpdate: function (st) { var k = st.progress < .36 ? 0 : st.progress < .7 ? 1 : 2; steps.forEach(function (li, i) { li.classList.toggle("on", i === k); }); } } });
      // beat one is already in place when the scene pins: it arrives on the approach
      gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".sla-pin", start: "top 85%", end: "top 10%", scrub: true } })
        .fromTo(".sla-b1 .sla-copy > *", { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: .1, duration: .5 }, .2)
        .fromTo(".sla-hero", { opacity: 0, y: 60, rotate: -6 }, { opacity: 1, y: 0, rotate: 0, duration: .7 }, .1);
      tl.to(".sla-snow i", { yPercent: 12, force3D: true, duration: 1 }, 0)
        .to(".sla-b1", { opacity: 0, y: -40, duration: .14 }, .3)
        .fromTo(".sla-b2", { opacity: 0 }, { opacity: 1, duration: .08 }, .36)
        .fromTo(".sla-b2 .sla-copy", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .1 }, .38)
        .fromTo(".sla-p", { opacity: 0, y: 70 }, { opacity: 1, y: 0, stagger: .05, duration: .16, ease: "power2.out" }, .4)
        .to(".sla-b2", { opacity: 0, y: -40, duration: .12 }, .66)
        .fromTo(".sla-b3", { opacity: 0 }, { opacity: 1, duration: .06 }, .7)
        .fromTo(".sla-cafe", { clipPath: "inset(18% 12% 18% 12%)", scale: 1.1 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: .2, ease: "power2.out" }, .7)
        .fromTo(".sla-snow", { opacity: 1 }, { opacity: 0, duration: .1 }, .72)
        .fromTo(".sla-result > *", { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: .04, duration: .12 }, .82)
        .to({}, { duration: .06 });
      cleanups.push(function () { s.classList.remove("is-pinned"); });
    })();

    /* Web and UI: a website is built in five layers. Each one drops onto the stack
       in order (brief, sitemap, wireframe, look, responsive), its step lights up on the
       right, and at the end the stack folds flat into the finished, live site. */
    (function () {
      var w = $(".ws"); if (!w) return;
      w.classList.add("is-3d");
      var cards = $$(".ws-card", w), txts = $$(".ws-txt", w), gap = 36, last = -1;
      function rest(i) { return (2 * gap - i * gap) + "px"; }
      // the current layer's step opens; at the end every step reads as done
      function light(k) { if (k === last) return; last = k; w.classList.toggle("is-done", k === 5); txts.forEach(function (t, i) { t.classList.toggle("on", i === k); }); }
      var tl = gsap.timeline({ defaults: { ease: "power2.out" }, scrollTrigger: { trigger: ".ws-pin", start: "top top", end: "+=170%", pin: true, scrub: .6, anticipatePin: 1,
        onUpdate: function (st) { var p = st.progress; light(p > .9 ? 5 : Math.min(4, Math.floor(p / .155))); } } });
      gsap.set(cards, { "--rx": "56deg", "--rz": "-38deg" });
      tl.set([".ws-live", ".ws-lock"], { opacity: 0 }, 0).set(".ws-end", { opacity: 0, y: 10 }, 0);
      gsap.fromTo(cards[0], { opacity: 0, "--ty": (2 * gap - 240) + "px" }, { opacity: 1, "--ty": rest(0), ease: "power2.out", scrollTrigger: { trigger: ".ws-pin", start: "top 75%", end: "top 10%", scrub: .5 } });
      cards.forEach(function (c, i) {
        if (i) tl.fromTo(c, { opacity: 0, "--ty": (2 * gap - i * gap - 240) + "px" }, { opacity: 1, "--ty": rest(i), duration: .1 }, i * .155);
      });
      // inside each layer, its own small build
      tl.fromTo(".ws-brief > i", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .05, stagger: .008 }, .04)
        .fromTo(".ws-map svg", { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .06 }, .2)
        .fromTo(".ws-wire > *", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .05, stagger: .015 }, .36)
        .fromTo(".ws-look .w-sun", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .06 }, .52)
        .fromTo(".ws-phone", { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: .06 }, .68)
        .fromTo(".ws-motion", { opacity: 0 }, { opacity: 1, duration: .04 }, .72)
      // fold: the stack lies down flat and merges into one page with its phone
        .fromTo(cards, { "--rx": "56deg", "--rz": "-38deg", "--ty": function (i) { return rest(i); } }, { "--rx": "0deg", "--rz": "0deg", "--ty": "0px", duration: .12, ease: "power2.inOut", immediateRender: false }, .8)
        .to(cards.slice(0, 3), { opacity: 0, duration: .06 }, .84)
        .to(".ws-resp", { borderColor: "rgba(0,0,0,0)", duration: .04 }, .86)
        .fromTo(".ws-resp", { "--tx": "0px" }, { "--tx": function () { return ($(".ws-resp").offsetWidth * .2) + "px"; }, duration: .06, ease: "power2.inOut", immediateRender: false }, .88)
        .to(".ws-motion", { opacity: 0, duration: .04 }, .86)
        .to([".ws-live", ".ws-lock"], { opacity: 1, duration: .03 }, .93)
        .to(".ws-end", { opacity: 1, y: 0, duration: .04 }, .93)
        .to({}, { duration: .05 });
      light(0);
      cleanups.push(function () { w.classList.remove("is-3d", "is-done"); txts.forEach(function (t) { t.classList.remove("on"); }); last = -1; cards.forEach(function (c) { ["--ty", "--rx", "--rz", "--tx"].forEach(function (v) { c.style.removeProperty(v); }); }); });
    })();

    /* Systems: one proposal page builds itself, in the four real steps.
       1 the brief is written; 2 the 40-page master is scanned and a layout is picked,
       its grid opens on the page and the copy flies into place; 3 the imagery fills its
       frames; 4 review notes appear, resolve, the page is approved and joins the deck. */
    (function () {
      var x = $(".px"); if (!x) return;
      x.classList.add("is-pinned");
      var stage = $(".px-stage", x), fly = $$(".px-fly i", x), steps = $$(".px-steps li", x);
      var thumbs = $$(".px-thumbs i", x), pick = thumbs.indexOf($(".px-thumbs .pick", x)), scan = $(".px-scan", x);
      function rel(el, fx, fy) { var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left + r.width * fx, r.top - s.top + r.height * fy]; }
      var P = {};
      function spots() {
        P.from = rel($(".px-doc", x), .3, .3);
        P.to = [rel($(".px-title", x), 0, 0), rel($(".px-b1", x), 0, 0), rel($(".px-b2", x), 0, 0)];
        P.step = thumbs.length > 1 ? thumbs[1].getBoundingClientRect().left - thumbs[0].getBoundingClientRect().left : 0;
      }
      spots();
      var tl = gsap.timeline({ defaults: { ease: "power2.out" }, scrollTrigger: { trigger: ".px-pin", start: "top top", end: "+=160%", pin: true, scrub: .6, anticipatePin: 1,
        onRefresh: spots } });
      // the clock runs the whole way: days become minutes
      // before the pin: the empty workspace arrives, so the scene never opens on a blank screen
      gsap.timeline({ defaults: { ease: "power2.out" }, scrollTrigger: { trigger: ".px-pin", start: "top 85%", end: "top 10%", scrub: .5 } })
        .fromTo(".px-head", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .3 }, 0)
        .fromTo(".px-src", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: .4 }, .15)
        .fromTo(".px-page", { opacity: 0, y: 30 }, { opacity: .45, y: 0, duration: .4 }, .25)
        .fromTo(".px-lib", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4 }, .35)
        .fromTo(".px-out", { opacity: 0, x: 30 }, { opacity: .35, x: 0, duration: .4 }, .45)
        .fromTo(".px-steps", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4 }, .55);
      tl.fromTo(".px-to", { scaleX: 0 }, { scaleX: 1, duration: .92, ease: "none" }, 0)
        .fromTo(".px-d1", { opacity: 1 }, { opacity: .4, duration: .2 }, .72)
        .fromTo(".px-d2", { opacity: .3 }, { opacity: 1, duration: .1 }, .86)
      // 1 content in: the brief writes itself, its pictures land
        .fromTo(".px-doc > *", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .05, stagger: .012 }, 0)
        .fromTo(".px-pics i", { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .04, stagger: .012 }, .07)
      // 2 layout mapping: the master is scanned, one layout is chosen
        .set(thumbs[pick] || {}, { borderColor: "rgba(236,232,224,.14)", backgroundColor: "rgba(207,174,120,0)" }, 0)
        .fromTo(scan, { opacity: 0, x: 0 }, { opacity: 1, x: 0, duration: .02 }, .15)
        .to(scan, { x: function () { return P.step * pick; }, duration: .13, ease: "power1.inOut" }, .17)
        .to(thumbs[pick] || {}, { borderColor: "#cfae78", backgroundColor: "rgba(207,174,120,.16)", duration: .03 }, .3)
        .to(scan, { opacity: 0, duration: .03 }, .32)
        .fromTo(".px-page", { opacity: .45 }, { opacity: 1, duration: .05, immediateRender: false }, .3)
        .fromTo(".px-grid i", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: .06, stagger: .004 }, .31);
      // the copy travels from the brief into its slots
      fly.forEach(function (f, i) {
        tl.fromTo(f, { opacity: 0, x: function () { return P.from[0]; }, y: function () { return P.from[1] + i * 14; }, scale: .8 },
          { opacity: 1, x: function () { return P.to[i][0]; }, y: function () { return P.to[i][1]; }, scale: 1, duration: .1, ease: "power2.inOut" }, .38 + i * .03)
          .to(f, { opacity: 0, duration: .02 }, .48 + i * .03);
      });
      tl.fromTo([".px-kick", ".px-title", ".px-rule"], { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .05, stagger: .015 }, .47)
        .fromTo(".px-body i", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .04, stagger: .006 }, .5)
      // 3 visuals added
        .fromTo(".px-img > span", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .07, stagger: .03, ease: "power3.inOut" }, .58)
        .fromTo(".px-pn", { opacity: 0 }, { opacity: 1, duration: .03 }, .66)
      // 4 designer review: two notes, both resolved, approved, into the deck
        .fromTo(".px-note", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: .04, stagger: .03, ease: "back.out(2)" }, .7)
        .to(".px-note", { opacity: 0, scale: .4, duration: .04, stagger: .02 }, .8)
        .fromTo(".px-ok", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: .05, ease: "back.out(1.6)" }, .83)
        .fromTo(".px-out", { opacity: .35 }, { opacity: 1, duration: .04, immediateRender: false }, .86)
        .fromTo(".px-deck i", { opacity: 0, x: -30, rotate: -3 }, { opacity: 1, x: 0, rotate: 0, duration: .06, stagger: .02 }, .87)
        .to({}, { duration: .06 });
      // each step's line fills while that step happens
      var at = [0, .14, .55, .7], cur = -2;
      steps.forEach(function (li, i) { tl.fromTo(li, { "--p": 0 }, { "--p": 1, duration: [.14, .41, .15, .2][i], ease: "none" }, at[i]); });
      // the step being shown is lit; finished ones stay readable, later ones wait
      tl.eventCallback("onUpdate", function () {
        var t = tl.time(), k = -1;
        at.forEach(function (a, i) { if (t >= a) k = i; });
        if (t >= tl.duration() - .05) k = steps.length;
        if (k === cur) return; cur = k;
        steps.forEach(function (li, i) { li.classList.toggle("on", i === k); li.classList.toggle("done", i < k); });
      });
      cleanups.push(function () { x.classList.remove("is-pinned"); steps.forEach(function (li) { li.style.removeProperty("--p"); li.classList.remove("on", "done"); }); });
    })();

    /* 3D pipeline: each stage of the character appears as the line reaches it. */
    (function () {
      var p = $(".pipe"); if (!p) return;
      var nodes = $$(".pn", p), lines = $$(".pl", p);
      var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".pipe-pin", start: "top top", end: "+=120%", pin: true, scrub: .6, anticipatePin: 1 } });
      gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".pipe-pin", start: "top 85%", end: "top 15%", scrub: .5 } })
        .fromTo(".pipe-bg", { opacity: 0 }, { opacity: .55, duration: .5 }, 0)
        .fromTo(nodes.slice(0, 2), { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, stagger: .2, duration: .5 }, .3);
      // one beat per stage: the line draws, then the next stage settles in where it lands
      lines.forEach(function (l, i) {
        var at = .08 + i * .2;
        tl.fromTo(l, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .12, ease: "power1.inOut" }, at)
          .fromTo(nodes[i + 2], { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .1, ease: "power2.out" }, at + .1);
      });
      tl.to({}, { duration: .14 });
      cleanups.push(function () { gsap.set(nodes, { clearProps: "opacity,transform" }); });
    })();

    return function () { cleanups.forEach(function (f) { f(); }); };
  });

  /* ================================================================ signature projects (phones)
     Short staged reveals instead of long pinned scenes. */
  mm.add(MOBILE, function () {
    $$(".inw-ref, .inw-out, .sla-p, .px-src, .px-mid, .px-out, .gor-girl, .gor-copy, .ws-l, .pn").forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    var frames = $$(".inw-frames img");
    if (frames.length > 1) ScrollTrigger.create({ trigger: ".inw-out", start: "top 60%", end: "bottom 30%", onUpdate: function (st) {
      var k = Math.min(frames.length - 1, Math.floor(st.progress * frames.length));
      frames.forEach(function (f, i) { if (i) f.style.opacity = i <= k ? 1 : 0; });
    } });
  });

  /* ================================================================ craft-specific motion (all sizes) */
  mm.add("(prefers-reduced-motion: no-preference)", function () {

    /* illustration: pictures are revealed like ink going down, left to right; titles get a drawn rule */
    $$(".art").forEach(function (a) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: a, start: "top 78%", once: true } });
      tl.fromTo($(".art-fig", a), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "power2.inOut" })
        .fromTo($(".art-fig img", a), { scale: 1.06 }, { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
        .fromTo($(".art-txt", a).children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .8, stagger: .08 }, .6);
    });
    gsap.fromTo(".disc", { rotate: -40 }, { rotate: 40, ease: "none", scrollTrigger: { trigger: ".btw", start: "top bottom", end: "bottom top", scrub: true } });

    /* instinct collage: the three columns drift at different speeds, the middle one against the others */
    $$(".clg").forEach(function (c) {
      var cols = $$(".clg-col", c), amp = [-6, 9, -12];
      cols.forEach(function (col, i) {
        gsap.fromTo(col, { yPercent: -amp[i] / 2 }, { yPercent: amp[i] / 2, ease: "none", scrollTrigger: { trigger: c, start: "top bottom", end: "bottom top", scrub: .4 } });
      });
      $$(".tape-f", c).forEach(function (f, i) {
        gsap.fromTo(f, { opacity: 0, y: 40, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, delay: (i % 3) * .08, ease: "power3.out", scrollTrigger: { trigger: f, start: "top 92%", once: true } });
      });
    });

    /* Detective VR: the scene comes up out of the dark, like a light being switched on */
    gsap.fromTo(".dvr img", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: ".dvr", start: "top 80%", once: true } });

    /* tools tape: runs only while it is on screen */
    $$(".tools, .contact").forEach(function (t) { ScrollTrigger.create({ trigger: t, start: "top bottom", end: "bottom top", toggleClass: "is-on" }); });

    /* the stamp is pressed onto the page: it lands from above, a little oversized, then settles */
    gsap.fromTo(".stamp", { opacity: 0, scale: 1.6, rotate: -24 }, { opacity: 1, scale: 1, rotate: -9, duration: .8, ease: "back.out(1.8)", scrollTrigger: { trigger: ".contact", start: "top 60%", once: true } });

    /* Majesty: the glass pieces are set down one at a time, king first */
    $$(".pieces").forEach(function (p) {
      gsap.fromTo($$("i", p), { opacity: 0, y: -26, scale: 1.04 }, { opacity: 1, y: 0, scale: 1, duration: .8, stagger: .09, ease: "power3.out", scrollTrigger: { trigger: p, start: "top 82%", once: true } });
    });

    /* rugs: the BoJack pass lands like a printed ticket */
    gsap.fromTo(".bj-pass", { rotate: -2, y: 20, opacity: 0 }, { rotate: 0, y: 0, opacity: 1, duration: 1.1, scrollTrigger: { trigger: ".bj-pass", start: "top 88%", once: true } });

    /* branding: the EcoFurChild line logo draws itself, then fills */
    var efc = $$(".efc-svg path");
    if (efc.length) {
      var etl = gsap.timeline({ scrollTrigger: { trigger: ".eco-logo", start: "top 75%", once: true } });
      etl.fromTo(efc, { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0, strokeOpacity: 1 }, { strokeDashoffset: 0, duration: 2, stagger: { each: .02, from: "start" }, ease: "power2.inOut" })
         .to(efc, { fillOpacity: 1, strokeOpacity: 0, duration: 1, stagger: .01 }, "-=.8");
      efc.forEach(function (p) { p.setAttribute("pathLength", "1"); });
    }
    /* branding: identity becomes application. The 3D figure slides out of the poster it was made from */
    gsap.fromTo(".print-3d", { xPercent: -100, opacity: .2 }, { xPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: ".print-pair", start: "top 85%", end: "center 45%", scrub: true } });

    /* Majesty and 3D: a camera move that explains the object. The board tilts from plan into perspective */
    gsap.fromTo(".chess-cam", { rotateX: 0, y: 0 }, { rotateX: 48, y: -10, ease: "none", scrollTrigger: { trigger: ".chess-board", start: "top 80%", end: "bottom 30%", scrub: true } });
    /* MetaHuman range: the expressions arrive in order, left to right, inside their frame */
    gsap.fromTo(".mh-i", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .9, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: ".mh", start: "top 80%", once: true } });
  });


  /* Triggers are measured in page order, so every position below a pinned scene
     includes the scroll distance that pin adds. Pins are given priority by position. */
  ScrollTrigger.addEventListener("refreshInit", function () { ScrollTrigger.sort(); });

  /* keep measurements honest once fonts and late images arrive */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
