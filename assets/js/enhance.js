try{
/*
 * velaris.js: scroll-linked animated noise background, plain JS + WebGL.
 * Port of "Velaris" by amanshakya307 (21st.dev) for a no-framework site.
 *
 * Usage:
 *   <section class="vl-host" data-velaris> ... content ... </section>
 *   (loaded with the site scripts)
 *   Velaris.mount(document.querySelector('[data-velaris]'), { ...options })
 *
 * Options (all optional):
 *   bg        "#000000"             base colour, keep black on Marya's site
 *   colors    [c0,c1,c2,c3]         four hex colours (the fourth is usually dark)
 *   stops     [{at:0,colors:[...]}, {at:1,colors:[...]}]  colours by scroll progress (overrides colors)
 *   speed     0.6                   idle drift speed (time-based)
 *   travel    6.0                   how far the noise moves across the full scroll of the section
 *   grain     0.15                  film grain amount (keep low: 0.1 to 0.2)
 *   intensity 0.9                   peak colour strength
 *   edgeFade  0.25                  fraction of the scroll range used to fade in from / out to black
 *   res       0.5                   render scale (0.5 = half resolution; the image is soft, so this is free)
 *   smooth    6                     scroll smoothing strength (higher = snappier)
 */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 0: "+(e&&e.message||e))}
try{
(function (global) {
  'use strict';

  var VS = 'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';

  // Fragment shader: same look as the original (2D simplex, four-colour blend, glow, vignette, grain),
  // plus u_amp, which fades the whole field to black at the section edges.
  var FS = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform vec2 u_resolution;uniform float u_time;uniform float u_grain;uniform float u_amp;',
    'uniform vec3 u_colors[4];uniform vec3 u_bg;',
    'vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}',
    'float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    'vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    'vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);',
    'vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    'vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;',
    'vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;',
    'm*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    'return 130.*dot(m,g);}',
    'void main(){vec2 uv=vUv;float ratio=u_resolution.x/u_resolution.y;vec2 p=uv-.5;p.x*=ratio;',
    'float t=u_time*.1;',
    'float n1=snoise(p*.4+vec2(t*.2,-t*.3));',
    'float n2=snoise(p*.55+vec2(-t*.15,t*.25)+n1*.25);',
    'float n3=snoise(p*.75+vec2(t*.1,-t*.2)+n2*.2);',
    'vec3 col=u_bg;float dist=length(p)*1.5;float vig=1.-smoothstep(.3,1.2,dist);',
    'col=mix(col,u_colors[0],smoothstep(-.2,.5,n1)*.85);',
    'col=mix(col,u_colors[1],smoothstep(-.1,.6,n2)*.7);',
    'col=mix(col,u_colors[2],smoothstep(-.3,.4,n3)*.6);',
    'col=mix(col,u_colors[3],smoothstep(0.,.7,n1*n2)*.5);',
    'col+=u_colors[1]*smoothstep(.8,0.,dist)*.3;',
    'col=mix(col*.2,col,vig);',
    'col=mix(u_bg,col,u_amp);',
    'float gr=fract(sin(dot(uv,vec2(12.9898,78.233)))*43758.5453+u_time);',
    'col+=(gr-.5)*u_grain*.1*u_amp;',
    'gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function hex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  // Colour at scroll progress p, interpolated between stops.
  function colorsAt(stops, p) {
    if (stops.length === 1) return stops[0].rgb;
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      if (p <= b.at || i === stops.length - 2) {
        var k = smoothstep(a.at, b.at, p), out = [];
        for (var j = 0; j < 12; j++) out.push(a.rgb[j] + (b.rgb[j] - a.rgb[j]) * k);
        return out;
      }
    }
    return stops[stops.length - 1].rgb;
  }

  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    var o = {
      bg: opts.bg || '#000000',
      speed: opts.speed != null ? opts.speed : 0.6,
      travel: opts.travel != null ? opts.travel : 6.0,
      grain: opts.grain != null ? opts.grain : 0.15,
      intensity: opts.intensity != null ? opts.intensity : 0.9,
      edgeFade: opts.edgeFade != null ? opts.edgeFade : 0.25,
      res: opts.res != null ? opts.res : 0.5,
      smooth: opts.smooth != null ? opts.smooth : 6,
      fps: opts.fps || 0
    };
    var stops;
    function setStops(list) {
      stops = list.map(function (s) {
        var c = s.colors.slice(0, 4); while (c.length < 4) c.push('#000000');
        return { at: s.at, rgb: [].concat.apply([], c.map(hex)) };
      }).sort(function (a, b) { return a.at - b.at; });
    }
    setStops(opts.stops || [{ at: 0, colors: opts.colors || ['#2a2a2a', '#1a1a1a', '#3a3a3a', '#000000'] }]);

    // The canvas sits behind the content and never takes pointer events or screen-reader focus.
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'vl-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.insertBefore(canvas, host.firstChild);

    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.remove(); host.style.background = o.bg; return null; } // still looks finished: plain black

    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['u_resolution', 'u_time', 'u_grain', 'u_amp', 'u_colors', 'u_bg'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform3fv(U.u_bg, hex(o.bg));

    function resize() {
      var w = Math.max(1, Math.round(host.clientWidth * o.res));
      var h = Math.max(1, Math.round(host.clientHeight * o.res));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    var ro = new ResizeObserver(resize); ro.observe(host); resize();

    // Scroll progress: 0 when the section's top meets the bottom of the screen,
    // 1 when its bottom leaves the top. Read once per frame, never in a scroll listener.
    function progress() {
      var r = host.getBoundingClientRect(), vh = innerHeight;
      return clamp((vh - r.top) / (r.height + vh), 0, 1);
    }

    var reduce = matchMedia('(prefers-reduced-motion: reduce)');
    var clock = 0, sp = progress(), last = 0, raf = 0, visible = false, alive = true;

    var lastDraw = 0;
    function frame(now) {
      raf = 0;
      if (!alive) return;
      // optional frame cap (phones): soft noise at 30fps looks the same and costs half
      if (o.fps && now - lastDraw < 1000 / o.fps - 2) { if (visible) raf = requestAnimationFrame(frame); return; }
      lastDraw = now;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var target = progress();
      // Frame-rate independent smoothing (same feel at 60Hz and 120Hz).
      sp += (target - sp) * (1 - Math.exp(-o.smooth * dt));
      if (!reduce.matches) clock += dt * o.speed;

      // Fade from black on entry and back to black on exit, so the hand-over is never a hard edge.
      var e = o.edgeFade;
      var amp = o.intensity * smoothstep(0, e, sp) * (1 - smoothstep(1 - e, 1, sp));

      gl.uniform2f(U.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(U.u_time, clock + sp * o.travel * 10);
      gl.uniform1f(U.u_grain, o.grain);
      gl.uniform1f(U.u_amp, amp);
      gl.uniform3fv(U.u_colors, new Float32Array(colorsAt(stops, sp)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (visible) raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && alive && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    // Only run while the section is on screen and the tab is visible.
    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting; visible ? start() : stop();
    }, { rootMargin: '10% 0px' });
    io.observe(host);
    function onVis() { document.hidden ? stop() : (visible && start()); }
    document.addEventListener('visibilitychange', onVis);

    return {
      // move the same canvas and context to another section, with its own colour stops
      retarget: function (h, opt) {
        if (!h || h === host) { if (opt && opt.stops) setStops(opt.stops); return; }
        io.unobserve(host); ro.unobserve(host);
        host = h; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.insertBefore(canvas, host.firstChild);
        if (opt && opt.stops) setStops(opt.stops);
        if (opt && opt.intensity != null) o.intensity = opt.intensity;
        sp = progress(); resize(); io.observe(host); ro.observe(host);
      },
      destroy: function () {
        alive = false; stop(); io.disconnect(); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis); canvas.remove();
      },
      set: function (k, v) { o[k] = v; }
    };
  }

  global.Velaris = { mount: mount };
})(window);

/* =====================================================================
   ENHANCEMENT LAYER · motion choreography
   Vanilla, no libraries: the site already runs its own inertial scroller and
   pinned scenes, so GSAP/Lenis would only fight them. Everything here animates
   transform, opacity or filter, and stands down for prefers-reduced-motion.
   ===================================================================== */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 1: "+(e&&e.message||e))}
try{
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  var pending = [];
  // run cb once every image inside el is decoded, or after 700ms at most, so nothing ever fades in half-loaded
  function ready(el, cb) {
    var imgs = [].slice.call(el.tagName === "IMG" ? [el] : el.querySelectorAll("img")).filter(function (im) { return !(im.complete && im.naturalWidth); });
    if (!imgs.length || !("decode" in Image.prototype)) { cb(); return; }
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    Promise.all(imgs.map(function (im) { im.loading = "eager"; return im.decode().catch(function () {}); })).then(go);
    setTimeout(go, 700);
  }
  function once(els, cb, margin) {
    if (!("IntersectionObserver" in window) || reduce) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) fire(e.target); });
    }, { rootMargin: margin || "0px 0px -12% 0px", threshold: 0 });
    function fire(el) { if (el.__done) return; el.__done = true; io.unobserve(el); ready(el, function () { cb(el); }); }
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
  var sweepAt = 0;
  function sweepTick() { var now = performance.now(); if (now - sweepAt > 140 && pending.length) { sweepAt = now; sweep(); } }
  (window.__frame ? window.__frame.add(sweepTick) : addEventListener("scroll", sweepTick, { passive: true }));
  addEventListener("scroll", function () { clearTimeout(sweepT); sweepT = setTimeout(sweep, 160); }, { passive: true });

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
    (window.__frame ? window.__frame.add(drift) : addEventListener("scroll", drift, { passive: true }));
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
    (window.__frame ? window.__frame.add(scan) : addEventListener("scroll", scan, { passive: true }));
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
    (window.__frame ? window.__frame.add(run) : addEventListener("scroll", run, { passive: true }));
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
    // the page is black now: no colour engine. Only the faint smoke drifts with the scroll,
    // written as a transform on a composited layer and only when it moved by a pixel or more
    var smA = amb.appendChild(document.createElement("b")), smB = amb.appendChild(document.createElement("b"));
    smA.className = "smk a"; smB.className = "smk b";
    var lastY = -1e9;
    function ambRun() {
      var y = scrollY; if (Math.abs(y - lastY) < 2) return; lastY = y;
      smA.style.transform = "translate3d(0," + (Math.sin(y * 0.0007) * 90).toFixed(0) + "px,0) scale(1.15)";
      smB.style.transform = "translate3d(0," + (Math.sin(y * 0.0005 + 1) * 120).toFixed(0) + "px,0) scale(-1.3,1.3)";
    }
    // smoke switched off (pure black page): nothing to run per frame
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
    (window.__frame ? window.__frame.add(gRun) : addEventListener("scroll", gRun, { passive: true }));
    gRun();
  }

  /* ---------- failsafe: nothing stays hidden. Anything already on or above the screen is revealed,
     whatever the observers did (embedded viewers, fast jumps, odd browsers) ---------- */
  var fsList = null, fsTimer = null;
  var isHead = function (el) { return /^(H2|H3|H4)$/.test(el.tagName) || el.classList.contains("tagline"); };
  var isGroup = function (el) { return el.matches(".crs-grid, .cards, .bb-grid, .mhl-grid, .eco-pts, .feat3, .lv-legend, .pillars"); };
  function shown(el) {
    if (el.classList.contains("gx")) return el.classList.contains("gx-in");
    var ok = true;
    if (el.matches(".reveal, .rise")) ok = ok && el.classList.contains("in");
    if (isHead(el) && el.querySelector(".hw")) ok = ok && el.classList.contains("words-in");
    if (isGroup(el)) ok = ok && el.classList.contains("st-on");
    return ok;
  }
  function failsafe() {
    var vh = innerHeight;
    if (!fsList) fsList = $$(".reveal, .rise, .gx, .crs-grid, .cards, .bb-grid, .mhl-grid, .eco-pts, .feat3, .lv-legend, .pillars, h2, h3, h4, .tagline");
    fsList = fsList.filter(function (el) { return !shown(el); });
    if (!fsList.length) { if (fsTimer) { clearInterval(fsTimer); fsTimer = null; } return; }
    fsList.forEach(function (el) {
      if (el.getBoundingClientRect().top >= vh * 0.98) return;
      if (el.classList.contains("gx")) { el.classList.add("gx-in"); return; }
      if (el.matches(".reveal, .rise")) el.classList.add("in");
      if (isHead(el) && el.querySelector(".hw")) el.classList.add("words-in");
      if (isGroup(el)) el.classList.add("st-on");
    });
  }
  var fsT = null;
  addEventListener("scroll", function () { clearTimeout(fsT); fsT = setTimeout(failsafe, 180); }, { passive: true });
  fsTimer = setInterval(failsafe, 1500);
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

