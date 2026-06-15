import { fallback2026Teams, fallback2026Stadia, fallback2026Groups } from './src/data/fallbackData2026.js';

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

const normalizeMatchesData = (rawMatches, teamsList, stadiaList) => {
  return rawMatches.map(match => {
    const homeTeam = teamsList.find(t => String(t.id) === String(match.home_team_id));
    const awayTeam = teamsList.find(t => String(t.id) === String(match.away_team_id));
    const stadium = stadiaList.find(s => String(s.id) === String(match.stadium_id));

    const finished = match.finished === 'TRUE' || match.finished === true || match.time_elapsed === 'completed';
    
    const matchDateStr = match.date || match.local_date;
    let isLiveByTime = false;
    if (matchDateStr) {
      const matchDate = new Date(matchDateStr);
      const now = new Date();
      const diffMs = now.getTime() - matchDate.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      isLiveByTime = !finished && diffMinutes >= 0 && diffMinutes <= 125;
    }

    const isLive = match.time_elapsed === 'live' || 
                   match.time_elapsed === 'inprogress' || 
                   match.time_elapsed === 'in_progress' || 
                   isLiveByTime;

    let status = 'future_scheduled';
    if (finished) status = 'completed';
    else if (isLive) status = 'in_progress';

    const homeScore = parseInt(match.home_score || 0);
    const awayScore = parseInt(match.away_score || 0);
    const homePenalties = parseInt(match.home_penalties || 0);
    const awayPenalties = parseInt(match.away_penalties || 0);

    let stageName = 'First stage';
    if (match.type && match.type !== 'group') {
      stageName = match.type;
    }

    const groupLetter = match.group || homeTeam?.groups || homeTeam?.group || '';

    return {
      id: match.id,
      venue: stadium?.name_en || 'Estadio',
      location: stadium?.city_en && stadium?.country_en ? `${stadium.city_en}, ${stadium.country_en}` : stadium?.city_en || 'Ciudad',
      status: status,
      stage_name: stageName,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      home_team_country: homeTeam?.fifa_code || 'TBD',
      away_team_country: awayTeam?.fifa_code || 'TBD',
      datetime: match.date || match.local_date,
      group: String(groupLetter).toUpperCase(),
      winner_code: finished 
        ? (homeScore > awayScore 
            ? homeTeam?.fifa_code 
            : awayScore > homeScore 
              ? awayTeam?.fifa_code 
              : (homePenalties > awayPenalties 
                  ? homeTeam?.fifa_code 
                  : awayPenalties > homePenalties 
                    ? awayTeam?.fifa_code 
                    : null)) 
        : null,
      home_team: {
        country: homeTeam?.fifa_code || 'TBD',
        name: homeTeam?.name_en || 'Winner',
        goals: homeScore,
        penalties: homePenalties
      },
      away_team: {
        country: awayTeam?.fifa_code || 'TBD',
        name: awayTeam?.name_en || 'Winner',
        goals: awayScore,
        penalties: awayPenalties
      }
    };
  });
};

const calculateGroupsStandings = (normalizedMatches, teamsList) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  return letters.map(letter => {
    const teamsInGroup = teamsList
      .filter(t => String(t.groups || t.group || '').toUpperCase() === letter)
      .map(t => ({
        id: String(t.id),
        country: t.fifa_code || 'TBD',
        name: t.name_en || 'Por definir',
        games_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_differential: 0,
        group_points: 0
      }));

    normalizedMatches.forEach(match => {
      if ((match.stage_name === 'First stage' || match.stage_name === 'group') && 
          match.status === 'completed' && 
          match.group === letter) {
        const home = teamsInGroup.find(t => t.id === String(match.home_team_id));
        const away = teamsInGroup.find(t => t.id === String(match.away_team_id));
        if (home && away) {
          home.games_played += 1;
          away.games_played += 1;
          home.goals_for += match.home_team.goals;
          home.goals_against += match.away_team.goals;
          away.goals_for += match.away_team.goals;
          away.goals_against += match.home_team.goals;

          if (match.home_team.goals > match.away_team.goals) {
            home.wins += 1;
            home.group_points += 3;
            away.losses += 1;
          } else if (match.away_team.goals > match.home_team.goals) {
            away.wins += 1;
            away.group_points += 3;
            home.losses += 1;
          } else {
            home.draws += 1;
            home.group_points += 1;
            away.draws += 1;
            away.group_points += 1;
          }
        }
      }
    });

    teamsInGroup.forEach(t => {
      t.goal_differential = t.goals_for - t.goals_against;
    });

    teamsInGroup.sort((a, b) => {
      if (b.group_points !== a.group_points) return b.group_points - a.group_points;
      if (b.goal_differential !== a.goal_differential) return b.goal_differential - a.goal_differential;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return a.name.localeCompare(b.name);
    });

    return {
      letter: letter,
      teams: teamsInGroup
    };
  });
};

async function testFull() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
    const raw = await res.json();
    const openMatches = extractArray(raw, 'matches');
    const mapped = mapOpenFootballMatches(openMatches, fallback2026Teams);
    const normalized = normalizeMatchesData(mapped, fallback2026Teams, fallback2026Stadia);
    const groups = calculateGroupsStandings(normalized, fallback2026Teams);
    console.log('Successfully processed full pipeline! Groups count:', groups.length);
    console.log('Group A standings sample:', JSON.stringify(groups[0].teams.slice(0, 2), null, 2));
  } catch (err) {
    console.error('PIPELINE FAILED:', err);
  }
}

testFull();
