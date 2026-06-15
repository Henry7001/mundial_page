import { fallback2026Teams } from './src/data/fallbackData2026.js';

const findTeamIdByName = (name, teamsList) => {
  if (!name) return null;
  let cleanName = name.trim().toLowerCase();
  
  if (cleanName === 'usa' || cleanName === 'united states') {
    cleanName = 'states';
  }
  if (cleanName === 'turkey') cleanName = 'turkiye';
  if (cleanName === 'czech republic') cleanName = 'czechia';
  cleanName = cleanName.replace('&', 'and');

  const team = teamsList.find(t => {
    const tName = t.name_en.toLowerCase();
    return tName === cleanName || cleanName.includes(tName) || tName.includes(cleanName);
  });
  if (team) return team.id;
  return null;
};

const groundToStadiumId = {
  'Mexico City': '1',
  'Guadalajara': '2',
  'Monterrey': '3',
  'Dallas': '4',
  'Houston': '5',
  'Kansas City': '6',
  'Atlanta': '7',
  'Miami': '8',
  'Boston': '9',
  'Philadelphia': '10',
  'New York/New Jersey (East Rutherford)': '11',
  'New York': '11',
  'Toronto': '12',
  'Vancouver': '13',
  'Seattle': '14',
  'San Francisco Bay Area (Santa Clara)': '15',
  'Santa Clara': '15',
  'Los Angeles (Inglewood)': '16',
  'Los Angeles': '16'
};

const mapRoundToTypeAndStage = (round) => {
  if (!round) return { type: 'group', stageName: 'First stage' };
  const r = round.toLowerCase();
  if (r.includes('matchday')) return { type: 'group', stageName: 'First stage' };
  if (r.includes('32')) return { type: 'r32', stageName: 'Round of 32' };
  if (r.includes('16')) return { type: 'r16', stageName: 'Round of 16' };
  if (r.includes('quarter')) return { type: 'quarter', stageName: 'Quarter-finals' };
  if (r.includes('semi')) return { type: 'semi', stageName: 'Semi-finals' };
  if (r.includes('third')) return { type: 'third', stageName: 'Play-off for third place' };
  if (r.includes('final')) return { type: 'final', stageName: 'Final' };
  return { type: 'group', stageName: 'First stage' };
};

const parseOpenFootballDate = (dateStr, timeStr) => {
  try {
    if (!timeStr) return new Date(`${dateStr}T12:00:00Z`).toISOString();
    const parts = timeStr.trim().split(/\s+/);
    const time = parts[0] || "12:00";
    let offset = "+00:00";
    if (parts[1]) {
      const match = parts[1].match(/UTC([+-]\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        const sign = num >= 0 ? '+' : '-';
        const absNum = Math.abs(num);
        const hours = String(absNum).padStart(2, '0');
        offset = `${sign}${hours}:00`;
      }
    }
    return new Date(`${dateStr}T${time}:00${offset}`).toISOString();
  } catch (e) {
    return new Date(`${dateStr}T12:00:00Z`).toISOString();
  }
};

const mapOpenFootballMatches = (openMatches, teamsList) => {
  return openMatches.map((m, index) => {
    const homeId = findTeamIdByName(m.team1, teamsList);
    const awayId = findTeamIdByName(m.team2, teamsList);
    
    const hasScore = m.score && m.score.ft;
    const finished = hasScore ? 'TRUE' : 'FALSE';
    const timeElapsed = hasScore ? 'completed' : 'notstarted';
    
    const homeScore = m.score && m.score.et ? m.score.et[0] : (hasScore ? m.score.ft[0] : null);
    const awayScore = m.score && m.score.et ? m.score.et[1] : (hasScore ? m.score.ft[1] : null);
    const homePenalties = m.score && m.score.p ? m.score.p[0] : null;
    const awayPenalties = m.score && m.score.p ? m.score.p[1] : null;

    const roundInfo = mapRoundToTypeAndStage(m.round);
    const groupLetter = m.group ? m.group.replace(/group/i, '').trim() : '';

    return {
      id: String(index + 1),
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: homePenalties,
      away_penalties: awayPenalties,
      group: groupLetter,
      stadium_id: groundToStadiumId[m.ground] || '1',
      finished: finished,
      time_elapsed: timeElapsed,
      type: roundInfo.type,
      date: parseOpenFootballDate(m.date, m.time)
    };
  });
};

const extractArray = (data, fallbackKey) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data[fallbackKey])) return data[fallbackKey];
    if (Array.isArray(data.teams)) return data.teams;
    if (Array.isArray(data.games)) return data.games;
    if (Array.isArray(data.matches)) return data.matches;
    const found = Object.values(data).find(v => Array.isArray(v));
    if (found) return found;
  }
  return [];
};

async function runTest() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const raw = await res.json();
    const openMatches = extractArray(raw, 'matches');
    console.log('Successfully fetched openMatches, count:', openMatches.length);
    const mapped = mapOpenFootballMatches(openMatches, fallback2026Teams);
    console.log('Successfully mapped matches, count:', mapped.length);
    console.log('Sample match:', JSON.stringify(mapped[0], null, 2));
  } catch (err) {
    console.error('ERROR IN MAPPING:', err);
  }
}

runTest();
