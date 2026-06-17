/**
 * Local search tool for finding Simon's housing.
 *
 * Instructions:
 * Run this script locally using Node.js:
 * node local_search.js
 *
 * It will fetch the latest listings from Craigslist via RSS feed, filter them
 * based on the exclusions, and output potential matches. It bypasses automated browser
 * restrictions by running on your local machine / IP.
 */

const https = require('https');

async function fetchXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch: ${res.statusCode} ${res.statusMessage}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemStr = match[1];
    const titleMatch = itemStr.match(/<title><\!\[CDATA\[(.*?)\]\]><\/title>/) || itemStr.match(/<title>(.*?)<\/title>/);
    const linkMatch = itemStr.match(/<link>(.*?)<\/link>/);
    const descMatch = itemStr.match(/<description><\!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemStr.match(/<description>([\s\S]*?)<\/description>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1],
        link: linkMatch[1],
        description: descMatch ? descMatch[1] : ''
      });
    }
  }
  return items;
}

function filterListings(items) {
  const exclusions = [
    'office', 'workspace', 'coworking',
    'hacker house', 'founder house', 'bunk bed',
    'crash pad', 'drop house', 'shared sleeping',
    'living room', 'den only', 'couch', 'co-op'
  ];

  return items.filter(item => {
    const text = (item.title + ' ' + item.description).toLowerCase();

    // Check exclusions
    for (const ex of exclusions) {
      if (text.includes(ex)) {
        return false;
      }
    }
    return true;
  });
}

async function main() {
  // Use max_price=2000 to match the stretch budget
  const rssUrl = 'https://sfbay.craigslist.org/search/sfc/apa?max_price=2000&format=rss';

  console.log(`Fetching listings from ${rssUrl}...\n`);

  try {
    const xml = await fetchXML(rssUrl);
    const items = extractItems(xml);
    const validListings = filterListings(items);

    console.log(`Found ${items.length} total listings.`);
    console.log(`Filtered down to ${validListings.length} matching criteria (no obvious exclusions).\n`);

    // Display up to 5 listings
    const displayCount = Math.min(5, validListings.length);
    for (let i = 0; i < displayCount; i++) {
      console.log(`--- Listing ${i + 1} ---`);
      console.log(`Title: ${validListings[i].title}`);
      console.log(`Link:  ${validListings[i].link}`);
      console.log(`-------------------\n`);
    }

    if (validListings.length > 0) {
      console.log("Please select a link above and review it manually in your browser.");
      console.log("Use the templates in `outreach_templates.md` to contact the ones that look best.");
    }

  } catch (err) {
    console.error("Error fetching listings:", err.message);
    console.log("If you are getting a 403 Forbidden or similar, Craigslist may be blocking the request.");
    console.log("In that case, you can manually visit: https://sfbay.craigslist.org/search/sfc/apa?max_price=2000");
  }
}

main();
