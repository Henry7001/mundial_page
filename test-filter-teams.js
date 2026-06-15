import { fallback2026Teams } from './src/data/fallbackData2026.js';

const letters = ['A', 'B', 'C', 'D'];
letters.forEach(letter => {
  const teamsInGroup = fallback2026Teams
    .filter(t => String(t.groups || t.group || '').toUpperCase() === letter);
  
  console.log(`Group ${letter} count:`, teamsInGroup.length);
  console.log(`Group ${letter} teams:`, teamsInGroup.map(t => `${t.id}: ${t.fifa_code} (${t.groups})`));
});
