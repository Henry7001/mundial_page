import { fallback2026Teams } from './src/data/fallbackData2026.js';

fallback2026Teams.forEach(t => {
  console.log(`Team ${t.id}: code: ${t.fifa_code}, name: ${t.name_en}, group_field(groups): ${t.groups}, group_field(group): ${t.group}`);
});