/* BoJack Pilot: words and boarding pass arrive in order, the art drifts as if still falling,
   and a teal thread stitches the four process steps together as you scroll */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 2: "+(e&&e.message||e))}
try{
(function () {
  var sec = document.querySelector(".bjx"); if (!sec) return;
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var top = sec.querySelector(".bjx-top"), art = sec.querySelector(".bjx-art img"), brief = sec.querySelector(".bjx-brief"),
      steps = sec.querySelector(".bjx-steps"), frames = [].slice.call(sec.querySelectorAll(".bjx-steps .frame"));
  function on(el, cls, margin) {
    if (!el) return;
    if (still || !("IntersectionObserver" in window)) { el.classList.add(cls); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add(cls); io.disconnect(); } }); }, { rootMargin: margin || "0px 0px -15% 0px" });
    io.observe(el);
  }
  // the reveal class sits on the section so the CSS can stagger everything inside the top block
  if (top) {
    if (still || !("IntersectionObserver" in window)) sec.classList.add("bjx-on");
    else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { sec.classList.add("bjx-on"); io.disconnect(); } }, { rootMargin: "0px 0px -20% 0px" }); io.observe(top); }
  }
  on(brief, "on");
  // thread: built to the real width, knots above each frame
  var NS = "http://www.w3.org/2000/svg", svg = null, path = null, knots = [], len = 0, xs = [];
  function build() {
    if (!steps || innerWidth <= 900) { if (svg) { svg.remove(); svg = null; } frames.forEach(function (f) { on(f, "on", "0px 0px -8% 0px"); }); return; }
    var W = steps.clientWidth, H = parseFloat(getComputedStyle(steps).getPropertyValue("--th")) || 44;
    if (!svg) { svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "bjx-thread"); svg.setAttribute("aria-hidden", "true"); steps.insertBefore(svg, steps.firstChild); }
    H = svg.getBoundingClientRect().height || 44;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.innerHTML = "";
    xs = frames.map(function (f) { return f.offsetLeft + f.offsetWidth / 2; });
    var y = H * 0.55, a = H * 0.38, d = "M0," + y.toFixed(1);
    // a loose running stitch: dips between knots, rests on each knot
    for (var i = 0; i < xs.length; i++) {
      var x0 = i === 0 ? 0 : xs[i - 1], x1 = xs[i], mx = (x0 + x1) / 2;
      d += " Q" + mx.toFixed(1) + "," + (y + (i % 2 ? -a : a)).toFixed(1) + " " + x1.toFixed(1) + "," + y.toFixed(1);
    }
    d += " Q" + ((xs[xs.length - 1] + W) / 2).toFixed(1) + "," + (y - a).toFixed(1) + " " + W + "," + y.toFixed(1);
    path = document.createElementNS(NS, "path"); path.setAttribute("d", d); svg.appendChild(path);
    len = path.getTotalLength(); path.style.strokeDasharray = len.toFixed(1) + " " + len.toFixed(1);
    knots = xs.map(function (x) { var c = document.createElementNS(NS, "circle"); c.setAttribute("class", "knot"); c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", "4.5"); svg.appendChild(c); return c; });
    last = -1; tick();
  }
  var last = -1;
  function tick() {
    var vh = innerHeight;
    if (art && !still) {
      var r = sec.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        var t = Math.max(-1, Math.min(1, (r.top + Math.min(r.height, vh * 1.4) / 2 - vh / 2) / vh));   // -1..1 across the pass
        art.style.transform = "translate3d(0," + (t * -40).toFixed(1) + "px,0) rotate(" + (t * -3.2).toFixed(2) + "deg)";
      }
    }
    if (!svg || !path) return;
    var sr = steps.getBoundingClientRect(); if (sr.bottom < -100 || sr.top > vh + 100) return;
    var p = still ? 1 : Math.max(0, Math.min(1, (vh * 0.95 - sr.top) / (vh * 0.5)));
    if (Math.abs(p - last) < 0.0005) return; last = p;
    path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
    var reach = p * steps.clientWidth;
    xs.forEach(function (x, i) { var hit = reach >= x - 4; knots[i].classList.toggle("on", hit); if (hit) frames[i].classList.add("on"); });
  }
  build();
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 200); });
  addEventListener("load", build);
  (window.__frame ? window.__frame.add(tick) : addEventListener("scroll", tick, { passive: true }));
})();

