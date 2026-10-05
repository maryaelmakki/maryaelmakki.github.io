/* Chapter openers: one fine-line drawing per sector, in that sector's own language.
   Each drawing is built to the opener's real size (portrait and landscape get their
   own composition), draws itself in about a second and a half when the opener comes
   into view, then keeps one quiet idle movement that runs only while it is on screen.
   Without motion the drawings are simply shown finished. */
(function () {
  "use strict";
  var G = window.gsap, ST = window.ScrollTrigger;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NS = "http://www.w3.org/2000/svg";

  /* ---------------------------------------------------------------- drawing helpers (pixel units) */
  function f(n) { return Math.round(n * 10) / 10; }
  function path(d, cls, extra) { return '<path class="' + cls + '"' + (/a-l|a-s|a-p/.test(cls) ? ' pathLength="1"' : "") + ' d="' + d + '"' + (extra || "") + "/>"; }
  function line(x1, y1, x2, y2, cls) { return path("M" + f(x1) + "," + f(y1) + "L" + f(x2) + "," + f(y2), cls); }
  function rr(x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    if (!r) return "M" + f(x) + "," + f(y) + "h" + f(w) + "v" + f(h) + "h" + f(-w) + "Z";
    return "M" + f(x + r) + "," + f(y) + "H" + f(x + w - r) + "Q" + f(x + w) + "," + f(y) + " " + f(x + w) + "," + f(y + r) + "V" + f(y + h - r) +
      "Q" + f(x + w) + "," + f(y + h) + " " + f(x + w - r) + "," + f(y + h) + "H" + f(x + r) + "Q" + f(x) + "," + f(y + h) + " " + f(x) + "," + f(y + h - r) +
      "V" + f(y + r) + "Q" + f(x) + "," + f(y) + " " + f(x + r) + "," + f(y) + "Z";
  }
  function box(x, y, w, h, r, cls) { return path(rr(x, y, w, h, r), cls); }
  function bracket(x, y, L, sx, sy, cls) { return path("M" + f(x) + "," + f(y + sy * L) + "V" + f(y) + "H" + f(x + sx * L), cls); }
  function clamp(a, v, b) { return Math.max(a, Math.min(b, v)); }
  // moving parts live in their own small SVG layers (see hoist below), so idle motion
  // is a compositor transform or a repaint of a few lines, never of the whole drawing
  function layerOf(root, name) { return root.querySelector('svg[data-layer="' + name + '"]'); }

  /* ---------------------------------------------------------------- the nine drawings
     Every builder gets the opener's width and height and returns { svg, idle } where
     idle(svgEl) returns a paused, repeating timeline (or a ticker function). */
  var ART = {};

  /* 01 AI Film: two film strips run in opposite directions, a timeline ruler with a playhead */
  ART.film = function (w, h) {
    var port = h > w, sh = clamp(64, h * .1, 104), fw = sh * 1.55, out = "";
    function strip(y, id) {
      var s = '<g class="a-m" data-m="' + id + '">', x0 = -fw * 2, x1 = w + fw * 2, inT = y + sh * .2, inB = y + sh * .8, hs = sh * .09;
      s += line(x0, y, x1, y, "a-l a-strong") + line(x0, y + sh, x1, y + sh, "a-l a-strong") + line(x0, inT, x1, inT, "a-l a-soft") + line(x0, inB, x1, inB, "a-l a-soft");
      for (var x = x0; x <= x1; x += fw) s += line(x, inT, x, inB, "a-l a-soft");
      for (var hx = x0; hx <= x1; hx += fw / 4) s += box(hx + fw / 8 - hs / 2, y + sh * .1 - hs / 2, hs, hs, 1.5, "a-f") + box(hx + fw / 8 - hs / 2, y + sh * .9 - hs / 2, hs, hs, 1.5, "a-f");
      return s + "</g>";
    }
    var yA = port ? Math.max(126, h * .15) : h * .1, yB = h - h * (port ? .07 : .1) - sh;
    out += strip(yA, "a") + strip(yB, "b");
    var rx0 = port ? w * .08 : w * .3, rx1 = port ? w * .92 : w * .7, ry = yB - (port ? 46 : 54);
    out += line(rx0, ry, rx1, ry, "a-l");
    for (var t = 0, x = rx0; x <= rx1; x += 12, t++) out += line(x, ry, x, ry - (t % 5 ? 6 : 14), "a-l a-soft");
    out += '<g class="a-m" data-m="head">' + line(rx0, ry + 8, rx0, ry - 30, "a-l a-strong") + path("M" + f(rx0 - 5) + "," + f(ry - 36) + "h10l-5,6Z", "a-f a-strong") + "</g>";
    return { svg: out, idle: function (el) {
      var tl = G.timeline({ paused: true, repeat: -1, defaults: { ease: "none" } });
      tl.fromTo(layerOf(el, "a"), { x: 0 }, { x: -fw, duration: 7 }, 0)
        .fromTo(layerOf(el, "b"), { x: -fw }, { x: 0, duration: 7 }, 0)
        .fromTo(layerOf(el, "head"), { x: 0 }, { x: rx1 - rx0, duration: 7 }, 0);
      return tl;
    } };
  };

  /* 02 Systems: orthogonal wiring between nodes, with signals running through it */
  ART.systems = function (w, h) {
    var sx = w / 1600, sy = h / 900, R = 14, out = "", pulses = "";
    var L = [
      [[0, 120], ["h", 260], ["v", 220], ["h", 420]], [[0, 380], ["h", 180], ["v", 300], ["h", 330]], [[0, 640], ["h", 300], ["v", 720], ["h", 470]],
      [[1600, 90], ["h", 1380], ["v", 200], ["h", 1190]], [[1600, 330], ["h", 1450], ["v", 260], ["h", 1300]], [[1600, 600], ["h", 1320], ["v", 690], ["h", 1150]],
      [[360, 0], ["v", 90], ["h", 560], ["v", 150]], [[1200, 0], ["v", 60], ["h", 1010], ["v", 140]], [[520, 900], ["v", 820], ["h", 690], ["v", 760]],
      [[0, 470], ["h", 380], ["v", 400], ["h", 540]], [[1600, 430], ["h", 1240], ["v", 360], ["h", 1075]], [[980, 900], ["v", 720], ["h", 1180], ["v", 640]]
    ];
    L.forEach(function (l, n) {
      var x = l[0][0] * sx, y = l[0][1] * sy, pts = [[x, y]];
      for (var k = 1; k < l.length; k++) { if (l[k][0] === "h") x = l[k][1] * sx; else y = l[k][1] * sy; pts.push([x, y]); }
      var d = "M" + f(pts[0][0]) + "," + f(pts[0][1]);
      for (var j = 1; j < pts.length; j++) {
        var p0 = pts[j - 1], p1 = pts[j], p2 = pts[j + 1];
        if (!p2) { d += "L" + f(p1[0]) + "," + f(p1[1]); break; }
        var dx1 = Math.sign(p1[0] - p0[0]), dy1 = Math.sign(p1[1] - p0[1]), dx2 = Math.sign(p2[0] - p1[0]), dy2 = Math.sign(p2[1] - p1[1]);
        d += "L" + f(p1[0] - dx1 * R) + "," + f(p1[1] - dy1 * R) + "Q" + f(p1[0]) + "," + f(p1[1]) + " " + f(p1[0] + dx2 * R) + "," + f(p1[1] + dy2 * R);
      }
      var e = pts[pts.length - 1];
      out += path(d, "a-l") + box(e[0] - 22, e[1] - 10, 44, 20, 6, "a-node") + box(e[0] - 14, e[1] - 2.5, 5, 5, 2.5, "a-f a-strong");
      if (n % 2 === 0 || n > 8) pulses += path(d, "a-p");
    });
    return { svg: out + pulses, idle: function (el) {
      var tl = G.timeline({ paused: true });
      $$(".a-p", el).forEach(function (p, i) {
        tl.fromTo(p, { strokeDashoffset: 1.08 }, { strokeDashoffset: -1, duration: 2.6, ease: "power1.inOut", repeat: -1, repeatDelay: .8 + (i % 3) * .5 }, i * .45);
      });
      return tl;
    } };
  };

  /* 03 Web & UI: a page being designed in a browser, with its phone layout beside it */
  ART.web = function (w, h) {
    var port = h > w, out = "", bw, bh, bx, by, pw, ph, px, py;
    if (port) { bw = w * .82; bh = bw * .56; bx = (w - bw) / 2; by = Math.max(126, h * .15); pw = w * .3; ph = pw * 1.95; px = w * .62; py = h - ph - h * .05; }
    else { bh = h * .76; bw = Math.min(w * .82, bh / .56); bh = Math.min(bh, bw * .62); bx = (w - bw) / 2; by = (h - bh) / 2 + h * .03; pw = bw * .14; ph = pw * 1.95; px = bx + bw - pw * .5; py = by + bh - ph * .82; }
    var pad = bw * .06, top = by + 30, cw = bw - pad * 2;
    // guides first, as a designer would set them
    out += line(bx, 0, bx, h, "a-d") + line(bx + bw, 0, bx + bw, h, "a-d") + line(0, by, w, by, "a-d") + line(0, by + bh, w, by + bh, "a-d");
    out += box(bx, by, bw, bh, 10, "a-l a-strong") + line(bx, top, bx + bw, top, "a-l");
    for (var i = 0; i < 3; i++) out += box(bx + 12 + i * 11, by + 12, 6, 6, 3, "a-f");
    out += box(bx + bw * .3, by + 9, bw * .4, 12, 6, "a-l a-soft");
    for (var c = 0; c <= 12; c++) out += line(bx + pad + cw / 12 * c, top + 8, bx + pad + cw / 12 * c, by + bh - 8, "a-d a-faint");
    var ny = top + bh * .06;
    out += box(bx + pad, ny, cw * .12, 8, 3, "a-f a-strong");
    for (var n = 0; n < 4; n++) out += line(bx + pad + cw * (.6 + n * .09), ny + 4, bx + pad + cw * (.66 + n * .09), ny + 4, "a-l");
    var hy = top + bh * .2, btn = [bx + pad, hy + 92, cw * .16, 18];
    if (port) {   // on a phone the browser sits above the title, so it can show a full hero
      out += box(bx + pad, hy, cw * .44, 12, 3, "a-f a-strong") + box(bx + pad, hy + 20, cw * .32, 12, 3, "a-f a-strong");
      for (var l = 0; l < 3; l++) out += line(bx + pad, hy + 48 + l * 11, bx + pad + cw * (.42 - l * .07), hy + 48 + l * 11, "a-l a-soft");
      out += '<g class="a-btn">' + box(btn[0], btn[1], btn[2], btn[3], 9, "a-l a-strong") + "</g>";
      var ix = bx + pad + cw * .54, iw = cw * .46, ih = bh * .36;
      out += box(ix, hy, iw, ih, 6, "a-l") + line(ix, hy, ix + iw, hy + ih, "a-l a-soft") + line(ix + iw, hy, ix, hy + ih, "a-l a-soft");
    }
    var cy = by + bh * (port ? .7 : .78), cwid = (cw - 24) / 3;
    for (var k = 0; k < 3; k++) { out += box(bx + pad + k * (cwid + 12), cy, cwid, bh * (port ? .22 : .16), 6, "a-l"); out += line(bx + pad + k * (cwid + 12) + 10, cy + bh * .16, bx + pad + k * (cwid + 12) + cwid * .7, cy + bh * .16, "a-l a-soft"); }
    // the same page, reflowed for a phone
    out += '<g class="a-phone">' + box(px, py, pw, ph, 14, "a-l a-strong a-solid") + line(px + pw * .38, py + 9, px + pw * .62, py + 9, "a-l") +
      box(px + 10, py + 24, pw * .3, 6, 3, "a-f a-strong") + box(px + 10, py + 40, pw - 20, ph * .26, 5, "a-l") +
      box(px + 10, py + 50 + ph * .26, pw * .7, 7, 3, "a-f") + line(px + 10, py + 66 + ph * .26, px + pw * .8, py + 66 + ph * .26, "a-l a-soft") +
      box(px + 10, py + 80 + ph * .26, pw * .44, 12, 6, "a-l a-strong") + box(px + 10, py + ph * .66, pw - 20, ph * .26, 5, "a-l") + "</g>";
    // cursor
    var cur = "M0,0L0,17L4.6,12.8L7.6,19.6L10.4,18.4L7.4,11.8L13.2,11.6Z";
    var stops = port ? [[bx + pad + cw * .44, hy + 8], [btn[0] + btn[2] * .6, btn[1] + 10], [bx + pad + cwid * 1.5 + 12, cy + bh * .1], [px + pw * .5, py + 86 + ph * .26], [bx + pad + cw * .44, hy + 8]]
      : [[bx + pad + cw * .63, ny + 6], [bx + pad + cwid * .5, cy + bh * .07], [bx + pad + cwid * 2.5 + 24, cy + bh * .07], [px + pw * .5, py + 86 + ph * .26], [bx + pad + cw * .63, ny + 6]];
    out += '<g class="a-cur" data-m="cur" transform="translate(' + f(stops[0][0]) + "," + f(stops[0][1]) + ')"><path class="a-cursor" d="' + cur + '"/></g>';
    return { svg: out, idle: function (el) {
      var c = layerOf(el, "cur"), b = el.querySelector(".a-btn path"), tl = G.timeline({ paused: true, repeat: -1, repeatDelay: .6 });
      for (var s = 1; s < stops.length; s++) tl.to(c, { x: stops[s][0] - stops[0][0], y: stops[s][1] - stops[0][1], duration: 1.2, ease: "power2.inOut" }, "+=.7");
      if (b) tl.to(b, { fillOpacity: .5, duration: .15, yoyo: true, repeat: 1 }, 2.05);
      return tl;
    } };
  };

  /* 04 Visual Direction: a camera viewfinder. Frame lines, thirds, letterbox, a focus box finding the subject */
  ART.direction = function (w, h) {
    var port = h > w, fw, fh, out = "";
    if (port) { fh = h * .84; fw = Math.min(w * .88, fh * 9 / 16); fh = fw * 16 / 9; }
    else { fw = w * .78; fh = Math.min(fw * 9 / 16, h * .8); fw = fh * 16 / 9; }
    var cx = w / 2, cy = h / 2, x0 = cx - fw / 2, y0 = cy - fh / 2, x1 = x0 + fw, y1 = y0 + fh, L = Math.min(fw, fh) * .07;
    out += bracket(x0, y0, L, 1, 1, "a-l a-strong") + bracket(x1, y0, L, -1, 1, "a-l a-strong") + bracket(x0, y1, L, 1, -1, "a-l a-strong") + bracket(x1, y1, L, -1, -1, "a-l a-strong");
    out += line(x0 + fw / 3, y0, x0 + fw / 3, y1, "a-d") + line(x0 + fw * 2 / 3, y0, x0 + fw * 2 / 3, y1, "a-d") + line(x0, y0 + fh / 3, x1, y0 + fh / 3, "a-d") + line(x0, y0 + fh * 2 / 3, x1, y0 + fh * 2 / 3, "a-d");
    if (!port) { var lb = fw / 2.39 / 2; out += line(x0, cy - lb, x1, cy - lb, "a-l a-soft") + line(x0, cy + lb, x1, cy + lb, "a-l a-soft"); }
    out += line(cx - 9, cy, cx + 9, cy, "a-l") + line(cx, cy - 9, cx, cy + 9, "a-l");
    // exposure scale on the right edge of the frame
    var ex = port ? x1 - 16 : x1 + 22, e0 = cy - fh * .28, e1 = cy + fh * .28;
    for (var t = 0, y = e0; y <= e1; y += 10, t++) out += line(ex, y, ex + (t % 5 ? 5 : 11), y, "a-l a-soft");
    out += '<g data-m="ev">' + path("M" + f(ex - 4) + "," + f(cy) + "l-7,-5v10Z", "a-f a-strong") + "</g>";
    // the focus box
    var fb = Math.min(fw, fh) * .2;
    var P = [[x0 + fw * 2 / 3, y0 + fh / 3, 1], [x0 + fw / 3, y0 + fh * 2 / 3, .8], [x0 + fw * 2 / 3, y0 + fh * 2 / 3, 1.15], [x0 + fw * 2 / 3, y0 + fh / 3, 1]];
    out += '<g data-m="focus" transform="translate(' + f(P[0][0]) + "," + f(P[0][1]) + ')">' + bracket(-fb / 2, -fb / 2, fb * .25, 1, 1, "a-l a-strong") + bracket(fb / 2, -fb / 2, fb * .25, -1, 1, "a-l a-strong") +
      bracket(-fb / 2, fb / 2, fb * .25, 1, -1, "a-l a-strong") + bracket(fb / 2, fb / 2, fb * .25, -1, -1, "a-l a-strong") + "</g>";
    return { svg: out, idle: function (el) {
      var fo = layerOf(el, "focus"), ev = layerOf(el, "ev"), tl = G.timeline({ paused: true, repeat: -1 });
      G.set(fo, { transformOrigin: f(P[0][0]) + "px " + f(P[0][1]) + "px" });
      for (var i = 1; i < P.length; i++) tl.to(fo, { x: P[i][0] - P[0][0], y: P[i][1] - P[0][1], scale: P[i][2], duration: 1.6, ease: "power3.inOut" }, "+=1.4");
      tl.fromTo(ev, { y: -fh * .12 }, { y: fh * .1, duration: tl.duration() / 2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      return tl;
    } };
  };

  /* 06 Handmade Rugs: warp threads go up, the weft is woven over and under, fringe at the end */
  ART.textile = function (w, h) {
    var port = h > w, x0, x1, y0, y1, out = "", wefts = [];
    var panels = port ? [[w * .06, w * .94, Math.max(130, h * .15), h * .34]] : [[w * .04, w * .25, h * .12, h * .8], [w * .75, w * .96, h * .12, h * .8]];
    var gap = 18, row = 20, amp = 3.5;
    panels.forEach(function (P) { x0 = P[0]; x1 = P[1]; y0 = P[2]; y1 = P[3];
    for (var x = x0; x <= x1; x += gap) out += line(x, y0, x, y1, "a-l a-soft");
    for (var y = y0 + row / 2, r = 0; y < y1; y += row, r++) {
      var d = "M" + f(x0 - 8) + "," + f(y), up = r % 2 ? 1 : -1;
      for (var xx = x0; xx <= x1 + gap; xx += gap) { d += "Q" + f(xx - gap / 2) + "," + f(y + amp * up) + " " + f(xx) + "," + f(y); up = -up; }
      out += path(d, "a-l");
      if (r % 6 === 2) wefts.push(d);
    }
    for (var fx = x0; fx <= x1; fx += gap) { var len = 14 + ((fx * 7) % 13); out += line(fx, y1 + 6, fx + 1.5, y1 + 6 + len, "a-l a-soft"); }
    });
    wefts.forEach(function (d) { out += path(d, "a-p"); });
    return { svg: out, idle: function (el) {
      var tl = G.timeline({ paused: true });
      $$(".a-p", el).forEach(function (p, i) { tl.fromTo(p, { strokeDashoffset: 1.08 }, { strokeDashoffset: -1, duration: 3.4, ease: "sine.inOut", repeat: -1, repeatDelay: 1.2 }, i * 1.1); });
      return tl;
    } };
  };

  /* 07 Branding: a logo construction sheet. Square, grid, one circle, one golden arc, baselines and swatches */
  ART.branding = function (w, h) {
    var port = h > w, S, cx, cy, out = "";
    if (port) { S = Math.min(w * .6, h * .22); cx = w / 2; cy = Math.max(130, h * .15) + S / 2; } else { S = Math.min(h * .6, w * .36); cx = w / 2; cy = h * .47; }
    var x0 = cx - S / 2, y0 = cy - S / 2;
    out += line(x0 - S * .25, y0, x0 + S * 1.25, y0, "a-d") + line(x0 - S * .25, y0 + S, x0 + S * 1.25, y0 + S, "a-d") + line(x0, y0 - S * .25, x0, y0 + S * 1.25, "a-d") + line(x0 + S, y0 - S * .25, x0 + S, y0 + S * 1.25, "a-d");
    for (var c = 1; c < 6; c++) out += line(x0 + S / 6 * c, y0, x0 + S / 6 * c, y0 + S, "a-d a-faint");
    out += line(x0, y0, x0 + S, y0 + S, "a-d") + line(x0 + S, y0, x0, y0 + S, "a-d");
    out += box(x0, y0, S, S, 0, "a-l a-strong");
    var r = S / 2;
    out += path("M" + f(cx - r) + "," + f(cy) + "A" + f(r) + "," + f(r) + " 0 1 1 " + f(cx + r) + "," + f(cy) + "A" + f(r) + "," + f(r) + " 0 1 1 " + f(cx - r) + "," + f(cy), "a-l");
    var g = S * .618;
    out += path("M" + f(x0) + "," + f(y0 + S - g) + "A" + f(g) + "," + f(g) + " 0 0 1 " + f(x0 + g) + "," + f(y0 + S), "a-l a-strong");
    out += line(x0 + g, y0, x0 + g, y0 + S, "a-l a-soft") + line(x0, y0 + S - g, x0 + S, y0 + S - g, "a-l a-soft");
    // type baselines under the mark
    var by = port ? h * .8 : Math.min(y0 + S + S * .14, h * .9);
    out += line(x0 - S * .1, by, x0 + S * 1.1, by, "a-l a-soft") + line(x0 - S * .1, by - S * .08, x0 + S * 1.1, by - S * .08, "a-d") + line(x0 - S * .1, by - S * .13, x0 + S * 1.1, by - S * .13, "a-d a-faint");
    var sw = ["var(--sla)", "var(--eco)", "#cfae78", "var(--print)", "#ece8e0"], ss = S * .1;
    var sx0 = port ? x0 : cx - (5 * ss + 32) / 2;
    if ((!port || h > 640) && by + S * .07 + ss < h - 8) sw.forEach(function (col, i) { out += path(rr(sx0 + i * (ss + 8), by + S * .07, ss, ss, 4), "a-f a-swatch", ' style="fill:' + col + '"'); });
    out += path("M" + f(x0) + "," + f(y0) + "h" + f(S) + "v" + f(S) + "h" + f(-S) + "Z", "a-p");
    return { svg: out, idle: function (el) {
      var tl = G.timeline({ paused: true });
      tl.fromTo(el.querySelector(".a-p"), { strokeDashoffset: 1.08 }, { strokeDashoffset: -1, duration: 6, ease: "none", repeat: -1, repeatDelay: 1 });
      return tl;
    } };
  };

  /* 08 3D Design: a perspective floor and a wireframe cube turning slowly over it */
  ART["three-d"] = function (w, h) {
    var port = h > w, hz = h * (port ? .82 : .72), vx = w * .5, out = "";
    var span = Math.max(w, h) * 1.6;
    for (var i = -14; i <= 14; i++) { var bx = vx + i * span / 14; out += line(vx + (bx - vx) * .06, hz + (h - hz) * .06, bx, h + 4, "a-l a-soft"); }
    for (var k = 1; k <= 9; k++) { var y = hz + (h - hz) * Math.pow(k / 9, 2.2); out += line(0, y, w, y, "a-l a-faint"); }
    out += line(0, hz, w, hz, "a-d");
    var size = Math.min(w, h) * (port ? .16 : .11), cx = vx, cy = port ? hz - size * 1.05 : Math.max(h * .23, 80 + size * 1.1), baseY = port ? hz + 6 : cy + size * 1.15;
    out += '<path class="a-l a-strong a-cube" pathLength="1" d=""/>' + '<path class="a-shadow" d=""/>';
    var cube = null, shadow = null, V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    function draw(el, a) {
      var cosA = Math.cos(a), sinA = Math.sin(a), tilt = -.42, cosT = Math.cos(tilt), sinT = Math.sin(tilt), P = [], d = "", sd = "";
      V.forEach(function (v) {
        var x = v[0] * cosA - v[2] * sinA, z = v[0] * sinA + v[2] * cosA, y = v[1] * cosT - z * sinT; z = v[1] * sinT + z * cosT;
        var s = 4 / (4 + z); P.push([cx + x * size * s * .8, cy + y * size * s * .8]);
      });
      E.forEach(function (e) { d += "M" + f(P[e[0]][0]) + "," + f(P[e[0]][1]) + "L" + f(P[e[1]][0]) + "," + f(P[e[1]][1]); });
      [0, 1, 5, 4].forEach(function (n, j) { var q = V[n], x = q[0] * cosA - q[2] * sinA, z = q[0] * sinA + q[2] * cosA; sd += (j ? "L" : "M") + f(cx + x * size * .9) + "," + f(baseY + z * size * .16); });
      (cube || (cube = el.querySelector(".a-cube"))).setAttribute("d", d);
      (shadow || (shadow = el.querySelector(".a-shadow"))).setAttribute("d", sd + "Z");
    }
    return { svg: out, init: function (el) { draw(el, .6); }, idle: function (el) {
      var o = { a: .6 };
      return G.to(o, { a: .6 + Math.PI * 2, duration: 22, ease: "none", repeat: -1, paused: true, onUpdate: function () { draw(el, o.a); } });
    } };
  };

  /* 09 Level Concept: the floor plan itself, rooms, route, and the player walking it */
  ART.level = function (w, h) {
    var port = h > w, rooms = [["WC", 48, 30, 215, 135], ["WC", 48, 150, 215, 250], ["Canteen", 305, 30, 473, 175], ["Storage", 490, 30, 657, 175], ["Co-working", 672, 30, 840, 410],
      ["CFO", 415, 268, 580, 413], ["IT", 415, 503, 570, 648], ["CEO", 600, 503, 840, 648], ["Lift", 287, 662, 345, 718]];
    var rx0, ry0, rw, rh, out = "";
    if (port) { rx0 = w * .05; ry0 = Math.max(126, h * .15); rw = w * .9; rh = h * .36 - ry0 + h * .02; } else { rx0 = w * .14; ry0 = h * .1; rw = w * .72; rh = h * .84; }
    var s = Math.min(rw / 870, rh / 750), ox = rx0 + (rw - 870 * s) / 2, oy = ry0 + (rh - 750 * s) / 2;
    function X(v) { return ox + v * s; } function Y(v) { return oy + v * s; }
    out += path(rr(X(230), Y(30), 610 * s, 618 * s, 0), "a-d");
    rooms.forEach(function (r) {
      out += box(X(r[1]), Y(r[2]), (r[3] - r[1]) * s, (r[4] - r[2]) * s, 3, "a-l");
      if ((r[3] - r[1]) * s > r[0].length * 6 + 10) out += '<text class="a-f a-label" x="' + f(X(r[1]) + 6) + '" y="' + f(Y(r[2]) + 14) + '">' + r[0] + "</text>";
    });
    var walk = [[316, 690], [316, 455], [495, 455], [495, 575], [495, 455], [627, 455], [627, 580], [627, 455], [627, 378], [756, 378], [627, 378], [627, 237], [627, 150], [627, 237], [338, 237], [338, 120], [338, 237], [316, 237], [316, 455], [316, 690]];
    var d = walk.map(function (p, i) { return (i ? "L" : "M") + f(X(p[0])) + "," + f(Y(p[1])); }).join("");
    out += path(d, "a-d a-route") + path(d, "a-p a-walker");
    return { svg: out, idle: function (el) {
      return G.fromTo(el.querySelector(".a-walker"), { strokeDashoffset: 1.02 }, { strokeDashoffset: -1, duration: 26, ease: "none", repeat: -1, paused: true });
    } };
  };

  /* ---------------------------------------------------------------- mounting */
  var items = [];
  $$(".chapter-art").forEach(function (svg) {
    var key = svg.dataset.art, make = ART[key]; if (!make) return;
    // the rug red is too dark to draw with at low opacity, so its lines use a lifted version of it
    var ch = svg.closest(".chapter"), tint = key === "textile" ? "222 128 116" : ch && ch.dataset.tint;
    if (tint) svg.style.setProperty("--tint", tint);
    items.push({ svg: svg, root: svg.parentNode, tint: tint, ch: ch, make: make, w: 0, h: 0, draw: null, idle: null, st: [] });
  });
  if (!items.length) return;

  function build(it) {
    var w = Math.round(it.svg.clientWidth), h = Math.round(it.svg.clientHeight);
    if (!w || !h || (Math.abs(w - it.w) < 24 && Math.abs(h - it.h) < 80)) return false;
    it.w = w; it.h = h;
    var r = it.make(w, h);
    it.svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    it.svg.innerHTML = r.svg;
    hoist(it, w, h);
    if (r.init) r.init(it.root);
    it.r = r;
    return true;
  }

  function hoist(it, w, h) {
    $$(".chapter-art-layer", it.root).forEach(function (l) { l.remove(); });
    function layer(name) {
      var l = document.createElementNS(NS, "svg");
      l.setAttribute("class", "chapter-art chapter-art-layer"); l.setAttribute("viewBox", "0 0 " + w + " " + h);
      l.setAttribute("focusable", "false"); l.dataset.layer = name;
      if (it.tint) l.style.setProperty("--tint", it.tint);
      it.root.appendChild(l); return l;
    }
    $$("[data-m]", it.svg).forEach(function (g) { layer(g.dataset.m).appendChild(g); });
    var fx = $$(".a-p, .a-cube, .a-shadow, .a-btn", it.svg);
    if (fx.length) { var l = layer("fx"); fx.forEach(function (n) { l.appendChild(n); }); }
  }

  function wire(it) {
    if (it.draw) it.draw.kill(); if (it.idle) it.idle.kill(); it.st.forEach(function (s) { s.kill(); }); it.st = [];
    if (!G || reduce) return;
    var lines = $$(".a-l", it.root), soft = $$(".a-d, .a-f, .a-node, .a-label, .a-shadow, .a-cursor", it.root);
    it.idle = it.r.idle ? it.r.idle(it.root) : null;
    var played = false;
    it.draw = G.timeline({ paused: true, onComplete: function () { if (it.visible && it.idle) it.idle.play(); } });
    if (lines.length) it.draw.fromTo(lines, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: { amount: .55 } }, 0);
    if (soft.length) it.draw.fromTo(soft, { opacity: 0 }, { opacity: 1, duration: .6, ease: "power1.out", stagger: { amount: .45 } }, .35);
    if (it.root.querySelector(".a-p")) G.set($$(".a-p", it.root), { strokeDashoffset: 1.08 });
    it.st.push(ST.create({ trigger: it.ch, start: "top 82%", end: "bottom top",
      onEnter: function () { if (!played) { played = true; it.draw.timeScale(1).play(); } },
      onLeaveBack: function () { played = false; if (it.idle) it.idle.pause(); it.draw.timeScale(2.5).reverse(); } }));
    it.st.push(ST.create({ trigger: it.ch, start: "top bottom", end: "bottom top",
      onToggle: function (st) { it.visible = st.isActive; if (!it.idle) return; if (st.isActive && it.draw.progress() === 1) it.idle.play(); else it.idle.pause(); } }));
  }

  items.forEach(function (it) { if (build(it)) wire(it); });

  var rt = 0;
  addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { items.forEach(function (it) { if (build(it)) { wire(it); if (it.draw && it.ch.getBoundingClientRect().top < innerHeight * .82) it.draw.progress(1); } }); }, 220);
  });
})();
