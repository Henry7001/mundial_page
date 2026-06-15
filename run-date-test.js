import { fallback2026Games } from './src/data/fallbackData2026.js';

const formatMatchDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Guayaquil'
    }) + ' (ECU)';
  } catch (e) {
    return dateString;
  }
};

fallback2026Games.slice(0, 15).forEach(g => {
  console.log(`Match ${g.id}: UTC: ${g.date} -> Ecuador: ${formatMatchDate(g.date)} (finished: ${g.finished})`);
});
