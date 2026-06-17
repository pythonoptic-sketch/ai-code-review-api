const http = require('http');
const https = require('https');
const fs = require('fs');

async function fetchXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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

function generateEmail(listing) {
  return `
Subject: Inquiry regarding your listing: ${listing.title}

Hi,

I'm Simon. I came across your listing for the space and it looks great. I'm a clean, respectful, and serious renter looking for a proper personal living space.

Could you please let me know:
- Is the space still available?
- What is the lowest practical monthly or all-in cost?
- What is the upfront cost and move-in timing?
- What is the lease or sublease term?
- How are utilities handled?
- Could you clarify the bathroom, kitchen, and laundry access?
- What is the earliest path to tour or apply, and what are the application requirements?

If it's available, I would love to take the next step.

Best,
Simon
323.470.9456
`;
}

async function main() {
  const rssUrl = 'https://sfbay.craigslist.org/search/sfc/apa?max_price=2000&format=rss';
  console.log(`Fetching listings from ${rssUrl}...`);
  const xml = await fetchXML(rssUrl);
  const items = extractItems(xml);

  // Filter out any obvious exclusions
  const filtered = items.filter(item => {
    const t = item.title.toLowerCase();
    const exclusions = ['office', 'workspace', 'coworking', 'hacker house', 'bunk bed', 'crash pad', 'drop house', 'shared sleeping'];
    for (const ex of exclusions) {
      if (t.includes(ex)) return false;
    }
    return true;
  });

  const selected = filtered.slice(0, 3);
  console.log(`\nFound ${selected.length} listings that match criteria. Generating outreach drafts...\n`);

  selected.forEach((listing, index) => {
    console.log(`--- Outreach Draft ${index + 1} ---`);
    console.log(`Listing: ${listing.title}`);
    console.log(`URL: ${listing.link}`);
    console.log(`\nEmail Draft:${generateEmail(listing)}`);
    console.log(`------------------------------\n`);
  });
}

main().catch(console.error);
