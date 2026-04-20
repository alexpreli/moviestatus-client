(function (global) {
  "use strict";

  var RSS_URL = "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml";
  var RSS_JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
  var CACHE_MS = 15 * 60 * 1000;
  var cache = { at: 0, articles: null };

  function safeString(v) {
    return typeof v === "string" ? v : v == null ? "" : String(v);
  }

  global.MovieStatusNews = {
    fetchArticles: function (limit) {
      limit = Math.min(30, Math.max(1, Number(limit || 12)));
      if (cache.articles && Date.now() - cache.at < CACHE_MS) {
        return Promise.resolve({
          articles: cache.articles.slice(0, limit),
          source: "BBC News (entertainment & arts) via rss2json.com",
        });
      }

      var url = RSS_JSON + encodeURIComponent(RSS_URL);

      return fetch(url, { headers: { Accept: "application/json" } })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(safeString(data && data.message) || "News request failed");
            if (!data || data.status !== "ok") {
              throw new Error(safeString(data && data.message) || "Invalid feed response");
            }
            var raw = Array.isArray(data.items) ? data.items : [];
            var articles = raw.map(function (it) {
              return {
                title: safeString(it.title).trim(),
                link: safeString(it.link).trim(),
                pubDate: safeString(it.pubDate),
                source: safeString(it.author || "BBC News"),
              };
            }).filter(function (a) {
              return a.title && a.link;
            });

            cache = { at: Date.now(), articles: articles };
            return {
              articles: articles.slice(0, limit),
              source: "BBC News (entertainment & arts) via rss2json.com",
            };
          });
        });
    },
  };
})(window);
