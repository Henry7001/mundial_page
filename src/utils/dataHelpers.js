import { getCountryNameEs, countryMap } from './countries';

// Helper to safely extract arrays from API responses that might be wrapped in objects
export const extractArray = (data, fallbackKey) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data[fallbackKey])) return data[fallbackKey];
    if (Array.isArray(data.teams)) return data.teams;
    if (Array.isArray(data.games)) return data.games;
    if (Array.isArray(data.matches)) return data.matches;
    if (Array.isArray(data.stadiums)) return data.stadiums;
    if (Array.isArray(data.groups)) return data.groups;
    const foundArray = Object.values(data).find(v => Array.isArray(v));
    if (foundArray) return foundArray;
  }
  return [];
};

// Helper to map openfootball team name to local fallback team ID
export const findTeamIdByName = (name, teamsList) => {
  if (!name) return null;
  let cleanName = name.trim().toLowerCase();
  if (cleanName === 'usa' || cleanName === 'united states') cleanName = 'states';
  if (cleanName === 'turkey') cleanName = 'turkiye';
  if (cleanName === 'czech republic') cleanName = 'czechia';
  cleanName = cleanName.replace('&', 'and');
  const team = teamsList.find(t => {
    const tName = t.name_en.toLowerCase();
    return tName === cleanName || cleanName.includes(tName) || tName.includes(cleanName);
  });
  if (team) return team.id;
  const entry = Object.entries(countryMap).find(([, c]) =>
    c.nameEn.toLowerCase() === cleanName || c.nameEs.toLowerCase() === cleanName
  );
  if (entry) {
    const matched = teamsList.find(t => t.fifa_code === entry[0]);
    if (matched) return matched.id;
  }
  return null;
};

// Ground to stadium ID mapping
export const groundToStadiumId = {
  'Mexico City': '1',
  'Guadalajara': '2',
  'Guadalajara (Zapopan)': '2',
  'Monterrey': '3',
  'Monterrey (Guadalupe)': '3',
  'Dallas': '4',
  'Dallas (Arlington)': '4',
  'Houston': '5',
  'Kansas City': '6',
  'Atlanta': '7',
  'Miami': '8',
  'Miami (Miami Gardens)': '8',
  'Boston': '9',
  'Boston (Foxborough)': '9',
  'Philadelphia': '10',
  'New York/New Jersey (East Rutherford)': '11',
  'New York': '11',
  'Toronto': '12',
  'Vancouver': '13',
  'Seattle': '14',
  'San Francisco Bay Area (Santa Clara)': '15',
  'Santa Clara': '15',
  'Los Angeles (Inglewood)': '16',
  'Los Angeles': '16',
};

export const stadiumDisplayInfo = {
  '1': { name: 'Estadio Azteca', location: 'Ciudad de México, México' },
  '2': { name: 'Estadio Akron', location: 'Guadalajara, México' },
  '3': { name: 'Estadio BBVA', location: 'Monterrey, México' },
  '4': { name: 'AT&T Stadium', location: 'Dallas/Arlington, USA' },
  '5': { name: 'NRG Stadium', location: 'Houston, USA' },
  '6': { name: 'Arrowhead Stadium', location: 'Kansas City, USA' },
  '7': { name: 'Mercedes-Benz Stadium', location: 'Atlanta, USA' },
  '8': { name: 'Hard Rock Stadium', location: 'Miami, USA' },
  '9': { name: 'Gillette Stadium', location: 'Boston/Foxborough, USA' },
  '10': { name: 'Lincoln Financial Field', location: 'Filadelfia, USA' },
  '11': { name: 'MetLife Stadium', location: 'Nueva York/Nueva Jersey, USA' },
  '12': { name: 'BMO Field', location: 'Toronto, Canadá' },
  '13': { name: 'BC Place', location: 'Vancouver, Canadá' },
  '14': { name: 'Lumen Field', location: 'Seattle, USA' },
  '15': { name: "Levi's Stadium", location: 'San Francisco/Santa Clara, USA' },
  '16': { name: 'SoFi Stadium', location: 'Los Ángeles/Inglewood, USA' },
};

export const mapRoundToTypeAndStage = (round) => {
  if (!round) return { type: 'group', stageName: 'First stage' };
  const r = round.toLowerCase();
  if (r.includes('matchday')) return { type: 'group', stageName: 'First stage' };
  if (r.includes('32')) return { type: 'r32', stageName: 'Round of 32' };
  if (r.includes('16')) return { type: 'r16', stageName: 'Round of 16' };
  if (r.includes('quarter')) return { type: 'quarter', stageName: 'Quarter-finals' };
  if (r.includes('semi')) return { type: 'semi', stageName: 'Semi-finals' };
  if (r.includes('third') || r.includes('3rd') || r.includes('place'))
    return { type: 'third', stageName: 'Play-off for third place' };
  if (r.includes('final')) return { type: 'final', stageName: 'Final' };
  return { type: 'group', stageName: 'First stage' };
};

export const parseOpenFootballDate = (dateStr, timeStr) => {
  try {
    if (!timeStr) return new Date(`${dateStr}T12:00:00Z`).toISOString();
    const parts = timeStr.trim().split(/\s+/);
    const time = parts[0] || '12:00';
    let offset = '+00:00';
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

export const mapOpenFootballMatches = (openMatches, teamsList) => {
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
      finished,
      time_elapsed: timeElapsed,
      type: roundInfo.type,
      date: parseOpenFootballDate(m.date, m.time),
    };
  });
};

// Format Date (Spanish format)
export const formatMatchDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return (
      date.toLocaleString('es-EC', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Guayaquil',
      }) + ' (ECU)'
    );
  } catch (e) {
    return dateString;
  }
};

// Stage name translator
export const getStageNameEs = (stageName) => {
  switch (stageName) {
    case 'First stage':
    case 'group':
      return 'Fase de Grupos';
    case 'Round of 32':
    case 'r32':
      return 'Dieciseisavos de Final';
    case 'Round of 16':
    case 'r16':
      return 'Octavos de Final';
    case 'Quarter-finals':
    case 'quarter':
      return 'Cuartos de Final';
    case 'Semi-finals':
    case 'semi':
      return 'Semifinal';
    case 'Play-off for third place':
    case 'third':
      return 'Tercer Puesto';
    case 'Final':
    case 'final':
      return 'Gran Final';
    default:
      return stageName;
  }
};