/* Pinned section bar: turns solid once you leave the cover, and a pill slides to the sector you are in */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 3: "+(e&&e.message||e))}
try{
(function () {
  var nav = document.getElementById("nav"), cats = document.getElementById("cats"); if (!nav || !cats) return;
  var links = [].slice.call(cats.querySelectorAll(".cat")), ind = cats.querySelector(".cat-ind");
  // which bar item each chapter belongs to (Level Concept sits under 3D)
  var map = { film: "film", systems: "systems", web: "web", direction: "direction", illustration: "illustration", textile: "textile", branding: "branding", "three-d": "three-d", level: "three-d" };
  var chapters = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var stops = [document.getElementById("about"), document.getElementById("contact")].filter(Boolean);
  var cur = null, solid = null;
  function place(a) {
    if (!a) { cats.classList.remove("has-on"); return; }
    cats.classList.add("has-on");
    ind.style.transform = "translate3d(" + a.offsetLeft + "px,0,0) scaleX(" + (a.offsetWidth / 100).toFixed(4) + ")";
    // on narrow screens the bar scrolls sideways: keep the active item in view
    if (cats.scrollWidth > cats.clientWidth + 2) {
      var want = a.offsetLeft - (cats.clientWidth - a.offsetWidth) / 2;
      cats.scrollTo({ left: Math.max(0, want), behavior: "smooth" });
    }
  }
  function tick() {
    var y = scrollY, vh = innerHeight;
    var s = y > 40; if (s !== solid) { solid = s; nav.classList.toggle("nav-solid", s); }
    var line = vh * 0.42, found = null;
    for (var i = 0; i < chapters.length; i++) { if (chapters[i].getBoundingClientRect().top <= line) found = chapters[i]; else break; }
    for (var j = 0; j < stops.length; j++) { if (stops[j].getBoundingClientRect().top <= line) found = null; }
    var k = found ? map[found.id] : null;
    if (k === cur) return; cur = k;
    var a = null; links.forEach(function (l) { var on = l.getAttribute("data-k") === k; l.classList.toggle("on", on); if (on) { a = l; l.setAttribute("aria-current", "true"); } else l.removeAttribute("aria-current"); });
    place(a);
  }
  (window.__frame ? window.__frame.add(tick) : addEventListener("scroll", tick, { passive: true }));
  addEventListener("resize", function () { var a = cats.querySelector(".cat.on"); if (a) place(a); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var a = cats.querySelector(".cat.on"); if (a) place(a); });
  tick();
})();

/* Web & UI build: one browser goes from brief to live as the pinned scene scrolls */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 4: "+(e&&e.message||e))}
try{
(function () {
  var sec = document.querySelector(".wb"); if (!sec) return;
  var stage = sec.querySelector(".wb-stage"), now = sec.querySelector(".wb-now"), rail = [].slice.call(sec.querySelectorAll(".wb-rail li")), prog = sec.querySelector(".wb-prog");
  var nEl = now.querySelector(".wb-n"), tEl = now.querySelector(".wb-t"), dEl = now.querySelector(".wb-d");
  var steps = [
    ["01", "Brief", "Goals, audience and content, agreed before any pixel."],
    ["02", "Structure", "Sitemap and wireframes: what goes where, and why."],
    ["03", "Visual design", "Type, colour and imagery, built as one system from your brand."],
    ["04", "Motion and build", "Interaction, transitions and layouts for every screen size."],
    ["05", "Launch", "Live on your domain, checked on desktop and phone."]
  ];
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var at = [0.02, 0.2, 0.4, 0.6, 0.8], cur = -1, swapT = null;
  function show(i) {
    if (i === cur) return; cur = i;
    stage.setAttribute("data-s", String(i + 1));
    rail.forEach(function (li, k) { li.classList.toggle("on", k <= i); });
    var st = steps[Math.max(0, i)];
    clearTimeout(swapT); now.classList.add("swap");
    swapT = setTimeout(function () { nEl.textContent = st[0]; tEl.textContent = st[1]; dEl.textContent = st[2]; now.classList.remove("swap"); }, 220);
  }
  if (still) { show(4); prog.style.setProperty("--p", 1); return; }
  function tick() {
    var r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -100 || r.top > vh + 100) return;
    var span = sec.offsetHeight - vh, p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 1;
    prog.style.setProperty("--p", p.toFixed(4));
    var i = 0; for (var k = 0; k < at.length; k++) if (p >= at[k]) i = k;
    show(i);
  }
  (window.__frame ? window.__frame.add(tick) : addEventListener("scroll", tick, { passive: true }));
  tick();
})();

/* Handmade Rugs opener: the black fabric drifts with the scroll and a soft light runs along its folds */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 5: "+(e&&e.message||e))}
try{
(function () {
  var ch = document.getElementById("textile"); if (!ch) return;
  var mv = ch.querySelector(".fab-move"), sh = ch.querySelector(".fab-sheen b"); if (!mv || !sh) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function run() {
    var r = ch.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -100 || r.top > vh + 100) return;
    var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));           // 0 entering .. 1 leaving
    mv.style.setProperty("--fy", ((p - 0.5) * -90).toFixed(1) + "px");
    mv.style.setProperty("--fr", ((p - 0.5) * 2.4).toFixed(2) + "deg");
    sh.style.setProperty("--sx", (-38 + p * 76).toFixed(2) + "%");
  }
  (window.__frame ? window.__frame.add(run) : addEventListener("scroll", run, { passive: true })); run();
})();

