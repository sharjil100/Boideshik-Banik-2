/*!
 * product-art.js
 * Self-contained, dependency-free library of studio-style SVG product
 * illustrations of consumer electronics.
 *
 *   ProductArt.types            -> array of supported type strings
 *   ProductArt.svg(type, opts)  -> full "<svg ...>...</svg>" string
 *
 *   opts = {
 *     color : '#hex'            main body colour (any colour works)
 *     accent: '#hex'            secondary colour (optional, per-type default)
 *     view  : 'front'|'angle'   composition (default 'front')
 *     uid   : 'string'          namespace for gradient ids (auto if absent)
 *   }
 *
 * No real brand names, logos or trademarked designs are drawn.
 */
(function (root) {
  'use strict';

  var uidCounter = 0;
  var DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ */
  /* colour helpers                                                     */
  /* ------------------------------------------------------------------ */
  function parseHex(h) {
    if (typeof h !== 'string') return null;
    h = h.trim().replace(/^#/, '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function toHex(r) {
    return '#' + r.map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }
  function mix(a, b, t) {
    var A = parseHex(a), B = parseHex(b);
    return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function lighten(c, t) { return mix(c, '#ffffff', t); }
  function darken(c, t) { return mix(c, '#000000', t); }
  function luma(c) { var r = parseHex(c); return (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255; }

  /* palette derived from one colour; amounts adapt to lightness so that
     white products still get visible grey shading and black products get
     visible highlights */
  function pal(c) {
    var L = luma(c);
    return {
      base: c, L: L,
      l1: lighten(c, 0.14 + 0.16 * (1 - L)),
      l2: lighten(c, 0.36 + 0.22 * (1 - L)),
      d1: darken(c, 0.06 + 0.07 * L),
      d2: darken(c, 0.16 + 0.12 * L),
      d3: darken(c, 0.36 + 0.14 * L),
      line: darken(c, 0.22 + 0.22 * L)
    };
  }

  /* ------------------------------------------------------------------ */
  /* svg build helpers                                                  */
  /* ------------------------------------------------------------------ */
  function n(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return n(p[0]) + ' ' + n(p[1]); }

  function Ctx(uid) { this.u = uid; this.defs = []; this.k = 0; this.cache = {}; }
  Ctx.prototype.id = function (p) { return this.u + '-' + p + (this.k++); };
  function stops(s) {
    return s.map(function (x) {
      return '<stop offset="' + x[0] + '" stop-color="' + x[1] + '"' + (x[2] != null ? ' stop-opacity="' + x[2] + '"' : '') + '/>';
    }).join('');
  }
  /* linear gradient (objectBoundingBox unless extra overrides) */
  Ctx.prototype.lin = function (s, x1, y1, x2, y2, extra) {
    var id = this.id('l');
    this.defs.push('<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (extra || '') + '>' + stops(s) + '</linearGradient>');
    return 'url(#' + id + ')';
  };
  /* linear gradient in user space */
  Ctx.prototype.linU = function (s, x1, y1, x2, y2) {
    return this.lin(s, n(x1), n(y1), n(x2), n(y2), ' gradientUnits="userSpaceOnUse"');
  };
  Ctx.prototype.rad = function (s, cx, cy, r, fx, fy, extra) {
    var id = this.id('r');
    this.defs.push('<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' +
      (fx != null ? ' fx="' + fx + '" fy="' + fy + '"' : '') + (extra || '') + '>' + stops(s) + '</radialGradient>');
    return 'url(#' + id + ')';
  };
  Ctx.prototype.radU = function (s, cx, cy, r, fx, fy) {
    return this.rad(s, n(cx), n(cy), n(r), fx != null ? n(fx) : null, fy != null ? n(fy) : null, ' gradientUnits="userSpaceOnUse"');
  };
  Ctx.prototype.blur = function (sd) {
    var key = 'b' + sd;
    if (!this.cache[key]) {
      var id = this.id('f');
      this.defs.push('<filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + sd + '"/></filter>');
      this.cache[key] = 'url(#' + id + ')';
    }
    return this.cache[key];
  };
  Ctx.prototype.clip = function (inner) {
    var id = this.id('c');
    this.defs.push('<clipPath id="' + id + '">' + inner + '</clipPath>');
    return 'url(#' + id + ')';
  };
  Ctx.prototype.pattern = function (w, h, inner) {
    var id = this.id('p');
    this.defs.push('<pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' + inner + '</pattern>');
    return 'url(#' + id + ')';
  };

  function rrPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return 'M' + n(x + r) + ' ' + n(y) + 'H' + n(x + w - r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + w) + ' ' + n(y + r) +
      'V' + n(y + h - r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + w - r) + ' ' + n(y + h) +
      'H' + n(x + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x) + ' ' + n(y + h - r) +
      'V' + n(y + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + r) + ' ' + n(y) + 'Z';
  }
  function rect(x, y, w, h, r, fill, extra) {
    return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" rx="' + n(r) + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function ell(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function circ(cx, cy, r, fill, extra) { return ell(cx, cy, r, r, fill, extra); }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }

  /* polygon with rounded corners */
  function rpoly(pts, r) {
    var len = pts.length, d = '';
    for (var i = 0; i < len; i++) {
      var p0 = pts[(i - 1 + len) % len], p1 = pts[i], p2 = pts[(i + 1) % len];
      var v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      var l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      var rr = Math.min(r, l1 * 0.45, l2 * 0.45);
      var a = [p1[0] + v1[0] / l1 * rr, p1[1] + v1[1] / l1 * rr];
      var b = [p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr];
      d += (i === 0 ? 'M' : 'L') + pt(a) + 'Q' + pt(p1) + ' ' + pt(b);
    }
    return d + 'Z';
  }
  function poly(pts) { return 'M' + pts.map(pt).join('L') + 'Z'; }

  /* soft contact shadow */
  function shadow(x, cx, cy, rx, ry, k) {
    k = k == null ? 1 : k;
    var g1 = x.rad([[0, '#2b2620', 0.26 * k], [0.55, '#2b2620', 0.11 * k], [1, '#2b2620', 0]], 0.5, 0.5, 0.5);
    var g2 = x.rad([[0, '#1d1a16', 0.42 * k], [0.6, '#1d1a16', 0.12 * k], [1, '#1d1a16', 0]], 0.5, 0.5, 0.5);
    return ell(cx, cy, rx, ry, g1) + ell(cx, cy - ry * 0.08, rx * 0.66, ry * 0.42, g2);
  }

  /* metal (silver) gradient */
  function metal(x, horizontal) {
    var s = [[0, '#868a90'], [0.22, '#e8eaed'], [0.45, '#aeb2b8'], [0.7, '#f4f5f7'], [1, '#7e8288']];
    return horizontal ? x.lin(s, 0, 0, 1, 0) : x.lin(s, 0, 0, 0, 1);
  }

  /* horizontal cylinder shading overlay (light from the left) */
  function cylOverlay(x, k) {
    k = k || 1;
    return x.lin([[0, '#000', 0.30 * k], [0.1, '#000', 0.08 * k], [0.28, '#fff', 0.22 * k], [0.42, '#fff', 0.02], [0.7, '#000', 0.04 * k], [0.9, '#000', 0.2 * k], [1, '#000', 0.36 * k]], 0, 0, 1, 0);
  }
  /* vertical overlay (light from top) */
  function vOverlay(x, k) {
    k = k || 1;
    return x.lin([[0, '#fff', 0.26 * k], [0.25, '#fff', 0.06 * k], [0.55, '#000', 0], [0.85, '#000', 0.14 * k], [1, '#000', 0.3 * k]], 0, 0, 0, 1);
  }

  /* ------------------------------------------------------------------ */
  /* tiny 3D helper (for boxes / prisms)                                */
  /* ------------------------------------------------------------------ */
  function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vnorm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  function Cam(o) {
    var yw = o.yaw * DEG, pc = o.pitch * DEG;
    var cyw = Math.cos(yw), syw = Math.sin(yw), cp = Math.cos(pc), sp = Math.sin(pc);
    var f = o.f || 14, s = o.s, cx = o.cx, cy = o.cy;
    function rot(v) {
      var x1 = v[0] * cyw + v[2] * syw, z1 = -v[0] * syw + v[2] * cyw, y1 = v[1];
      return [x1, y1 * cp - z1 * sp, y1 * sp + z1 * cp];
    }
    function p(v) {
      var r = rot(v), k = f / (f - r[2]);
      return [cx + r[0] * s * k, cy - r[1] * s * k];
    }
    return { rot: rot, p: p, s: s };
  }

  var LIGHT = vnorm([-0.5, 0.78, 0.45]);
  function lit(P, nc) {
    var b = vdot(nc, LIGHT);
    if (b >= 0.5) return mix(P.base, P.l1, Math.min(1, (b - 0.5) / 0.45));
    return mix(P.base, P.d2, Math.min(1, (0.5 - b) / 1.05));
  }

  /* parallelepiped: corner o, edges u (x-ish), v (y-ish), w (z-ish) */
  function box3(o, u, v, w) {
    var c = [o, vadd(o, u), vadd(vadd(o, u), w), vadd(o, w),
      vadd(o, v), vadd(vadd(o, u), v), vadd(vadd(vadd(o, u), v), w), vadd(vadd(o, v), w)];
    var ctr = vadd(o, vmul(vadd(vadd(u, v), w), 0.5));
    var F = [[0, 1, 2, 3], [4, 7, 6, 5], [3, 2, 6, 7], [0, 4, 5, 1], [0, 3, 7, 4], [1, 5, 6, 2]];
    var names = ['bottom', 'top', 'front', 'back', 'left', 'right'];
    return F.map(function (f, i) {
      var pts = f.map(function (k) { return c[k]; });
      var nn = vnorm(vcross(vsub(pts[1], pts[0]), vsub(pts[2], pts[1])));
      var fc = vmul(vadd(vadd(pts[0], pts[1]), vadd(pts[2], pts[3])), 0.25);
      if (vdot(nn, vsub(fc, ctr)) < 0) nn = vmul(nn, -1);
      return { pts: pts, n: nn, name: names[i] };
    });
  }
  /* draw visible faces of a box; returns {svg, vis:{name:bool}} */
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lo = [], up = [], i;
    for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  /* soft contact shadow under a world-space footprint (4 points on the ground) */
  function shadowFoot(x, cam, foot, k, grow) {
    var p = foot.map(cam.p), xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
    var minx = Math.min.apply(0, xs), maxx = Math.max.apply(0, xs), miny = Math.min.apply(0, ys), maxy = Math.max.apply(0, ys);
    grow = grow || 1;
    var rx = (maxx - minx) / 2 * 1.12 * grow, ry = Math.max(16, (maxy - miny) / 2 * 1.25 * grow);
    var g = x.rad([[0, '#2b2620', 0.3 * (k || 1)], [0.6, '#2b2620', 0.12 * (k || 1)], [1, '#2b2620', 0]], 0.5, 0.5, 0.5);
    var hp = hull(p);
    return ell((minx + maxx) / 2, (miny + maxy) / 2 + ry * 0.12, rx, ry, g) +
      path(rpoly(hp, 10), '#1d1a16', ' opacity="' + 0.22 * (k || 1) + '" filter="' + x.blur(6) + '" transform="translate(0 4)"');
  }
  function drawBox(x, cam, faces, P, r, opt) {
    opt = opt || {};
    var out = '', vis = {};
    var all = [], nsum = [0, 0, 0];
    faces.forEach(function (f) {
      var nc = cam.rot(f.n);
      if (nc[2] > 0.015) nsum = vadd(nsum, nc);
      f.pts.forEach(function (q) { all.push(cam.p(q)); });
    });
    out += path(rpoly(hull(all), r == null ? 6 : r), lit(P, vnorm(nsum)));
    faces.forEach(function (f) {
      var nc = cam.rot(f.n);
      if (nc[2] <= 0.015) return;
      vis[f.name] = true;
      var pts = f.pts.map(cam.p);
      var col = lit(P, nc);
      var g = x.lin([[0, lighten(col, 0.06)], [1, darken(col, 0.05)]], 0, 0, 0.7, 1);
      out += path(rpoly(pts, r == null ? 6 : r), g,
        ' stroke="' + (P.L > 0.75 ? darken(col, 0.13) : lighten(col, 0.18)) + '" stroke-width="1" stroke-opacity="' + (opt.edge || 0.7) + '" stroke-linejoin="round"');
    });
    return { svg: out, vis: vis };
  }
  /* map (s,t) on a planar face to screen */
  function faceMap(cam, o, a, b) {
    return function (s, t) { return cam.p(vadd(o, vadd(vmul(a, s), vmul(b, t)))); };
  }
  function rrLocal(map, x0, y0, w, h, r, seg) {
    seg = seg || 5;
    var pts = [], cs = [[x0 + w - r, y0 + r, -90], [x0 + w - r, y0 + h - r, 0], [x0 + r, y0 + h - r, 90], [x0 + r, y0 + r, 180]];
    cs.forEach(function (c) {
      for (var i = 0; i <= seg; i++) {
        var a = (c[2] + 90 * i / seg) * DEG;
        pts.push(map(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r));
      }
    });
    return poly(pts);
  }
  function circLocal(map, cx, cy, r, seg) {
    seg = seg || 28;
    var pts = [];
    for (var i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2;
      pts.push(map(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    return poly(pts);
  }

  /* tube stroke (cable, rods): returns layered strokes */
  function tube(d, w, P, extra) {
    extra = extra || '';
    return '<path d="' + d + '" fill="none" stroke="' + P.d3 + '" stroke-width="' + n(w + 2.5) + '" stroke-linecap="round" stroke-linejoin="round"' + extra + '/>' +
      '<path d="' + d + '" fill="none" stroke="' + P.d1 + '" stroke-width="' + n(w) + '" stroke-linecap="round" stroke-linejoin="round"' + extra + '/>' +
      '<path d="' + d + '" fill="none" stroke="' + P.base + '" stroke-width="' + n(w * 0.62) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(-' + n(w * 0.12) + ' -' + n(w * 0.16) + ')"' + extra + '/>' +
      '<path d="' + d + '" fill="none" stroke="' + P.l2 + '" stroke-opacity=".75" stroke-width="' + n(Math.max(1.2, w * 0.18)) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(-' + n(w * 0.18) + ' -' + n(w * 0.28) + ')"' + extra + '/>';
  }

  /* ------------------------------------------------------------------ */
  /* product drawings                                                   */
  /* each: function(x ctx, P palette, A accent palette, view, c, a)     */
  /* ------------------------------------------------------------------ */
  var T = {};
  var DEF = {};

  /* ---------------------------- earbuds ---------------------------- */
  DEF.earbuds = { color: '#f4f3f0', accent: function (c) { return luma(c) > 0.6 ? darken(c, 0.12) : mix(c, '#2a2a2a', 0.55); } };

  function bud(x, P, A, cx, cy, s, flip, rot) {
    var gBody = x.rad([[0, P.l2], [0.35, P.l1], [0.72, P.base], [1, P.d2]], 0.36, 0.3, 0.78);
    var gTip = x.rad([[0, A.l1], [0.55, A.base], [1, A.d2]], 0.4, 0.32, 0.72);
    var gFace = x.rad([[0, P.l1], [0.65, P.base], [1, P.d1]], 0.35, 0.28, 0.85);
    return '<g transform="translate(' + n(cx) + ' ' + n(cy) + ') rotate(' + (rot || 0) + ') scale(' + (flip ? -s : s) + ' ' + s + ')">' +
      ell(-42, 12, 25, 28, gTip) +
      ell(-58, 12, 8, 13, A.d3, ' opacity=".65"') +
      ell(-42, 4, 12, 6, '#fff', ' opacity=".35" filter="' + x.blur(2) + '"') +
      path('M-32 -30C-4 -50 44 -42 52 -6C58 26 32 46 2 44C-30 42-48 22-46 2C-45-12-40-24-32-30Z', gBody, ' stroke="' + P.line + '" stroke-opacity=".28" stroke-width="1.2"') +
      ell(14, 1, 29, 28, gFace, ' stroke="' + P.d2 + '" stroke-opacity=".55" stroke-width="2"') +
      ell(14, 1, 22, 21, 'none', ' stroke="#fff" stroke-opacity=".35" stroke-width="1.2"') +
      ell(2, -24, 16, 5, '#fff', ' opacity=".7" filter="' + x.blur(2.2) + '"') +
      '</g>';
  }

  T.earbuds = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += shadow(x, 300, 448, 220, 34);
      var cd = rrPath(165, 205, 270, 196, 92);
      o += path(cd, x.lin([[0, P.l1], [0.4, P.base], [1, P.d1]], 0, 0, 0, 1));
      o += path(cd, cylOverlay(x, 0.8));
      o += path(cd, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.5"');
      var cl = x.clip('<path d="' + cd + '"/>');
      o += '<g clip-path="' + cl + '">' +
        '<path d="M160 268H440" stroke="' + P.d3 + '" stroke-opacity=".55" stroke-width="2.2"/>' +
        '<path d="M160 271H440" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>' +
        rect(200, 216, 150, 20, 10, '#fff', ' opacity=".55" filter="' + x.blur(4) + '"') +
        rect(400, 260, 18, 110, 9, '#fff', ' opacity=".18" filter="' + x.blur(4) + '"') +
        '</g>';
      o += circ(300, 330, 4, '#8fd19b') + circ(300, 330, 9, '#8fd19b', ' opacity=".3" filter="' + x.blur(3) + '"');
      o += bud(x, P, A, 222, 430, 0.95, false, -8);
      o += bud(x, P, A, 382, 436, 0.95, true, 8);
    } else {
      o += shadow(x, 300, 452, 200, 34);
      /* lid (open, inner face visible) */
      var lid = rrPath(176, 120, 248, 190, 84);
      o += path(lid, x.lin([[0, P.l1], [0.5, P.base], [1, P.d1]], 0, 0, 1, 0.3));
      o += path(lid, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.5"');
      var lidIn = rrPath(190, 134, 220, 170, 72);
      o += path(lidIn, x.lin([[0, P.d1], [0.6, P.d2], [1, P.d3]], 0, 0, 0, 1));
      o += path(lidIn, 'none', ' stroke="#fff" stroke-opacity=".35" stroke-width="2" transform="translate(-1 -1)"');
      /* base */
      var bd = 'M165 300H435V360A92 92 0 0 1 343 452H257A92 92 0 0 1 165 360Z';
      o += path(bd, x.lin([[0, P.base], [1, P.d1]], 0, 0, 0, 1));
      o += path(bd, cylOverlay(x, 0.8));
      o += path(bd, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.5"');
      o += circ(300, 400, 4, '#8fd19b') + circ(300, 400, 9, '#8fd19b', ' opacity=".3" filter="' + x.blur(3) + '"');
      /* top deck */
      o += ell(300, 300, 135, 36, x.lin([[0, P.d1], [1, P.l1]], 0, 0, 0, 1), ' stroke="' + P.line + '" stroke-opacity=".3"');
      o += ell(300, 302, 120, 28, x.lin([[0, P.d2], [1, P.base]], 0, 0, 0, 1), ' opacity=".9"');
      [[248, 300], [352, 300]].forEach(function (c, i) {
        o += ell(c[0], c[1] + 2, 42, 18, P.d3, ' opacity=".9"');
        var gTop = x.rad([[0, P.l2], [0.5, P.l1], [1, P.d1]], 0.4, 0.25, 0.8);
        o += ell(c[0], c[1] - 6, 36, 20, gTop, ' stroke="' + P.d2 + '" stroke-opacity=".6"');
        o += ell(c[0] + (i ? 4 : -4), c[1] - 10, 22, 11, x.rad([[0, P.l1], [1, P.base]], 0.4, 0.3, 0.8), ' stroke="' + P.d2 + '" stroke-opacity=".5"');
        o += ell(c[0] - 8, c[1] - 16, 10, 3, '#fff', ' opacity=".75" filter="' + x.blur(1.5) + '"');
      });
      o += rect(176, 300, 248, 6, 3, P.d3, ' opacity=".12"');
    }
    return o;
  };

  /* --------------------------- headphones -------------------------- */
  DEF.headphones = { color: '#2d2e31', accent: function (c) { return luma(c) > 0.6 ? darken(c, 0.14) : mix(c, '#1b1b1d', 0.45); } };
  T.headphones = function (x, P, A, view) {
    var o = '';
    function band(d, w) {
      return '<path d="' + d + '" fill="none" stroke="' + (P.L > 0.75 ? darken(P.base, 0.2) : P.d3) + '" stroke-width="' + (w + 3) + '" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + P.base + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    }
    if (view !== 'angle') {
      o += shadow(x, 172, 484, 82, 16) + shadow(x, 428, 484, 82, 16);
      var arc = 'M165 270A135 168 0 0 1 435 270';
      o += band(arc, 28);
      o += '<path d="M177 272A123 156 0 0 1 423 272" fill="none" stroke="' + A.d1 + '" stroke-width="12" stroke-linecap="round"/>';
      o += '<path d="M151 270A149 182 0 0 1 449 270" fill="none" stroke="' + P.l2 + '" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" stroke-dasharray="0 70 400"/>';
      var side = function () {
        var s = '';
        s += rect(158, 262, 14, 52, 5, metal(x, true));
        s += rect(145, 300, 40, 22, 9, x.lin([[0, P.l1], [1, P.d1]], 0, 0, 0, 1));
        var cup = rrPath(118, 312, 86, 170, 43);
        s += rect(196, 320, 42, 154, 21, x.lin([[0, A.d2], [0.5, A.base], [1, A.l1]], 0, 0, 1, 0));
        s += rect(232, 330, 6, 134, 3, A.d3, ' opacity=".4"');
        s += path(cup, x.lin([[0, P.l1], [0.5, P.base], [1, P.d1]], 0, 0, 0, 1));
        s += path(cup, cylOverlay(x, 1));
        s += path(cup, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.4"');
        s += rect(130, 340, 8, 112, 4, '#fff', ' opacity=".35" filter="' + x.blur(2.5) + '"');
        s += '<path d="M150 318V476" stroke="' + P.d3 + '" stroke-opacity=".35" stroke-width="1.5"/>';
        return s;
      };
      o += side();
      o += '<g transform="translate(600 0) scale(-1 1)">' + side() + '</g>';
    } else {
      o += shadow(x, 404, 430, 78, 15, 0.8) + shadow(x, 236, 502, 122, 22);
      /* back cup */
      o += ell(418, 330, 60, 92, x.lin([[0, P.base], [1, P.d2]], 0, 0, 1, 0));
      o += ell(402, 332, 58, 90, x.rad([[0, A.d2], [0.55, A.base], [0.85, A.l1], [1, A.d1]], 0.5, 0.5, 0.5));
      o += ell(400, 334, 32, 58, x.rad([[0, A.d3], [1, A.d2]], 0.5, 0.5, 0.5), ' opacity=".85"');
      /* band */
      var arc2 = 'M236 268C222 60 438 44 414 246';
      o += band(arc2, 30);
      o += '<path d="M248 262C240 92 420 78 404 246" fill="none" stroke="' + A.d1 + '" stroke-width="10" stroke-linecap="round"/>';
      o += '<path d="M236 210C236 100 350 66 400 116" fill="none" stroke="' + (P.L > 0.75 ? P.d1 : P.l2) + '" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" transform="translate(-6 -2)"/>';
      o += rect(407, 238, 12, 50, 5, metal(x, true));
      /* front cup: cushion peeking then shell */
      o += ell(256, 382, 92, 120, x.lin([[0, A.d2], [0.6, A.base], [1, A.l1]], 0, 0, 1, 0));
      o += rect(228, 252, 13, 44, 5, metal(x, true));
      o += ell(234, 380, 94, 120, x.rad([[0, P.l1], [0.55, P.base], [1, P.d2]], 0.38, 0.32, 0.75), ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.4"');
      o += ell(230, 380, 74, 98, x.lin([[0, P.l1], [0.5, P.base], [1, P.d1]], 0, 0, 1, 1), ' stroke="' + P.d2 + '" stroke-width="2.5"');
      o += ell(230, 380, 74, 98, 'none', ' stroke="#fff" stroke-opacity=".3" stroke-width="1.4" transform="translate(-1.5 -1.5)"');
      o += ell(200, 322, 30, 12, '#fff', ' opacity=".45" transform="rotate(-35 200 322)" filter="' + x.blur(4) + '"');
      o += circ(262, 448, 3.2, P.d3, ' opacity=".7"');
      /* yoke */
      o += '<path d="M146 360C146 268 324 268 324 360" fill="none" stroke="' + P.d3 + '" stroke-width="13" stroke-linecap="round"/>';
      o += '<path d="M146 360C146 268 324 268 324 360" fill="none" stroke="' + P.base + '" stroke-width="9" stroke-linecap="round"/>';
      o += '<path d="M152 330C162 286 230 274 270 284" fill="none" stroke="' + P.l2 + '" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>';
      o += circ(146, 362, 8, x.rad([[0, P.l1], [1, P.d2]], 0.4, 0.4, 0.6)) + circ(324, 362, 8, x.rad([[0, P.l1], [1, P.d2]], 0.4, 0.4, 0.6));
    }
    return o;
  };

  /* ---------------------------- speaker ---------------------------- */
  DEF.speaker = { color: '#4a5260', accent: function (c) { return luma(c) > 0.7 ? darken(c, 0.2) : mix(c, '#1d1d1f', 0.6); } };
  function fabric(x, P) {
    var dot = P.L > 0.5 ? '#000' : '#000';
    return x.pattern(6, 6, '<rect width="6" height="6" fill="' + P.base + '"/>' +
      '<circle cx="1.5" cy="1.5" r="1.25" fill="' + dot + '" fill-opacity="' + (P.L > 0.7 ? 0.13 : 0.24) + '"/>' +
      '<circle cx="4.5" cy="4.5" r="1.25" fill="' + dot + '" fill-opacity="' + (P.L > 0.7 ? 0.13 : 0.24) + '"/>' +
      '<circle cx="4.5" cy="1.5" r=".7" fill="#fff" fill-opacity=".10"/>' +
      '<circle cx="1.5" cy="4.5" r=".7" fill="#fff" fill-opacity=".10"/>');
  }
  T.speaker = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += shadow(x, 302, 398, 205, 30);
      var bd = 'M152 226H452A30 84 0 0 1 452 394H152Z';
      o += path(bd, fabric(x, P));
      o += path(bd, x.lin([[0, '#fff', 0.3], [0.18, '#fff', 0.1], [0.4, '#000', 0], [0.78, '#000', 0.2], [1, '#000', 0.48]], 0, 0, 0, 1));
      o += path(bd, x.lin([[0, '#000', 0.1], [0.12, '#000', 0], [0.86, '#000', 0], [1, '#000', 0.22]], 0, 0, 1, 0));
      /* right rubber band */
      o += path('M440 226H452A30 84 0 0 1 452 394H440A30 84 0 0 0 440 226Z', x.lin([[0, A.l1], [0.4, A.base], [1, A.d2]], 0, 0, 0, 1));
      o += '<path d="M490 286C514 282 516 336 490 332" fill="none" stroke="' + A.d1 + '" stroke-width="8" stroke-linecap="round"/>';
      /* top control pad */
      o += rect(250, 219, 104, 14, 7, x.lin([[0, A.l1], [1, A.d1]], 0, 0, 0, 1));
      o += '<path d="M268 226h10M326 226h10M331 221v10" stroke="' + A.l2 + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>' + circ(302, 226, 3.2, A.l2, ' opacity=".8"');
      /* left end cap with passive radiator */
      o += ell(152, 310, 30, 84, x.lin([[0, A.l1], [0.5, A.base], [1, A.d2]], 0, 0, 1, 1), ' stroke="' + A.d3 + '" stroke-opacity=".5"');
      o += ell(152, 310, 20, 62, x.lin([[0, A.d2], [1, A.base]], 0, 0, 1, 1));
      o += ell(153, 310, 13, 40, x.lin([[0, A.l1], [1, A.d1]], 0, 0, 1, 1));
      o += ell(146, 286, 3, 16, '#fff', ' opacity=".35" filter="' + x.blur(1.5) + '"');
      o += rect(190, 238, 230, 10, 5, '#fff', ' opacity=".22" filter="' + x.blur(3) + '"');
    } else {
      o += shadow(x, 300, 456, 140, 30);
      var b2 = 'M196 168V438A104 30 0 0 0 404 438V168Z';
      o += path(b2, fabric(x, P));
      o += path(b2, cylOverlay(x, 1.1));
      /* bottom foot */
      o += path('M196 420V438A104 30 0 0 0 404 438V420A104 30 0 0 1 196 420Z', x.lin([[0, A.d1], [0.3, A.l1], [0.6, A.base], [1, A.d3]], 0, 0, 1, 0));
      /* top cap */
      o += path('M196 168V184A104 30 0 0 0 404 184V168Z', x.lin([[0, A.d2], [0.3, A.l1], [0.6, A.base], [1, A.d3]], 0, 0, 1, 0));
      o += ell(300, 168, 104, 30, x.lin([[0, A.l1], [1, A.base]], 0, 0, 0.3, 1), ' stroke="' + A.l2 + '" stroke-opacity=".35"');
      o += ell(300, 170, 84, 21, x.lin([[0, A.d1], [1, A.l1]], 0, 0, 0, 1), ' opacity=".7"');
      [[258, 170], [300, 168], [342, 170]].forEach(function (c, i) {
        o += ell(c[0], c[1] + 1.5, 14, 6, A.d3, ' opacity=".5"');
        o += ell(c[0], c[1], 14, 6, x.lin([[0, A.l2], [1, A.base]], 0, 0, 0, 1));
      });
      o += '<path d="M252 170h12M336 170h12M342 167v6" stroke="' + A.d3 + '" stroke-width="1.6" stroke-linecap="round"/>' + circ(300, 168, 2.4, A.d3);
      /* lanyard */
      o += '<path d="M392 196C422 196 426 236 400 240" fill="none" stroke="' + A.d1 + '" stroke-width="7" stroke-linecap="round"/>';
      o += rect(222, 200, 26, 210, 13, '#fff', ' opacity=".14" filter="' + x.blur(5) + '"');
    }
    return o;
  };

  /* --------------------------- powerbank --------------------------- */
  DEF.powerbank = { color: '#eceae6', accent: '#62c39a' };
  T.powerbank = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += shadow(x, 300, 482, 150, 24);
      var bd = rrPath(198, 112, 204, 370, 40);
      o += path(bd, x.lin([[0, P.l1], [0.5, P.base], [1, P.d1]], 0, 0, 0.4, 1));
      o += path(bd, cylOverlay(x, 0.7));
      o += path(bd, 'none', ' stroke="' + P.line + '" stroke-opacity=".38" stroke-width="1.5"');
      o += path(rrPath(208, 122, 184, 350, 31), 'none', ' stroke="#fff" stroke-opacity=".55" stroke-width="1.6"');
      var cl = x.clip('<path d="' + bd + '"/>');
      o += '<g clip-path="' + cl + '"><path d="M198 112H330L198 330Z" fill="#fff" opacity=".18"/>' +
        rect(386, 150, 10, 300, 5, '#fff', ' opacity=".35" filter="' + x.blur(3) + '"') + '</g>';
      o += rect(250, 168, 100, 38, 12, x.lin([[0, '#26282c'], [1, '#0d0e10']], 0, 0, 0, 1));
      for (var i = 0; i < 4; i++) o += rect(262 + i * 20, 182, 14, 10, 3, A.base, i === 3 ? ' opacity=".22"' : '');
      o += rect(262, 182, 74, 10, 3, A.l1, ' opacity=".5" filter="' + x.blur(3) + '"');
      o += rect(250, 168, 100, 14, 7, '#fff', ' opacity=".07"');
      o += rect(400, 216, 6, 44, 3, x.lin([[0, P.l1], [1, P.d2]], 0, 0, 1, 0));
      o += circ(300, 430, 9, 'none', ' stroke="' + P.d2 + '" stroke-opacity=".5" stroke-width="1.5"');
      o += circ(300, 431, 9, 'none', ' stroke="#fff" stroke-opacity=".6" stroke-width="1"');
    } else {
      var cam = Cam({ yaw: -34, pitch: 20, s: 98, cx: 300, cy: 296, f: 12 });
      var W = 1.9, H = 3.5, D = 0.72;
      var org = [-W / 2, -H / 2, -D / 2];
      o += shadowFoot(x, cam, [[-W / 2, -H / 2, -D / 2], [W / 2, -H / 2, -D / 2], [W / 2, -H / 2, D / 2], [-W / 2, -H / 2, D / 2]]);
      var r = drawBox(x, cam, box3(org, [W, 0, 0], [0, H, 0], [0, 0, D]), P, 16);
      o += r.svg;
      var fm = faceMap(cam, [-W / 2, -H / 2, D / 2], [1, 0, 0], [0, 1, 0]);
      var tm = faceMap(cam, [-W / 2, H / 2, D / 2], [1, 0, 0], [0, 0, -1]);
      /* display window on front */
      o += path(rrLocal(fm, 0.45, 2.72, 1.0, 0.38, 0.12), x.lin([[0, '#26282c'], [1, '#0c0d0f']], 0, 0, 0, 1));
      for (var k = 0; k < 4; k++) o += path(rrLocal(fm, 0.57 + k * 0.2, 2.86, 0.14, 0.1, 0.03), A.base, k === 3 ? ' opacity=".22"' : '');
      /* gloss streak */
      o += path(poly([fm(0.05, 3.4), fm(0.9, 3.4), fm(0.05, 1.1)]), '#fff', ' opacity=".14"');
      /* ports on top */
      o += path(rrLocal(tm, 0.32, 0.26, 0.42, 0.17, 0.08), '#151618');
      o += path(rrLocal(tm, 0.92, 0.22, 0.62, 0.25, 0.03), '#151618');
      o += path(rrLocal(tm, 0.98, 0.31, 0.5, 0.07, 0.01), '#d9dce0', ' opacity=".8"');
      /* side button */
      var sm = faceMap(cam, [W / 2, -H / 2, D / 2], [0, 0, -1], [0, 1, 0]);
      o += path(rrLocal(sm, 0.22, 2.5, 0.26, 0.5, 0.1), P.d2, ' opacity=".6"');
    }
    return o;
  };

  /* --------------------------- smartwatch -------------------------- */
  DEF.smartwatch = { color: '#2c2d30', accent: '#e9895c' };
  function watchFlat(x, P, A, opt) {
    opt = opt || {};
    var o = '';
    var caseP = pal(P.L > 0.75 ? mix(P.base, '#c9ccd1', 0.35) : mix(P.base, '#8e9196', 0.2));
    var strapUp = 'M246 80Q246 70 258 70H342Q354 70 354 80L362 214H238Z';
    var strapDn = 'M238 384H362L356 516Q356 528 344 528H256Q244 528 244 516Z';
    if (opt.sil) return '<path d="' + strapUp + '"/><path d="' + strapDn + '"/><path d="' + rrPath(200, 186, 200, 228, 56) + '"/>';
    var sg = x.lin([[0, P.d1], [0.18, P.base], [0.5, P.l1], [0.82, P.base], [1, P.d2]], 0, 0, 1, 0);
    o += path(strapUp, sg) + path(strapUp, x.lin([[0, '#fff', 0.1], [1, '#000', 0.12]], 0, 0, 0, 1));
    o += path(strapDn, sg) + path(strapDn, x.lin([[0, '#000', 0.12], [1, '#fff', 0.06]], 0, 0, 0, 1));
    for (var i = 0; i < 4; i++) {
      o += ell(300, 436 + i * 20, 4.5, 3.2, P.d3, ' opacity=".9"');
      o += ell(300, 437.2 + i * 20, 4.5, 3.2, '#fff', ' opacity=".12"');
    }
    o += '<path d="M252 92H348" stroke="#000" stroke-opacity=".15" stroke-width="1.2"/>';
    /* case */
    var cd = rrPath(200, 186, 200, 228, 56);
    o += rect(394, 262, 18, 44, 6, metal(x));
    for (var r = 0; r < 6; r++) o += '<path d="M396 ' + (267 + r * 7) + 'H411" stroke="#5f6368" stroke-opacity=".5" stroke-width="1.2"/>';
    o += rect(396, 322, 9, 36, 4, x.lin([[0, caseP.l1], [1, caseP.d2]], 0, 0, 1, 0));
    o += path(cd, x.lin([[0, caseP.l2], [0.3, caseP.base], [0.55, caseP.d1], [0.78, caseP.l1], [1, caseP.d2]], 0, 0, 1, 1), ' stroke="' + caseP.line + '" stroke-opacity=".5" stroke-width="1.2"');
    o += path(rrPath(204, 190, 192, 220, 52), 'none', ' stroke="#fff" stroke-opacity=".45" stroke-width="1.5"');
    /* screen */
    var sd = rrPath(214, 200, 172, 200, 44);
    o += path(sd, x.lin([[0, '#1d1f23'], [1, '#08090b']], 0, 0, 0.4, 1));
    var cx = 300, cy = 300;
    for (var t = 0; t < 12; t++) {
      var a = t * 30 * DEG, r1 = t % 3 === 0 ? 62 : 68, r2 = 76;
      o += '<path d="M' + n(cx + Math.sin(a) * r1) + ' ' + n(cy - Math.cos(a) * r1) + 'L' + n(cx + Math.sin(a) * r2) + ' ' + n(cy - Math.cos(a) * r2) + '" stroke="#fff" stroke-opacity="' + (t % 3 === 0 ? 0.9 : 0.45) + '" stroke-width="' + (t % 3 === 0 ? 3.2 : 1.8) + '" stroke-linecap="round"/>';
    }
    o += '<path d="M300 300L268 280" stroke="#f2f2f2" stroke-width="6" stroke-linecap="round"/>';
    o += '<path d="M300 300L344 260" stroke="#f2f2f2" stroke-width="4.5" stroke-linecap="round"/>';
    o += '<path d="M300 300L296 360M300 300l2 -16" stroke="' + A.base + '" stroke-width="1.8" stroke-linecap="round"/>';
    o += circ(300, 300, 5.5, A.base) + circ(300, 300, 2.2, '#111');
    o += '<path d="M318 338a12 12 0 1 1 -1 0" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="2.6"/>';
    o += '<path d="M318 338a12 12 0 0 1 11.6 15" fill="none" stroke="' + A.base + '" stroke-width="2.6" stroke-linecap="round"/>';
    var cl = x.clip('<path d="' + sd + '"/>');
    o += '<g clip-path="' + cl + '"><path d="M214 200H330L214 330Z" fill="#fff" opacity=".09"/></g>';
    return o;
  }
  T.smartwatch = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += ell(304, 512, 120, 18, x.rad([[0, '#2b2620', 0.16], [1, '#2b2620', 0]], 0.5, 0.5, 0.5));
      o += '<g opacity=".22" filter="' + x.blur(9) + '" transform="translate(6 12)" fill="#2b2620">' + watchFlat(x, P, A, { sil: true }) + '</g>';
      o += '<g transform="translate(300 300) scale(.92) translate(-300 -300)">' + watchFlat(x, P, A) + '</g>';
      return o;
    }
    var T2 = 'translate(300 290) scale(1 .62) rotate(-32) translate(-300 -300)';
    o += shadow(x, 308, 392, 230, 70, 0.75);
    var side = darken(P.base, P.L > 0.6 ? 0.25 : 0.1);
    var silh = watchFlat(x, P, A, { sil: true });
    for (var i = 16; i > 0; i -= 2) {
      o += '<g transform="translate(0 ' + i + ') ' + T2 + '" fill="' + (i > 8 ? darken(side, 0.1) : side) + '">' + silh + '</g>';
    }
    o += '<g transform="' + T2 + '">' + watchFlat(x, P, A) + '</g>';
    return o;
  };

  /* ---------------------------- charger ---------------------------- */
  DEF.charger = { color: '#f2f1ee', accent: function (c) { return luma(c) > 0.55 ? '#8b9098' : '#c7cbd1'; } };
  T.charger = function (x, P, A, view) {
    var o = '';
    var W = 2.0, H = 2.1, D = 1.75;
    var org = [-W / 2, -H / 2, -D / 2];
    var faces = box3(org, [W, 0, 0], [0, H, 0], [0, 0, D]);
    var foot = [[-W / 2, -H / 2, -D / 2], [W / 2, -H / 2, -D / 2], [W / 2, -H / 2, D / 2], [-W / 2, -H / 2, D / 2]];
    if (view !== 'angle') {
      var cam = Cam({ yaw: -20, pitch: 20, s: 98, cx: 300, cy: 300, f: 11 });
      o += shadowFoot(x, cam, foot);
      o += drawBox(x, cam, faces, P, 22).svg;
      var fm = faceMap(cam, [-W / 2, -H / 2, D / 2], [1, 0, 0], [0, 1, 0]);
      /* inset panel */
      o += path(rrLocal(fm, 0.62, 0.32, 0.76, 1.48, 0.3), A.base, ' opacity=".18"');
      o += path(rrLocal(fm, 0.72, 1.36, 0.56, 0.2, 0.1), '#141517');
      o += path(rrLocal(fm, 0.8, 1.42, 0.4, 0.07, 0.035), '#6a6e74');
      o += path(rrLocal(fm, 0.72, 1.0, 0.56, 0.2, 0.1), '#141517');
      o += path(rrLocal(fm, 0.8, 1.06, 0.4, 0.07, 0.035), '#6a6e74');
      o += path(rrLocal(fm, 0.66, 0.5, 0.68, 0.28, 0.03), '#141517');
      o += path(rrLocal(fm, 0.71, 0.6, 0.58, 0.09, 0.01), '#d0d3d8');
      o += path(poly([fm(0.04, 2.06), fm(0.7, 2.06), fm(0.04, 1.2)]), '#fff', ' opacity=".14"');
      /* led */
      o += path(circLocal(fm, 1.0, 1.84, 0.035), A.base);
    } else {
      var cam2 = Cam({ yaw: -132, pitch: 18, s: 96, cx: 290, cy: 306, f: 11 });
      o += shadowFoot(x, cam2, foot);
      o += drawBox(x, cam2, faces, P, 22).svg;
      var bm = faceMap(cam2, [W / 2, -H / 2, -D / 2], [-1, 0, 0], [0, 1, 0]);
      o += path(rrLocal(bm, 0.3, 0.3, 1.4, 1.5, 0.45), P.d1, ' opacity=".55"');
      o += path(rrLocal(bm, 0.32, 0.32, 1.4, 1.5, 0.45), 'none', ' stroke="#fff" stroke-opacity=".5" stroke-width="1.2"');
      /* round pins */
      [[0.48, 1.06], [-0.48, 1.06]].sort(function (a, b) { return a[0] - b[0]; }).forEach(function (pp) {
        var base = cam2.p([pp[0], pp[1] - H / 2 + 0.0, -D / 2]);
        var tip = cam2.p([pp[0], pp[1] - H / 2, -D / 2 - 0.95]);
        o += ell(base[0], base[1], 12, 11, '#1a1b1d', ' opacity=".5"');
        var d = 'M' + pt(base) + 'L' + pt(tip);
        o += '<path d="' + d + '" stroke="#6d7177" stroke-width="20" stroke-linecap="round"/>';
        o += '<path d="' + d + '" stroke="#b7bbc1" stroke-width="16" stroke-linecap="round"/>';
        o += '<path d="' + d + '" stroke="#eef0f2" stroke-width="5" stroke-linecap="round" transform="translate(-3 -4)"/>';
        o += circ(tip[0], tip[1], 8, x.rad([[0, '#ffffff'], [1, '#9a9ea4']], 0.4, 0.4, 0.6));
      });
    }
    return o;
  };

  /* ----------------------------- cable ----------------------------- */
  DEF.cable = { color: '#f1f0ec', accent: function (c) { return luma(c) > 0.6 ? darken(c, 0.06) : lighten(c, 0.08); } };
  function usbc(x, P, A, cx, cy, ang, s) {
    var o = '<g transform="translate(' + n(cx) + ' ' + n(cy) + ') rotate(' + ang + ') scale(' + (s || 1) + ')">';
    o += path('M-7 0L-10 -20H10L7 0Z', x.lin([[0, A.d1], [0.4, A.l1], [1, A.d2]], 0, 0, 1, 0));
    o += rect(-15, -78, 30, 60, 9, x.lin([[0, A.d2], [0.3, A.l1], [0.55, A.base], [1, A.d2]], 0, 0, 1, 0), ' stroke="' + A.line + '" stroke-opacity=".3"');
    o += rect(-11, -102, 22, 26, 6, metal(x, true));
    o += rect(-6, -98, 12, 3, 1.5, '#2b2d30', ' opacity=".7"');
    return o + '</g>';
  }
  function cableTube(d, w, P, extra) {
    extra = extra || '';
    var edge = P.L > 0.7 ? darken(P.base, 0.17) : P.d3;
    var cap = ' fill="none" stroke-linecap="round" stroke-linejoin="round"' + extra;
    return '<path d="' + d + '" stroke="' + edge + '" stroke-width="' + n(w + 2) + '"' + cap + '/>' +
      '<path d="' + d + '" stroke="' + P.d1 + '" stroke-width="' + n(w) + '"' + cap + '/>' +
      '<path d="' + d + '" stroke="' + P.base + '" stroke-width="' + n(w * 0.6) + '" transform="translate(0 -' + n(w * 0.14) + ')"' + cap + '/>' +
      '<path d="' + d + '" stroke="' + (P.L > 0.8 ? '#ffffff' : P.l2) + '" stroke-opacity=".8" stroke-width="' + n(w * 0.2) + '" transform="translate(0 -' + n(w * 0.26) + ')"' + cap + '/>';
  }
  function loopD(cx, cy, rx, ry) {
    return 'M' + n(cx - rx) + ' ' + n(cy) + 'A' + n(rx) + ' ' + n(ry) + ' 0 1 1 ' + n(cx + rx) + ' ' + n(cy) + 'A' + n(rx) + ' ' + n(ry) + ' 0 1 1 ' + n(cx - rx) + ' ' + n(cy) + 'Z';
  }
  T.cable = function (x, P, A, view) {
    var o = '';
    var w = 12;
    if (view !== 'angle') {
      o += shadow(x, 300, 392, 215, 46);
      var loops = [[300, 296, 158, 88, -3], [304, 300, 150, 84, 2], [296, 292, 164, 92, 0], [302, 302, 154, 86, -1], [298, 294, 160, 90, 3], [300, 299, 147, 82, 1], [303, 297, 162, 89, -2]];
      loops.forEach(function (l) {
        o += cableTube(loopD(l[0], l[1], l[2], l[3]), w, P, ' transform="rotate(' + l[4] + ' 300 300)"');
      });
      o += cableTube('M236 372C214 396 196 404 176 408', w, P);
      o += cableTube('M364 374C386 396 404 404 424 408', w, P);
      o += usbc(x, P, A, 176, 408, -98, 1.05);
      o += usbc(x, P, A, 424, 408, 98, 1.05);
      o += ell(300, 212, 120, 10, '#fff', ' opacity=".18" filter="' + x.blur(5) + '"');
    } else {
      o += shadow(x, 300, 420, 200, 60);
      var loops2 = [[300, 280, 132, 104], [304, 284, 126, 99], [296, 276, 137, 108], [301, 286, 129, 101], [298, 279, 134, 106], [303, 282, 124, 97]];
      o += '<g transform="rotate(-10 300 280)">';
      loops2.forEach(function (l) { o += cableTube(loopD(l[0], l[1], l[2], l[3]), w, P); });
      /* tie strap crossing the bundle on the right */
      o += rect(404, 262, 60, 34, 10, A.d3, ' opacity=".35" transform="translate(2 4)"');
      o += rect(404, 262, 60, 34, 10, x.lin([[0, A.l1], [0.45, A.base], [1, A.d2]], 0, 0, 0, 1), ' stroke="' + A.line + '" stroke-opacity=".35"');
      o += rect(412, 268, 44, 6, 3, '#fff', ' opacity=".25"');
      o += '</g>';
      o += cableTube('M318 370C340 400 366 414 400 418', w, P);
      o += cableTube('M282 374C296 412 318 434 350 446', w, P);
      o += usbc(x, P, A, 400, 418, 94, 1.05);
      o += usbc(x, P, A, 350, 446, 106, 1.05);
    }
    return o;
  };

  /* --------------------------- ringlight --------------------------- */
  DEF.ringlight = { color: '#2a2b2e', accent: '#fff4e2' };
  function tripod(x, P, legs, hub) {
    var o = '', mp = pal('#2b2c2f');
    legs.forEach(function (l) {
      var d = 'M' + hub[0] + ' ' + hub[1] + 'L' + l[0] + ' ' + l[1];
      o += '<path d="' + d + '" stroke="' + mp.d3 + '" stroke-width="12" stroke-linecap="round"/>';
      o += '<path d="' + d + '" stroke="' + mp.base + '" stroke-width="9" stroke-linecap="round"/>';
      o += '<path d="' + d + '" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round" transform="translate(-2 -1)"/>';
      o += ell(l[0], l[1] + 2, 9, 5, '#1b1c1e');
    });
    return o;
  }
  T.ringlight = function (x, P, A, view) {
    var o = '', mp = pal('#2b2c2f');
    var glow = A.base;
    if (view !== 'angle') {
      var cx = 300, cy = 214;
      o += shadow(x, 300, 528, 150, 18);
      o += tripod(x, P, [[196, 526], [404, 526]], [300, 446]);
      o += rect(293, 330, 14, 120, 6, x.lin([[0, mp.l2], [0.4, mp.base], [1, mp.d3]], 0, 0, 1, 0));
      o += tripod(x, P, [[300, 536]], [300, 446]);
      o += rect(284, 436, 32, 24, 8, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
      o += circ(cx, cy, 175, x.rad([[0, glow, 0.0], [0.6, glow, 0.3], [0.78, glow, 0.18], [1, glow, 0]], 0.5, 0.5, 0.5));
      var ring = 'M' + (cx - 138) + ' ' + cy + 'a138 138 0 1 0 276 0a138 138 0 1 0 -276 0ZM' + (cx - 98) + ' ' + cy + 'a98 98 0 1 1 196 0a98 98 0 1 1 -196 0Z';
      o += path(ring, x.lin([[0, P.l1], [0.5, P.base], [1, P.d2]], 0, 0, 1, 1), ' fill-rule="evenodd" stroke="' + P.line + '" stroke-opacity=".4"');
      var diff = 'M' + (cx - 128) + ' ' + cy + 'a128 128 0 1 0 256 0a128 128 0 1 0 -256 0ZM' + (cx - 108) + ' ' + cy + 'a108 108 0 1 1 216 0a108 108 0 1 1 -216 0Z';
      o += path(diff, x.rad([[0.8, '#ffffff'], [0.92, glow], [1, mix(glow, '#d9cdb8', 0.4)]], 0.5, 0.5, 0.5), ' fill-rule="evenodd"');
      o += circ(cx, cy, 118, 'none', ' stroke="#fff" stroke-width="5" stroke-opacity=".9" filter="' + x.blur(2) + '"');
      o += '<path d="M' + (cx - 120) + ' ' + (cy - 60) + 'A134 134 0 0 1 ' + (cx + 20) + ' ' + (cy - 133) + '" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>';
      /* ring mount + phone holder */
      o += rect(290, 346, 20, 18, 5, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
      o += rect(296, 230, 8, 120, 4, x.lin([[0, mp.l1], [1, mp.d3]], 0, 0, 1, 0));
      o += rect(266, 150, 68, 112, 12, x.lin([[0, '#2a2c31'], [1, '#0f1012']], 0, 0, 1, 1), ' stroke="#55585e" stroke-width="2"');
      o += rect(271, 155, 58, 102, 9, x.lin([[0, '#3b4252'], [0.5, '#1b1f27'], [1, '#101215']], 0, 0, 1, 1));
      o += '<path d="M272 158L300 158L272 210Z" fill="#fff" opacity=".1"/>';
      o += rect(276, 142, 48, 12, 4, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
      o += rect(276, 258, 48, 12, 4, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
    } else {
      var cx2 = 300, cy2 = 214;
      o += shadow(x, 300, 526, 150, 20);
      o += tripod(x, P, [[214, 518], [420, 528]], [300, 446]);
      o += rect(293, 330, 14, 120, 6, x.lin([[0, mp.l2], [0.4, mp.base], [1, mp.d3]], 0, 0, 1, 0));
      o += tripod(x, P, [[268, 540]], [300, 446]);
      o += rect(284, 436, 32, 24, 8, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
      o += '<g transform="translate(' + cx2 + ' ' + cy2 + ') rotate(-4)">';
      o += ell(0, 0, 150, 175, x.rad([[0.55, glow, 0], [0.75, glow, 0.25], [1, glow, 0]], 0.5, 0.5, 0.5), ' transform="scale(.6 1)"');
      /* back rim (thickness) */
      var e = function (rx, ry) { return 'M' + (-rx) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (2 * rx) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0Z'; };
      var e2 = function (rx, ry) { return 'M' + (-rx) + ' 0a' + rx + ' ' + ry + ' 0 1 1 ' + (2 * rx) + ' 0a' + rx + ' ' + ry + ' 0 1 1 ' + (-2 * rx) + ' 0Z'; };
      o += '<g transform="translate(16 0)">' + path(e(80, 138) + e2(56, 98), x.lin([[0, P.d1], [1, P.d3]], 0, 0, 1, 0), ' fill-rule="evenodd"') + '</g>';
      o += path(e(80, 138) + e2(56, 98), x.lin([[0, P.l1], [0.5, P.base], [1, P.d2]], 0, 0, 1, 1), ' fill-rule="evenodd" stroke="' + P.line + '" stroke-opacity=".4"');
      o += path(e(73, 128) + e2(62, 108), x.lin([[0, '#ffffff'], [0.6, glow], [1, mix(glow, '#d9cdb8', 0.4)]], 0, 0, 1, 1), ' fill-rule="evenodd"');
      o += ell(0, 0, 67, 118, 'none', ' stroke="#fff" stroke-width="4" stroke-opacity=".85" filter="' + x.blur(1.6) + '"');
      o += '</g>';
      o += rect(290, 346, 20, 18, 5, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1));
      o += rect(296, 230, 8, 120, 4, x.lin([[0, mp.l1], [1, mp.d3]], 0, 0, 1, 0));
      o += '<g transform="translate(300 206) skewY(-10)">' +
        rect(-14, -56, 40, 112, 10, x.lin([[0, '#2a2c31'], [1, '#0f1012']], 0, 0, 1, 1), ' stroke="#55585e" stroke-width="2"') +
        rect(-10, -52, 32, 104, 7, x.lin([[0, '#3b4252'], [0.6, '#1b1f27'], [1, '#101215']], 0, 0, 1, 1)) +
        rect(-24, -60, 12, 120, 5, '#16171a') +
        rect(-12, -66, 36, 12, 4, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1)) +
        rect(-12, 52, 36, 12, 4, x.lin([[0, mp.l1], [1, mp.d2]], 0, 0, 0, 1)) + '</g>';
    }
    return o;
  };

  /* ------------------------------ cctv ----------------------------- */
  DEF.cctv = { color: '#f3f2ef', accent: '#141518' };
  function lens(x, cx, cy, r, sx) {
    sx = sx || 1;
    var o = '<g transform="translate(' + n(cx) + ' ' + n(cy) + ') scale(' + sx + ' 1)">';
    o += circ(0, 0, r, x.lin([[0, '#5d6168'], [0.5, '#1d1f22'], [1, '#8b9096']], 0, 0, 1, 1));
    o += circ(0, 0, r * 0.82, '#08090b');
    o += circ(0, 0, r * 0.64, x.rad([[0, '#3a3f6e'], [0.5, '#141629'], [1, '#050507']], 0.42, 0.4, 0.6));
    o += circ(0, 0, r * 0.3, x.rad([[0, '#6b4f8f', 0.8], [1, '#1b1630', 0]], 0.5, 0.5, 0.5));
    o += ell(-r * 0.28, -r * 0.3, r * 0.2, r * 0.12, '#fff', ' opacity=".75" transform="rotate(-35 ' + n(-r * 0.28) + ' ' + n(-r * 0.3) + ')"');
    o += circ(r * 0.25, r * 0.25, r * 0.05, '#fff', ' opacity=".5"');
    return o + '</g>';
  }
  T.cctv = function (x, P, A, view) {
    var o = '';
    o += shadow(x, 300, 472, 150, 26);
    /* base */
    var bd = 'M200 392V452A100 24 0 0 0 400 452V392Z';
    o += path(bd, x.lin([[0, P.base], [1, P.d1]], 0, 0, 0, 1));
    o += path(bd, cylOverlay(x, 0.8));
    o += ell(300, 392, 100, 24, x.lin([[0, P.l1], [1, P.base]], 0, 0, 0, 1), ' stroke="' + P.line + '" stroke-opacity=".25"');
    o += path(bd, 'none', ' stroke="' + P.line + '" stroke-opacity=".3"');
    o += ell(300, 392, 54, 13, P.d2, ' opacity=".5"');
    o += rect(258, 352, 84, 44, 20, x.lin([[0, P.d1], [0.3, P.l1], [1, P.d2]], 0, 0, 1, 0));
    o += rect(328, 418, 14, 4, 2, P.d3, ' opacity=".4"');
    /* head */
    var hc = [300, 248], R = 122;
    o += circ(hc[0], hc[1], R, x.rad([[0, P.l2], [0.35, P.l1], [0.7, P.base], [0.92, P.d1], [1, P.d2]], 0.36, 0.3, 0.75), ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.4"');
    o += ell(300, 352, 70, 10, P.d3, ' opacity=".12" filter="' + x.blur(4) + '"');
    if (view !== 'angle') {
      o += '<path d="M178 252A122 40 0 0 0 422 252" fill="none" stroke="' + P.d2 + '" stroke-opacity=".5" stroke-width="1.5"/>';
      o += circ(300, 240, 88, x.lin([[0, mix(A.base, '#4a4e57', 0.5)], [0.5, A.base], [1, darken(A.base, 0.3)]], 0, 0, 0.6, 1), ' stroke="' + P.d1 + '" stroke-width="3"');
      for (var i = 0; i < 6; i++) {
        var a = (i * 60 + 30) * DEG;
        o += circ(300 + Math.cos(a) * 62, 240 + Math.sin(a) * 62, 4.5, '#3a1d22', ' stroke="#55595f" stroke-width="1"');
      }
      o += lens(x, 300, 240, 40);
      o += circ(300, 172, 4, '#2c3036', ' stroke="#55595f"');
      o += '<path d="M232 196A88 88 0 0 1 300 152" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" filter="' + x.blur(1.5) + '"/>';
      o += circ(300, 344, 2.6, P.d3, ' opacity=".6"');
      o += ell(234, 168, 30, 14, '#fff', ' opacity=".6" transform="rotate(-35 234 168)" filter="' + x.blur(5) + '"');
    } else {
      o += '<path d="M178 266A122 34 0 0 0 422 236" fill="none" stroke="' + P.d2 + '" stroke-opacity=".5" stroke-width="1.5"/>';
      o += '<g transform="translate(250 226) rotate(-14)">';
      o += ell(0, 0, 60, 86, x.lin([[0, mix(A.base, '#4a4e57', 0.5)], [0.5, A.base], [1, darken(A.base, 0.3)]], 0, 0, 0.6, 1), ' stroke="' + P.d1 + '" stroke-width="3"');
      for (var j = 0; j < 6; j++) {
        var b = (j * 60 + 30) * DEG;
        o += ell(Math.cos(b) * 42, Math.sin(b) * 60, 3.2, 4.5, '#3a1d22', ' stroke="#55595f" stroke-width="1"');
      }
      o += lens(x, 0, 0, 39, 0.68);
      o += ell(0, -70, 3, 4, '#2c3036');
      o += '<path d="M-44 -50A60 86 0 0 1 2 -86" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" filter="' + x.blur(1.5) + '"/>';
      o += '</g>';
      o += ell(352, 176, 34, 16, '#fff', ' opacity=".55" transform="rotate(30 352 176)" filter="' + x.blur(6) + '"');
      o += '<path d="M392 200A122 122 0 0 1 404 300" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" filter="' + x.blur(1.5) + '"/>';
    }
    return o;
  };

  /* ---------------------------- trimmer ---------------------------- */
  DEF.trimmer = { color: '#2a2b2e', accent: '#c19a63' };
  function trimmerBody(x, P, A) {
    var o = '';
    var bd = 'M252 166C248 250 262 330 262 446Q262 492 300 492Q338 492 338 446C338 330 352 250 348 166Z';
    o += rect(244, 106, 112, 70, 18, x.lin([[0, P.d1], [0.3, P.l1], [0.6, P.base], [1, P.d3]], 0, 0, 1, 0));
    o += rect(236, 88, 128, 26, 6, metal(x, true));
    for (var i = 0; i < 25; i++) o += rect(238.5 + i * 5, 88, 2, 11, 0.8, '#3a3d41', ' opacity=".55"');
    o += rect(236, 104, 128, 10, 4, '#2d2f33', ' opacity=".35"');
    o += path(bd, x.lin([[0, P.l1], [0.5, P.base], [1, P.d1]], 0, 0, 0, 1));
    o += path(bd, cylOverlay(x, 1.1));
    o += path(bd, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.4"');
    /* grip ribs */
    var cl = x.clip('<path d="' + bd + '"/>');
    var ribs = '';
    for (var r = 0; r < 14; r++) ribs += '<path d="M250 ' + (352 + r * 8) + 'H350" stroke="' + P.d3 + '" stroke-opacity="' + (P.L > 0.6 ? 0.35 : 0.6) + '" stroke-width="3"/><path d="M250 ' + (354 + r * 8) + 'H350" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>';
    o += '<g clip-path="' + cl + '">' + ribs + rect(262, 180, 16, 280, 8, '#fff', ' opacity=".22" filter="' + x.blur(4) + '"') + '</g>';
    o += circ(300, 252, 19, x.lin([[0, A.l1], [0.5, A.base], [1, A.d2]], 0, 0, 1, 1), ' stroke="' + A.d3 + '" stroke-opacity=".5"');
    o += '<path d="M294 246A9 9 0 1 0 306 246M300 241V250" fill="none" stroke="' + A.d3 + '" stroke-width="2" stroke-linecap="round" opacity=".75"/>';
    for (var k = 0; k < 3; k++) o += circ(290 + k * 10, 296, 2.4, k < 2 ? '#8fd19b' : '#4b4f55');
    o += rect(270, 470, 60, 6, 3, A.base, ' opacity=".9"');
    return { svg: o, d: bd };
  }
  T.trimmer = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += shadow(x, 300, 494, 80, 15);
      o += trimmerBody(x, P, A).svg;
    } else {
      o += '<g transform="rotate(-12 300 340)">' + shadow(x, 300, 340, 230, 28) + '</g>';
      o += '<g transform="translate(0 -6) rotate(-76 300 290)">' + trimmerBody(x, P, A).svg + '</g>';
      /* detached comb guard in front */
      var cc = pal(P.L > 0.6 ? '#5b5e64' : mix(P.base, '#b9bcc2', 0.35));
      o += shadow(x, 214, 448, 84, 14, 0.8);
      var cg = '<g transform="translate(214 418) rotate(-6)">';
      cg += path('M-60 0H60L54 30Q0 38 -54 30Z', x.lin([[0, cc.l1], [1, cc.d2]], 0, 0, 0, 1), ' opacity=".95"');
      for (var i = 0; i < 15; i++) cg += rect(-56 + i * 7.6, -46, 3.6, 50, 1.8, x.lin([[0, cc.l1], [1, cc.base]], 0, 0, 0, 1));
      cg += rect(-60, -4, 120, 10, 4, cc.d1);
      cg += path('M-50 14H50', 'none', ' stroke="#fff" stroke-opacity=".3" stroke-width="2"');
      o += cg + '</g>';
    }
    return o;
  };

  /* ---------------------------- minifan ---------------------------- */
  DEF.minifan = { color: '#eeede9', accent: function (c) { return luma(c) > 0.6 ? darken(c, 0.12) : lighten(c, 0.25); } };
  function fanHead(x, P, A) {
    var o = '';
    o += circ(0, 0, 124, x.lin([[0, P.l1], [0.5, P.base], [1, P.d2]], 0, 0, 1, 1), ' stroke="' + P.line + '" stroke-opacity=".4" stroke-width="1.4"');
    o += circ(0, 0, 110, x.rad([[0, P.d3, 0.35], [1, P.d3, 0.6]], 0.5, 0.5, 0.5));
    for (var b = 0; b < 5; b++) {
      o += '<path transform="rotate(' + (b * 72) + ')" d="M0 -20C34 -36 52 -84 18 -102C-8 -104 -18 -60 -8 -22Z" fill="' + x.lin([[0, A.l1], [1, A.d1]], 0, 0, 1, 1) + '" opacity=".92" stroke="' + A.d2 + '" stroke-opacity=".4"/>';
    }
    o += circ(0, 0, 26, x.rad([[0, P.l2], [0.6, P.base], [1, P.d2]], 0.4, 0.35, 0.7));
    for (var r = 0; r < 4; r++) o += circ(0, 0, 36 + r * 21, 'none', ' stroke="' + P.base + '" stroke-width="3"');
    for (var s = 0; s < 16; s++) {
      var a = s * 22.5 * DEG;
      o += '<path d="M' + n(Math.cos(a) * 28) + ' ' + n(Math.sin(a) * 28) + 'L' + n(Math.cos(a) * 111) + ' ' + n(Math.sin(a) * 111) + '" stroke="' + P.base + '" stroke-width="2.4"/>';
    }
    o += circ(0, 0, 117, 'none', ' stroke="' + P.l1 + '" stroke-width="12"');
    o += circ(0, 0, 117, 'none', ' stroke="' + x.lin([[0, '#fff', 0.6], [0.5, '#fff', 0], [1, '#000', 0.2]], 0, 0, 1, 1) + '" stroke-width="12"');
    o += circ(0, 0, 18, x.rad([[0, P.l2], [1, P.d1]], 0.4, 0.35, 0.7), ' stroke="' + P.d2 + '" stroke-opacity=".5"');
    o += circ(0, 0, 124, 'none', ' stroke="' + P.line + '" stroke-opacity=".45" stroke-width="1.4"');
    o += '<path d="M-96 -70A118 118 0 0 1 -20 -116" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" filter="' + x.blur(1) + '"/>';
    return o;
  }
  T.minifan = function (x, P, A, view) {
    var o = '';
    o += shadow(x, 300, 506, 110, 18);
    o += ell(300, 494, 78, 18, x.lin([[0, P.base], [1, P.d2]], 0, 0, 0, 1));
    o += ell(300, 488, 78, 18, x.lin([[0, P.l1], [1, P.base]], 0, 0, 0, 1), ' stroke="' + P.line + '" stroke-opacity=".3"');
    var hd = rrPath(272, 330, 56, 162, 28);
    o += path(hd, x.lin([[0, P.base], [1, P.d1]], 0, 0, 0, 1));
    o += path(hd, cylOverlay(x, 1));
    o += path(hd, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.2"');
    o += circ(300, 390, 11, x.lin([[0, A.l1], [1, A.d2]], 0, 0, 1, 1), ' stroke="' + P.d2 + '" stroke-opacity=".5"');
    o += '<path d="M296 387A5 5 0 1 0 304 387M300 384V390" fill="none" stroke="' + A.d3 + '" stroke-width="1.5" stroke-linecap="round"/>';
    for (var i = 0; i < 3; i++) o += circ(292 + i * 8, 420, 2, i < 2 ? '#8fd19b' : '#c9c9c9');
    o += rect(278, 338, 9, 140, 4.5, '#fff', ' opacity=".3" filter="' + x.blur(2) + '"');
    if (view !== 'angle') {
      o += rect(286, 318, 28, 26, 8, x.lin([[0, P.l1], [1, P.d2]], 0, 0, 1, 0));
      o += '<g transform="translate(300 196)">' + fanHead(x, P, A) + '</g>';
    } else {
      o += rect(286, 318, 28, 26, 8, x.lin([[0, P.l1], [1, P.d2]], 0, 0, 1, 0));
      o += '<g transform="translate(324 200) rotate(-8) scale(.62 1)">' + circ(0, 0, 124, x.lin([[0, P.d1], [1, P.d3]], 0, 0, 1, 0)) + '</g>';
      o += '<g transform="translate(300 198) rotate(-8) scale(.62 1)">' + fanHead(x, P, A) + '</g>';
    }
    return o;
  };

  /* ----------------------------- mouse ----------------------------- */
  DEF.mouse = { color: '#ecebe7', accent: function (c) { return luma(c) > 0.6 ? '#5a5d63' : '#9a9da3'; } };
  T.mouse = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      var md = 'M300 112C362 112 394 166 398 238C404 330 402 420 362 462C342 482 322 488 300 488C278 488 258 482 238 462C198 420 196 330 202 238C206 166 238 112 300 112Z';
      o += ell(306, 476, 110, 22, x.rad([[0, '#2b2620', 0.2], [1, '#2b2620', 0]], 0.5, 0.5, 0.5));
      o += path(md, '#2b2620', ' opacity=".25" transform="translate(6 14)" filter="' + x.blur(10) + '"');
      o += path(md, x.rad([[0, P.l2], [0.35, P.l1], [0.75, P.base], [1, P.d2]], 0.42, 0.42, 0.62));
      o += path(md, 'none', ' stroke="' + P.line + '" stroke-opacity=".45" stroke-width="1.5"');
      o += path(md, 'none', ' stroke="#fff" stroke-opacity=".5" stroke-width="2" transform="translate(300 300) scale(.975) translate(-300 -300)"');
      o += '<path d="M300 114V238M206 256C250 276 350 276 394 256" fill="none" stroke="' + P.d3 + '" stroke-opacity=".55" stroke-width="1.8"/>';
      o += '<path d="M302 114V238M206 259C250 279 350 279 394 259" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>';
      o += rect(283, 152, 34, 78, 16, P.d3, ' opacity=".7"');
      o += rect(288, 158, 24, 66, 12, x.lin([[0, A.d2], [0.4, A.l1], [1, A.d2]], 0, 0, 1, 0));
      for (var i = 0; i < 9; i++) o += '<path d="M290 ' + (164 + i * 7) + 'H310" stroke="' + A.d3 + '" stroke-opacity=".5" stroke-width="1.3"/>';
      o += ell(262, 350, 34, 70, '#fff', ' opacity=".35" filter="' + x.blur(10) + '"');
      o += '<path d="M206 300C202 340 204 380 214 400" fill="none" stroke="' + P.d3 + '" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/>';
    } else {
      o += shadow(x, 304, 418, 205, 40);
      /* base skirt */
      var skirt = 'M110 392C108 420 170 440 300 442C420 444 492 422 490 394C470 410 410 420 300 418C190 416 128 408 110 392Z';
      var sk = pal(P.L > 0.6 ? darken(P.base, 0.42) : darken(P.base, 0.3));
      o += path(skirt, x.lin([[0, sk.l1], [1, sk.d2]], 0, 0, 0, 1));
      var body = 'M110 392C104 352 150 302 238 276C320 250 420 250 468 296C496 324 496 378 490 394C470 410 410 420 300 418C190 416 128 408 110 392Z';
      o += path(body, x.lin([[0, P.l1], [0.45, P.base], [1, P.d2]], 0, 0, 0, 1));
      o += path(body, x.lin([[0, '#000', 0.08], [0.2, '#000', 0], [0.75, '#fff', 0.05], [1, '#000', 0.2]], 0, 0, 1, 0));
      o += path(body, 'none', ' stroke="' + P.line + '" stroke-opacity=".4" stroke-width="1.4"');
      /* top/side split line */
      o += '<path d="M120 372C190 336 300 318 420 312C452 311 474 316 486 330" fill="none" stroke="' + P.d3 + '" stroke-opacity=".3" stroke-width="1.6"/>';
      o += '<path d="M122 375C190 340 300 322 420 316C452 315 474 320 486 334" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>';
      /* button split and wheel */
      o += '<path d="M140 346C180 318 214 300 250 290" fill="none" stroke="' + P.d3 + '" stroke-opacity=".45" stroke-width="1.6"/>';
      o += '<path d="M234 280C250 298 254 316 250 336" fill="none" stroke="' + P.d3 + '" stroke-opacity=".35" stroke-width="1.6"/>';
      o += ell(214, 300, 22, 8, P.d3, ' opacity=".6" transform="rotate(-24 214 300)"');
      o += ell(213, 297, 17, 6.5, x.lin([[0, A.l1], [1, A.d2]], 0, 0, 0, 1), ' transform="rotate(-24 213 297)"');
      /* thumb buttons */
      o += rect(250, 352, 52, 12, 6, P.d1, ' stroke="' + P.d3 + '" stroke-opacity=".35" transform="rotate(-6 276 358)"');
      o += rect(310, 346, 52, 12, 6, P.d1, ' stroke="' + P.d3 + '" stroke-opacity=".35" transform="rotate(-4 336 352)"');
      o += '<path d="M200 296C270 266 360 254 440 270" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round" filter="' + x.blur(5) + '"/>';
    }
    return o;
  };

  /* ---------------------------- keyboard --------------------------- */
  DEF.keyboard = { color: '#e9e7e2', accent: function (c) { return luma(c) > 0.55 ? mix(c, '#5d636c', 0.45) : mix(c, '#d8d4cc', 0.55); } };
  var KB_ROWS = [
    [[1, 'a'], 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, [2, 'm'], [1, 'm']],
    [[1.5, 'm'], 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, [1.5, 'm'], [1, 'm']],
    [[1.75, 'm'], 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, [2.25, 'a'], [1, 'm']],
    [[2.25, 'm'], 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, [1.75, 'm'], [1, 'm'], [1, 'm']],
    [[1.25, 'm'], [1.25, 'm'], [1.25, 'm'], [6.25, 'k'], [1, 'm'], [1, 'm'], [1, 'm'], [1, 'm'], [1, 'm']]
  ];
  T.keyboard = function (x, P, A, view) {
    var o = '';
    var front = view !== 'angle';
    var cam = front ? Cam({ yaw: 0, pitch: 52, s: 27.5, cx: 300, cy: 292, f: 40 })
      : Cam({ yaw: -26, pitch: 42, s: 24.5, cx: 300, cy: 292, f: 30 });
    var W = 16.7, D = 5.75, H0 = 0.7;
    var ox = -W / 2, oz = -D / 2;
    o += shadowFoot(x, cam, [[ox, 0, oz], [ox + W, 0, oz], [ox + W, 0, oz + D], [ox, 0, oz + D]], 0.9, front ? 0.98 : 0.8);
    var caseP = pal(darken(P.base, P.L > 0.7 ? 0.05 : 0));
    o += drawBox(x, cam, box3([ox, 0, oz], [W, 0, 0], [0, H0, 0], [0, 0, D]), caseP, 10).svg;
    /* plate */
    var pm = faceMap(cam, [ox, H0, oz], [1, 0, 0], [0, 0, 1]);
    o += path(rrLocal(pm, 0.3, 0.3, W - 0.6, D - 0.6, 0.12), caseP.d3, ' opacity=".75"');
    var kp = pal(P.L > 0.7 ? P.base : lighten(P.base, 0.04));
    for (var r = 0; r < 5; r++) {
      var xx = 0.35;
      var zz = 0.38 + r;
      KB_ROWS[r].forEach(function (k) {
        var w = typeof k === 'number' ? k : k[0];
        var kind = typeof k === 'number' ? 'k' : k[1];
        var Pk = kind === 'k' ? kp : kind === 'm' ? A : pal(mix(A.base, '#000', 0.12));
        var x0 = ox + xx + 0.05, x1 = ox + xx + w - 0.05, z0 = oz + zz + 0.04, z1 = oz + zz + 0.94;
        var t = 0.13, ht = H0 + 0.62, hb = H0 + 0.02;
        var c = {
          b0: [x0, hb, z0], b1: [x1, hb, z0], b2: [x1, hb, z1], b3: [x0, hb, z1],
          t0: [x0 + t, ht, z0 + t * 0.6], t1: [x1 - t, ht, z0 + t * 0.6], t2: [x1 - t, ht, z1 - t * 1.3], t3: [x0 + t, ht, z1 - t * 1.3]
        };
        var faces = [
          { pts: [c.b3, c.b2, c.t2, c.t3], n: vnorm([0, 0.3, 1]) },
          { pts: [c.b1, c.b2, c.t2, c.t1], n: vnorm([1, 0.3, 0]) },
          { pts: [c.b0, c.b3, c.t3, c.t0], n: vnorm([-1, 0.3, 0]) },
          { pts: [c.t0, c.t1, c.t2, c.t3], n: [0, 1, 0] }
        ];
        faces.forEach(function (f, i) {
          var nc = cam.rot(f.n);
          if (nc[2] <= 0.02) return;
          var col = lit(Pk, nc);
          if (i === 3) col = mix(col, Pk.base, 0.4);
          o += path(rpoly(f.pts.map(cam.p), i === 3 ? 3 : 1.5), col, i === 3 ? ' stroke="' + (Pk.L > 0.75 ? darken(col, 0.12) : lighten(col, 0.16)) + '" stroke-width=".8"' : '');
        });
        xx += w;
      });
    }
    /* sheen */
    o += path(poly([pm(0.2, 0.2), pm(6.5, 0.2), pm(2.0, D - 0.2), pm(0.2, D - 0.2)]), '#fff', ' opacity=".06"');
    return o;
  };

  /* ------------------------------ bulb ----------------------------- */
  DEF.bulb = { color: '#f3f2ee', accent: '#ffcf86' };
  function bulbBody(x, P, A, halo) {
    var o = '';
    var glow = A.base;
    if (halo) o += circ(300, 206, 190, x.rad([[0, glow, 0.5], [0.45, glow, 0.22], [1, glow, 0]], 0.5, 0.5, 0.5));
    /* screw base */
    o += path('M252 404H348L344 474H256Z', metal(x, true));
    for (var i = 0; i < 4; i++) {
      var y = 412 + i * 16;
      o += '<path d="M252 ' + y + 'Q300 ' + (y + 8) + ' 348 ' + (y - 4) + '" fill="none" stroke="#6e7278" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>';
      o += '<path d="M252 ' + (y - 3) + 'Q300 ' + (y + 5) + ' 348 ' + (y - 7) + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>';
    }
    o += path('M262 472H338L326 492H274Z', x.lin([[0, '#3a3b3e'], [0.4, '#1c1d1f'], [1, '#0e0f10']], 0, 0, 1, 0));
    o += rect(286, 490, 28, 9, 4, metal(x, true));
    /* housing */
    var hd = 'M236 330H364C362 360 356 388 350 408H250C244 388 238 360 236 330Z';
    o += path(hd, x.lin([[0, P.base], [1, P.d1]], 0, 0, 0, 1));
    o += path(hd, cylOverlay(x, 0.9));
    o += path(hd, 'none', ' stroke="' + P.line + '" stroke-opacity=".35" stroke-width="1.2"');
    for (var k = 0; k < 3; k++) o += '<path d="M' + (246 + k * 2) + ' ' + (372 + k * 10) + 'H' + (354 - k * 2) + '" stroke="' + P.d2 + '" stroke-opacity=".35" stroke-width="1.2"/>';
    /* glass */
    var gd = 'M226 306A118 118 0 1 1 374 306C368 316 364 324 364 334H236C236 324 232 316 226 306Z';
    o += path(gd, x.rad([[0, '#ffffff'], [0.55, mix('#ffffff', glow, 0.18)], [0.85, mix('#ece8e1', glow, 0.25)], [1, mix('#d9d4cb', glow, 0.25)]], 0.4, 0.34, 0.7));
    o += path(gd, x.rad([[0, glow, 0.55], [0.6, glow, 0.15], [1, glow, 0]], 0.5, 0.62, 0.55));
    o += path(gd, 'none', ' stroke="#c9c3b8" stroke-opacity=".75" stroke-width="1.5"');
    o += ell(250, 150, 42, 22, '#fff', ' opacity=".9" transform="rotate(-38 250 150)" filter="' + x.blur(6) + '"');
    o += rect(236, 326, 128, 8, 4, mix(P.base, '#000', 0.1), ' opacity=".5"');
    return o;
  }
  T.bulb = function (x, P, A, view) {
    var o = '';
    if (view !== 'angle') {
      o += shadow(x, 300, 498, 96, 16);
      o += '<g transform="translate(300 300) scale(.94) translate(-300 -300)">' + bulbBody(x, P, A, true) + '</g>';
    } else {
      o += ell(262, 290, 170, 150, x.rad([[0, A.base, 0.45], [1, A.base, 0]], 0.5, 0.5, 0.5));
      o += shadow(x, 330, 410, 200, 28);
      o += '<g transform="translate(300 300) rotate(-62) translate(-300 -300) translate(0 40)">' + bulbBody(x, P, A, false) + '</g>';
    }
    return o;
  };

  /* --------------------------- controller -------------------------- */
  DEF.controller = { color: '#ecebe7', accent: function (c) { return luma(c) > 0.6 ? '#4f535a' : '#cfd2d6'; } };
  var PAD_L = [[300, 205], [[270, 205], [240, 198], [205, 198]], [[160, 198], [128, 214], [116, 258]], [[102, 310], [92, 380], [102, 428]],
    [[110, 462], [160, 470], [184, 440]], [[204, 414], [220, 380], [252, 372]], [[275, 366], [290, 368], [300, 368]]];
  function padPath() {
    var d = 'M' + pt(PAD_L[0]);
    var i;
    for (i = 1; i < PAD_L.length; i++) d += 'C' + pt(PAD_L[i][0]) + ' ' + pt(PAD_L[i][1]) + ' ' + pt(PAD_L[i][2]);
    var m = function (p) { return [600 - p[0], p[1]]; };
    for (i = PAD_L.length - 1; i >= 1; i--) {
      var start = i === 1 ? PAD_L[0] : PAD_L[i - 1][2];
      d += 'C' + pt(m(PAD_L[i][1])) + ' ' + pt(m(PAD_L[i][0])) + ' ' + pt(m(start));
    }
    return d + 'Z';
  }
  function padTop(x, P, A) {
    var o = '', pd = padPath();
    var dark = pal(P.L > 0.5 ? '#3a3c41' : mix(P.base, '#000', 0.35));
    o += path(pd, x.rad([[0, P.l2], [0.35, P.l1], [0.75, P.base], [1, P.d2]], 0.45, 0.35, 0.7));
    o += path(pd, 'none', ' stroke="' + P.line + '" stroke-opacity=".45" stroke-width="1.5"');
    o += path(pd, 'none', ' stroke="#fff" stroke-opacity=".45" stroke-width="2" transform="translate(300 300) scale(.985) translate(-300 -298)"');
    /* dpad */
    o += circ(185, 280, 44, P.d1, ' opacity=".6"') + circ(185, 281, 44, 'none', ' stroke="#fff" stroke-opacity=".4"');
    var dp = 'M174 248h22v21h21v22h-21v21h-22v-21h-21v-22h21Z';
    o += path(dp, dark.d2, ' transform="translate(0 2)"');
    o += path(dp, x.lin([[0, dark.l1], [1, dark.base]], 0, 0, 1, 1), ' stroke="' + dark.l2 + '" stroke-opacity=".3"');
    /* face buttons */
    o += circ(415, 280, 52, P.d1, ' opacity=".6"') + circ(415, 281, 52, 'none', ' stroke="#fff" stroke-opacity=".4"');
    [[415, 250], [445, 280], [415, 310], [385, 280]].forEach(function (c) {
      o += circ(c[0], c[1] + 2, 14, A.d3, ' opacity=".6"');
      o += circ(c[0], c[1], 14, x.rad([[0, A.l2], [0.5, A.base], [1, A.d2]], 0.4, 0.35, 0.7));
    });
    /* center buttons */
    o += rect(254, 246, 22, 9, 4.5, dark.base) + rect(324, 246, 22, 9, 4.5, dark.base);
    o += circ(300, 300, 13, P.d2, ' opacity=".5"') + circ(300, 299, 11, x.rad([[0, P.l2], [1, P.d1]], 0.4, 0.35, 0.7));
    o += circ(300, 299, 5, A.base, ' opacity=".7"');
    o += '<path d="M240 214Q300 206 360 214" stroke="' + A.base + '" stroke-opacity=".5" stroke-width="3" stroke-linecap="round" fill="none"/>';
    return o;
  }
  function stick(x, P, cx, cy, noRecess) {
    var dark = pal(P.L > 0.5 ? '#3a3c41' : mix(P.base, '#000', 0.35));
    var o = noRecess ? '' : circ(cx, cy, 36, P.d2, ' opacity=".55"') + circ(cx, cy + 1, 36, 'none', ' stroke="#fff" stroke-opacity=".4"');
    o += circ(cx + 2, cy + 4, 27, dark.d3);
    o += circ(cx, cy, 27, x.rad([[0, dark.l2], [0.4, dark.l1], [0.8, dark.base], [1, dark.d2]], 0.4, 0.35, 0.7));
    o += circ(cx, cy, 19, 'none', ' stroke="' + dark.d2 + '" stroke-width="1.5"');
    o += circ(cx, cy, 16, x.rad([[0, dark.base], [1, dark.d1]], 0.5, 0.6, 0.6));
    return o;
  }
  T.controller = function (x, P, A, view) {
    var o = '';
    var pd = padPath();
    var dark = pal(P.L > 0.5 ? '#3a3c41' : mix(P.base, '#000', 0.35));
    var bumpers = rect(132, 186, 110, 30, 14, x.lin([[0, dark.l1], [1, dark.d1]], 0, 0, 0, 1)) + rect(358, 186, 110, 30, 14, x.lin([[0, dark.l1], [1, dark.d1]], 0, 0, 0, 1));
    if (view !== 'angle') {
      o += ell(306, 468, 200, 26, x.rad([[0, '#2b2620', 0.18], [1, '#2b2620', 0]], 0.5, 0.5, 0.5));
      o += path(pd, '#2b2620', ' opacity=".28" transform="translate(4 14)" filter="' + x.blur(10) + '"');
      o += '<g transform="translate(300 300) scale(1.08) translate(-300 -322)">';
      o += bumpers + padTop(x, P, A) + stick(x, P, 245, 340) + stick(x, P, 355, 340);
      o += '</g>';
    } else {
      var TR = 'translate(300 284) scale(1.06 .74) rotate(-9) translate(-300 -320)';
      o += shadow(x, 300, 410, 250, 52, 0.8);
      var side = darken(P.base, P.L > 0.6 ? 0.2 : 0.08);
      for (var i = 26; i > 0; i -= 2) o += '<g transform="translate(0 ' + i + ') ' + TR + '">' + path(pd, i > 14 ? darken(side, 0.1) : side) + '</g>';
      o += '<g transform="translate(0 2) ' + TR + '">' + bumpers + '</g>';
      o += '<g transform="' + TR + '">' + padTop(x, P, A) + '</g>';
      /* raised sticks */
      [[245, 340], [355, 340]].forEach(function (s) {
        o += '<g transform="' + TR + '">' + circ(s[0], s[1], 36, P.d2, ' opacity=".55"') + circ(s[0], s[1], 15, dark.d3) + '</g>';
        o += '<g transform="translate(0 -9) ' + TR + '">' + circ(s[0], s[1] + 8, 27, dark.d3) + stick(x, P, s[0], s[1], true) + '</g>';
      });
    }
    return o;
  };

  /* --------------------------- phonestand -------------------------- */
  DEF.phonestand = { color: '#c8cacd', accent: '#2a2b2e' };
  T.phonestand = function (x, P, A, view) {
    var o = '';
    var front = view !== 'angle';
    var cam = front ? Cam({ yaw: -72, pitch: 10, s: 92, cx: 300, cy: 300, f: 14 })
      : Cam({ yaw: -32, pitch: 16, s: 92, cx: 296, cy: 300, f: 14 });
    var sh = 1.35; /* vertical shift */
    var Y = function (v) { return [v[0], v[1] - sh - 0.6, v[2]]; };
    o += shadowFoot(x, cam, [Y([-1.05, 0, -1.55]), Y([1.05, 0, -1.55]), Y([1.05, 0, 0.95]), Y([-1.05, 0, 0.95])], 1, 1.02);
    var dir = vnorm([0, 0.94, -0.34]), nrm = [0, 0.34, 0.94];
    var B = [0, 0.78, -0.02];
    var draw = function (o3, u, v, w, PP, r) { return drawBox(x, cam, box3(Y(o3), u, v, w), PP, r == null ? 6 : r).svg; };
    /* base */
    o += draw([-1.05, 0, -1.55], [2.1, 0, 0], [0, 0.14, 0], [0, 0, 2.5], P, 10);
    /* lower arm from rear of base to hinge */
    var h1 = [0, 0.14, -1.2], h2 = vadd(B, vmul(dir, 0.95));
    var ad = vnorm(vsub(h2, h1));
    var an = vnorm(vcross([1, 0, 0], ad));
    o += draw(vsub([-0.55, h1[1], h1[2]], vmul(an, 0.06)), [1.1, 0, 0], vsub(h2, h1), vmul(an, 0.13), P, 5);
    /* hinge 1 */
    var hp = cam.p(Y([0.58, h1[1] + 0.05, h1[2]]));
    o += circ(hp[0], hp[1], 7, x.rad([[0, '#ffffff'], [1, P.d2]], 0.4, 0.4, 0.6));
    /* plate */
    var pl0 = vadd([-0.75, B[1], B[2]], vmul(nrm, -0.11));
    o += draw(pl0, [1.5, 0, 0], vmul(dir, 2.25), vmul(nrm, 0.11), P, 7);
    /* lip */
    o += draw(vadd([-0.75, B[1], B[2]], vmul(dir, -0.09)), [1.5, 0, 0], vmul(dir, 0.1), vmul(nrm, 0.3), P, 4);
    var hp2 = cam.p(Y([0.78, h2[1], h2[2] - 0.08]));
    o += circ(hp2[0], hp2[1], 8, x.rad([[0, '#ffffff'], [1, P.d2]], 0.4, 0.4, 0.6));
    /* phone */
    var phP = pal('#2a2b2f');
    var ph0 = vadd([-0.55, B[1], B[2]], vmul(dir, 0.01));
    o += draw(ph0, [1.1, 0, 0], vmul(dir, 2.35), vmul(nrm, 0.12), phP, 9);
    var sm = faceMap(cam, Y(vadd(ph0, vmul(nrm, 0.12))), [1, 0, 0], dir);
    if (cam.rot(nrm)[2] > 0) {
      o += path(rrLocal(sm, 0.05, 0.05, 1.0, 2.25, 0.1), x.lin([[0, '#3d4658'], [0.5, '#1a1e26'], [1, '#0e1014']], 0, 0, 1, 1));
      o += path(poly([sm(0.05, 2.3), sm(0.6, 2.3), sm(0.05, 1.2)]), '#fff', ' opacity=".09"');
    }
    return o;
  };

  /* ------------------------------ box ------------------------------ */
  DEF.box = { color: '#ebe6dd', accent: function (c) { return luma(c) > 0.55 ? darken(c, 0.28) : lighten(c, 0.3); } };
  T.box = function (x, P, A, view) {
    var o = '';
    var front = view !== 'angle';
    var cam = front ? Cam({ yaw: -14, pitch: 24, s: 108, cx: 300, cy: 300, f: 14 })
      : Cam({ yaw: -40, pitch: 26, s: 104, cx: 300, cy: 300, f: 14 });
    var W = 2.6, H = 1.05, D = 1.9, LID = 0.42;
    o += shadowFoot(x, cam, [[-W / 2, -0.55, -D / 2], [W / 2, -0.55, -D / 2], [W / 2, -0.55, D / 2], [-W / 2, -0.55, D / 2]]);
    var base = box3([-W / 2 + 0.02, -0.55, -D / 2 + 0.02], [W - 0.04, 0, 0], [0, H - 0.05, 0], [0, 0, D - 0.04]);
    o += drawBox(x, cam, base, P, 4).svg;
    var lidP = pal(lighten(P.base, 0.02));
    var lid = box3([-W / 2, -0.55 + H - LID, -D / 2], [W, 0, 0], [0, LID, 0], [0, 0, D]);
    o += drawBox(x, cam, lid, lidP, 4).svg;
    /* seam shadow under lid */
    var fm = faceMap(cam, [-W / 2, -0.55, D / 2], [1, 0, 0], [0, 1, 0]);
    o += '<path d="M' + pt(fm(0.02, H - LID - 0.012)) + 'L' + pt(fm(W - 0.02, H - LID - 0.012)) + '" stroke="#000" stroke-opacity=".18" stroke-width="2"/>';
    var rm = faceMap(cam, [W / 2, -0.55, D / 2], [0, 0, -1], [0, 1, 0]);
    if (!front || cam.rot([1, 0, 0])[2] > 0) o += '<path d="M' + pt(rm(0.01, H - LID - 0.012)) + 'L' + pt(rm(D - 0.02, H - LID - 0.012)) + '" stroke="#000" stroke-opacity=".18" stroke-width="2"/>';
    if (!front) {
      /* accent sleeve band around lid+base */
      var bw = 0.5, bx = -bw / 2 + 0.55;
      var sf = faceMap(cam, [bx, -0.56, D / 2 + 0.006], [1, 0, 0], [0, 1, 0]);
      var tf = faceMap(cam, [bx, -0.55 + H + 0.006, D / 2], [1, 0, 0], [0, 0, -1]);
      o += path(poly([sf(0, 0), sf(bw, 0), sf(bw, H + 0.012), sf(0, H + 0.012)]), lit(A, cam.rot([0, 0, 1])));
      o += path(poly([tf(0, 0), tf(bw, 0), tf(bw, D), tf(0, D)]), lit(A, cam.rot([0, 1, 0])));
    }
    /* embossed mark on lid top */
    var tm = faceMap(cam, [0, -0.55 + H + 0.004, 0], [1, 0, 0], [0, 0, -1]);
    var mx = front ? 0 : -0.45, my = 0;
    var emb = function (dx, dy, col, op) {
      var tr = ' transform="translate(' + dx + ' ' + dy + ')"';
      return path(circLocal(tm, mx, my, 0.17, 40) + circLocal(tm, mx, my, 0.13, 40), col, ' fill-rule="evenodd" opacity="' + op + '"' + tr) +
        path(poly([tm(mx - 0.05, my - 0.07), tm(mx + 0.07, my + 0.05), tm(mx + 0.04, my + 0.07), tm(mx - 0.07, my - 0.05)]), col, ' opacity="' + op + '"' + tr);
    };
    o += emb(0, 1, '#fff', 0.6) + emb(0, -0.6, '#000', 0.16);
    o += '<path d="M' + pt(tm(mx - 0.22, my - 0.32)) + 'L' + pt(tm(mx + 0.22, my - 0.32)) + '" stroke="#000" stroke-opacity=".12" stroke-width="2.2" stroke-linecap="round"/>';
    /* top sheen */
    o += path(poly([tm(-W / 2 + 0.05, D / 2 - 0.05), tm(-0.2, D / 2 - 0.05), tm(-W / 2 + 0.05, -0.2)]), '#fff', ' opacity=".18"');
    return o;
  };

  /* ------------------------------------------------------------------ */
  var TYPES = ['earbuds', 'headphones', 'speaker', 'powerbank', 'smartwatch', 'charger', 'cable', 'ringlight', 'cctv',
    'trimmer', 'minifan', 'mouse', 'keyboard', 'bulb', 'controller', 'phonestand', 'box'];

  /* per-type framing adjustments so every product fills ~60-75% of the box */
  var SCALE = { 'earbuds-front': 1.12, 'earbuds-angle': 1.05, 'speaker-front': 1.1, 'cable': 1.05 };

  function svg(type, opts) {
    opts = opts || {};
    if (!T[type]) type = 'box';
    var def = DEF[type];
    var color = parseHex(opts.color) ? '#' + String(opts.color).trim().replace(/^#/, '') : def.color;
    if (color.length === 4) color = toHex(parseHex(color));
    var accent = parseHex(opts.accent) ? toHex(parseHex(opts.accent)) : (typeof def.accent === 'function' ? def.accent(color) : def.accent);
    color = toHex(parseHex(color));
    var view = opts.view === 'angle' ? 'angle' : 'front';
    var uid = opts.uid != null && opts.uid !== '' ? String(opts.uid).replace(/[^A-Za-z0-9_-]/g, '_') : 'pa' + (++uidCounter);
    var x = new Ctx('pa-' + uid);
    var body = T[type](x, pal(color), pal(accent), view);
    var sc = SCALE[type + '-' + view] || SCALE[type];
    if (sc) body = '<g transform="translate(300 300) scale(' + sc + ') translate(-300 -300)">' + body + '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + type + '">' +
      '<defs>' + x.defs.join('') + '</defs>' + body + '</svg>';
  }

  root.ProductArt = {
    types: TYPES.slice(),
    defaults: (function () {
      var d = {};
      TYPES.forEach(function (t) { d[t] = { color: DEF[t].color, accent: typeof DEF[t].accent === 'function' ? DEF[t].accent(DEF[t].color) : DEF[t].accent }; });
      return d;
    })(),
    svg: svg
  };
})(typeof window !== 'undefined' ? window : this);
