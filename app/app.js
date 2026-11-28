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
  var view = [];          // filtered records {lat,lng,city,state,date,to,ts,status}
  var viewDirty = true;
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

  var map = L.map("map", { preferCanvas: true }).setView([39.5, -98.35], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // ---------------------------------------------------------- canvas layer
  var PointLayer = L.Layer.extend({
    onAdd: function (m) {
      this._map = m;
      var c = L.DomUtil.create("canvas", "rat-canvas");
      c.style.position = "absolute";
      c.style.pointerEvents = "none";
      m.getPanes().overlayPane.appendChild(c);
      this._canvas = c;
      m.on("moveend zoomend resize", this._reset, this);
      this._reset();
    },
    onRemove: function (m) {
      m.off("moveend zoomend resize", this._reset, this);
      L.DomUtil.remove(this._canvas);
    },
    _reset: function () { this.redraw(); },
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
      var topLeft = m.containerPointToLatLng([0, 0]);
      L.DomUtil.setPosition(c, m.latLngToLayerPoint(topLeft).subtract(m.getPixelOrigin()).add([0, 0]));
      // simpler & robust: pin canvas to container origin via layer point of (0,0) container point
      var pos = m.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(c, pos);
      drawPoints(c.getContext("2d"), size, dpr);
    },
  });
  var pointLayer = new PointLayer();
  pointLayer.addTo(map);

  function project(lat, lng, zoom, origin) {
    var scale = 256 * Math.pow(2, zoom);
    var x = ((lng + 180) / 360) * scale;
    var sin = Math.sin((lat * Math.PI) / 180);
    var y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    return [x - origin.x, y - origin.y];
  }

  function currentView() {
    if (!viewDirty) return view;
    view = [];
    var df = document.getElementById("dateFrom").value || "0000-01-01";
    var dt = document.getElementById("dateTo").value || "9999-12-31";
    Object.keys(selected).forEach(function (slug) {
      if (!selected[slug] || !loaded[slug]) return;
      var meta = cityBySlug[slug];
      var pts = loaded[slug];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (p[2] < df || p[2] > dt) continue;
        if (!isCitizenPoint(meta, p)) continue;
        view.push({
          lat: p[0], lng: p[1], date: p[2], to: p[3], ts: p[4], status: p[5],
          city: meta.city, state: meta.state, slug: slug,
        });
      }
    });
    viewDirty = false;
    renderSummary();
    return view;
  }

  function drawPoints(ctx, size, dpr) {
    var recs = currentView();
    var zoom = map.getZoom();
    var origin = map.getPixelOrigin();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    aggregates = null;
    drawnPts = null;
    var inView = [];
    var i, xy;
    for (i = 0; i < recs.length; i++) {
      xy = project(recs[i].lat, recs[i].lng, zoom, origin);
      if (xy[0] < -30 || xy[1] < -30 || xy[0] > size.x + 30 || xy[1] > size.y + 30) continue;
      inView.push([xy[0], xy[1], recs[i]]);
    }
    var status = document.getElementById("mapStatus");
    if (viewMode === "heat") {
      drawHeat(ctx, size, dpr, inView);
      status.textContent = inView.length.toLocaleString() +
        " complaints in view — density view. Switch to Points and zoom in for individual complaints.";
      return;
    }
    if (inView.length > 50000) {
      // aggregate into grid cells
      var cell = 16;
      var grid = {};
      for (i = 0; i < inView.length; i++) {
        var gx = Math.floor(inView[i][0] / cell), gy = Math.floor(inView[i][1] / cell);
        var key = gx + ":" + gy;
        var g = grid[key];
        if (!g) { g = grid[key] = { x: gx * cell + cell / 2, y: gy * cell + cell / 2, count: 0, lat: 0, lng: 0 }; }
        g.count++;
        g.lat += inView[i][2].lat;
        g.lng += inView[i][2].lng;
      }
      aggregates = Object.values(grid);
      aggregates.forEach(function (g) {
        g.lat /= g.count; g.lng /= g.count;
        var r = Math.max(3.5, Math.min(24, 3 + Math.sqrt(g.count) * 1.7));
        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(122,31,20,0.78)";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#f2b04a";
        ctx.stroke();
        if (r > 9) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(g.count >= 1000 ? Math.round(g.count / 100) / 10 + "k" : g.count, g.x, g.y + 3);
        }
      });
      status.textContent = inView.length.toLocaleString() + " complaints in view, aggregated into " +
        aggregates.length.toLocaleString() + " cells — zoom in to see individual points.";
    } else {
      drawnPts = inView;
      ctx.fillStyle = "rgba(212,61,42,0.55)";
      for (i = 0; i < inView.length; i++) {
        ctx.beginPath();
        ctx.arc(inView[i][0], inView[i][1], 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      status.textContent = inView.length.toLocaleString() + " complaints in view" +
        (recs.length !== inView.length ? " (" + recs.length.toLocaleString() + " in selection)" : "") +
        ". Click a point for details.";
    }
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
  function drawHeat(ctx, size, dpr, inView) {
    // bin points into a coarse grid, paint soft blobs by density on an
    // offscreen intensity canvas, then colorize by alpha -> heat palette
    var cell = 10;
    var grid = {};
    var maxC = 1;
    for (var i = 0; i < inView.length; i++) {
      var gx = Math.floor(inView[i][0] / cell), gy = Math.floor(inView[i][1] / cell);
      var key = gx + ":" + gy;
      var g = grid[key];
      if (!g) { g = grid[key] = { x: gx * cell + cell / 2, y: gy * cell + cell / 2, count: 0 }; }
      g.count++;
      if (g.count > maxC) maxC = g.count;
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
        loaded[slug] = pts;
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
    var byCity = {}, byType = {}, total = 0;
    view.forEach(function (r) {
      total++;
      byCity[r.city + ", " + r.state] = (byCity[r.city + ", " + r.state] || 0) + 1;
      byType[r.ts] = (byType[r.ts] || 0) + 1;
    });
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
    var recs = currentView();
    var lines = ["city,state,date,latitude,longitude,type_original,type_standard,status"];
    function esc(v) {
      v = String(v == null ? "" : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      lines.push([esc(r.city), esc(r.state), r.date, r.lat, r.lng, esc(r.to), esc(r.ts), esc(r.status)].join(","));
    }
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
