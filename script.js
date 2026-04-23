(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const NO_COVER_PLACEHOLDER =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">' +
      '<rect fill="#0a0a0a" width="500" height="750"/>' +
      '<text x="250" y="360" fill="#6a6a6a" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="600" text-anchor="middle">' +
      "NO COVER FOUND" +
      "</text>" +
      "</svg>"
    );

  const heroMoviesEl = $("#heroMovies");
  const featuredMoviesEl = $("#featuredMoviesGrid");
  const featuredShowsEl = $("#featuredShowsGrid");
  const upcomingEl = $("#upcomingGrid");
  const trendingEl = $("#trendingGrid");
  const popularClassicEl = $("#popularClassicGrid");
  const searchResultsEl = $("#searchResults");
  const searchResultsSection = $("#searchResultsSection");
  const searchResultsDesc = $("#searchResultsDesc");
  const statusLineEl = $("#statusLine");
  const globalErrorSection = $("#globalErrorSection");
  const homeContent = $("#homeContent");

  const searchInput = $("#searchInput");
  const searchType = $("#searchType");
  const searchBtn = $("#searchBtn");
  const searchToggle = $("#headerSearchToggle");
  const searchDropdown = $("#searchDropdown");

  const subtitleSearchInput = $("#subtitleSearchInput");
  const subtitleLangSelect = $("#subtitleLangSelect");
  const subtitleSearchBtn = $("#subtitleSearchBtn");
  const subtitleSearchResults = $("#subtitleSearchResults");
  const subtitleSearchStatus = $("#subtitleSearchStatus");

  const qualitySearchInput = $("#qualitySearchInput");
  const qualitySelect = $("#qualitySelect");
  const qualitySearchBtn = $("#qualitySearchBtn");
  const qualitySearchResults = $("#qualitySearchResults");
  const qualitySearchStatus = $("#qualitySearchStatus");
  const audioSearchInput = $("#audioSearchInput");
  const audioSearchBtn = $("#audioSearchBtn");
  const audioSearchResults = $("#audioSearchResults");
  const audioSearchStatus = $("#audioSearchStatus");

  const cardTpl = document.getElementById("cardTemplate");
  const heroTpl = document.getElementById("heroCardTemplate");

  var refreshSiteTopMeasure = null;

  function cfgListing() {
    return window.MOVIESTATUS_CONFIG || {};
  }

  function regionVal() {
    return window.MovieStatusTmdb && window.MovieStatusTmdb.getRegion
      ? window.MovieStatusTmdb.getRegion()
      : "US";
  }

  function bindSiteTopMeasure() {
    var notice = document.querySelector(".noticebar");
    var headerInner = document.querySelector(".header_inner");
    function setVar() {
      var h = 0;
      if (notice) h += notice.offsetHeight;
      if (headerInner) h += headerInner.offsetHeight;
      document.documentElement.style.setProperty("--site-top-h", h + "px");
    }
    setVar();
    var roTargets = [notice, headerInner].filter(Boolean);
    if (typeof ResizeObserver !== "undefined" && roTargets.length) {
      var ro = new ResizeObserver(setVar);
      roTargets.forEach(function (el) {
        ro.observe(el);
      });
    }
    window.addEventListener("resize", setVar);
    window.addEventListener("orientationchange", function () {
      setTimeout(setVar, 200);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVar);
      window.visualViewport.addEventListener("scroll", setVar);
    }
    if (searchToggle && searchDropdown) {
      searchToggle.addEventListener("click", function () {
        setTimeout(setVar, 400);
      });
    }
    refreshSiteTopMeasure = setVar;
  }

  function setStatus(msg, isError) {
    if (!statusLineEl) return;
    statusLineEl.textContent = msg || "";
    statusLineEl.classList.toggle("isError", Boolean(isError));
  }

  function ageDaysLabel(days) {
    if (typeof days !== "number" || !Number.isFinite(days)) return null;
    if (days < 0) return { text: "D" + days, cls: "is-upcoming" };
    return { text: "D+" + days, cls: "is-online" };
  }

  function ageDaysLong(days, status) {
    if (status === "Released") {
      if (typeof days === "number" && days > 0) {
        return days + (days === 1 ? " day" : " days") + " since release";
      }
      if (days === 0) return "Released today";
      return "Released";
    }
    if (typeof days !== "number" || !Number.isFinite(days)) return "Released";
    if (days < 0) return Math.abs(days) + " days until release";
    if (days === 0) return "Released today";
    if (days === 1) return "1 day since release";
    return days + " days since release";
  }

  function buildTmdbPageUrl(item) {
    if (!item || !item.id) return "#";
    var path = item.type === "show" ? "tv" : "movie";
    return "https://www.themoviedb.org/" + path + "/" + encodeURIComponent(String(item.id));
  }

  function dLabel(v) {
    if (v == null || !Number.isFinite(Number(v))) return "PENDING";
    var n = Math.floor(Number(v));
    if (n < 0) return "D" + n;
    return "D+" + n;
  }

  function parseQueryAndYear(q) {
    if (!q) return { query: q, year: null };

    var match = q.match(/\(?(\d{4})\)?[\.\!\?]*$/);
    if (match) {
      var year = match[1];
      var cleanQuery = q.replace(match[0], "").trim();
      var yNum = parseInt(year);

      if (yNum > 1880 && yNum < 2100) {
        return { query: cleanQuery, year: year };
      }
    }
    return { query: q, year: null };
  }

  function setLeakBadge(card, likely, leakTimeDays, item) {
    var badge = card.querySelector(".card_badge") || card.querySelector(".hero-card_badge");
    if (!badge) return;
    badge.classList.remove("is-upcoming", "is-unavailable", "is-leaked", "is-unleaked");
    if (likely === true) {
      badge.textContent = "ONLINE";
      badge.classList.add("is-leaked");
      return;
    }
    if (likely === false) {
      if (item && !item.year) {
        badge.textContent = "OFFLINE";
      } else {
        var dStr = dLabel(leakTimeDays);
        badge.textContent = dStr === "PENDING" ? "OFFLINE" : "OFFLINE " + dStr;
      }
      badge.classList.add("is-unleaked");
      return;
    }
    badge.textContent = "CHECKING";
  }

  function openCineby(item) {
    if (!item || !item.id) return;
    const type = (item.type === "show" || item.type === "tv") ? "tv" : "movie";
    const cinebyUrl = `https://cineby.sc/${type}/${item.id}?play=true`;
    const searchUrl = `https://www.google.com/url?q=${encodeURIComponent(cinebyUrl)}`;
    window.open(searchUrl, "_blank", "noopener,noreferrer");
  }

  function updateCardAvailabilityRow(card, item, res, rowOpts) {
    rowOpts = rowOpts || {};
    var forSearchMode = Boolean(rowOpts.forSearchMode);
    var statusSelector = rowOpts.statusSelector || ".movie-status";
    var movieStatus = card.querySelector(statusSelector);
    if (!movieStatus) return;
    movieStatus.classList.remove("is-pending", "found", "not-found", "is-inconclusive");

    if (res && res.watchUrl) card.setAttribute("data-verify-url", res.watchUrl);

    var verifyBtn = card.querySelector(".redirect-btn");
    if (verifyBtn && forSearchMode) {
      verifyBtn.style.display = res && res.ok && res.likely === true ? "" : "none";
    }

    if (rowOpts.listingOffline) {
      movieStatus.textContent = "Availability service is offline.";
      movieStatus.classList.add("is-inconclusive");
      setLeakBadge(card, null, null, item);
      return;
    }

    if (res && res.ok && res.likely === true) {
      if (rowOpts.mode === "quality") {
        movieStatus.textContent = "FullHD / 1080p verified";
      } else if (rowOpts.mode === "subtitle") {
        movieStatus.textContent = "Subtitle found";
      } else if (rowOpts.mode === "audio" && res.audio) {
        movieStatus.textContent =
          "Audio official: " +
          ((res.audio.official || []).join(", ") || "Unknown year") +
          " | Untrusted: " +
          ((res.audio.untrusted || []).join(", ") || "None");
      } else {
        movieStatus.textContent = "LEAKED";
      }
      setLeakBadge(card, true, res.leakTimeDays, item);
      movieStatus.classList.add("found");
      return;
    }
    if (res && res.ok && res.likely === false) {
      if (rowOpts.mode === "quality") {
        movieStatus.textContent = "High quality not found";
      } else if (rowOpts.mode === "subtitle") {
        movieStatus.textContent = "Subtitle not found";
      } else if (rowOpts.mode === "audio" && res.audio) {
        movieStatus.textContent =
          "Audio official: " +
          ((res.audio.official || []).join(", ") || "Unknown year") +
          " | Untrusted: " +
          ((res.audio.untrusted || []).join(", ") || "None");
      } else {
        if (item && !item.year) {
          movieStatus.textContent = "UNLEAKED";
        } else {
          movieStatus.textContent = "UNLEAKED " + dLabel(res.leakTimeDays);
        }
      }
      setLeakBadge(card, false, res.leakTimeDays, item);
      movieStatus.classList.add("not-found");
      return;
    }
    if (res && res.ok && res.likely === null) {
      movieStatus.textContent = "Could not confirm availability.";
      movieStatus.classList.add("is-inconclusive");
      setLeakBadge(card, null, null, item);
      return;
    }
    if (res && res.skipped) {
      movieStatus.textContent = "Availability checks are turned off.";
      movieStatus.classList.add("is-inconclusive");
      setLeakBadge(card, null, null, item);
      return;
    }
    var errMsg = res && res.error ? String(res.error) : "";
    if (errMsg) {
      var short = errMsg.length > 160 ? errMsg.slice(0, 157) + "…" : errMsg;
      movieStatus.textContent = short;
      movieStatus.classList.add("is-inconclusive");
      setLeakBadge(card, null, null, item);
      return;
    }
    movieStatus.textContent = "Something went wrong. Please try again.";
    movieStatus.classList.add("is-inconclusive");
    setLeakBadge(card, null, null, item);
  }

  async function verifyItemsInContainer(container, items, opts) {
    opts = opts || {};
    var forSearchMode = Boolean(opts.forSearchMode);
    var cardSelector = opts.cardSelector != null ? opts.cardSelector : ".card";
    var statusSelector = opts.statusSelector || ".movie-status";
    var mode = opts.mode || "listing";
    var subtitleLang = opts.subtitleLang || "";
    var qualityToken = opts.qualityToken || "";
    if (!container || !Array.isArray(items)) return;

    var cards;
    if (cardSelector) {
      cards = container.querySelectorAll(cardSelector);
    } else {
      cards = container.querySelectorAll(".card, .hero-card");
    }
    var n = Math.min(items.length, cards.length);

    if (window._listingBackendOk === false) {
      for (var oi = 0; oi < n; oi++) {
        updateCardAvailabilityRow(cards[oi], items[oi], { ok: false }, {
          forSearchMode: forSearchMode,
          statusSelector: statusSelector,
          listingOffline: true,
        });
      }
      return;
    }

    if (!window.MovieStatusSearchVerify || !window.MovieStatusSearchVerify.isConfigured()) {
      for (var ci = 0; ci < n; ci++) {
        updateCardAvailabilityRow(cards[ci], items[ci], { ok: false, skipped: true }, {
          forSearchMode: forSearchMode,
          statusSelector: statusSelector,
        });
      }
      return;
    }


    var promises = [];
    for (var vi = 0; vi < n; vi++) {
      promises.push((async function (item, card) {
        if (!item || !card) return;
        try {
          var res = await window.MovieStatusSearchVerify.verifyQuery({
            tmdbId: item.id || "",
            title: item.title || "",
            year: item.year || "",
            type: item.type || "movie",
            mode: mode,
            releaseDate: item.releaseDateISO || "",
            episodeAirDate: item.episodeAirDateISO || "",
            season: item.seasonNumber || "",
            episode: item.episodeNumber || "",
            subtitleLang: subtitleLang,
            qualityToken: qualityToken,
            providerCount: item.platforms && item.platforms.length ? item.platforms.length : 0,
            officialAudio: item.spokenLanguages && item.spokenLanguages.length ? item.spokenLanguages.join(",") : "",
          });
          updateCardAvailabilityRow(card, item, res, {
            forSearchMode: forSearchMode,
            statusSelector: statusSelector,
            mode: mode,
            itemFoundOnlineDays: typeof item.foundOnlineDays === "number" ? item.foundOnlineDays : null,
          });
        } catch (e) {
          updateCardAvailabilityRow(card, item, { ok: false }, {
            forSearchMode: forSearchMode,
            statusSelector: statusSelector,
            mode: mode,
          });
        }
      })(items[vi], cards[vi]));
    }
    await Promise.all(promises);
  }

  if (searchToggle && searchDropdown) {
    searchToggle.addEventListener("click", function () {
      searchDropdown.classList.toggle("is-open");
      if (searchDropdown.classList.contains("is-open")) {
        setTimeout(function () { searchInput && searchInput.focus(); }, 150);
      }
    });
  }

  function buildHeroCard(item) {
    if (!heroTpl) return null;
    var node = heroTpl.content.firstElementChild.cloneNode(true);
    node.setAttribute("data-tmdb-id", String(item.id || ""));
    node.setAttribute("data-item-type", item.type === "show" ? "show" : "movie");
    node.title = item.title || "";

    var img = node.querySelector(".hero-card_img");
    var badge = node.querySelector(".hero-card_badge");
    var titleEl = node.querySelector(".hero-card_title");
    if (titleEl) titleEl.textContent = item.title || "";
    var year = node.querySelector(".hero-card_year");
    var age = node.querySelector(".hero-card_age");
    var platforms = node.querySelector(".hero-card_platforms");
    var heroStatus = node.querySelector(".hero-card_movie-status");
    var heroVerify = node.querySelector(".redirect-btn");
    var heroTmdb = node.querySelector(".tmdb-page-btn");

    if (heroTmdb) {
      heroTmdb.href = buildTmdbPageUrl(item);
      heroTmdb.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
    if (heroStatus) {
      heroStatus.classList.remove("is-pending", "found", "not-found", "is-inconclusive");
      if (window._listingBackendOk === false) {
        heroStatus.textContent = "Availability service is offline.";
        heroStatus.classList.add("is-inconclusive");
      } else if (!window.MovieStatusSearchVerify || !window.MovieStatusSearchVerify.isConfigured()) {
        heroStatus.textContent = "Availability checks are turned off.";
        heroStatus.classList.add("is-inconclusive");
      } else {
        heroStatus.textContent = "Checking…";
        heroStatus.classList.add("is-pending");
      }
    }
    if (heroVerify) {
      heroVerify.style.display = "none";
      heroVerify.title = `Watch ${item.title} Online Now`;
      heroVerify.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openCineby(item);
      });
    }

    img.src = item.hasTmdbPoster && item.posterUrl ? item.posterUrl : NO_COVER_PLACEHOLDER;
    img.alt = item.title || "";

    if (!item.year) {
      year.textContent = "Unknown year";
      if (age) age.style.display = "none";
    } else {
      year.textContent = item.year;
    }

    var hAgeDays = (typeof item.foundOnlineDays === "number") ? item.foundOnlineDays : null;
    age.textContent = ageDaysLong(hAgeDays, item.status);

    if (platforms && Array.isArray(item.platforms)) {
      for (var hi = 0; hi < Math.min(item.platforms.length, 3); hi++) {
        var hp = buildPlatformPill(item.platforms[hi]);
        if (hp) platforms.appendChild(hp);
      }
    }

    node.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".trailer-btn")) return;
      window.open(buildTmdbPageUrl(item), "_blank", "noopener,noreferrer");
    });

    if (item.hasTrailer) {
      const trailerBtn = document.createElement("button");
      const isShow = item.type === "show" || item.type === "tv";
      trailerBtn.type = "button";
      trailerBtn.className = "trailer-btn";
      trailerBtn.innerHTML = `<span class="trailer-spacer"></span><span class="trailer-text-wrap" title="Redirect to trailer on YouTube for this title">${isShow ? "TV SHOW TRAILER" : "MOVIE TRAILER"}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      trailerBtn.onclick = (e) => {
        e.stopPropagation();
        fetchTrailer(item.type, item.id);
      };

      const heroActions = node.querySelector(".hero-card_action-btns");
      if (heroActions) {
        const redirectBtn = heroActions.querySelector(".redirect-btn");
        if (redirectBtn) {
          redirectBtn.before(trailerBtn);
        } else {
          heroActions.appendChild(trailerBtn);
        }
      }
    }

    return node;
  }

  function buildCard(item) {
    if (!cardTpl) return null;
    var node = cardTpl.content.firstElementChild.cloneNode(true);
    node.setAttribute("data-tmdb-id", String(item.id || ""));
    node.setAttribute("data-item-type", item.type === "show" ? "show" : "movie");
    node.title = item.title || "";

    var img = node.querySelector(".card_img");
    var badge = node.querySelector(".card_badge");
    var typeBadge = node.querySelector(".card_typeBadge");
    var titleLink = node.querySelector(".card_titleLink");
    var yearEl = node.querySelector(".card_year");
    var ageEl = node.querySelector(".card_age");
    var platformsEl = node.querySelector(".card_platforms");

    img.src = item.hasTmdbPoster && item.posterUrl ? item.posterUrl : NO_COVER_PLACEHOLDER;
    img.alt = item.title || "";

    badge.textContent = "CHECKING";

    var imgLink = node.querySelector(".card_imgLink");
    if (imgLink) {
      imgLink.href = buildTmdbPageUrl(item);
      imgLink.target = "_blank";
      imgLink.rel = "noopener noreferrer";
    }

    var ageDays = (typeof item.foundOnlineDays === "number") ? item.foundOnlineDays : null;
    var ageInfo = ageDaysLabel(ageDays);
    if (!item.year) {
      ageEl.style.display = "none";
    } else if (ageInfo) {
      ageEl.textContent = ageDaysLong(ageDays, item.status);
      ageEl.classList.remove("is-unknown");
      ageEl.classList.add(ageInfo.cls);
    } else {
      ageEl.textContent = "Released";
      ageEl.classList.add("is-online");
      ageEl.classList.remove("is-unknown");
    }

    if (item.type === "show") {
      typeBadge.textContent = "TV Series";
    } else if (item.type === "movie") {
      typeBadge.textContent = "MOVIE";
    } else {
      typeBadge.style.display = "none";
    }

    titleLink.textContent = item.title || "";
    if (titleLink.textContent === "") titleLink.textContent = "Title N/A";
    titleLink.href = buildTmdbPageUrl(item);
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";

    if (!item.year) {
      yearEl.textContent = "Unknown year";
    } else {
      yearEl.textContent = item.year;
    }

    if (platformsEl) {
      var plats = Array.isArray(item.platforms) ? item.platforms : [];
      if (plats.length === 0) {
        var emptyPlat = document.createElement("span");
        emptyPlat.className = "platform-pill";
        emptyPlat.textContent = "No official providers found";
        emptyPlat.style.opacity = "0.5";
        emptyPlat.style.cursor = "default";
        platformsEl.appendChild(emptyPlat);
      } else {
        for (var pi = 0; pi < Math.min(plats.length, 5); pi++) {
          var pill = buildPlatformPill(plats[pi]);
          if (pill) platformsEl.appendChild(pill);
        }
      }
    }

    var movieStatus = node.querySelector(".movie-status");
    var verifyBtn = node.querySelector(".redirect-btn");
    var tmdbBtn = node.querySelector(".tmdb-page-btn");

    if (tmdbBtn) {
      tmdbBtn.href = buildTmdbPageUrl(item);
      tmdbBtn.classList.add("tmdb-page-btn");
      tmdbBtn.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    node.style.cursor = "pointer";
    node.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".trailer-btn")) return;
      window.open(buildTmdbPageUrl(item), "_blank", "noopener,noreferrer");
    });

    if (item.hasTrailer) {
      const trailerBtn = document.createElement("button");
      const isShow = item.type === "show" || item.type === "tv";
      trailerBtn.type = "button";
      trailerBtn.className = "trailer-btn";
      trailerBtn.title = `Watch trailer for ${item.title}`;
      trailerBtn.innerHTML = `<span class="trailer-spacer"></span><span class="trailer-text-wrap">${isShow ? "TV SHOW TRAILER" : "MOVIE TRAILER"}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      trailerBtn.onclick = (e) => {
        e.stopPropagation();
        fetchTrailer(item.type, item.id);
      };

      const cardActions = node.querySelector(".card_action-btns");
      if (cardActions) {
        const redirectBtn = cardActions.querySelector(".redirect-btn");
        if (redirectBtn) {
          redirectBtn.before(trailerBtn);
        } else {
          cardActions.appendChild(trailerBtn);
        }
      }
    }

    movieStatus.classList.remove("found", "not-found", "is-pending", "is-inconclusive");

    if (window._listingBackendOk === false) {
      movieStatus.textContent = "Availability service is offline.";
      movieStatus.classList.add("is-inconclusive");
    } else if (!window.MovieStatusSearchVerify || !window.MovieStatusSearchVerify.isConfigured()) {
      movieStatus.textContent = "Availability checks are turned off.";
      movieStatus.classList.add("is-inconclusive");
    } else {
      movieStatus.textContent = "Checking…";
      movieStatus.classList.add("is-pending");
    }

    if (verifyBtn) {
      verifyBtn.style.display = "none";
      verifyBtn.title = `Watch ${item.title} Online Now`;
      verifyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openCineby(item);
      });
    }

    return node;
  }

  function buildPlatformPill(platform) {
    var a = document.createElement("a");
    a.className = "platform-pill";
    a.href = platform.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = platform.name || "Watch";

    if (platform.logoUrl) {
      var logo = document.createElement("img");
      logo.className = "platform-pill_logo";
      logo.src = platform.logoUrl;
      logo.alt = "";
      logo.loading = "lazy";
      a.appendChild(logo);
    }
    a.appendChild(document.createTextNode(platform.name || "Watch"));
    return a;
  }

  function normalizeSearchResult(r) {

    if (r.normalized) return r;

    if (r.type === "movie" || r.type === "show") {
      r.normalized = true;
      return r;
    }


    const isMovie = r._media_type === "movie" || r.media_type === "movie" ||
      (r._media_type !== "tv" && r.media_type !== "tv" && !r.first_air_date);
    const title = isMovie ? (r.title || r.original_title) : (r.name || r.original_name);
    if (!title || title.trim() === "") return null;

    const dateStr = isMovie ? (r.release_date || "") : (r.first_air_date || "");
    const year = dateStr ? dateStr.substring(0, 4) : "";
    const posterUrl = r.poster_path ? "https://image.tmdb.org/t/p/w500" + r.poster_path : "";

    let days = null;
    if (dateStr) {
      const releaseDate = new Date(dateStr + "T00:00:00Z");
      if (!isNaN(releaseDate.getTime())) {
        const today = new Date();

        const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const diffTime = todayUtc - releaseDate;
        days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return {
      normalized: true,
      id: r.id,
      type: isMovie ? "movie" : "show",
      title: title,
      year: year,
      posterUrl: posterUrl,
      hasTmdbPoster: !!r.poster_path,
      foundOnlineDays: days,
      releaseDateISO: dateStr,
      platforms: [],
      status: r.status || ""
    };
  }

  function renderGrid(container, items, cardBuilder) {
    if (!container) return;
    container.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nothing found.";
      container.appendChild(empty);
      return;
    }


    var normalized = items.map(normalizeSearchResult).filter(Boolean);

    if (normalized.length === 0) {
      var emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-state";
      emptyMsg.textContent = "Nothing found.";
      container.appendChild(emptyMsg);
      return;
    }


    normalized.sort((a, b) => {
      if (a.hasTmdbPoster && !b.hasTmdbPoster) return -1;
      if (!a.hasTmdbPoster && b.hasTmdbPoster) return 1;
      return 0;
    });


    var builder = cardBuilder || buildCard;
    for (var i = 0; i < normalized.length; i++) {
      var card = builder(normalized[i]);
      if (card) container.appendChild(card);
    }
  }



  function appendCardToGrid(container, item, cardBuilder) {
    if (!container) return null;
    var skeletons = container.querySelectorAll(".skeleton");
    var card = (cardBuilder || buildCard)(item);
    if (!card) return null;
    if (skeletons.length > 0) {
      container.replaceChild(card, skeletons[0]);
    } else {
      container.appendChild(card);
    }
    return card;
  }

  function showSkeletons(container, count, isHero) {
    if (!container) return;
    container.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var el = document.createElement("div");
      el.className = "skeleton";
      el.style.height = isHero ? "380px" : "250px";
      container.appendChild(el);
    }
  }

  function showSearchResultsSection() {
    if (!searchResultsSection) return;
    searchResultsSection.classList.add("is-open");
    requestAnimationFrame(function () {
      searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function hideSearchResults() {
    if (!searchResultsSection) return;
    searchResultsSection.classList.remove("is-open");
  }

  const closeSearchBtn = $("#closeSearchBtn");
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener("click", hideSearchResults);
  }

  function pingListingBackend() {
    return new Promise(function (resolve) {
      if (cfgListing().listingCheck === false) {
        resolve(true);
        return;
      }
      var root = String(cfgListing().searchVerifyBaseUrl || "")
        .trim()
        .replace(/\/$/, "");
      var isLocal = typeof location !== "undefined" && (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
      if (!root && isLocal) {
        var lp = Number(cfgListing().localServerPort);
        var lport = Number.isFinite(lp) && lp > 0 ? Math.floor(lp) : 3000;
        root = "http://127.0.0.1:" + lport;
      }
      var url = root ? root + "/health" : "/health";
      fetch(url, { method: "GET", credentials: "omit", cache: "no-store" })
        .then(function (r) {
          resolve(r.ok);
        })
        .catch(function () {
          resolve(false);
        });
    });
  }

  function verifyApiRoot() {
    var root = String(cfgListing().searchVerifyBaseUrl || "")
      .trim()
      .replace(/\/$/, "");
    var isLocal = typeof location !== "undefined" && (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if (!root && isLocal) {
      var lp = Number(cfgListing().localServerPort);
      var lport = Number.isFinite(lp) && lp > 0 ? Math.floor(lp) : 3000;
      root = "http://127.0.0.1:" + lport;
    }
    return root;
  }

  function translateQuality(q) {
    const map = {
      "2160p": "4K Ultra HD (2160p)",
      "4K": "4K Ultra HD (2160p)",
      "UHD": "4K Ultra HD (2160p)",
      "1080p": "Full HD (1080p)",
      "720p": "HD (720p)",
      "480p": "SD (480p)",
      "360p": "SD (360p)",
      "HD": "HD (720p)",
      "WEB-DL": "WEB-DL",
      "BluRay": "Blu-ray",
      "CAM": "Camera Recording (CAM)",
      "TS": "Telesync",
      "TC": "Telecine",
      "DVDRip": "DVD Rip",
      "WEBRip": "WEB Rip"
    };
    return map[q] || q;
  }

  function fetchTrailer(type, id) {
    const root = verifyApiRoot();
    const url = `${root}/api/trailers?id=${id}&type=${type}`;
    const headers = {};
    if (MOVIESTATUS_CONFIG.apiKey) headers["x-api-key"] = MOVIESTATUS_CONFIG.apiKey;

    fetch(url, { headers })
      .then(res => res.json())
      .then(json => {
        if (json.ok && json.trailers && json.trailers.length) {
          window.open(`https://www.youtube.com/watch?v=${json.trailers[0].key}`, "_blank");
        } else {
          alert("Trailer not found.");
        }
      })
      .catch(() => alert("Could not fetch trailer."));
  }


  function loadSubtitleLanguages() {
    if (!subtitleLangSelect) return Promise.resolve();
    var root = verifyApiRoot();
    var u = (root ? root : "") + "/api/subtitle-languages";
    return fetch(u, { method: "GET", credentials: "omit" })
      .then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) return;
          var json = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch (_) {
            json = {};
          }
          var rows = json && Array.isArray(json.data) ? json.data : [];
          if (!rows.length) return;
          subtitleLangSelect.innerHTML = "";
          for (var i = 0; i < rows.length; i++) {
            var opt = document.createElement("option");
            opt.value = rows[i].code;
            opt.textContent = rows[i].name;
            if (rows[i].code === "en") opt.selected = true;
            subtitleLangSelect.appendChild(opt);
          }
        });
      })
      .catch(function () { });
  }

  function renderHomeSection(el, items, cardBuilder, isHero) {
    if (!el) return;
    el.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nothing found.";
      el.appendChild(empty);
      return;
    }
    var builder = cardBuilder || buildCard;
    var statusSel = isHero ? ".hero-card_movie-status" : ".movie-status";
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.hasTmdbPoster && item.posterPath) item.hasTmdbPoster = true;
      if (!item.posterUrl && item.posterPath) {
        item.posterUrl = "https://image.tmdb.org/t/p/w500" + item.posterPath;
      }
      if (!Array.isArray(item.platforms)) item.platforms = [];
      var card = builder(item);
      if (!card) continue;
      if (item.verifyResult) {
        updateCardAvailabilityRow(card, item, item.verifyResult, {
          forSearchMode: true,
          statusSelector: statusSel,
          mode: "listing",
          itemFoundOnlineDays: typeof item.foundOnlineDays === "number" ? item.foundOnlineDays : null,
        });
      }
      el.appendChild(card);
    }
  }

  async function loadHomeData() {
    showSkeletons(heroMoviesEl, 4, true);
    showSkeletons(featuredMoviesEl, 8);
    showSkeletons(featuredShowsEl, 8);
    showSkeletons(upcomingEl, 6);
    showSkeletons(trendingEl, 6);
    showSkeletons(popularClassicEl, 8);

    var root = verifyApiRoot();
    var url = (root || "") + "/api/home-data";
    var maxAttempts = 5;
    var retryMs = 2000;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise(function (r) { setTimeout(r, retryMs); });
      }
      try {
        var res = await fetch(url, { method: "GET", credentials: "omit", cache: "no-cache" });
        var json = await res.json();

        if (res.status === 503 || json.fetching) {
          setStatus(
            "Preparing home data\u2026 (" + (attempt + 1) + "/" + maxAttempts + ")",
            false
          );
          continue;
        }

        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.error || "Data unavailable.");
        }

        setStatus("");
        var d = json.data;
        renderHomeSection(heroMoviesEl, d.heroMovies || [], buildHeroCard, true);
        renderHomeSection(featuredMoviesEl, d.featuredMovies || []);
        renderHomeSection(featuredShowsEl, d.featuredShows || []);
        renderHomeSection(upcomingEl, d.upcoming || []);
        renderHomeSection(trendingEl, d.trending || []);
        renderHomeSection(popularClassicEl, d.popularClassic || []);
        return;

      } catch (err) {
        if (attempt + 1 >= maxAttempts) {
          if (homeContent) homeContent.style.display = "none";
          if (globalErrorSection) globalErrorSection.style.display = "block";
          setStatus("Connection to server lost.", true);
        } else {
          setStatus("Connection error, retrying\u2026", false);
        }
      }
    }
  }

  async function doSearch() {
    var query = (searchInput ? searchInput.value : "").trim();
    var type = searchType ? searchType.value : "all";
    var country = regionVal();

    if (!query) {
      setStatus("Type a movie or TV name first.");
      hideSearchResults();
      return;
    }

    showSearchResultsSection();
    if (searchResultsDesc) searchResultsDesc.textContent = 'Showing results for "' + query + '"';

    showSkeletons(searchResultsEl, 6);
    setStatus("Searching...");

    try {
      if (!window.MovieStatusTmdb) throw new Error("Missing MovieStatusTmdb");

      var idMatch = query.match(/^\d+$/);
      var items = [];
      if (idMatch) {
        var details = await window.MovieStatusTmdb.searchById(query);
        if (details) items = [details];
      } else {
        var parsed = parseQueryAndYear(query);
        var data = await window.MovieStatusTmdb.search(parsed.query, type, country, 16, parsed.year);
        items = data && data.items ? data.items : [];
      }

      items = items.map(normalizeSearchResult).filter(Boolean);

      if (items.length === 0) {
        setStatus("No TMDb results found.");
        renderGrid(searchResultsEl, []);
        return;
      }


      items.sort((a, b) => {
        if (a.hasTmdbPoster && !b.hasTmdbPoster) return -1;
        if (!a.hasTmdbPoster && b.hasTmdbPoster) return 1;
        return 0;
      });

      renderGrid(searchResultsEl, items);
      setStatus("Found " + items.length + " matching titles. Checking availability...");

      await verifyItemsInContainer(searchResultsEl, items, {
        forSearchMode: true,
        statusSelector: ".movie-status",
        mode: "listing"
      });

      setStatus("Search complete. Found " + searchResultsEl.children.length + " results.");
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), true);
      renderGrid(searchResultsEl, []);
    }
  }

  async function doSubtitleToolSearch() {
    var query = (subtitleSearchInput && subtitleSearchInput.value || "").trim();
    if (!query) {
      if (subtitleSearchStatus) subtitleSearchStatus.textContent = "Enter a title or ID.";
      return;
    }
    subtitleSearchStatus.textContent = "Resolving TMDb reference…";
    try {
      var idMatch = query.match(/^\d+$/);
      var items = [];
      if (idMatch) {
        var details = await window.MovieStatusTmdb.searchById(query);
        if (details) items = [details];
      } else {
        var parsed = parseQueryAndYear(query);
        var data = await window.MovieStatusTmdb.search(parsed.query, "all", regionVal(), 1, parsed.year);
        items = data && data.items ? data.items : [];
      }

      items = items.map(normalizeSearchResult).filter(Boolean);

      if (items.length === 0) {
        subtitleSearchStatus.textContent = "Title not found on TMDb.";
        renderGrid(subtitleSearchResults, []);
        return;
      }
      subtitleSearchResults.innerHTML = "";
      subtitleSearchStatus.textContent = "Checking for available subtitles...";

      items.forEach(item => {
        item.hasTrailer = true; // Force trailer button for this section
        const card = buildCard(item);
        subtitleSearchResults.appendChild(card);
        const ageEl = card.querySelector(".card_age");
        if (ageEl) ageEl.style.display = "none";
        var root = verifyApiRoot();
        var url = (root ? root : "") + `/api/subtitles-list?tmdbId=${item.id}`;
        var headers = {};
        if (MOVIESTATUS_CONFIG.apiKey) headers["x-api-key"] = MOVIESTATUS_CONFIG.apiKey;

        fetch(url, { headers })
          .then(res => {
            if (!res.ok) throw new Error("Server error: " + res.status);
            return res.json();
          })
          .then(subJson => {
            const statusRow = card.querySelector(".movie-status");
            if (!statusRow) return;
            statusRow.classList.remove("is-pending");

            if (subJson.ok && subJson.data.length) {
              const list = subJson.data.map(s => s.display).sort((a, b) => a.localeCompare(b)).join(", ");
              statusRow.innerHTML = `<div style="display:flex; align-items:flex-start; gap:8px; font-size:14px; width:100%;"><strong style="white-space:nowrap; color:var(--neon-light);">Available Subtitles:</strong> <span style="flex:1; word-break:break-word;">${list}</span></div>`;
              statusRow.classList.add("found");
              setLeakBadge(card, true, null, item);
              const vBtn = card.querySelector(".redirect-btn");
              if (vBtn) vBtn.style.display = "";
            } else {
              statusRow.textContent = "No subtitles available for this title.";
              statusRow.classList.add("not-found");
              setLeakBadge(card, false, item.foundOnlineDays, item);
            }
          })
          .catch(err => {
            const statusRow = card.querySelector(".movie-status");
            if (statusRow) {
              statusRow.classList.remove("is-pending");
              statusRow.textContent = "Subtitle service is temporarily busy. Please try again soon.";
            }
          });
      });

      if (items.length === 0) renderGrid(subtitleSearchResults, []);
      subtitleSearchStatus.textContent = "Movie / TV Series subtitles results found.";
    } catch (err) {
      if (subtitleSearchStatus) subtitleSearchStatus.textContent = String(err && err.message ? err.message : err);
      renderGrid(subtitleSearchResults, []);
    }
  }

  async function doQualityToolSearch() {
    var query = (qualitySearchInput && qualitySearchInput.value || "").trim();
    if (!query) {
      if (qualitySearchStatus) qualitySearchStatus.textContent = "Enter a title or ID.";
      return;
    }
    qualitySearchStatus.textContent = "Resolving TMDb reference…";
    try {
      var idMatch = query.match(/^\d+$/);
      var items = [];
      if (idMatch) {
        var details = await window.MovieStatusTmdb.searchById(query);
        if (details) items = [details];
      } else {
        var parsed = parseQueryAndYear(query);
        var data = await window.MovieStatusTmdb.search(parsed.query, "all", regionVal(), 1, parsed.year);
        items = data && data.items ? data.items : [];
      }

      items = items.map(normalizeSearchResult).filter(Boolean);

      if (items.length === 0) {
        qualitySearchStatus.textContent = "Title not found on TMDb.";
        renderGrid(qualitySearchResults, []);
        return;
      }
      qualitySearchResults.innerHTML = "";
      qualitySearchStatus.textContent = "Checking available qualities...";

      var rendered = 0;
      items.forEach(item => {
        item.hasTrailer = true; // Force trailer button for this section
        const card = buildCard(item);
        qualitySearchResults.appendChild(card);
        const ageEl = card.querySelector(".card_age");
        if (ageEl) ageEl.style.display = "none";
        rendered++;
        var root = verifyApiRoot();
        var url = (root ? root : "") + `/api/quality-list?tmdbId=${item.id}`;
        var headers = {};
        if (MOVIESTATUS_CONFIG.apiKey) headers["x-api-key"] = MOVIESTATUS_CONFIG.apiKey;

        fetch(url, { headers })
          .then(res => {
            if (!res.ok) throw new Error("Server error: " + res.status);
            return res.json();
          })
          .then(qualJson => {
            const statusRow = card.querySelector(".movie-status");
            if (!statusRow) return;
            statusRow.classList.remove("is-pending");

            if (qualJson.ok && qualJson.data.length) {
              const labels = qualJson.data.map(translateQuality).sort((a, b) => a.localeCompare(b)).join(", ");
              statusRow.innerHTML = `<div style="display:flex; align-items:flex-start; gap:8px; font-size:14px; width:100%;"><strong style="white-space:nowrap; color:var(--neon-light);">Video Qualities:</strong> <span style="flex:1; word-break:break-word;">${labels}</span></div>`;
              statusRow.classList.add("found");
              setLeakBadge(card, true, null, item);
              const vBtn = card.querySelector(".redirect-btn");
              if (vBtn) vBtn.style.display = "";
            } else {
              statusRow.textContent = "No specific quality tags detected.";
              statusRow.classList.add("not-found");
              setLeakBadge(card, false, item.foundOnlineDays, item);
            }
          })
          .catch(err => {
            const statusRow = card.querySelector(".movie-status");
            if (statusRow) {
              statusRow.classList.remove("is-pending");
              statusRow.textContent = "Quality service is temporarily busy. Please try again soon.";
            }
          });
      });

      if (rendered === 0) renderGrid(qualitySearchResults, []);
      qualitySearchStatus.textContent = "Movie / TV Series quality results found.";
    } catch (err) {
      if (qualitySearchStatus) qualitySearchStatus.textContent = String(err && err.message ? err.message : err);
    }
  }

  async function doAudioToolSearch() {
    var query = (audioSearchInput && audioSearchInput.value || "").trim();
    if (!query) {
      if (audioSearchStatus) audioSearchStatus.textContent = "Enter a title or ID.";
      return;
    }
    audioSearchStatus.textContent = "Resolving TMDb reference…";
    try {
      var idMatch = query.match(/^\d+$/);
      var items = [];
      if (idMatch) {
        var details = await window.MovieStatusTmdb.searchById(query);
        if (details) items = [details];
      } else {
        var parsed = parseQueryAndYear(query);
        var data = await window.MovieStatusTmdb.search(parsed.query, "all", regionVal(), 1, parsed.year);
        items = data && data.items ? data.items : [];
      }

      items = items.map(normalizeSearchResult).filter(Boolean);

      if (items.length === 0) {
        audioSearchStatus.textContent = "Title not found on TMDb.";
        renderGrid(audioSearchResults, []);
        return;
      }
      audioSearchResults.innerHTML = "";
      audioSearchStatus.textContent = "Fetching audio languages...";

      var rendered = 0;
      items.forEach(item => {
        item.hasTrailer = true; // Force trailer button for this section
        const card = buildCard(item);
        audioSearchResults.appendChild(card);
        const ageEl = card.querySelector(".card_age");
        if (ageEl) ageEl.style.display = "none";
        rendered++;
        var root = verifyApiRoot();
        var url = (root ? root : "") + `/api/audio-languages?tmdbId=${item.id}&type=${item.type}`;
        var headers = {};
        if (MOVIESTATUS_CONFIG.apiKey) headers["x-api-key"] = MOVIESTATUS_CONFIG.apiKey;

        fetch(url, { headers })
          .then(async res => {
            if (!res.ok) {
              if (res.status === 400 || res.status === 404) return { ok: true, spoken: [], translations: [] };
              throw new Error("Wyzie API error: " + res.status);
            }
            return res.json();
          })
          .then(audJson => {
            const statusRow = card.querySelector(".movie-status");
            if (!statusRow) return;
            statusRow.classList.remove("is-pending");

            if (audJson.ok && (audJson.spoken.length || audJson.translations.length)) {
              const spoken = audJson.spoken.sort((a, b) => a.localeCompare(b)).join(", ");
              const trans = audJson.translations.sort((a, b) => a.localeCompare(b)).join(", ");
              statusRow.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:6px; font-size:14px; width:100%;">
                  <div style="display:flex; align-items:flex-start; gap:8px;"><strong style="white-space:nowrap; color:var(--neon-light);">Original Audio:</strong> <span style="flex:1; word-break:break-word;">${spoken}</span></div>
                  <div style="display:flex; align-items:flex-start; gap:8px;"><strong style="white-space:nowrap; color:var(--neon-light);">Dubbed Audio:</strong> <span style="flex:1; word-break:break-word;">${trans}</span></div>
                </div>`;
              statusRow.classList.add("found");
              setLeakBadge(card, true, null, item);
              const vBtn = card.querySelector(".redirect-btn");
              if (vBtn) vBtn.style.display = "";
            } else {
              statusRow.textContent = "No audio language data available.";
              statusRow.classList.add("not-found");
              setLeakBadge(card, false, item.foundOnlineDays, item);
            }
          })
          .catch(err => {
            const statusRow = card.querySelector(".movie-status");
            if (statusRow) {
              statusRow.classList.remove("is-pending");
              statusRow.textContent = "Audio service is temporarily busy. Please try again soon.";
            }
          });
      });

      if (rendered === 0) renderGrid(audioSearchResults, []);
      audioSearchStatus.textContent = "Movie / TV Series audio results found.";
    } catch (err) {
      if (audioSearchStatus) audioSearchStatus.textContent = String(err && err.message ? err.message : err);
    }
  }

  searchBtn && searchBtn.addEventListener("click", doSearch);
  searchInput && searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doSearch();
  });

  subtitleSearchBtn && subtitleSearchBtn.addEventListener("click", doSubtitleToolSearch);
  subtitleSearchInput &&
    subtitleSearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doSubtitleToolSearch();
    });

  qualitySearchBtn && qualitySearchBtn.addEventListener("click", doQualityToolSearch);
  qualitySearchInput &&
    qualitySearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doQualityToolSearch();
    });
  audioSearchBtn && audioSearchBtn.addEventListener("click", doAudioToolSearch);
  audioSearchInput &&
    audioSearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doAudioToolSearch();
    });

  const closeSupportBtn = $("#closeSupportBtn");
  if (closeSupportBtn) {
    closeSupportBtn.addEventListener("click", function () {
      const card = $("#supportCard");
      if (card) card.style.display = "none";
    });
  }


  async function initLoad() {
    window._listingBackendOk = true;
    if (cfgListing().listingCheck !== false) {
      window._listingBackendOk = await pingListingBackend();
      if (!window._listingBackendOk) {
        setStatus("Availability service is offline. Try again later.", true);
      }
    }

    loadHomeData();
  }

  bindSiteTopMeasure();
  initLoad();
})();