/* Gorilla still: fade the framed flat-lay in once */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 6: "+(e&&e.message||e))}
try{
(function () {
  var f = document.querySelector(".gxs-f"); if (!f) return;
  if (!("IntersectionObserver" in window)) { f.classList.add("on"); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { f.classList.add("on"); io.disconnect(); } }); }, { rootMargin: "0px 0px -12% 0px" });
  io.observe(f);
})();

/* Instinct: three reference nodes wire into the final frame as the scene scrolls; then the frames change */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 7: "+(e&&e.message||e))}
try{
(function () {
  var sec = document.querySelector(".inw"); if (!sec) return;
  var stage = sec.querySelector(".inw-stage"), svg = sec.querySelector(".inw-links");
  var nodes = [].slice.call(sec.querySelectorAll(".inw-node")), out = sec.querySelector(".inw-out");
  var frames = [].slice.call(sec.querySelectorAll(".inw-frames img")), count = sec.querySelector(".inw-count");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg", links = [], ghosts = [], dots = [], lens = [];
  function pt(el, side) {
    var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top];
  }
  function build() {
    var W = stage.clientWidth, H = stage.clientHeight; svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = '<defs><linearGradient id="inwG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#c9a173" stop-opacity=".35"/><stop offset=".55" stop-color="#e7c9a0"/><stop offset="1" stop-color="#f3dfc3"/></linearGradient></defs>';
    links = []; ghosts = []; dots = []; lens = [];
    var ins = [].slice.call(out.querySelectorAll(".port")), vertical = innerWidth <= 860;
    nodes.forEach(function (n, i) {
      var a = pt(n.querySelector(".port")), b = pt(ins[i]), d;
      if (vertical) { var my = (a[1] + b[1]) / 2; d = "M" + a[0] + "," + a[1] + " C" + a[0] + "," + my + " " + b[0] + "," + my + " " + b[0] + "," + b[1]; }
      else { var mx = a[0] + (b[0] - a[0]) * 0.55; d = "M" + a[0] + "," + a[1] + " C" + mx + "," + a[1] + " " + (b[0] - (b[0] - a[0]) * 0.35) + "," + b[1] + " " + b[0] + "," + b[1]; }
      var g = document.createElementNS(NS, "path"); g.setAttribute("d", d); g.setAttribute("class", "ghost"); svg.appendChild(g);
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.appendChild(p);
      var L = p.getTotalLength(); p.style.strokeDasharray = L + " " + L; p.style.strokeDashoffset = L;
      var c = document.createElementNS(NS, "circle"); c.setAttribute("r", "3.2"); c.style.opacity = 0; svg.appendChild(c);
      links.push(p); ghosts.push(g); dots.push(c); lens.push(L);
    });
    last = -1; run();
  }
  var last = -1, curF = -1;
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function run() {
    var r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -100 || r.top > vh + 100) return;
    var span = sec.offsetHeight - vh, p = still ? 1 : clamp((-r.top + vh * 0.35) / (span + vh * 0.35));
    if (Math.abs(p - last) < 0.0004) return; last = p;
    nodes.forEach(function (n, i) { n.classList.toggle("on", p > 0.02 + i * 0.05); });
    links.forEach(function (l, i) {
      var k = clamp((p - (0.14 + i * 0.07)) / 0.2);
      l.style.strokeDashoffset = (lens[i] * (1 - k)).toFixed(1);
      nodes[i].classList.toggle("lit", k > 0 && k < 1 || p > 0.5);
      // a bead of light runs along each wire while it is live
      var dk = p < 0.14 + i * 0.07 ? -1 : (k < 1 ? k : ((p * 3 + i * 0.33) % 1));
      if (dk < 0) { dots[i].style.opacity = 0; }
      else { var q = l.getPointAtLength(lens[i] * dk); dots[i].setAttribute("cx", q.x.toFixed(1)); dots[i].setAttribute("cy", q.y.toFixed(1)); dots[i].style.opacity = 1; }
    });
    out.classList.toggle("on", p > 0.36);
    var fi = p < 0.46 ? 0 : Math.min(frames.length - 1, Math.floor((p - 0.46) / 0.54 * frames.length));
    if (fi !== curF) { curF = fi; frames.forEach(function (im, k) { im.classList.toggle("on", k === fi); }); count.textContent = String(fi + 1).padStart(2, "0") + " / " + String(frames.length).padStart(2, "0"); }
  }
  build();
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 200); });
  addEventListener("load", build);
  (window.__frame ? window.__frame.add(run) : addEventListener("scroll", run, { passive: true }));
})();

