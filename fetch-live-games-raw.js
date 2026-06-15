import fs from 'fs';

async function test() {
  const url = 'https://worldcup26.ir/get/games';
  console.log('Fetching live games from', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    const data = await res.json();
    const games = data.games || data;
    console.log('Total games received:', games.length);
    fs.writeFileSync('live-games-dump.json', JSON.stringify(games, null, 2), 'utf8');
    console.log('Dumped live games to live-games-dump.json');
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
test();
