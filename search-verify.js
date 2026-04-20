(function (global) {
  "use strict";

  var STORAGE_KEY = "moviestatus_search_verify_quota_v1";

  function cfg() {
    return global.MOVIESTATUS_CONFIG || {};
  }

  function apiRoot() {
    var explicit = String(cfg().searchVerifyBaseUrl || "")
      .trim()
      .replace(/\/$/, "");
    if (explicit) return explicit;
    if (typeof global.location !== "undefined" && global.location.protocol === "file:") {
      var p = Number(cfg().localServerPort);
      var port = Number.isFinite(p) && p > 0 ? Math.floor(p) : 3000;
      return "http://127.0.0.1:" + port;
    }
    return "";
  }

  function todayUTC() {
    return new Date().toISOString().slice(0, 10);
  }

  function getQuotaLimit() {
    var n = Number(cfg().searchVerifyDailyLimit);
    if (!Number.isFinite(n)) return 0;
    if (n <= 0) return 0;
    return Math.floor(n);
  }

  function consumeQuota() {
    var limit = getQuotaLimit();
    if (limit <= 0) return;
    var day = todayUTC();
    var rec = { day: day, count: 0 };
    var raw = global.localStorage ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.day === day && typeof parsed.count === "number") rec = parsed;
      } catch (ignore) { }
    }
    if (rec.count >= limit) {
      throw new Error("LIMIT");
    }
    rec.count += 1;
    if (global.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      } catch (ignore) { }
    }
  }

  function listingEnabled() {
    return cfg().listingCheck !== false;
  }

  function verifyQuery(meta) {
    meta = meta || {};
    if (!listingEnabled()) {
      return Promise.resolve({ ok: false, likely: null, skipped: true });
    }
    try {
      consumeQuota();
    } catch (e) {
      if (String(e && e.message) === "LIMIT") {
        return Promise.resolve({
          ok: false,
          likely: null,
          error:
            "You have reached the daily limit for availability checks. Please try again tomorrow.",
        });
      }
      return Promise.resolve({
        ok: false,
        likely: null,
        error: "Something went wrong. Please try again.",
      });
    }
    var root = apiRoot();
    var qs =
      "tmdbId=" +
      encodeURIComponent(meta.tmdbId != null ? String(meta.tmdbId) : "") +
      "&title=" +
      encodeURIComponent(meta.title != null ? String(meta.title) : "") +
      "&year=" +
      encodeURIComponent(meta.year != null ? String(meta.year) : "") +
      "&type=" +
      encodeURIComponent(meta.type != null ? String(meta.type) : "movie") +
      "&mode=" +
      encodeURIComponent(meta.mode != null ? String(meta.mode) : "listing") +
      "&releaseDate=" +
      encodeURIComponent(meta.releaseDate != null ? String(meta.releaseDate) : "") +
      "&episodeAirDate=" +
      encodeURIComponent(meta.episodeAirDate != null ? String(meta.episodeAirDate) : "") +
      "&season=" +
      encodeURIComponent(meta.season != null ? String(meta.season) : "") +
      "&episode=" +
      encodeURIComponent(meta.episode != null ? String(meta.episode) : "") +
      "&subtitleLang=" +
      encodeURIComponent(meta.subtitleLang != null ? String(meta.subtitleLang) : "") +
      "&qualityToken=" +
      encodeURIComponent(meta.qualityToken != null ? String(meta.qualityToken) : "") +
      "&providerCount=" +
      encodeURIComponent(meta.providerCount != null ? String(meta.providerCount) : "0") +
      "&officialAudio=" +
      encodeURIComponent(meta.officialAudio != null ? String(meta.officialAudio) : "");
    var u = (root ? root : "") + "/api/verify?" + qs;

    return fetch(u, {
      method: "GET",
      credentials: "omit",
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (ignore) {
              data = {};
            }
          }
          if (!res.ok) {
            var msg =
              (data && data.error) ||
              "Service temporarily unavailable.";
            return { ok: false, likely: null, error: String(msg) };
          }
          var likely = data.likely;
          return {
            ok: Boolean(data.ok),
            likely: likely === true ? true : likely === false ? false : null,
            statsText: data.statsText != null ? data.statsText : null,
            watchUrl: data.watchUrl ? String(data.watchUrl) : "",
            leakTimeDays: Number.isFinite(Number(data.leakTimeDays)) ? Number(data.leakTimeDays) : null,
            quality: data.quality || null,
            audio: data.audio || null,
            error: data.error ? String(data.error) : "",
          };
        });
      })
      .catch(function () {
        return {
          ok: false,
          likely: null,
          error: "Connection failed. Check your network and try again.",
        };
      });
  }

  function isConfigured() {
    return listingEnabled();
  }

  global.MovieStatusSearchVerify = {
    isConfigured: isConfigured,
    verifyQuery: verifyQuery,
  };
})(window);