/* painted edge fades for full-bleed sections (cheaper than masking moving video and parallax) */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 8: "+(e&&e.message||e))}
try{
(function () {
  [].forEach.call(document.querySelectorAll(".fsv, main > .ov, .chapter-in, .gor-stage"), function (el) {
    if (el.querySelector(":scope > .edge")) return;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    var e = document.createElement("i"); e.className = "edge"; e.setAttribute("aria-hidden", "true");
    // sits just above the background layer, so everything that comes after it (text, figures) stays on top
    var bg = el.querySelector(":scope > .bg:last-of-type, :scope > .ov-bg, :scope > .gor-bg, :scope > video");
    if (el.classList.contains("chapter-in")) { var bgs = el.querySelectorAll(":scope > .bg"); bg = bgs.length ? bgs[bgs.length - 1] : null; }
    if (bg && bg.nextSibling) el.insertBefore(e, bg.nextSibling); else if (bg) el.appendChild(e); else el.insertBefore(e, el.firstChild);
  });
})();

/* Sla v2: three parts. Each part's pieces slide in from their own side (left, right, top, bottom) with the copy
   for that part, settle, then lift away as the next part arrives. Progress is smoothed per frame so it glides. */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 9: "+(e&&e.message||e))}
try{
(function () {
  var sec = document.querySelector(".slx"); if (!sec) return;
  var run = sec.querySelector(".slx-run"), objs = [].slice.call(sec.querySelectorAll(".slx-o"));
  var texts = [].slice.call(sec.querySelectorAll(".slx-t")), ticks = [].slice.call(sec.querySelectorAll(".slx-ticks i"));
  var N = texts.length, still = matchMedia("(prefers-reduced-motion: reduce)").matches; if (still) return;
  var cnt = {};
  var data = objs.map(function (o) { var cs = o.style, s = +o.getAttribute("data-s"); cnt[s] = (cnt[s] || 0); var k = cnt[s]++;
    return { el: o, s: s, k: k, from: o.getAttribute("data-from") || "b", d: parseFloat(cs.getPropertyValue("--d")) || 1, r: parseFloat(cs.getPropertyValue("--r")) || 0, vis: false }; });
  var tdata = texts.map(function (t) { return { el: t, s: +t.getAttribute("data-s"), side: t.getAttribute("data-side") === "r" ? 1 : -1, kids: [].slice.call(t.children), vis: false }; });
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function eo(t) { return 1 - Math.pow(1 - t, 4); }            // ease-out quart: arrives fast, lands softly
  function ei(t) { return t * t * (3 - 2 * t); }               // smoothstep for exits
  var fs = null, target = 0, lt = 0, raf = 0, cur = -1;
  function enterOf(q, s, k) { var a = s === 0 ? -0.75 : -0.42; return eo(clamp((q - a - k * 0.08) / 0.6)); }
  function exitOf(q, s) { return s === N - 1 ? 0 : ei(clamp((q - 0.62) / 0.4)); }
  function paint(f) {
    var vw = innerWidth, vh = innerHeight, mob = vw <= 800;
    var dx = mob ? 0.75 * vw : 0.55 * vw, dy = mob ? 0.6 * vh : 0.7 * vh;
    data.forEach(function (o) {
      var q = f - o.s, inn = enterOf(q, o.s, o.k), out = exitOf(q, o.s), op = Math.min(inn, 1 - out);
      var m = (1 - inn) * o.d, x = 0, y = 0;
      if (o.from === "l") x = -dx * m; else if (o.from === "r") x = dx * m; else if (o.from === "t") y = -dy * m; else y = dy * m;
      y += -0.16 * vh * out * o.d + (q - 0.3) * -0.03 * vh * o.d * (inn > 0.99 && out < 0.01 ? 1 : inn);   // lift away; slow float while held
      var rot = o.r * (1 + 1.6 * (1 - inn)) + o.r * 0.8 * out, sc = 0.94 + 0.06 * inn - 0.04 * out;
      var show = op > 0.004;
      if (show !== o.vis) { o.vis = show; o.el.style.visibility = show ? "visible" : "hidden"; }
      if (!show) return;
      o.el.style.opacity = op.toFixed(3);
      o.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg) scale(" + sc.toFixed(4) + ")";
    });
    tdata.forEach(function (t) {
      var q = f - t.s, out = exitOf(q, t.s), any = false;
      t.kids.forEach(function (c, i) {
        var a = t.s === 0 ? -0.6 : -0.3, inn = eo(clamp((q - a - i * 0.07) / 0.45)), op = Math.min(inn, 1 - out);
        if (op > 0.004) any = true;
        c.style.opacity = op.toFixed(3);
        c.style.transform = "translate3d(" + (t.side * 56 * (1 - inn)).toFixed(1) + "px," + (-22 * out).toFixed(1) + "px,0)";
      });
      if (any !== t.vis) { t.vis = any; t.el.style.visibility = any ? "visible" : "hidden"; }
    });
    var i = Math.max(0, Math.min(N - 1, Math.round(f - 0.15)));
    if (i !== cur) { cur = i; ticks.forEach(function (x, k) { x.classList.toggle("on", k === i); }); sec.classList.toggle("not-winter", i === N - 1); }
  }
  function measure() {
    var r = run.getBoundingClientRect(), vh = innerHeight, span = Math.max(1, run.offsetHeight - vh);
    return { f: Math.max(-1.2, Math.min(N, (-r.top / span) * N)), near: r.bottom > -vh && r.top < vh * 2 };
  }
  function loop(now) {
    raf = 0; var dt = Math.min(50, now - (lt || now)) / 1000; lt = now;
    if (fs === null || Math.abs(target - fs) > 1.5) fs = target;
    fs += (target - fs) * (1 - Math.exp(-9 * dt));
    if (Math.abs(target - fs) < 0.0006) fs = target;
    paint(fs);
    if (fs !== target) raf = requestAnimationFrame(loop); else lt = 0;
  }
  function onFrame() { var m = measure(); if (!m.near) { fs = null; return; } target = m.f; if (!raf) raf = requestAnimationFrame(loop); }
  (window.__frame ? window.__frame.add(onFrame) : addEventListener("scroll", onFrame, { passive: true }));
  addEventListener("resize", function () { fs = null; onFrame(); }); onFrame();
})();

/* EcoFurChild: when the logo comes into view its outlines draw on (dog and leaf first, then the name, then the line),
   the gold fills in, and only then the project details rise */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 10: "+(e&&e.message||e))}
try{
(function () {
  var box = document.querySelector("[data-efc]"); if (!box) return;
  var svg = box.querySelector("svg"), paths = [].slice.call(svg.querySelectorAll("path"));
  var vb = svg.viewBox.baseVal, H = vb.height;
  // sort the traced shapes into symbol / wordmark / tagline by where they sit
  var info = paths.map(function (p) { var b = p.getBBox(); return { p: p, y: b.y, h: b.height, x: b.x }; });
  // the group is flipped (scale .1, -.1): convert to screen order with the bounding box in the svg's own space
  info.forEach(function (o) { var r = o.p.getBoundingClientRect(), s = svg.getBoundingClientRect(); o.ty = s.height ? (r.top - s.top) / s.height : 0; o.tx = s.width ? (r.left - s.left) / s.width : 0; });
  info.forEach(function (o) {
    var band = o.ty < 0.42 ? 0 : o.ty < 0.82 ? 1 : 2;
    var dl = band === 0 ? 0.1 + o.tx * 0.5 : band === 1 ? 1.1 + o.tx * 0.7 : 1.9 + o.tx * 0.5;
    var dd = band === 0 ? 2.2 : band === 1 ? 1.2 : 0.9;
    o.p.style.setProperty("--dl", dl.toFixed(2) + "s"); o.p.style.setProperty("--dd", dd + "s");
    o.p.style.setProperty("--fl", (dl + dd * 0.8).toFixed(2) + "s");
  });
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go() {
    box.classList.add("go");
    setTimeout(function () { box.classList.add("done"); }, still ? 0 : 2900);
  }
  if (still || !("IntersectionObserver" in window)) { go(); return; }
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); requestAnimationFrame(function () { requestAnimationFrame(go); }); } }, { rootMargin: "0px 0px -25% 0px" });
  io.observe(box);
})();

