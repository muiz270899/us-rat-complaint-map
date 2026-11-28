/* US 311 Rat Complaint Map
 * Static app: reads ../data/summary.json + per-city point files produced by
 * pipeline/fetch.py. Points are [lat, lng, date, type_original, type_standard, status].
 * Rendering uses a custom canvas layer: individual dots when zoomed in,
 * grid aggregation when the visible selection is large, so 100k+ point
 * cities stay usable.
 */
(function () {
  "use strict";

  var DATA_BASES = ["../data/", "data/", "./data/"];
  var DATA_BASE = null;
  var summary = null;
  var cityBySlug = {};
  var loaded = {};        // slug -> points array
  var loading = {};       // slug -> true while fetching
  var selected = {};      // slug -> bool
  var viewDirty = true;   // selection/filters changed since stats were computed
  var aggregates = null;  // last drawn aggregate cells [{x,y,count,lat,lng}]
  var drawnPts = null;    // last drawn individual points [{x,y,rec}]
  var viewMode = "points"; // "points" | "heat"
  var citizenMode = false; // true: count/map resident-filed cases only

  // A point counts as citizen-filed when its city has no resident/proactive
  // split in the source data (all its categories are resident-filed 311
  // requests), or when its original city type is one of the resident types.
  function isCitizenPoint(meta, p) {
    if (!citizenMode) return true;
    if (!meta || !meta.resident || !meta.resident.citizen_types) return true;
    return meta.resident.citizen_types.indexOf(p[3]) >= 0;
  }
  function cityPulled(c) {
    return citizenMode && c.resident ? c.resident.citizen_pulled : c.pulled;
  }
  function cityGeocoded(c) {
    return citizenMode && c.resident ? c.resident.citizen_geocoded : c.geocoded;
  }

  var map = L.map("map", { preferCanvas: true, zoomControl: false }).setView([39.5, -98.35], 4);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // ---------------------------------------------------------- canvas layer
  var PointLayer = L.Layer.extend({
    onAdd: function (m) {
      this._map = m;
      var c = L.DomUtil.create("canvas", "rat-canvas leaflet-zoom-animated");
      c.style.position = "absolute";
      c.style.pointerEvents = "none";
      m.getPanes().overlayPane.appendChild(c);
      this._canvas = c;
      m.on("moveend zoomend resize", this._reset, this);
      m.on("zoomanim", this._animateZoom, this);
      m.on("zoom", this._onZoom, this);
      this._reset();
    },
    onRemove: function (m) {
      m.off("moveend zoomend resize", this._reset, this);
      m.off("zoomanim", this._animateZoom, this);
      m.off("zoom", this._onZoom, this);
      L.DomUtil.remove(this._canvas);
    },
    _reset: function () { this.redraw(); },
    // Scale the canvas with the same transform Leaflet applies to
    // its own layers, so the balls and their count labels grow/shrink
    // together with the map during a zoom instead of sitting still
    // and snapping at the end. Two paths lead here: "zoomanim" for
    // animated zooms (buttons/wheel — the CSS transition interpolates
    // to this target), and "zoom" for pinch zooms, where Leaflet
    // fires no zoomanim during the gesture but updates its state
    // continuously with fractional zooms. The drawn content is in
    // container points of the view it was drawn for; redraw() stores
    // that view's container-origin lat/lng, which must land on its
    // layer point in the target view, scaled about the canvas origin.
    // redraw() at zoomend replaces the transform with the exact
    // position again.
    _transformTo: function (center, zoom) {
      var m = this._map, c = this._canvas;
      if (!m || !c || !this._originLatLng) return;
      var scale = m.getZoomScale(zoom, this._drawZoom);
      var offset = m.project(this._originLatLng, zoom)
        .subtract(m._getNewPixelOrigin(center, zoom));
      L.DomUtil.setTransform(c, offset, scale);
    },
    _animateZoom: function (e) { this._transformTo(e.center, e.zoom); },
    _onZoom: function () {
      var m = this._map;
      if (m) this._transformTo(m.getCenter(), m.getZoom());
    },
    redraw: function () {
      var m = this._map;
      if (!m || !this._canvas) return;
      var size = m.getSize();
      var dpr = window.devicePixelRatio || 1;
      var c = this._canvas;
      c.width = size.x * dpr;
      c.height = size.y * dpr;
      c.style.width = size.x + "px";
      c.style.height = size.y + "px";
      // Pin the canvas to the layer point of the container's top-left
      // corner. drawPoints() draws in coordinates relative to this same
      // point, so canvas position and drawing can never drift apart
      // when Leaflet re-bases the panes after a pan.
      var pos = m.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(c, pos);
      this._originLatLng = m.containerPointToLatLng([0, 0]);
      this._drawZoom = m.getZoom();
      drawPoints(c.getContext("2d"), size, dpr);
    },
  });
  var pointLayer = new PointLayer();
  pointLayer.addTo(map);

  // ---------------------------------------------------------- point index
  // Each city's points are indexed once at load into spatial leaf cells
  // over Web-Mercator world-fraction coordinates. A redraw only touches
  // cells intersecting the current view, so panning and zooming stay
  // fast even with millions of points loaded. (The previous design
  // rebuilt an array of record objects for the whole selection and
  // re-iterated it with per-point allocations on every redraw, which
  // made zooming stutter badly on phones.) Inside a cell, point indices
  // are grouped citizen-filed first (for cities with a resident split)
  // and date-sorted within each group, so any filter combination
  // resolves to at most two contiguous ranges per cell.
  var CELL_MAX = 2500;

  function dateNum(s) { // "YYYY-MM-DD" -> YYYYMMDD number (0 when empty)
    if (!s) return 0;
    return (+s.slice(0, 4)) * 10000 + (+s.slice(5, 7)) * 100 + (+s.slice(8, 10));
  }
  function wyOf(lat) {
    var s = Math.sin((lat * Math.PI) / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  }

  function buildIndex(slug, pts) {
    var meta = cityBySlug[slug] || {};
    var n = pts.length;
    var wx = new Float32Array(n), wy = new Float32Array(n);
    var dnum = new Uint32Array(n), cit = new Uint8Array(n);
    var sumLat = 0, sumLng = 0, i, p;
    for (i = 0; i < n; i++) {
      p = pts[i];
      wx[i] = (p[1] + 180) / 360;
      wy[i] = wyOf(p[0]);
      dnum[i] = dateNum(p[2]);
      cit[i] = isCitizenPoint(meta, p) ? 1 : 0;
      sumLat += p[0]; sumLng += p[1];
    }
    var cells = [];
    var all = new Uint32Array(n);
    for (i = 0; i < n; i++) all[i] = i;
    split(all, 0);
    function split(idxs, depth) {
      if (idxs.length <= CELL_MAX || depth >= 14) { cells.push(makeCell(idxs)); return; }
      var mnx = 1, mxx = -1, mny = 1, mxy = -1, j, v;
      for (j = 0; j < idxs.length; j++) {
        v = wx[idxs[j]]; if (v < mnx) mnx = v; if (v > mxx) mxx = v;
        v = wy[idxs[j]]; if (v < mny) mny = v; if (v > mxy) mxy = v;
      }
      var alongX = (mxx - mnx) >= (mxy - mny);
      var mid = alongX ? (mnx + mxx) / 2 : (mny + mxy) / 2;
      var lo = [], hi = [];
      for (j = 0; j < idxs.length; j++) {
        if ((alongX ? wx[idxs[j]] : wy[idxs[j]]) < mid) lo.push(idxs[j]); else hi.push(idxs[j]);
      }
      if (!lo.length || !hi.length) { cells.push(makeCell(idxs)); return; }
      split(Uint32Array.from(lo), depth + 1);
      split(Uint32Array.from(hi), depth + 1);
    }
    function makeCell(idxs) {
      var arr = Array.prototype.slice.call(idxs);
      arr.sort(function (a, b) { return (cit[b] - cit[a]) || (dnum[a] - dnum[b]); });
      var u = Uint32Array.from(arr);
      var cEnd = 0;
      while (cEnd < u.length && cit[u[cEnd]]) cEnd++;
      var sLat = 0, sLng = 0, csLat = 0, csLng = 0;
      var mnx = 1, mxx = -1, mny = 1, mxy = -1, j, k;
      for (j = 0; j < u.length; j++) {
        k = u[j];
        sLat += pts[k][0]; sLng += pts[k][1];
        if (j < cEnd) { csLat += pts[k][0]; csLng += pts[k][1]; }
        if (wx[k] < mnx) mnx = wx[k]; if (wx[k] > mxx) mxx = wx[k];
        if (wy[k] < mny) mny = wy[k]; if (wy[k] > mxy) mxy = wy[k];
      }
      return { idx: u, x0: mnx, x1: mxx, y0: mny, y1: mxy, count: u.length,
        sumLat: sLat, sumLng: sLng, cEnd: cEnd, cSumLat: csLat, cSumLng: csLng };
    }
    return { meta: meta, pts: pts, wx: wx, wy: wy, dnum: dnum, cells: cells,
      centroid: n ? [sumLat / n, sumLng / n] : null };
  }

  function filterRange() {
    var dt = document.getElementById("dateTo").value;
    return [dateNum(document.getElementById("dateFrom").value), dt ? dateNum(dt) : 99999999];
  }
  function groupSlice(ix, cell, a, b, dfN, dtN) {
    var lo = a, hi = b, mid;
    while (lo < hi) { mid = (lo + hi) >> 1; if (ix.dnum[cell.idx[mid]] < dfN) lo = mid + 1; else hi = mid; }
    var start = lo;
    lo = a; hi = b;
    while (lo < hi) { mid = (lo + hi) >> 1; if (ix.dnum[cell.idx[mid]] <= dtN) lo = mid + 1; else hi = mid; }
    return start < lo ? [start, lo] : null;
  }
  function cellRanges(ix, cell, dfN, dtN) {
    var out = [], r;
    r = groupSlice(ix, cell, 0, cell.cEnd, dfN, dtN); if (r) out.push(r);
    if (!citizenMode) { r = groupSlice(ix, cell, cell.cEnd, cell.count, dfN, dtN); if (r) out.push(r); }
    return out;
  }
  function rangeCount(ranges) {
    var c = 0, i;
    for (i = 0; i < ranges.length; i++) c += ranges[i][1] - ranges[i][0];
    return c;
  }
  // Precomputed cell statistics apply when the slice is the whole
  // active group (no date narrowing): [count, sumLat, sumLng] or null.
  function cellStats(cell, ranges) {
    if (ranges.length !== 1) return null;
    var r = ranges[0];
    if (!citizenMode && r[0] === 0 && r[1] === cell.count) return [cell.count, cell.sumLat, cell.sumLng];
    if (citizenMode && r[0] === 0 && r[1] === cell.cEnd && cell.cEnd > 0) return [cell.cEnd, cell.cSumLat, cell.cSumLng];
    return null;
  }
  function eachSelectedIndex(cb) {
    Object.keys(selected).forEach(function (slug) {
      if (selected[slug] && loaded[slug]) cb(slug, loaded[slug]);
    });
  }

  // ---------------------------------------------------------- selection stats
  var statsCache = null;
  function computeStats() {
    if (!viewDirty && statsCache) return statsCache;
    var fr = filterRange(), dfN = fr[0], dtN = fr[1];
    var byCity = {}, byType = {}, total = 0;
    eachSelectedIndex(function (slug, ix) {
      var cityCount = 0, ci, ri, i, cell, ranges;
      for (ci = 0; ci < ix.cells.length; ci++) {
        cell = ix.cells[ci];
        ranges = cellRanges(ix, cell, dfN, dtN);
        for (ri = 0; ri < ranges.length; ri++) {
          cityCount += ranges[ri][1] - ranges[ri][0];
          for (i = ranges[ri][0]; i < ranges[ri][1]; i++) {
            var ts = ix.pts[cell.idx[i]][4];
            byType[ts] = (byType[ts] || 0) + 1;
          }
        }
      }
      if (cityCount > 0) { byCity[ix.meta.city + ", " + ix.meta.state] = cityCount; total += cityCount; }
    });
    statsCache = { byCity: byCity, byType: byType, total: total };
    viewDirty = false;
    renderSummary();
    return statsCache;
  }
  // Iterate every record in the current selection+filters (CSV export).
  function eachSelectedRecord(cb) {
    var fr = filterRange(), dfN = fr[0], dtN = fr[1];
    eachSelectedIndex(function (slug, ix) {
      var ci, ri, i, cell, ranges, p;
      for (ci = 0; ci < ix.cells.length; ci++) {
        cell = ix.cells[ci];
        ranges = cellRanges(ix, cell, dfN, dtN);
        for (ri = 0; ri < ranges.length; ri++) {
          for (i = ranges[ri][0]; i < ranges[ri][1]; i++) {
            p = ix.pts[cell.idx[i]];
            cb({ lat: p[0], lng: p[1], date: p[2], to: p[3], ts: p[4], status: p[5],
                 city: ix.meta.city, state: ix.meta.state, slug: slug });
          }
        }
      }
    });
  }

  function drawPoints(ctx, size, dpr) {
    if (viewDirty) computeStats();
    // One affine projection calibrated per redraw from Leaflet itself:
    // canvas coordinates are container points (the canvas is pinned to
    // the layer point of the container's top-left corner, see redraw()),
    // and container points are an affine function of world-fraction
    // coordinates, anchored at lat/lng (0, 0) = world fraction (0.5, 0.5).
    var scale = 256 * Math.pow(2, map.getZoom());
    var anchor = map.latLngToContainerPoint([0, 0]);
    function projX(wx) { return anchor.x + (wx - 0.5) * scale; }
    function projY(wy) { return anchor.y + (wy - 0.5) * scale; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    aggregates = null;
    drawnPts = null;

    var b = map.getBounds();
    var vx0 = (b.getWest() + 180) / 360, vx1 = (b.getEast() + 180) / 360;
    if (vx1 < vx0) { vx0 = 0; vx1 = 1; }
    var vy0 = wyOf(b.getNorth()), vy1 = wyOf(b.getSouth());
    var fr = filterRange(), dfN = fr[0], dtN = fr[1];
    var cellList = [], totalVis = 0, perCity = {};
    eachSelectedIndex(function (slug, ix) {
      var ci, cell, ranges, cnt;
      for (ci = 0; ci < ix.cells.length; ci++) {
        cell = ix.cells[ci];
        if (cell.x1 < vx0 || cell.x0 > vx1 || cell.y1 < vy0 || cell.y0 > vy1) continue;
        ranges = cellRanges(ix, cell, dfN, dtN);
        cnt = rangeCount(ranges);
        if (!cnt) continue;
        cellList.push({ ix: ix, cell: cell, ranges: ranges, cnt: cnt });
        totalVis += cnt;
        perCity[slug] = (perCity[slug] || 0) + cnt;
      }
    });

    var status = document.getElementById("mapStatus");
    if (viewMode === "heat") {
      drawHeat(ctx, size, dpr, cellList, projX, projY);
      status.textContent = totalVis.toLocaleString() +
        " complaints in view — density view. Switch to Points and zoom in for individual complaints.";
      drawCityLabels(ctx, size, perCity, projX, projY);
      return;
    }
    // Individual dots only where they can actually be told apart:
    // a sparse view at any zoom, or a street-level zoom (12+). A
    // city-level view holding thousands of complaints would otherwise
    // paint them as one solid pile of overlapping dots.
    var aggregate = totalVis > 50000 || (totalVis > 3000 && map.getZoom() < 12);
    if (aggregate) {
      // Google-Maps-style clustering: complaints within a ~48px
      // screen cell merge into ONE ball placed at the complaints'
      // own average location (not the cell's centre). Cluster
      // centres are therefore at least a cell apart, so the balls —
      // capped below the cell size — sit side by side instead of
      // piling over each other. Leaf cells that are small on screen
      // contribute their precomputed statistics without iterating
      // their points.
      var GRID = 48;
      var grid = {};
      function addToGrid(x, y, cnt, sLat, sLng) {
        var gx = Math.floor(x / GRID), gy = Math.floor(y / GRID);
        var key = (gx + 64) * 8192 + (gy + 64);
        var g = grid[key];
        if (!g) { g = grid[key] = { x: 0, y: 0, count: 0, lat: 0, lng: 0 }; }
        g.count += cnt; g.lat += sLat; g.lng += sLng;
      }
      var i, j, k, e, st, idx, cx, cy;
      for (i = 0; i < cellList.length; i++) {
        e = cellList[i];
        st = cellStats(e.cell, e.ranges);
        if (st && (e.cell.x1 - e.cell.x0) * scale <= 18) {
          addToGrid(projX((e.cell.x0 + e.cell.x1) / 2), projY((e.cell.y0 + e.cell.y1) / 2), st[0], st[1], st[2]);
          continue;
        }
        for (j = 0; j < e.ranges.length; j++) {
          for (k = e.ranges[j][0]; k < e.ranges[j][1]; k++) {
            idx = e.cell.idx[k];
            cx = projX(e.ix.wx[idx]); cy = projY(e.ix.wy[idx]);
            if (cx < -30 || cy < -30 || cx > size.x + 30 || cy > size.y + 30) continue;
            addToGrid(cx, cy, 1, e.ix.pts[idx][0], e.ix.pts[idx][1]);
          }
        }
      }
      aggregates = Object.values(grid);
      var maxCell = 0;
      aggregates.forEach(function (g) { if (g.count > maxCell) maxCell = g.count; });
      aggregates.forEach(function (g) {
        g.lat /= g.count; g.lng /= g.count;
        // The ball sits at the cluster's own centroid — the average
        // location of its complaints — and its radius stays in a
        // narrow band (12–18px) scaled by the largest cluster in
        // view, so neighbouring clusters touch at most.
        g.x = projX((g.lng + 180) / 360);
        g.y = projY(wyOf(g.lat));
        var r = 12 + 6 * Math.sqrt(g.count / maxCell);
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(122,31,20,0.85)";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#f2b04a";
        ctx.stroke();
        var label = g.count >= 1000 ? Math.round(g.count / 100) / 10 + "k" : "" + g.count;
        ctx.font = "bold 9px sans-serif";
        if (g.count >= 10 && ctx.measureText(label).width <= r * 2 - 5) {
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(label, g.x, g.y + 3);
        }
      });
      status.textContent = totalVis.toLocaleString() + " complaints in view, aggregated into " +
        aggregates.length.toLocaleString() + " cells — zoom in to see individual points.";
    } else {
      drawnPts = [];
      ctx.fillStyle = "rgba(212,61,42,0.55)";
      var i2, j2, k2, e2, idx2, x2, y2, p2;
      for (i2 = 0; i2 < cellList.length; i2++) {
        e2 = cellList[i2];
        for (j2 = 0; j2 < e2.ranges.length; j2++) {
          for (k2 = e2.ranges[j2][0]; k2 < e2.ranges[j2][1]; k2++) {
            idx2 = e2.cell.idx[k2];
            x2 = projX(e2.ix.wx[idx2]); y2 = projY(e2.ix.wy[idx2]);
            if (x2 < -30 || y2 < -30 || x2 > size.x + 30 || y2 > size.y + 30) continue;
            p2 = e2.ix.pts[idx2];
            drawnPts.push([x2, y2, { lat: p2[0], lng: p2[1], date: p2[2], to: p2[3], ts: p2[4],
              status: p2[5], city: e2.ix.meta.city, state: e2.ix.meta.state, slug: e2.ix.meta.slug }]);
            ctx.beginPath();
            ctx.arc(x2, y2, 2.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      var selTotal = statsCache ? statsCache.total : totalVis;
      status.textContent = totalVis.toLocaleString() + " complaints in view" +
        (selTotal !== totalVis ? " (" + selTotal.toLocaleString() + " in selection)" : "") +
        ". Click a point for details.";
    }
    drawCityLabels(ctx, size, perCity, projX, projY);
  }

  // City name labels on the map itself (the basemap does not label
  // every jurisdiction at these zooms). Drawn at each selected city's
  // point centroid, largest first, skipping any label that would
  // overlap one already placed.
  function drawCityLabels(ctx, size, perCity, projX, projY) {
    if (map.getZoom() > 9) return;
    var items = [];
    Object.keys(perCity).forEach(function (slug) {
      var ix = loaded[slug];
      if (!ix || !ix.centroid || !perCity[slug]) return;
      var x = projX((ix.centroid[1] + 180) / 360);
      var y = projY(wyOf(ix.centroid[0])) + 30;
      if (x < -40 || y < -20 || x > size.x + 40 || y > size.y + 20) return;
      items.push({ name: ix.meta.city, x: x, y: y, cnt: perCity[slug] });
    });
    items.sort(function (a, b) { return b.cnt - a.cnt; });
    var placed = [];
    ctx.font = "600 10px sans-serif";
    ctx.textAlign = "center";
    items.forEach(function (it) {
      var w = ctx.measureText(it.name).width + 8, h = 13;
      it.x = Math.max(w / 2 + 2, Math.min(size.x - w / 2 - 2, it.x));
      var box = { x0: it.x - w / 2, y0: it.y - h, x1: it.x + w / 2, y1: it.y + 2 };
      for (var i = 0; i < placed.length; i++) {
        var q = placed[i];
        if (box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0) return;
      }
      placed.push(box);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,253,248,0.92)";
      ctx.strokeText(it.name, it.x, it.y);
      ctx.fillStyle = "#43382a";
      ctx.fillText(it.name, it.x, it.y);
    });
  }

  // ---------------------------------------------------------- heat view
  var HEAT_STOPS = [ // [alpha 0..1, r, g, b]
    [0.00, 0, 0, 0], [0.18, 43, 88, 184], [0.38, 34, 150, 160],
    [0.58, 74, 178, 84], [0.76, 250, 205, 60], [0.90, 238, 120, 40],
    [1.00, 196, 30, 20],
  ];
  function heatColor(a) {
    for (var i = 1; i < HEAT_STOPS.length; i++) {
      if (a <= HEAT_STOPS[i][0]) {
        var p = HEAT_STOPS[i - 1], q = HEAT_STOPS[i];
        var t = (a - p[0]) / (q[0] - p[0] || 1);
        return [Math.round(p[1] + (q[1] - p[1]) * t),
                Math.round(p[2] + (q[2] - p[2]) * t),
                Math.round(p[3] + (q[3] - p[3]) * t)];
      }
    }
    return [196, 30, 20];
  }
  function drawHeat(ctx, size, dpr, cellList, projX, projY) {
    // bin visible points into a coarse grid (leaf cells that are small
    // on screen contribute their precomputed counts at their centroid),
    // paint soft blobs by density on an offscreen intensity canvas,
    // then colorize by alpha -> heat palette
    var cell = 10;
    var grid = {};
    var maxC = 1;
    var scale = 256 * Math.pow(2, map.getZoom());
    function addHeat(x, y, cnt) {
      var gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      var key = (gx + 64) * 8192 + (gy + 64);
      var g = grid[key];
      if (!g) { g = grid[key] = { x: gx * cell + cell / 2, y: gy * cell + cell / 2, count: 0 }; }
      g.count += cnt;
      if (g.count > maxC) maxC = g.count;
    }
    for (var i = 0; i < cellList.length; i++) {
      var e = cellList[i];
      var st = cellStats(e.cell, e.ranges);
      if (st && (e.cell.x1 - e.cell.x0) * scale <= 12) {
        addHeat(projX((e.cell.x0 + e.cell.x1) / 2), projY((e.cell.y0 + e.cell.y1) / 2), st[0]);
        continue;
      }
      for (var j = 0; j < e.ranges.length; j++) {
        for (var k = e.ranges[j][0]; k < e.ranges[j][1]; k++) {
          var idx = e.cell.idx[k];
          addHeat(projX(e.ix.wx[idx]), projY(e.ix.wy[idx]), 1);
        }
      }
    }
    var off = document.createElement("canvas");
    off.width = Math.max(1, size.x); off.height = Math.max(1, size.y);
    var octx = off.getContext("2d");
    octx.globalCompositeOperation = "lighter";
    Object.keys(grid).forEach(function (k) {
      var c = grid[k];
      var inten = Math.min(1, Math.log(1 + c.count) / Math.log(1 + maxC));
      var r = 16 + inten * 10;
      var grad = octx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
      grad.addColorStop(0, "rgba(0,0,0," + (0.16 + 0.5 * inten) + ")");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = grad;
      octx.beginPath(); octx.arc(c.x, c.y, r, 0, Math.PI * 2); octx.fill();
    });
    var img = octx.getImageData(0, 0, off.width, off.height);
    var d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var a = d[p + 3] / 255;
      if (a <= 0.01) { d[p + 3] = 0; continue; }
      var col = heatColor(a);
      d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2];
      d[p + 3] = Math.min(235, d[p + 3] + 40);
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, size.x, size.y);
  }

  map.on("click", function (e) {
    if (viewMode === "heat") return;
    var pt = e.containerPoint;
    var i, dx, dy;
    if (aggregates) {
      for (i = 0; i < aggregates.length; i++) {
        dx = aggregates[i].x - pt.x; dy = aggregates[i].y - pt.y;
        if (dx * dx + dy * dy < 26 * 26) {
          L.popup().setLatLng([aggregates[i].lat, aggregates[i].lng])
            .setContent("<b>" + aggregates[i].count.toLocaleString() + " complaints</b> in this area.<br>Zoom in to see individual complaints.")
            .openOn(map);
          return;
        }
      }
      return;
    }
    if (!drawnPts) return;
    var best = null, bestD = 9 * 9;
    for (i = 0; i < drawnPts.length; i++) {
      dx = drawnPts[i][0] - pt.x; dy = drawnPts[i][1] - pt.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = drawnPts[i][2]; }
    }
    if (best) {
      L.popup().setLatLng([best.lat, best.lng])
        .setContent(
          "<b>" + best.city + ", " + best.state + "</b><br>" +
          "Date: " + best.date + "<br>" +
          "Type (city's own): " + escapeHtml(best.to) + "<br>" +
          "Type (standardized): " + escapeHtml(best.ts) + "<br>" +
          "Status: " + escapeHtml(best.status || "—"))
        .openOn(map);
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  // ---------------------------------------------------------- UI building
  function fmt(n) { return (n || 0).toLocaleString(); }

  function renderCityList() {
    var el = document.getElementById("cityList");
    el.innerHTML = "";
    summary.cities.filter(function (c) { return !c.error; }).forEach(function (c) {
      var row = document.createElement("label");
      row.className = "city-item";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!selected[c.slug];
      cb.addEventListener("change", function () {
        selected[c.slug] = cb.checked;
        viewDirty = true;
        ensureLoaded(c.slug, row.querySelector(".ld"));
        pointLayer.redraw();
      });
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = c.city + ", " + c.state;
      var sub = document.createElement("span");
      sub.className = "sub";
      if (citizenMode && c.resident) {
        sub.textContent = fmt(c.resident.citizen_pulled) + " citizen-filed · " +
          fmt(c.resident.citizen_geocoded) + " mapped (of " + fmt(c.pulled) +
          " total records incl. proactive city work)";
      } else if (c.geocoded > 0) {
        sub.textContent = fmt(c.pulled) + " pulled · " + fmt(c.geocoded) + " mapped" +
          (c.missing_coords > 0 ? " · " + fmt(c.missing_coords) + " no coords" : "");
      } else {
        sub.textContent = fmt(c.pulled) + " pulled · source publishes no coordinates (CSV only)";
      }
      nm.appendChild(sub);
      var ct = document.createElement("span");
      ct.className = "ct";
      ct.textContent = fmt(c.geocoded);
      var ld = document.createElement("span");
      ld.className = "ld";
      row.appendChild(cb); row.appendChild(nm); row.appendChild(ct); row.appendChild(ld);
      el.appendChild(row);
      if (selected[c.slug]) ensureLoaded(c.slug, ld);
    });
  }

  function ensureLoaded(slug, ldEl) {
    if (loaded[slug] || loading[slug]) { if (loaded[slug]) pointLayer.redraw(); return; }
    loading[slug] = true;
    if (ldEl) ldEl.textContent = "loading…";
    var meta = cityBySlug[slug] || {};
    var files = meta.points_files
      ? meta.points_files.map(function (f) { return f.file; })
      : [meta.points_file || (slug + ".json")];
    Promise.all(files.map(function (f) {
      return fetch(DATA_BASE + f).then(function (r) { return r.json(); });
    })).then(function (parts) {
        var pts = [];
        parts.forEach(function (part) { pts = pts.concat(part); });
        loaded[slug] = buildIndex(slug, pts);
        loading[slug] = false;
        viewDirty = true;
        if (ldEl) ldEl.textContent = "";
        pointLayer.redraw();
      })
      .catch(function () {
        loading[slug] = false;
        if (ldEl) ldEl.textContent = "failed to load";
      });
  }

  function renderSummary() {
    var st = statsCache || { byCity: {}, byType: {}, total: 0 };
    var byCity = st.byCity, byType = st.byType, total = st.total;
    document.getElementById("selSummary").textContent =
      fmt(total) + (citizenMode ? " citizen-filed complaints selected"
                                : " complaints selected");
    document.getElementById("byCity").innerHTML = miniTable(byCity, total);
    document.getElementById("byType").innerHTML = miniTable(byType, total);
  }

  function miniTable(obj, total) {
    var keys = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; });
    if (!keys.length) return "<p class='hint'>Nothing selected.</p>";
    var max = obj[keys[0]];
    var h = "<table class='mini'>";
    keys.slice(0, 30).forEach(function (k) {
      h += "<tr><td>" + escapeHtml(k) + "</td><td>" + fmt(obj[k]) + "</td></tr>" +
        "<tr><td colspan='2'><div class='bar'><div style='width:" +
        Math.max(1.5, (obj[k] / max) * 100) + "%'></div></div></td></tr>";
    });
    return h + "</table>";
  }

  function renderCompare() {
    var el = document.getElementById("compareTable");
    var cities = summary.cities.filter(function (c) { return !c.error; })
      .slice().sort(function (a, b) { return b.pulled - a.pulled; });
    var h = "<table class='compare'><thead><tr><th>Jurisdiction</th><th>Records</th>" +
      "<th>Mapped</th><th>% mapped</th><th>No coords</th><th>Resident-filed</th>" +
      "<th>Years</th><th>Per 100k</th></tr></thead><tbody>";
    cities.forEach(function (c) {
      var per = c.population_2020_census
        ? Math.round((c.pulled / c.population_2020_census) * 100000).toLocaleString()
        : "—";
      var pct = c.pulled > 0 ? (100 * c.geocoded / c.pulled).toFixed(1) + "%" : "—";
      var res = c.resident ? fmt(c.resident.citizen_pulled) : "—";
      var years = (c.date_min || "?").slice(0, 4) + "–" + (c.date_max || "?").slice(0, 4);
      h += "<tr><td>" + escapeHtml(c.city) + ", " + c.state + "</td>" +
        "<td>" + fmt(c.pulled) + "</td><td>" + fmt(c.geocoded) + "</td>" +
        "<td>" + pct + "</td>" +
        "<td>" + fmt(c.missing_coords) + "</td>" +
        "<td>" + res + "</td>" +
        "<td class='dates'>" + years + "</td>" +
        "<td>" + per + "</td></tr>";
    });
    el.innerHTML = h + "</tbody></table>";
  }

  function renderTrends() {
    var el = document.getElementById("trends");
    var cities = summary.cities.filter(function (c) { return !c.error && c.by_year; })
      .slice().sort(function (a, b) { return b.pulled - a.pulled; });
    var h = "";
    cities.forEach(function (c) {
      var years = Object.keys(c.by_year).sort();
      if (years.length < 2) return;
      var max = 0, peak = years[0];
      years.forEach(function (y) { if (c.by_year[y] > max) { max = c.by_year[y]; peak = y; } });
      var W = 262, H = 34, pts = [];
      years.forEach(function (y, i) {
        var x = years.length === 1 ? W / 2 : (i / (years.length - 1)) * (W - 4) + 2;
        var yy = H - 3 - (c.by_year[y] / max) * (H - 8);
        pts.push(x.toFixed(1) + "," + yy.toFixed(1));
      });
      h += "<div class='trend-row'><div class='trend-head'><span>" +
        escapeHtml(c.city) + ", " + c.state + "</span><span class='trend-peak'>peak " +
        peak + ": " + fmt(max) + "</span></div>" +
        "<svg viewBox='0 0 " + W + " " + H + "' preserveAspectRatio='none' class='spark'>" +
        "<polyline points='" + pts.join(" ") + "' fill='none' stroke='#b23a2e' stroke-width='1.6'/>" +
        "</svg><div class='trend-years'><span>" + years[0] + "</span><span>" +
        years[years.length - 1] + "</span></div></div>";
    });
    el.innerHTML = h || "<p class='hint'>No trend data.</p>";
  }

  function renderAbout() {
    var el = document.getElementById("aboutData");
    var fetched = summary.generated_utc ? summary.generated_utc.slice(0, 10) : "unknown";
    var h = "<span class='fetched-note'>Data last fetched: " + fetched + "</span>" +
      "<p class='hint'>Every record comes straight from an official municipal 311 open-data API " +
      "(Socrata, CKAN, ArcGIS) — no scraping, no third-party resellers. The fetch pipeline is " +
      "re-runnable end-to-end from a clean checkout; see the repository README for the " +
      "methodology, cleaning rules and per-city coverage.</p>" +
      "<p class='hint'><strong>Full coverage documentation:</strong> " +
      "<a href='../COVERAGE.md' target='_blank' rel='noopener'>COVERAGE.md</a> lists, " +
      "for every jurisdiction, the source dataset, the exact category filter used, the date " +
      "range, and the pulled vs mapped counts — including how Baltimore's resident-filed " +
      "cases are separated from its proactive Rat Rubout rounds.</p><h3>Sources</h3><ul class='sources'>";
    summary.cities.filter(function (c) { return !c.error; }).forEach(function (c) {
      h += "<li><a href='" + c.source_url + "' target='_blank' rel='noopener'>" +
        escapeHtml(c.city) + ", " + c.state + "</a> — " + escapeHtml(c.source_name || "") +
        "<br><span class='filter-note'>Filter: " + escapeHtml(c.filter || "") + "</span></li>";
    });
    el.innerHTML = h + "</ul>";
  }

  function renderFullCsvLinks() {
    var el = document.getElementById("fullCsv");
    var h = "<h3>Full consolidated CSVs (all records, incl. non-geocoded)</h3>";
    summary.cities.filter(function (c) { return !c.error; }).forEach(function (c) {
      (c.csv_files || []).forEach(function (f) {
        h += "<a href='" + DATA_BASE + f.file + "'>" + c.city + ", " + c.state +
          " — " + f.file.split("/").pop() + " (" + fmt(f.rows) + " rows, " +
          (f.bytes / 1048576).toFixed(1) + " MB)</a>";
      });
    });
    el.innerHTML = h;
  }

  // ---------------------------------------------------------- CSV export
  document.getElementById("btnCsv").addEventListener("click", function () {
    var lines = ["city,state,date,latitude,longitude,type_original,type_standard,status"];
    function esc(v) {
      v = String(v == null ? "" : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    eachSelectedRecord(function (r) {
      lines.push([esc(r.city), esc(r.state), r.date, r.lat, r.lng, esc(r.to), esc(r.ts), esc(r.status)].join(","));
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rat-complaints-selection.csv";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  });

  function renderHeadStats() {
    if (!summary) return;
    var mapped = citizenMode && summary.total_citizen_geocoded != null
      ? summary.total_citizen_geocoded : summary.total_geocoded;
    var pulled = citizenMode && summary.total_citizen_pulled != null
      ? summary.total_citizen_pulled : summary.total_pulled;
    document.getElementById("headStats").innerHTML =
      "<span class='chip'><b>" + fmt(summary.city_count) + "</b> jurisdictions</span>" +
      "<span class='chip'><b>" + fmt(mapped) + "</b> complaints mapped" +
      (citizenMode ? " (citizen-filed)" : "") + "</span>" +
      "<span class='chip'><b>" + fmt(pulled) + "</b> records" +
      (citizenMode ? " (citizen-filed)" : " pulled") + "</span>" +
      "<span class='chip'>" + (summary.date_min_all || "?") + " &rarr; " +
      (summary.date_max_all || "?") + "</span>";
    var note = document.getElementById("modeNote");
    var balt = cityBySlug["baltimore"];
    if (citizenMode && balt && balt.resident) {
      note.hidden = false;
      note.innerHTML = "Citizen reports only is <b>on</b>. Baltimore now counts " +
        fmt(balt.resident.citizen_pulled) + " resident-filed cases instead of " +
        fmt(balt.pulled) + " total records — the difference is " +
        fmt(balt.resident.proactive_pulled) + " proactive Rat Rubout rounds " +
        "logged by the city itself, plus a small number of alley-concern cases.";
    } else {
      note.hidden = true;
      note.innerHTML = "";
    }
  }

  // ---------------------------------------------------------- controls
  document.getElementById("citizenToggle").addEventListener("change", function () {
    citizenMode = this.checked;
    viewDirty = true;
    renderHeadStats();
    renderCityList();
    pointLayer.redraw();
  });
  function setAllCities(mode) {
    var cities = summary.cities.filter(function (c) { return !c.error; });
    cities.forEach(function (c, i) {
      selected[c.slug] = mode === "all" ? true : mode === "top" ? i < 5 : false;
    });
    viewDirty = true;
    renderCityList();
    pointLayer.redraw();
  }
  document.getElementById("btnAllCities").addEventListener("click", function () { setAllCities("all"); });
  document.getElementById("btnTopCities").addEventListener("click", function () { setAllCities("top"); });
  document.getElementById("btnNoCities").addEventListener("click", function () { setAllCities("none"); });
  ["dateFrom", "dateTo"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", function () {
      viewDirty = true; pointLayer.redraw();
    });
  });
  function setViewMode(mode) {
    viewMode = mode;
    document.getElementById("btnViewPoints").classList.toggle("active", mode === "points");
    document.getElementById("btnViewHeat").classList.toggle("active", mode === "heat");
    document.getElementById("legendPoints").hidden = mode !== "points";
    document.getElementById("legendHeat").hidden = mode !== "heat";
    pointLayer.redraw();
  }
  document.getElementById("btnViewPoints").addEventListener("click", function () { setViewMode("points"); });
  document.getElementById("btnViewHeat").addEventListener("click", function () { setViewMode("heat"); });
  document.getElementById("btnAllDates").addEventListener("click", function () {
    document.getElementById("dateFrom").value = summary.date_min_all || "";
    document.getElementById("dateTo").value = summary.date_max_all || "";
    viewDirty = true; pointLayer.redraw();
  });
  document.getElementById("btnLastYear").addEventListener("click", function () {
    var max = summary.date_max_all;
    if (!max) return;
    var d = new Date(max + "T00:00:00Z");
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    document.getElementById("dateFrom").value = d.toISOString().slice(0, 10);
    document.getElementById("dateTo").value = max;
    viewDirty = true; pointLayer.redraw();
  });

  // ---------------------------------------------------------- boot
  function boot(base) {
    return fetch(base + "summary.json").then(function (r) {
      if (!r.ok) throw new Error("no summary");
      return r.json();
    }).then(function (s) { DATA_BASE = base; return s; });
  }
  var chain = Promise.reject();
  DATA_BASES.forEach(function (b) { chain = chain.catch(function () { return boot(b); }); });
  chain.then(function (s) {
    summary = s;
    // deep link: ?citizen=1 starts in "Citizen reports only" mode
    try {
      if (new URLSearchParams(window.location.search).get("citizen") === "1") {
        citizenMode = true;
        document.getElementById("citizenToggle").checked = true;
      }
    } catch (e) { /* older browser: ignore */ }
    var dmin = null, dmax = null;
    summary.cities.forEach(function (c) {
      cityBySlug[c.slug] = c;
      if (c.date_min && (!dmin || c.date_min < dmin)) dmin = c.date_min;
      if (c.date_max && (!dmax || c.date_max > dmax)) dmax = c.date_max;
    });
    summary.date_min_all = dmin;
    summary.date_max_all = dmax;
    renderHeadStats();
    var df = document.getElementById("dateFrom"), dt = document.getElementById("dateTo");
    df.min = dt.min = dmin; df.max = dt.max = dmax;
    df.value = dmin; dt.value = dmax;
    // default: top 5 cities, skipping any single city with >400k points so
    // the first paint stays fast (huge cities load on demand via checkbox)
    summary.cities.filter(function (c) { return !c.error && c.geocoded <= 400000; })
      .slice(0, 5).forEach(function (c) { selected[c.slug] = true; });
    renderCityList();
    renderCompare();
    renderTrends();
    renderAbout();
    renderFullCsvLinks();
    viewDirty = true;
    pointLayer.redraw();
  }).catch(function () {
    document.getElementById("mapStatus").textContent =
      "Could not load data/summary.json — serve this folder over HTTP (e.g. python3 -m http.server) or open via GitHub Pages.";
    document.getElementById("headStats").textContent = "Data failed to load.";
  });
})();
