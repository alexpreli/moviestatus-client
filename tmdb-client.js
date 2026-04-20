(function (global) {
  "use strict";

  function cfg() {
    return global.MOVIESTATUS_CONFIG || {};
  }

  function regionDefault() {
    return String(cfg().region || "US").toUpperCase();
  }

  function verifyApiRoot() {
    var root = String(cfg().searchVerifyBaseUrl || "").trim().replace(/\/$/, "");
    var isLocal = typeof location !== "undefined" && (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]");
    if (!root && isLocal) {
      var lp = Number(cfg().localServerPort) || 3000;
      root = "http://127.0.0.1:" + lp;
    }
    return root;
  }

  function tmdbProxy(endpoint, params) {
    var root = verifyApiRoot();
    var u = (root || "") + "/api/" + endpoint;
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    if (qs) u += (u.indexOf("?") === -1 ? "?" : "&") + qs;

    var headers = { "Accept": "application/json" };
    if (cfg().apiKey) headers["x-api-key"] = cfg().apiKey;

    return fetch(u, { headers: headers })
      .then(function (res) {
        if (!res.ok) throw new Error("Service unavailable.");
        return res.json();
      });
  }

  global.MovieStatusTmdb = {
    getRegion: regionDefault,
    search: function (query, type, region, limit, year) {
      return tmdbProxy("search", { query: query, type: type, region: region, year: year })
        .then(function (res) {
          if (!res.ok) throw new Error(res.error || "Search failed");
          return { items: (res.items || []).slice(0, limit || 20) };
        });
    },
    searchById: function (id) {
      return tmdbProxy("tmdb-details", { id: id, type: "movie" })
        .catch(function () {
          return tmdbProxy("tmdb-details", { id: id, type: "tv" });
        })
        .then(function (res) {
          if (!res.ok) throw new Error("Item not found");
          return res.item;
        });
    }
  };
})(window);