/* Sector gaps: one Velaris canvas, moved into whichever gap is on screen, with that gap's colours */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 11: "+(e&&e.message||e))}
try{
(function () {
  var gaps = [].slice.call(document.querySelectorAll(".vl-gap")); if (document.querySelector(".bgx") || /[?&]novel/.test(location.search) || !gaps.length || !window.Velaris || !("IntersectionObserver" in window)) return;
  function stops(g) {
    var a = g.getAttribute("data-a").split(","), b = g.getAttribute("data-b").split(",");
    return [{ at: 0, colors: a.concat("#000000") }, { at: 1, colors: b.concat("#000000") }];
  }
  var inst = null, small = matchMedia("(max-width: 800px), (pointer: coarse)").matches;
  // phones and tablets: the same colours as a painted glow that drifts slowly (no WebGL, nothing per frame)
  if (small) {
    gaps.forEach(function (g) {
      var a = g.getAttribute("data-a").split(","), b = g.getAttribute("data-b").split(",");
      var i = document.createElement("i"); i.className = "vl-css";
      i.style.backgroundImage = "radial-gradient(ellipse 55% 60% at 30% 45%," + a[2] + " 0%,transparent 70%),radial-gradient(ellipse 60% 65% at 70% 55%," + b[2] + " 0%,transparent 72%),radial-gradient(ellipse 80% 70% at 50% 50%," + b[0] + " 0%,transparent 80%)";
      g.insertBefore(i, g.firstChild);
    });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var g = e.target;
      if (!inst) inst = Velaris.mount(g, { stops: stops(g), speed: 0.4, travel: 4, grain: 0.12, intensity: 0.85, edgeFade: 0.3, res: 0.5, bg: "#0b0b0c" });
      else inst.retarget(g, { stops: stops(g) });
    });
  }, { rootMargin: "35% 0px" });
  gaps.forEach(function (g) { io.observe(g); });
})();

