export default function handler(req, res) {
  const config = {
    region: process.env.REGION,
    tmdbLanguage: process.env.TMDB_LANGUAGE,
    searchDailyLimit: parseInt(process.env.SEARCH_DAILY_LIMIT),
    searchVerifyBaseUrl: process.env.SEARCH_VERIFY_BASE_URL,
    localServerPort: parseInt(process.env.LOCAL_SERVER_PORT),
    searchVerifyDailyLimit: parseInt(process.env.SEARCH_VERIFY_DAILY_LIMIT),
    listingCheck: process.env.LISTING_CHECK,
  };

  const jsContent = `window.MOVIESTATUS_CONFIG = ${JSON.stringify(config, null, 2)};`;

  res.setHeader('Content-Type', 'application/javascript');
  res.status(200).send(jsContent);
}