/* One black, smoky background behind the whole site. It drifts on its own (CSS) and moves a little as you scroll
   through the sectors, smoothed per frame. Only transform changes: no blend modes, no masks, no repaint. */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 12: "+(e&&e.message||e))}
try{
(function () {
  var bx = document.querySelector(".bgx"); if (!bx) return;
  document.documentElement.classList.add("bgx-on");
  var inner = bx.querySelector(".bgx-in"), still = matchMedia("(prefers-reduced-motion: reduce)").matches; if (still) return;
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, lt = 0;
  function target() {
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = scrollY / max;
    tx = Math.sin(p * Math.PI * 7) * 5;            // drifts side to side as each sector passes (in %)
    ty = -p * 14;                                   // and slowly rises through the page
  }
  function step(now) {
    raf = 0; var dt = Math.min(50, lt ? now - lt : 16) / 1000; lt = now; var k = 1 - Math.exp(-3 * dt);
    cx += (tx - cx) * k; cy += (ty - cy) * k;
    inner.style.transform = "translate3d(" + cx.toFixed(3) + "%," + cy.toFixed(3) + "%,0)";
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.01) raf = requestAnimationFrame(step); else lt = 0;
  }
  function onScroll() { target(); if (!raf) raf = requestAnimationFrame(step); }
  (window.__frame ? window.__frame.add(onScroll) : addEventListener("scroll", onScroll, { passive: true }));
  target(); cx = tx; cy = ty; inner.style.transform = "translate3d(" + cx + "%," + cy + "%,0)";
})();

/* The smoke takes on the colour of the sector you are in: two tinted copies of the same smoke crossfade
   (opacity only), so the colour change is slow and smooth. Colours come from each project's own palette. */

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 13: "+(e&&e.message||e))}
try{
(function () {
  var t1 = document.querySelector(".bgx-s.t1"), t2 = document.querySelector(".bgx-s.t2"); if (!t1 || !t2) return;
  var F = {
    neutral: "assets/img/smk-neutral.webp", amber: "assets/img/smk-amber.webp", gold: "assets/img/smk-gold.webp", steel: "assets/img/smk-steel.webp",
    orange: "assets/img/smk-orange.webp", tan: "assets/img/smk-tan.webp", teal: "assets/img/smk-teal.webp", burgundy: "assets/img/smk-burgundy.webp",
    cyan: "assets/img/smk-cyan.webp", goldbrown: "assets/img/smk-goldbrown.webp", navy: "assets/img/smk-navy.webp", silver: "assets/img/smk-silver.webp", green: "assets/img/smk-green.webp"
  };
  var stops = [[".hero", "neutral"], ["#film", "amber"], ["#systems", "gold"], ["#web", "steel"], ["#direction", "orange"], [".inw", "tan"],
    ["#illustration", "teal"], ["#textile", "burgundy"], [".bjx", "cyan"], ["#branding", "goldbrown"], [".slx", "navy"], [".majesty", "silver"],
    ["#three-d", "silver"], ["#level", "green"], ["#about", "neutral"]].map(function (s) { return { el: document.querySelector(s[0]), c: s[1] }; }).filter(function (s) { return s.el; });
  var front = t1, back = t2, cur = "", want = "", busy = false, loaded = {};
  function load(c) { if (loaded[c]) return loaded[c]; var im = new Image(); im.src = F[c]; loaded[c] = (im.decode ? im.decode() : Promise.resolve()).catch(function () {}); return loaded[c]; }
  function show(c) {
    want = c; if (busy || c === cur) return; busy = true;
    load(c).then(function () {
      back.style.backgroundImage = "url(" + F[c] + ")";
      back.classList.add("vis"); front.classList.remove("vis");
      var t = front; front = back; back = t; cur = c;
      setTimeout(function () { busy = false; if (want !== cur) show(want); }, 1900);
    });
  }
  function pick() {
    var line = innerHeight * 0.55, c = stops[0].c;
    for (var i = 0; i < stops.length; i++) { if (stops[i].el.getBoundingClientRect().top < line) c = stops[i].c; else break; }
    if (c !== want) show(c);
  }
  front.style.backgroundImage = "url(" + F.neutral + ")"; front.classList.add("vis"); cur = want = "neutral"; loaded.neutral = Promise.resolve();
  (window.__frame ? window.__frame.add(pick) : addEventListener("scroll", pick, { passive: true })); pick();
  addEventListener("load", function () { setTimeout(function () { Object.keys(F).forEach(load); }, 2500); });
})();

}catch(e){(window.__siteErrs=window.__siteErrs||[]).push("enhance block 14: "+(e&&e.message||e))}
