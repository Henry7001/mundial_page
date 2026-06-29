import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Search, 
  MapPin, 
  Calendar, 
  RefreshCw, 
  TableProperties, 
  CalendarDays, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { getCountryNameEs, getCountryFlagUrl, countryMap } from './utils/countries';
import { 
  fallback2026Games, 
  fallback2026Teams, 
  fallback2026Groups, 
  fallback2026Stadia 
} from './data/fallbackData2026';

// Helper to safely extract arrays from API responses that might be wrapped in objects
const extractArray = (data, fallbackKey) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data[fallbackKey])) return data[fallbackKey];
    if (Array.isArray(data.teams)) return data.teams;
    if (Array.isArray(data.games)) return data.games;
    if (Array.isArray(data.matches)) return data.matches;
    if (Array.isArray(data.stadiums)) return data.stadiums;
    if (Array.isArray(data.groups)) return data.groups;
    
    // Look for any array inside the object
    const foundArray = Object.values(data).find(v => Array.isArray(v));
    if (foundArray) return foundArray;
  }
  return [];
};

// Helper to map openfootball team name to local fallback team ID
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

  // Try matching via countryMap keys/values
  const entry = Object.entries(countryMap).find(([code, c]) => {
    return c.nameEn.toLowerCase() === cleanName || c.nameEs.toLowerCase() === cleanName;
  });
  if (entry) {
    const matched = teamsList.find(t => t.fifa_code === entry[0]);
    if (matched) return matched.id;
  }
  return null;
};

// Ground to stadium ID mapping
const groundToStadiumId = {
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
  'Los Angeles': '16'
};

const mapRoundToTypeAndStage = (round) => {
  if (!round) return { type: 'group', stageName: 'First stage' };
  const r = round.toLowerCase();
  if (r.includes('matchday')) {
    return { type: 'group', stageName: 'First stage' };
  }
  if (r.includes('32')) {
    return { type: 'r32', stageName: 'Round of 32' };
  }
  if (r.includes('16')) {
    return { type: 'r16', stageName: 'Round of 16' };
  }
  if (r.includes('quarter')) {
    return { type: 'quarter', stageName: 'Quarter-finals' };
  }
  if (r.includes('semi')) {
    return { type: 'semi', stageName: 'Semi-finals' };
  }
  if (r.includes('third') || r.includes('3rd') || r.includes('place')) {
    return { type: 'third', stageName: 'Play-off for third place' };
  }
  if (r.includes('final')) {
    return { type: 'final', stageName: 'Final' };
  }
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

const stadiumDisplayInfo = {
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
  '15': { name: 'Levi\'s Stadium', location: 'San Francisco/Santa Clara, USA' },
  '16': { name: 'SoFi Stadium', location: 'Los Ángeles/Inglewood, USA' }
};

// Standalone match normalization helper
const normalizeMatchesData = (rawMatches, teamsList, stadiaList) => {
  const normalizedMatches = rawMatches.map(match => {
    const homeTeam = teamsList.find(t => String(t.id) === String(match.home_team_id));
    const awayTeam = teamsList.find(t => String(t.id) === String(match.away_team_id));
    const stadium = stadiaList.find(s => String(s.id) === String(match.stadium_id));

    const finished = match.finished === 'TRUE' || match.finished === true || match.time_elapsed === 'completed';
    
    // Dynamically check if the match should be live based on current time
    const matchDateStr = match.date || match.local_date;
    let isLiveByTime = false;
    if (matchDateStr) {
      const matchDate = new Date(matchDateStr);
      const now = new Date();
      const diffMs = now.getTime() - matchDate.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      // Live if started in the last 125 minutes (regular time + halftime + extra padding) and not completed
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

    // Determine match stage
    let stageName = 'First stage';
    if (match.type && match.type !== 'group') {
      stageName = match.type;
    }

    // Determine group letter
    const groupLetter = match.group || homeTeam?.groups || homeTeam?.group || '';

    const stdInfo = stadium ? stadiumDisplayInfo[String(stadium.id)] : null;
    const venue = stdInfo?.name || stadium?.name_en || 'Estadio';
    const location = stdInfo?.location || (stadium?.city_en && stadium?.country_en ? `${stadium.city_en}, ${stadium.country_en}` : stadium?.city_en || 'Ciudad');

    return {
      id: match.id,
      venue: venue,
      location: location,
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

  // Sort matches: Chronologically by date first, then by match ID
  normalizedMatches.sort((a, b) => {
    const dateA = new Date(a.datetime).getTime();
    const dateB = new Date(b.datetime).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return parseInt(a.id || 0) - parseInt(b.id || 0);
  });

  return normalizedMatches;
};

// Standalone standings calculation helper
const calculateGroupsStandings = (normalizedMatches, teamsList) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  return letters.map(letter => {
    // Find all teams assigned to this group
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

    // Calculate stats based on completed and live matches in this group
    normalizedMatches.forEach(match => {
      if ((match.stage_name === 'First stage' || match.stage_name === 'group') && 
          (match.status === 'completed' || match.status === 'in_progress' || match.status === 'simulated') && 
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

    // Recalculate goal differential for each team
    teamsInGroup.forEach(t => {
      t.goal_differential = t.goals_for - t.goals_against;
    });

    // Sort: points desc, goal diff desc, goals for desc, then alphabetical
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

// Extractor and sorter of best third-placed teams from the groups (for 2026 World Cup 48-team format)
const calculateBestThirds = (groupsList) => {
  if (!groupsList || groupsList.length === 0) return [];
  
  const thirds = groupsList.map(group => {
    // Index 2 is the 3rd-placed team in each group (sorted lists)
    const thirdTeam = group.teams && group.teams[2];
    if (!thirdTeam) return null;
    return {
      ...thirdTeam,
      group: group.letter
    };
  }).filter(Boolean);

  // FIFA World Cup tie-breakers for third-placed teams:
  // 1. Points
  // 2. Goal Difference
  // 3. Goals Scored
  // 4. Wins
  // 5. Stable sorting fallback (group letter)
  thirds.sort((a, b) => {
    if (b.group_points !== a.group_points) return b.group_points - a.group_points;
    if (b.goal_differential !== a.goal_differential) return b.goal_differential - a.goal_differential;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.group.localeCompare(b.group);
  });

  return thirds;
};

// Pre-defined pairings for the 16 Round of 32 matches in the 2026 World Cup format
const slotMappings = [
  { id: 73, name: "M73", home: { type: "runner_up", group: "A" }, away: { type: "runner_up", group: "B" } },
  { id: 74, name: "M74", home: { type: "winner", group: "E" }, away: { type: "third", allowed: ['A','B','C','D','F'] } },
  { id: 75, name: "M75", home: { type: "winner", group: "F" }, away: { type: "runner_up", group: "C" } },
  { id: 76, name: "M76", home: { type: "winner", group: "C" }, away: { type: "runner_up", group: "F" } },
  { id: 77, name: "M77", home: { type: "winner", group: "I" }, away: { type: "third", allowed: ['C','D','F','G','H'] } },
  { id: 78, name: "M78", home: { type: "runner_up", group: "E" }, away: { type: "runner_up", group: "I" } },
  { id: 79, name: "M79", home: { type: "winner", group: "A" }, away: { type: "third", allowed: ['C','E','F','H','I'] } },
  { id: 80, name: "M80", home: { type: "winner", group: "L" }, away: { type: "third", allowed: ['E','H','I','J','K'] } },
  { id: 81, name: "M81", home: { type: "winner", group: "D" }, away: { type: "third", allowed: ['B','E','F','I','J'] } },
  { id: 82, name: "M82", home: { type: "winner", group: "G" }, away: { type: "third", allowed: ['A','E','H','I','J'] } },
  { id: 83, name: "M83", home: { type: "runner_up", group: "K" }, away: { type: "runner_up", group: "L" } },
  { id: 84, name: "M84", home: { type: "winner", group: "H" }, away: { type: "runner_up", group: "J" } },
  { id: 85, name: "M85", home: { type: "winner", group: "B" }, away: { type: "third", allowed: ['E','F','G','I','J'] } },
  { id: 86, name: "M86", home: { type: "winner", group: "J" }, away: { type: "runner_up", group: "H" } },
  { id: 87, name: "M87", home: { type: "winner", group: "K" }, away: { type: "third", allowed: ['D','E','I','J','L'] } },
  { id: 88, name: "M88", home: { type: "runner_up", group: "D" }, away: { type: "runner_up", group: "G" } },
];

const resolveTeam = (slot, groupsList, bestThirdsList, showPossibleMatches = true, matchId = null, allocatedThirdsMap = {}, apiMatch = null, isHome = true) => {
  if (!showPossibleMatches && apiMatch) {
    const apiTeam = isHome ? apiMatch.home_team : apiMatch.away_team;
    const apiCountry = isHome ? apiMatch.home_team_country : apiMatch.away_team_country;
    if (apiTeam && apiTeam.name) {
      return {
        country: apiCountry || "TBD",
        name: apiTeam.name,
        isPlaceholder: !apiCountry,
        label: getCountryNameEs(apiCountry || "TBD", apiTeam.name)
      };
    }
  }

  if (!groupsList || groupsList.length === 0) {
    return { country: "TBD", name: "Por definir", isPlaceholder: true, label: "Por definir" };
  }
  if (slot.type === "winner" || slot.type === "runner_up") {
    const group = groupsList.find(g => g.letter === slot.group);
    if (group && group.teams && group.teams.length > 0) {
      // Check if group is decided based on showPossibleMatches
      const isDecided = showPossibleMatches 
        ? group.teams.some(t => t.games_played > 0)
        : group.teams.every(t => t.games_played === 3);
      if (isDecided) {
        const team = slot.type === "winner" ? group.teams[0] : group.teams[1];
        if (team) {
          return {
            country: team.country,
            name: team.name,
            isPlaceholder: false,
            label: getCountryNameEs(team.country, team.name)
          };
        }
      }
      return {
        country: "TBD",
        name: `Por definir (${slot.type === "winner" ? "1°" : "2°"}${slot.group})`,
        isPlaceholder: true,
        label: `${slot.type === "winner" ? "1°" : "2°"} Grupo ${slot.group}`
      };
    }
  } else if (slot.type === "third") {
    const thirdTeam = allocatedThirdsMap[matchId];
    if (thirdTeam) {
      const group = groupsList.find(g => g.letter === thirdTeam.group);
      const isDecided = showPossibleMatches
        ? group && group.teams.some(t => t.games_played > 0)
        : group && group.teams.every(t => t.games_played === 3);
      if (isDecided) {
        return {
          country: thirdTeam.country,
          name: thirdTeam.name,
          isPlaceholder: false,
          label: getCountryNameEs(thirdTeam.country, thirdTeam.name)
        };
      }
    }
    const thirdSlots = slotMappings.filter(m => m.away.type === 'third' || m.home.type === 'third');
    const slotIndex = thirdSlots.findIndex(m => m.id === matchId);
    return {
      country: "TBD",
      name: `Por definir (Mejor 3°)`,
      isPlaceholder: true,
      label: `3° TBD${slotIndex >= 0 ? ` (#${slotIndex + 1})` : ''}`
    };
  }
  return { country: "TBD", name: "Por definir", isPlaceholder: true, label: "Por definir" };
};

const resolveKnockoutBracket = (groupsList, bestThirdsList, knockoutScores, showPossibleMatches = true, apiMatches = []) => {
  const matches = {};

  // Dynamically allocate best thirds to matches using backtracking
  const allocatedThirdsMap = {};
  const thirdSlots = slotMappings.filter(m => m.away.type === 'third' || m.home.type === 'third');
  
  if (bestThirdsList && bestThirdsList.length >= 8) {
    const thirdsToAllocate = bestThirdsList.slice(0, 8);
    let found = false;
    const used = new Array(8).fill(false);
    const currentAllocation = {};

    const backtrack = (slotIdx) => {
      if (slotIdx === 8) {
        found = true;
        return true;
      }
      const match = thirdSlots[slotIdx];
      const slotDef = match.home.type === 'third' ? match.home : match.away;
      
      for (let i = 0; i < 8; i++) {
        const team = thirdsToAllocate[i];
        if (!used[i] && slotDef.allowed.includes(team.group)) {
          used[i] = true;
          currentAllocation[match.id] = team;
          if (backtrack(slotIdx + 1)) return true;
          used[i] = false;
          delete currentAllocation[match.id];
        }
      }
      return false;
    };
    
    backtrack(0);
    
    if (found) {
      Object.assign(allocatedThirdsMap, currentAllocation);
    } else {
      // Fallback if no perfect match
      thirdSlots.forEach((match, i) => {
        allocatedThirdsMap[match.id] = thirdsToAllocate[i];
      });
    }
  } else {
    // Fallback if less than 8 thirds available
    thirdSlots.forEach((match, i) => {
      allocatedThirdsMap[match.id] = bestThirdsList && bestThirdsList[i] ? bestThirdsList[i] : null;
    });
  }

  // 1. Resolve Round of 32 (M73 - M88)
  slotMappings.forEach(mapping => {
    const apiMatch = apiMatches.find(m => parseInt(m.id) === parseInt(mapping.id));
    const homeTeam = resolveTeam(mapping.home, groupsList, bestThirdsList, showPossibleMatches, mapping.id, allocatedThirdsMap, apiMatch, true);
    const awayTeam = resolveTeam(mapping.away, groupsList, bestThirdsList, showPossibleMatches, mapping.id, allocatedThirdsMap, apiMatch, false);
    
    const score = knockoutScores[mapping.id] || {};
    let homeScore = score.home !== undefined ? score.home : null;
    let awayScore = score.away !== undefined ? score.away : null;
    let homePens = score.homePens || 0;
    let awayPens = score.awayPens || 0;

    // Use API match scores if they are available and no user simulation score has been defined yet
    if (homeScore === null && awayScore === null && apiMatch && (apiMatch.status === 'completed' || apiMatch.status === 'simulated')) {
      homeScore = apiMatch.home_team.goals;
      awayScore = apiMatch.away_team.goals;
      homePens = apiMatch.home_team.penalties || 0;
      awayPens = apiMatch.away_team.penalties || 0;
    }
    
    // Determine winner and loser
    let winner = null;
    let loser = null;
    if (homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) {
        winner = homeTeam;
        loser = awayTeam;
      } else if (awayScore > homeScore) {
        winner = awayTeam;
        loser = homeTeam;
      } else {
        if (homePens > awayPens) {
          winner = homeTeam;
          loser = awayTeam;
        } else if (awayPens > homePens) {
          winner = awayTeam;
          loser = homeTeam;
        } else {
          winner = homeTeam;
          loser = awayTeam;
        }
      }
    }

    matches[mapping.id] = {
      id: mapping.id,
      name: mapping.name,
      stage: 'r32',
      home: homeTeam,
      away: awayTeam,
      homeScore,
      awayScore,
      homePens,
      awayPens,
      winner,
      loser
    };
  });

  // Helper to resolve subsequent knockout rounds
  const resolveNextRoundMatch = (matchId, stage, homeSourceId, awaySourceId, isLoser = false) => {
    let homeTeam = null;
    let awayTeam = null;
    const apiMatch = apiMatches.find(m => parseInt(m.id) === parseInt(matchId));

    const homeSource = matches[homeSourceId];
    const awaySource = matches[awaySourceId];

    if (homeSource && homeSource.winner) {
      homeTeam = isLoser ? homeSource.loser : homeSource.winner;
    } else if (apiMatch && apiMatch.home_team && apiMatch.home_team.name) {
      homeTeam = {
         country: apiMatch.home_team_country || "TBD",
         name: apiMatch.home_team.name,
         isPlaceholder: !apiMatch.home_team_country,
         label: getCountryNameEs(apiMatch.home_team_country || "TBD", apiMatch.home_team.name)
      };
    } else if (showPossibleMatches && homeSource) {
      homeTeam = isLoser ? homeSource.loser : homeSource.winner;
    }

    if (awaySource && awaySource.winner) {
      awayTeam = isLoser ? awaySource.loser : awaySource.winner;
    } else if (apiMatch && apiMatch.away_team && apiMatch.away_team.name) {
      awayTeam = {
         country: apiMatch.away_team_country || "TBD",
         name: apiMatch.away_team.name,
         isPlaceholder: !apiMatch.away_team_country,
         label: getCountryNameEs(apiMatch.away_team_country || "TBD", apiMatch.away_team.name)
      };
    } else if (showPossibleMatches && awaySource) {
      awayTeam = isLoser ? awaySource.loser : awaySource.winner;
    }

    const score = knockoutScores[matchId] || {};
    let homeScore = score.home !== undefined ? score.home : null;
    let awayScore = score.away !== undefined ? score.away : null;
    let homePens = score.homePens || 0;
    let awayPens = score.awayPens || 0;

    // Use API match scores if they are available and no user simulation score has been defined yet
    if (homeScore === null && awayScore === null && apiMatch && (apiMatch.status === 'completed' || apiMatch.status === 'simulated')) {
      homeScore = apiMatch.home_team.goals;
      awayScore = apiMatch.away_team.goals;
      homePens = apiMatch.home_team.penalties || 0;
      awayPens = apiMatch.away_team.penalties || 0;
    }

    let winner = null;
    let loser = null;
    if (homeTeam && awayTeam && !homeTeam.isPlaceholder && !awayTeam.isPlaceholder && homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) {
        winner = homeTeam;
        loser = awayTeam;
      } else if (awayScore > homeScore) {
        winner = awayTeam;
        loser = homeTeam;
      } else {
        if (homePens > awayPens) {
          winner = homeTeam;
          loser = awayTeam;
        } else if (awayPens > homePens) {
          winner = awayTeam;
          loser = homeTeam;
        } else {
          winner = homeTeam;
          loser = awayTeam;
        }
      }
    }

    const defaultHomePlaceholder = {
      country: "TBD",
      name: `Ganador M${homeSourceId}`,
      isPlaceholder: true,
      label: isLoser ? `Perdedor M${homeSourceId}` : `Ganador M${homeSourceId}`
    };

    const defaultAwayPlaceholder = {
      country: "TBD",
      name: `Ganador M${awaySourceId}`,
      isPlaceholder: true,
      label: isLoser ? `Perdedor M${awaySourceId}` : `Ganador M${awaySourceId}`
    };

    matches[matchId] = {
      id: matchId,
      name: `M${matchId}`,
      stage,
      home: homeTeam || defaultHomePlaceholder,
      away: awayTeam || defaultAwayPlaceholder,
      homeScore,
      awayScore,
      homePens,
      awayPens,
      winner,
      loser
    };
  };

  // 2. Resolve Round of 16 (M89 - M96)
  resolveNextRoundMatch(89, 'r16', 74, 77);
  resolveNextRoundMatch(90, 'r16', 73, 75);
  resolveNextRoundMatch(91, 'r16', 76, 78);
  resolveNextRoundMatch(92, 'r16', 79, 80);
  resolveNextRoundMatch(93, 'r16', 83, 84);
  resolveNextRoundMatch(94, 'r16', 81, 82);
  resolveNextRoundMatch(95, 'r16', 86, 88);
  resolveNextRoundMatch(96, 'r16', 85, 87);

  // 3. Resolve Quarter-finals (M97 - M100)
  resolveNextRoundMatch(97, 'quarter', 89, 90);
  resolveNextRoundMatch(98, 'quarter', 93, 94);
  resolveNextRoundMatch(99, 'quarter', 91, 92);
  resolveNextRoundMatch(100, 'quarter', 95, 96);

  // 4. Resolve Semi-finals (M101 - M102)
  resolveNextRoundMatch(101, 'semi', 97, 98);
  resolveNextRoundMatch(102, 'semi', 99, 100);

  // 5. Resolve Third Place Play-off (M103)
  resolveNextRoundMatch(103, 'third', 101, 102, true);

  // 6. Resolve Final (M104)
  resolveNextRoundMatch(104, 'final', 101, 102);

  return matches;
};

function App() {
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const isGroupStageOver = new Date() > new Date('2026-06-28T00:00:00-05:00');
  
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'standings'
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState(isGroupStageOver ? 'knockout' : 'all'); // 'all' | 'group' | 'knockout'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'scheduled'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPossibleMatches, setShowPossibleMatches] = useState(false);

  // State and ref for interactive score edits
  const [customScores, setCustomScores] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('sim')) return JSON.parse(atob(urlParams.get('sim')));
      const saved = localStorage.getItem('mundialstats-customScores');
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });
  const customScoresRef = useRef(customScores);
  const rawMatchesRef = useRef([]);

  useEffect(() => {
    localStorage.setItem('mundialstats-customScores', JSON.stringify(customScores));
  }, [customScores]);

  // Theme selection state (Windows retro versions)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mundialstats-theme');
    const validThemes = ['win95', 'winxp', 'win7', 'win10-light', 'win10-dark', 'ios', 'android-light', 'android-dark'];
    return validThemes.includes(saved) ? saved : 'win95';
  });

  // Windows Menu Active Dropdown State
  const [activeMenu, setActiveMenu] = useState(null); // null | 'archivo' | 'ver' | 'tema' | 'ayuda'
  
  // Show Acerca de Modal State
  const [showAbout, setShowAbout] = useState(false);

  // Desktop environment states
  const [isMatchesOpen, setIsMatchesOpen] = useState(true);
  const [isMatchesMinimized, setIsMatchesMinimized] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(!isGroupStageOver);
  const [isStandingsMinimized, setIsStandingsMinimized] = useState(false);
  const [isThirdsOpen, setIsThirdsOpen] = useState(!isGroupStageOver);
  const [isThirdsMinimized, setIsThirdsMinimized] = useState(false);
  const [isBracketOpen, setIsBracketOpen] = useState(true);
  const [isBracketMinimized, setIsBracketMinimized] = useState(false);
  const [focusedWindow, setFocusedWindow] = useState(isGroupStageOver ? 'bracket' : 'matches'); // 'matches' | 'standings' | 'thirds' | 'bracket' | 'readme'
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState(isGroupStageOver ? 'bracket' : 'matches'); // 'matches' | 'standings' | 'thirds' | 'bracket' | 'settings'
  const [winPositions, setWinPositions] = useState({
    matches: { x: 40, y: 12 },
    standings: { x: 620, y: 12 },
    thirds: { x: 330, y: 64 },
    bracket: { x: 190, y: 110 },
    readme: { x: 280, y: 120 },
  });
  
  // Knockout stage simulation states
  const [activeKnockoutRound, setActiveKnockoutRound] = useState('r32'); // 'r32' | 'r16' | 'quarter' | 'semi-final'
  const [knockoutScores, setKnockoutScores] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('ko_sim')) return JSON.parse(atob(urlParams.get('ko_sim')));
      const saved = localStorage.getItem('mundialstats-knockoutScores');
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('mundialstats-knockoutScores', JSON.stringify(knockoutScores));
  }, [knockoutScores]);
  
  const dragStateRef = useRef(null);

  // Digital clock helper for taskbar tray
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guayaquil' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem('mundialstats-theme', selectedTheme);
  };

  const toggleMenu = (menu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const handleSalir = () => {
    // Reset custom simulation scores and all filter fields
    setCustomScores({});
    customScoresRef.current = {};
    setSearchQuery('');
    setStageFilter('all');
    setStatusFilter('all');
    setActiveTab('matches');
    setIsMatchesOpen(true);
    setIsMatchesMinimized(false);
    setIsStandingsOpen(true);
    setIsStandingsMinimized(false);
    setIsThirdsOpen(true);
    setIsThirdsMinimized(false);
    setIsBracketOpen(true);
    setIsBracketMinimized(false);
    setKnockoutScores({});
    setActiveKnockoutRound('r32');
    setFocusedWindow('matches');
    setShowPossibleMatches(true);
    window.history.replaceState({}, '', window.location.pathname);
    fetchData(); // reload fresh copy
    alert("Se ha reiniciado el software MundialStats a su estado original.");
  };

  const handleShare = () => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      if (Object.keys(customScores).length > 0) {
        url.searchParams.set('sim', btoa(JSON.stringify(customScores)));
      }
      if (Object.keys(knockoutScores).length > 0) {
        url.searchParams.set('ko_sim', btoa(JSON.stringify(knockoutScores)));
      }
      navigator.clipboard.writeText(url.toString());
      alert("¡Enlace copiado al portapapeles! Puedes compartirlo para que vean tu simulación.");
    } catch (err) {
      alert("Error al generar el enlace.");
    }
    setActiveMenu(null);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.win95-menu-item-wrapper') && !e.target.closest('.win95-start-btn') && !e.target.closest('.win95-start-menu')) {
        setActiveMenu(null);
        setIsStartMenuOpen(false);
      }
      if (!e.target.closest('.desktop-shortcut')) {
        setSelectedShortcut(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Window drag-and-drop for desktop
  useEffect(() => {
    const onMove = (e) => {
      if (!dragStateRef.current) return;
      const { key, sx, sy, px, py } = dragStateRef.current;
      setWinPositions(prev => ({
        ...prev,
        [key]: {
          x: Math.max(0, px + (e.clientX - sx)),
          y: Math.max(0, py + (e.clientY - sy)),
        },
      }));
    };
    const onUp = () => { dragStateRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleDragStart = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const p = winPositions[key];
    dragStateRef.current = { key, sx: e.clientX, sy: e.clientY, px: p.x, py: p.y };
  };

  // Desktop shortcut click handler
  const handleShortcutClick = (shortcutId, action) => {
    if (selectedShortcut === shortcutId) {
      action();
      setSelectedShortcut(null);
    } else {
      setSelectedShortcut(shortcutId);
    }
  };

  const handleScoreChange = (matchId, team, newScore) => {
    const currentCustom = customScoresRef.current;
    const newCustomScores = {
      ...currentCustom,
      [matchId]: {
        ...currentCustom[matchId],
        [team === 'home' ? 'home' : 'away']: newScore
      }
    };
    
    // Set default values if undefined
    if (newCustomScores[matchId].home === undefined) {
      const match = matches.find(m => m.id === matchId);
      newCustomScores[matchId].home = team === 'home' ? newScore : (match?.home_team?.goals || 0);
    }
    if (newCustomScores[matchId].away === undefined) {
      const match = matches.find(m => m.id === matchId);
      newCustomScores[matchId].away = team === 'away' ? newScore : (match?.away_team?.goals || 0);
    }

    customScoresRef.current = newCustomScores;
    setCustomScores(newCustomScores);

    // Reapply customization based on the updated custom scores
    normalizeAndSetData(rawMatchesRef.current, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
  };

  const handleResetScore = (matchId) => {
    const currentCustom = customScoresRef.current;
    const newCustomScores = { ...currentCustom };
    delete newCustomScores[matchId];

    customScoresRef.current = newCustomScores;
    setCustomScores(newCustomScores);

    // Reapply customization to remove simulation for this match
    normalizeAndSetData(rawMatchesRef.current, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
  };

  const handleKnockoutScoreChange = (matchId, team, val) => {
    setKnockoutScores(prev => {
      const prevScore = prev[matchId] || {};
      const newScore = { ...prevScore };
      if (val === null || isNaN(val)) {
        delete newScore[team];
      } else {
        newScore[team] = val;
      }
      // If we cleared goals, reset penalties
      if (newScore.home === undefined || newScore.away === undefined || newScore.home !== newScore.away) {
        newScore.homePens = 0;
        newScore.awayPens = 0;
      }
      return {
        ...prev,
        [matchId]: newScore
      };
    });
  };

  const handleKnockoutPensChange = (matchId, team, val) => {
    setKnockoutScores(prev => {
      const prevScore = prev[matchId] || {};
      return {
        ...prev,
        [matchId]: {
          ...prevScore,
          [team === 'home' ? 'homePens' : 'awayPens']: val
        }
      };
    });
  };

  const handleResetKnockoutMatch = (matchId) => {
    setKnockoutScores(prev => {
      const newScores = { ...prev };
      delete newScores[matchId];
      return newScores;
    });
  };

  // Normalization layer to convert 2026 schema to unified display schema
  const normalizeAndSetData = (rawMatches, teamsList, groupsList, stadiaList) => {
    rawMatchesRef.current = rawMatches;
    const normalizedMatches = normalizeMatchesData(rawMatches, teamsList, stadiaList);
    
    // Apply custom scores (only for live or scheduled matches, not completed ones)
    const currentCustom = customScoresRef.current;
    const mergedMatches = normalizedMatches.map(m => {
      if (currentCustom[m.id] && m.status !== 'completed') {
        return {
          ...m,
          status: m.status === 'in_progress' ? 'in_progress' : 'simulated',
          home_team: { ...m.home_team, goals: currentCustom[m.id].home },
          away_team: { ...m.away_team, goals: currentCustom[m.id].away }
        };
      }
      return m;
    });

    const calculatedGroups = calculateGroupsStandings(mergedMatches, teamsList);
    setMatches(mergedMatches);
    setGroups(calculatedGroups);
  };

  // Fetch 2026 data
  const fetchData = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      // 12-second timeout controller for API fetch operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json', { cache: 'no-cache', signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const raw = await res.json();
      
      const openMatches = extractArray(raw, 'matches');
      if (openMatches.length === 0) throw new Error('Estructura vacía');

      // Map openfootball matches to our raw matches format
      const mappedMatches = mapOpenFootballMatches(openMatches, fallback2026Teams);

      normalizeAndSetData(mappedMatches, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
      setIsFallback(false);
    } catch (error) {
      console.warn('API error, loading local 2026 dataset:', error.message);
      // Fallback
      normalizeAndSetData(fallback2026Games, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
      setIsFallback(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format Date (Spanish format)
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

  // Stage name translator
  const getStageNameEs = (stageName) => {
    switch(stageName) {
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
      default: return stageName;
    }
  };

  // Memoized derived states for performance
  const memoizedThirdsList = useMemo(() => calculateBestThirds(groups), [groups]);
  const memoizedBracketMatches = useMemo(() => resolveKnockoutBracket(groups, memoizedThirdsList, knockoutScores, showPossibleMatches, matches), [groups, memoizedThirdsList, knockoutScores, showPossibleMatches, matches]);

  const allDisplayMatches = useMemo(() => {
    const groupMatches = matches.filter(m => m.stage_name === 'First stage' || m.stage_name === 'group' || !m.stage_name || parseInt(m.id) <= 72);
    const bracketList = Object.values(memoizedBracketMatches).map(bm => {
      const originalMatch = matches.find(m => String(m.id) === String(bm.id));
      let status = 'future_scheduled';
      if (originalMatch && originalMatch.status === 'completed') {
        status = 'completed';
      } else if (bm.homeScore !== null && bm.awayScore !== null) {
        status = 'simulated';
      } else if (originalMatch && originalMatch.status === 'in_progress') {
        status = 'in_progress';
      }
      return {
        id: bm.id,
        venue: originalMatch?.venue || 'Estadio',
        location: originalMatch?.location || 'Por definir',
        status: status,
        stage_name: bm.stage,
        home_team_id: null,
        away_team_id: null,
        home_team_country: bm.home.country,
        away_team_country: bm.away.country,
        datetime: originalMatch?.datetime || originalMatch?.date || originalMatch?.local_date || null,
        group: '',
        winner_code: bm.winner ? bm.winner.country : null,
        home_team: {
          country: bm.home.country,
          name: bm.home.name,
          goals: bm.homeScore,
          penalties: bm.homePens || 0
        },
        away_team: {
          country: bm.away.country,
          name: bm.away.name,
          goals: bm.awayScore,
          penalties: bm.awayPens || 0
        },
        isKnockout: true,
        isPlaceholder: bm.home.isPlaceholder || bm.away.isPlaceholder
      };
    });
    return [...groupMatches, ...bracketList].sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [matches, memoizedBracketMatches]);

  // Filter and Search Matches
  const filteredMatches = allDisplayMatches.filter(match => {
    // Search Filter
    const homeTeamName = match.home_team?.name || '';
    const awayTeamName = match.away_team?.name || '';
    const homeTeamEs = getCountryNameEs(match.home_team_country, homeTeamName);
    const awayTeamEs = getCountryNameEs(match.away_team_country, awayTeamName);
    
    const matchesSearch = 
      homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      homeTeamEs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayTeamEs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (match.venue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (match.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (match.group ? `grupo ${String(match.group || '').toLowerCase()}`.includes(searchQuery.toLowerCase()) : false);

    if (!matchesSearch) return false;

    // Stage Filter
    if (stageFilter === 'group') {
      if (match.stage_name !== 'First stage' && match.stage_name !== 'group') return false;
    } else if (stageFilter === 'knockout') {
      if (match.stage_name === 'First stage' || match.stage_name === 'group') return false;
    }

    // Status Filter
    if (statusFilter === 'completed' && match.status !== 'completed') return false;
    if (statusFilter === 'scheduled' && match.status !== 'future_unscheduled' && match.status !== 'future_scheduled') return false;
    if (statusFilter === 'live' && match.status !== 'in_progress') return false;

    return true;
  });

  const renderMatchesContent = () => {
    return (
      <div className="win95-view-content">
        {/* Search & Filters */}
        <fieldset className="win95-groupbox filter-groupbox">
          <legend>Buscar y Filtrar Partidos</legend>
          <div className="win95-filters-grid">
            <div className="filter-input-row">
              <label htmlFor="search-input">Texto:</label>
              <input 
                id="search-input"
                type="text" 
                placeholder="Buscar país, estadio, ciudad..." 
                className="win95-input-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="filter-select-row">
              <label htmlFor="stage-filter">Fase:</label>
              <select 
                id="stage-filter"
                className="win95-select-control"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="all">Todas las Fases</option>
                <option value="group">Fase de Grupos</option>
                <option value="knockout">Fase Eliminatoria</option>
              </select>
            </div>
            <div className="filter-select-row">
              <label htmlFor="status-filter">Estado:</label>
              <select 
                id="status-filter"
                className="win95-select-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Finalizados</option>
                <option value="live">En Vivo</option>
                <option value="scheduled">Programados</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Matches Cards */}
        {filteredMatches.length === 0 ? (
          <div className="win95-sunken empty-state-retro">
            <span className="empty-state-icon">⚽</span>
            <h3>No se encontraron registros</h3>
            <p>Verifique los criterios de búsqueda o cambie los filtros.</p>
          </div>
        ) : (
          <div className="win95-matches-grid">
            {filteredMatches.map((match) => {
              const homeTeamName = match.home_team?.name || 'Por definir';
              const awayTeamName = match.away_team?.name || 'Por definir';
              const homeTeamCode = match.home_team_country || '';
              const awayTeamCode = match.away_team_country || '';
              
              const homeTeamEs = getCountryNameEs(homeTeamCode, homeTeamName);
              const awayTeamEs = getCountryNameEs(awayTeamCode, awayTeamName);
              const homeFlag = getCountryFlagUrl(homeTeamCode, homeTeamName);
              const awayFlag = getCountryFlagUrl(awayTeamCode, awayTeamName);
              const isKnockout = match.isKnockout;
              const koWinner = isKnockout && memoizedBracketMatches[match.id]?.winner;
              const isHomeWinner = isKnockout 
                ? koWinner && koWinner.country === homeTeamCode 
                : match.status === 'completed' && match.winner_code === homeTeamCode;
              const isAwayWinner = isKnockout 
                ? koWinner && koWinner.country === awayTeamCode 
                : match.status === 'completed' && match.winner_code === awayTeamCode;
              
              let statusLabel = 'Programado';
              let statusClass = 'scheduled';
              if (match.status === 'completed') {
                statusLabel = 'Finalizado';
                statusClass = 'completed';
              } else if (match.status === 'in_progress') {
                statusLabel = 'En Vivo';
                statusClass = 'live';
              } else if (match.status === 'simulated') {
                statusLabel = 'Simulado';
                statusClass = 'simulated';
              }

              return (
                <div key={match.id} className={`win95-match-card-win ${statusClass}`}>
                  <div className="win95-match-card-title">
                    <span>Match #{match.id} - {getStageNameEs(match.stage_name)}</span>
                    <span className={`match-badge-retro ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="win95-match-card-body">
                    <div className="retro-team-rows">
                      {/* Home Team */}
                      <div className="retro-team-row">
                        <div className="retro-team-name-flag">
                          <img src={homeFlag} alt={homeTeamEs} className="retro-flag" />
                          <span className={`retro-name-txt ${isHomeWinner ? 'winner-bold' : ''}`}>
                            {homeTeamEs}
                          </span>
                        </div>
                        {match.status !== 'completed' ? (
                          <input 
                            type="number" 
                            min="0"
                            className="win95-match-score-input"
                            value={
                              isKnockout 
                                ? (match.home_team.goals !== null && match.home_team.goals !== undefined ? match.home_team.goals : '')
                                : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.home_team.goals : '')
                            }
                            placeholder="-"
                            disabled={isKnockout && match.isPlaceholder}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value);
                              if (isKnockout) {
                                handleKnockoutScoreChange(match.id, 'home', val);
                              } else {
                                handleScoreChange(match.id, 'home', val === null ? 0 : val);
                              }
                            }}
                          />
                        ) : (
                          <span className={`retro-score-txt ${isHomeWinner ? 'winner-bold' : ''}`}>
                            {match.home_team.goals}
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="retro-team-row">
                        <div className="retro-team-name-flag">
                          <img src={awayFlag} alt={awayTeamEs} className="retro-flag" />
                          <span className={`retro-name-txt ${isAwayWinner ? 'winner-bold' : ''}`}>
                            {awayTeamEs}
                          </span>
                        </div>
                        {match.status !== 'completed' ? (
                          <input 
                            type="number" 
                            min="0"
                            className="win95-match-score-input"
                            value={
                              isKnockout 
                                ? (match.away_team.goals !== null && match.away_team.goals !== undefined ? match.away_team.goals : '')
                                : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.away_team.goals : '')
                            }
                            placeholder="-"
                            disabled={isKnockout && match.isPlaceholder}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value);
                              if (isKnockout) {
                                handleKnockoutScoreChange(match.id, 'away', val);
                              } else {
                                handleScoreChange(match.id, 'away', val === null ? 0 : val);
                              }
                            }}
                          />
                        ) : (
                          <span className={`retro-score-txt ${isAwayWinner ? 'winner-bold' : ''}`}>
                            {match.away_team.goals}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Penalty Row if Tied (simulated knockout) */}
                    {(() => {
                      if (!isKnockout) return null;
                      const homeScore = knockoutScores[match.id]?.home;
                      const awayScore = knockoutScores[match.id]?.away;
                      const isSimulated = homeScore !== undefined && awayScore !== undefined;
                      const isTied = isSimulated && homeScore === awayScore;
                      if (!isTied) return null;
                      return (
                        <div className="retro-match-penalties-input-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #ccc', fontSize: '10px', marginBottom: '6px' }}>
                          <span>Penaltis:</span>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              min="0"
                              className="win95-match-pens-input"
                              style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }}
                              value={knockoutScores[match.id]?.homePens || ''}
                              placeholder="P"
                              onChange={(e) => handleKnockoutPensChange(match.id, 'home', parseInt(e.target.value) || 0)}
                            />
                            <span>-</span>
                            <input 
                              type="number" 
                              min="0"
                              className="win95-match-pens-input"
                              style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }}
                              value={knockoutScores[match.id]?.awayPens || ''}
                              placeholder="P"
                              onChange={(e) => handleKnockoutPensChange(match.id, 'away', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {((!isKnockout && customScores[match.id] !== undefined) || (isKnockout && knockoutScores[match.id] !== undefined)) && (
                      <div className="retro-match-reset-row" style={{ marginTop: '2px', marginBottom: '6px', textAlign: 'right' }}>
                        <button 
                          className="win95-btn reset-score-btn" 
                          onClick={() => isKnockout ? handleResetKnockoutMatch(match.id) : handleResetScore(match.id)}
                          style={{ fontSize: '9px', padding: '1px 5px', height: '17px', minHeight: 'unset', minWidth: 'unset', verticalAlign: 'middle' }}
                          title="Restablecer original"
                        >
                          Restablecer
                        </button>
                      </div>
                    )}

                    {match.status === 'completed' && (match.home_team.penalties > 0 || match.away_team.penalties > 0) ? (
                      <div className="retro-match-penalties">
                        Penaltis: {match.home_team.penalties} - {match.away_team.penalties}
                      </div>
                    ) : null}

                    <div className="retro-match-details">
                      <div className="retro-detail-line">
                        <span className="icon">📍</span>
                        <span>{match.venue}, {match.location}</span>
                      </div>
                      <div className="retro-detail-line">
                        <span className="icon">📅</span>
                        <span>{formatMatchDate(match.datetime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStandingsContent = () => {
    return (
      <div className="win95-standings-grid">
        {groups.map((group) => (
          <div key={group.letter} className="win95-group-box-win">
            <div className="win95-group-card-title">
              <span>Grupo {group.letter}</span>
            </div>
            <div className="win95-sunken table-viewport">
              <table className="retro-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>POS</th>
                    <th>Equipo</th>
                    <th className="text-center">PJ</th>
                    <th className="text-center">G</th>
                    <th className="text-center">E</th>
                    <th className="text-center">P</th>
                    <th className="text-center hide-mobile">GF</th>
                    <th className="text-center hide-mobile">GC</th>
                    <th className="text-center">DG</th>
                    <th className="text-center text-bold">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((team, idx) => {
                    const isQualifying = idx < 2;
                    const teamEs = getCountryNameEs(team.country, team.name);
                    const flagUrl = getCountryFlagUrl(team.country, team.name);

                    return (
                      <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                        <td className="text-center text-bold idx-cell">
                          {idx + 1}
                        </td>
                        <td>
                          <div className="retro-table-team">
                            <img src={flagUrl} alt={teamEs} className="retro-table-flag" />
                            <span className="retro-table-team-name" title={teamEs}>
                              {teamEs}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">{team.games_played}</td>
                        <td className="text-center">{team.wins}</td>
                        <td className="text-center">{team.draws}</td>
                        <td className="text-center">{team.losses}</td>
                        <td className="text-center hide-mobile">{team.goals_for}</td>
                        <td className="text-center hide-mobile">{team.goals_against}</td>
                        <td className="text-center dg-cell" style={{ color: team.goal_differential > 0 ? 'var(--color-win-text)' : team.goal_differential < 0 ? 'var(--color-loss-text)' : 'inherit' }}>
                          {team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}
                        </td>
                        <td className="text-center text-bold pts-cell">{team.group_points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderThirdsContent = () => {
    const thirdsList = memoizedThirdsList;

    return (
      <div className="win95-view-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <fieldset className="win95-groupbox filter-groupbox">
          <legend>Criterios de Clasificación</legend>
          <div style={{ fontSize: '11px', lineHeight: '1.4', padding: '2px' }}>
            Los <strong>8 mejores terceros</strong> de la fase de grupos avanzan a Dieciseisavos de Final.
            Se ordenan por: <strong>PTS</strong> ➔ <strong>DG</strong> ➔ <strong>GF</strong> ➔ <strong>G (Victorias)</strong>.
          </div>
        </fieldset>

        <div className="win95-group-box-win" style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="win95-group-card-title">
            <span>Tabla General de Terceros Lugares</span>
          </div>
          <div className="win95-sunken table-viewport" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="retro-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>POS</th>
                  <th style={{ width: '45px' }} className="text-center">Grp</th>
                  <th>Equipo</th>
                  <th className="text-center">PJ</th>
                  <th className="text-center">G</th>
                  <th className="text-center">E</th>
                  <th className="text-center">P</th>
                  <th className="text-center hide-mobile">GF</th>
                  <th className="text-center hide-mobile">GC</th>
                  <th className="text-center">DG</th>
                  <th className="text-center text-bold">PTS</th>
                  <th className="text-center" style={{ width: '80px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {thirdsList.map((team, idx) => {
                  const isQualifying = idx < 8;
                  const teamEs = getCountryNameEs(team.country, team.name);
                  const flagUrl = getCountryFlagUrl(team.country, team.name);

                  return (
                    <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                      <td className="text-center text-bold idx-cell">
                        {idx + 1}
                      </td>
                      <td className="text-center text-bold" style={{ opacity: 0.8 }}>
                        {team.group}
                      </td>
                      <td>
                        <div className="retro-table-team">
                          <img src={flagUrl} alt={teamEs} className="retro-table-flag" />
                          <span className="retro-table-team-name" title={teamEs}>
                            {teamEs}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">{team.games_played}</td>
                      <td className="text-center">{team.wins}</td>
                      <td className="text-center">{team.draws}</td>
                      <td className="text-center">{team.losses}</td>
                      <td className="text-center hide-mobile">{team.goals_for}</td>
                      <td className="text-center hide-mobile">{team.goals_against}</td>
                      <td className="text-center dg-cell" style={{ color: team.goal_differential > 0 ? 'var(--color-win-text)' : team.goal_differential < 0 ? 'var(--color-loss-text)' : 'inherit' }}>
                        {team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}
                      </td>
                      <td className="text-center text-bold pts-cell">{team.group_points}</td>
                      <td className="text-center">
                        <span className={`retro-badge-status ${isQualifying ? 'qualify' : 'eliminate'}`} style={{
                          fontWeight: 'bold',
                          padding: '1px 4px',
                          fontSize: '9px',
                          border: '1px solid',
                          borderColor: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)',
                          color: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)',
                          background: isQualifying ? 'rgba(0, 128, 0, 0.05)' : 'rgba(204, 0, 0, 0.05)'
                        }}>
                          {isQualifying ? 'Clasificado' : 'Eliminado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBracketContent = () => {
    const thirdsList = memoizedThirdsList;
    const bracketMatches = memoizedBracketMatches;

    // Filter matches by current tab and sort by match ID
    const activeMatches = Object.values(bracketMatches)
      .filter(m => {
        if (activeKnockoutRound === 'r32') return m.stage === 'r32';
        if (activeKnockoutRound === 'r16') return m.stage === 'r16';
        if (activeKnockoutRound === 'quarter') return m.stage === 'quarter';
        if (activeKnockoutRound === 'final') return ['semi', 'third', 'final'].includes(m.stage);
        return false;
      })
      .sort((a, b) => {
        const r32Order = [73, 75, 74, 77, 81, 82, 83, 84, 76, 78, 79, 80, 85, 87, 86, 88];
        const r16Order = [89, 90, 93, 94, 91, 92, 95, 96];
        const quarterOrder = [97, 98, 99, 100];
        
        const getOrder = (id, stage) => {
          if (stage === 'r32') return r32Order.indexOf(parseInt(id));
          if (stage === 'r16') return r16Order.indexOf(parseInt(id));
          if (stage === 'quarter') return quarterOrder.indexOf(parseInt(id));
          return parseInt(id);
        };

        return getOrder(a.id, a.stage) - getOrder(b.id, b.stage);
      });

    return (
      <div className="win95-view-content bracket-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
        {/* Retro Folder Tabs */}
        <div className="win95-tabs-container" style={{ display: 'flex', gap: '2px', borderBottom: '2px solid var(--win-border-dark)', paddingBottom: '1px' }}>
          <button 
            className={`win95-tab-btn ${activeKnockoutRound === 'r32' ? 'active' : ''}`}
            onClick={() => setActiveKnockoutRound('r32')}
          >
            Dieciseisavos (R32)
          </button>
          <button 
            className={`win95-tab-btn ${activeKnockoutRound === 'r16' ? 'active' : ''}`}
            onClick={() => setActiveKnockoutRound('r16')}
          >
            Octavos (R16)
          </button>
          <button 
            className={`win95-tab-btn ${activeKnockoutRound === 'quarter' ? 'active' : ''}`}
            onClick={() => setActiveKnockoutRound('quarter')}
          >
            Cuartos (R8)
          </button>
          <button 
            className={`win95-tab-btn ${activeKnockoutRound === 'final' ? 'active' : ''}`}
            onClick={() => setActiveKnockoutRound('final')}
          >
            Semis y Final
          </button>
          {!isGroupStageOver && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', paddingRight: '4px', paddingBottom: '2px' }}>
              <input 
                type="checkbox" 
                id="showPossible"
                checked={showPossibleMatches}
                onChange={(e) => setShowPossibleMatches(e.target.checked)}
                style={{ margin: 0, cursor: 'pointer' }}
              />
              <label htmlFor="showPossible" style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--win-text)' }}>Posibles Matches</label>
            </div>
          )}
        </div>

        {/* Matches Grid */}
        <div className="win95-bracket-grid" style={{ flex: 1, overflowY: 'auto', padding: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', alignContent: 'start' }}>
          {activeMatches.map((m) => {
            const homeFlag = getCountryFlagUrl(m.home.country, m.home.name);
            const awayFlag = getCountryFlagUrl(m.away.country, m.away.name);
            const isSimulated = m.homeScore !== null && m.awayScore !== null;
            const isTied = isSimulated && m.homeScore === m.awayScore;
            
            // Spanish stage name
            let stageEs = "Dieciseisavos";
            if (m.stage === 'r16') stageEs = "Octavos";
            else if (m.stage === 'quarter') stageEs = "Cuartos de Final";
            else if (m.stage === 'semi') stageEs = "Semifinal";
            else if (m.stage === 'third') stageEs = "3° Puesto";
            else if (m.stage === 'final') stageEs = "Gran Final";

            const originalMatch = matches.find(om => String(om.id) === String(m.id));
            const isCompletedInApi = originalMatch && originalMatch.status === 'completed';
            const disabledInputs = m.home.isPlaceholder || m.away.isPlaceholder || isCompletedInApi;
            const showReset = isSimulated && !isCompletedInApi;

            return (
              <div key={m.id} className={`win95-match-card-win ${isSimulated ? 'simulated' : ''}`} style={{ margin: 0 }}>
                <div className="win95-match-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Match #{m.id} - {stageEs}</span>
                  {isSimulated && (
                    <span className="match-badge-retro simulated" style={{ fontSize: '8px', padding: '1px 3px' }}>Simulado</span>
                  )}
                </div>
                <div className="win95-match-card-body" style={{ padding: '6px' }}>
                  <div className="retro-team-rows">
                    {/* Home Team Row */}
                    <div className="retro-team-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div className="retro-team-name-flag" style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <img src={homeFlag} alt={m.home.label} className="retro-flag" style={{ width: '16px', height: '11px', objectFit: 'cover' }} />
                        <span 
                          className={`retro-name-txt ${m.winner && m.winner.country === m.home.country ? 'winner-bold' : ''}`} 
                          style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', color: m.home.isPlaceholder ? '#888' : 'inherit' }}
                          title={m.home.label}
                        >
                          {m.home.label}
                        </span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        className="win95-match-score-input"
                        style={{ width: '30px', textAlign: 'center', height: '18px', padding: 0 }}
                        value={m.homeScore !== null ? m.homeScore : ''}
                        disabled={disabledInputs}
                        placeholder={disabledInputs ? '-' : ''}
                        onChange={(e) => handleKnockoutScoreChange(m.id, 'home', e.target.value === '' ? null : parseInt(e.target.value))}
                      />
                    </div>

                    {/* Away Team Row */}
                    <div className="retro-team-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div className="retro-team-name-flag" style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <img src={awayFlag} alt={m.away.label} className="retro-flag" style={{ width: '16px', height: '11px', objectFit: 'cover' }} />
                        <span 
                          className={`retro-name-txt ${m.winner && m.winner.country === m.away.country ? 'winner-bold' : ''}`} 
                          style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', color: m.away.isPlaceholder ? '#888' : 'inherit' }}
                          title={m.away.label}
                        >
                          {m.away.label}
                        </span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        className="win95-match-score-input"
                        style={{ width: '30px', textAlign: 'center', height: '18px', padding: 0 }}
                        value={m.awayScore !== null ? m.awayScore : ''}
                        disabled={disabledInputs}
                        placeholder={disabledInputs ? '-' : ''}
                        onChange={(e) => handleKnockoutScoreChange(m.id, 'away', e.target.value === '' ? null : parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Penalty Row if Tied */}
                  {isTied && (
                    <div className="retro-match-penalties-input-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #ccc', fontSize: '10px' }}>
                      <span>Penaltis:</span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          min="0"
                          className="win95-match-pens-input"
                          style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }}
                          value={m.homePens || ''}
                          placeholder="P"
                          disabled={disabledInputs}
                          onChange={(e) => handleKnockoutPensChange(m.id, 'home', parseInt(e.target.value) || 0)}
                        />
                        <span>-</span>
                        <input 
                          type="number" 
                          min="0"
                          className="win95-match-pens-input"
                          style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }}
                          value={m.awayPens || ''}
                          placeholder="P"
                          disabled={disabledInputs}
                          onChange={(e) => handleKnockoutPensChange(m.id, 'away', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reset Button */}
                  {showReset && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button 
                        className="win95-btn reset-score-btn" 
                        onClick={() => handleResetKnockoutMatch(m.id)}
                        style={{ fontSize: '9px', padding: '1px 5px', height: '17px', minHeight: 'unset', minWidth: 'unset' }}
                      >
                        Restablecer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasLiveMatches = matches.some(m => m.status === 'in_progress');
  return (
    <div className={`win95-app-container theme-${theme}`}>
      
      {/* Desktop Environment (Widescreen Only) */}
      <div className="desktop-shell-wrapper">
        <div className="win95-desktop">
          {/* Desktop Icons */}
          <div className="desktop-shortcuts">
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'matches' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('matches', () => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); })}
            >
              <span className="shortcut-icon">⚽</span>
              <span className="shortcut-label">Partidos 2026</span>
            </div>
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'standings' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('standings', () => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); })}
            >
              <span className="shortcut-icon">📊</span>
              <span className="shortcut-label">Posiciones</span>
            </div>
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'thirds' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('thirds', () => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); })}
            >
              <span className="shortcut-icon">🏆</span>
              <span className="shortcut-label">Mejores Terceros</span>
            </div>
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'bracket' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('bracket', () => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); })}
            >
              <span className="shortcut-icon">🏅</span>
              <span className="shortcut-label">Cuadro Eliminatorio</span>
            </div>
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'reset' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('reset', handleSalir)}
            >
              <span className="shortcut-icon">🗑️</span>
              <span className="shortcut-label">Papelera de Reciclaje</span>
            </div>
            <div 
              className={`desktop-shortcut ${selectedShortcut === 'readme' ? 'selected' : ''}`}
              onClick={() => handleShortcutClick('readme', () => { setShowReadme(true); setFocusedWindow('readme'); })}
            >
              <span className="shortcut-icon">📝</span>
              <span className="shortcut-label">LEEME.txt</span>
            </div>
          </div>

          {/* Loading Window Dialog */}
          {loading ? (
            <div className="win95-window loading-dialog" style={{ width: '300px', margin: 'auto', zIndex: 1000, height: 'auto', minHeight: 'auto', alignSelf: 'center' }}>
              <div className="win95-title-bar">
                <div className="win95-title-text">
                  <span className="win95-title-icon">⌛</span>
                  <span>Iniciando MundialStats...</span>
                </div>
              </div>
              <div className="win95-dialog-body" style={{ textAlign: 'center', padding: '20px' }}>
                <div className="win95-hourglass" style={{ fontSize: '32px', marginBottom: '10px' }}>⌛</div>
                <p>Cargando base de datos de la Copa Mundial 2026...</p>
                <div className="win95-sunken loading-progress-bar" style={{ height: '14px', marginTop: '15px', position: 'relative', background: '#fff' }}>
                  <div className="progress-blocks"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Matches Window (Partidos) */}
              {isMatchesOpen && !isMatchesMinimized && (
                <div 
                  className={`win95-window desktop-window matches-window ${focusedWindow === 'matches' ? 'focused' : 'inactive'}`}
                  onClick={() => setFocusedWindow('matches')}
                  style={{ zIndex: focusedWindow === 'matches' ? 100 : 50, left: winPositions.matches.x, top: winPositions.matches.y }}
                >
                  {/* Title Bar */}
                  <div className="win95-title-bar" onMouseDown={(e) => handleDragStart('matches', e)} style={{ cursor: 'move', userSelect: 'none' }}>
                    <div className="win95-title-text">
                      <span className="win95-title-icon">⚽</span>
                      <span>Partidos - MundialStats 2026</span>
                    </div>
                    <div className="win95-title-buttons">
                      <button className="win95-title-btn" title="Minimizar" onClick={(e) => { e.stopPropagation(); setIsMatchesMinimized(true); }}>_</button>
                      <button className="win95-title-btn" title="Maximizar" disabled>⬜</button>
                      <button className="win95-title-btn close" title="Cerrar" onClick={(e) => { e.stopPropagation(); setIsMatchesOpen(false); }}>X</button>
                    </div>
                  </div>

                  {/* Menu Bar */}
                  <div className="win95-menu-bar">
                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'archivo_m' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('archivo_m'); }}>
                        <u>A</u>rchivo
                      </button>
                      {activeMenu === 'archivo_m' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={handleShare}>
                            <u>C</u>ompartir Simulación
                          </button>
                          <div className="win95-dropdown-separator"></div>
                          <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}>
                            <u>S</u>alir (Reiniciar)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ver_m' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ver_m'); }}>
                        <u>V</u>er
                      </button>
                      {activeMenu === 'ver_m' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); closeMenu(); }}>
                            Mostrar Tabla de <u>P</u>osiciones
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); closeMenu(); }}>
                            Mostrar Mejores <u>T</u>erceros
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); closeMenu(); }}>
                            Mostrar Cuadro <u>E</u>liminatorio
                          </button>
                          <div className="win95-dropdown-separator"></div>
                          <button className="win95-dropdown-item" onClick={() => { fetchData(); closeMenu(); }}>
                            <u>A</u>ctualizar datos (Fetch)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'tema_m' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('tema_m'); }}>
                        <u>T</u>ema
                      </button>
                      {activeMenu === 'tema_m' && (
                        <div className="win95-dropdown-menu">
                          <button className={`win95-dropdown-item ${theme === 'win95' ? 'checked' : ''}`} onClick={() => { toggleTheme('win95'); closeMenu(); }}>
                            {theme === 'win95' && '✓ '}Windows 95 / 98
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'winxp' ? 'checked' : ''}`} onClick={() => { toggleTheme('winxp'); closeMenu(); }}>
                            {theme === 'winxp' && '✓ '}Windows XP (Luna)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win7' ? 'checked' : ''}`} onClick={() => { toggleTheme('win7'); closeMenu(); }}>
                            {theme === 'win7' && '✓ '}Windows 7 (Aero)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-light' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-light'); closeMenu(); }}>
                            {theme === 'win10-light' && '✓ '}Windows 10 Light
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-dark' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-dark'); closeMenu(); }}>
                            {theme === 'win10-dark' && '✓ '}Windows 10 Dark
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ayuda_m' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ayuda_m'); }}>
                        A<u>y</u>uda
                      </button>
                      {activeMenu === 'ayuda_m' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setShowAbout(true); closeMenu(); }}>
                            <u>A</u>cerca de MundialStats...
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Window Body */}
                  <div className="win95-window-body">
                    {/* Status info bar */}
                    <div className="win95-toolbar">
                      <div className="win95-status-field field-badge">
                        {isFallback ? (
                          <span className="retro-badge fallback">⚠️ SIN CONEXIÓN</span>
                        ) : (
                          <span className="retro-badge live">🖧 CONECTADO</span>
                        )}
                      </div>
                      <div className="win95-status-field field-text">
                        {isFallback 
                          ? 'Se cargaron datos locales por falta de conexión.' 
                          : 'Conectado a la API en vivo.'}
                      </div>
                      <button className="win95-btn toolbar-btn" onClick={fetchData} disabled={isRefreshing}>
                        <RefreshCw size={12} className={isRefreshing ? 'spinner' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                        <span>{isRefreshing ? 'Cargando...' : 'Reintentar'}</span>
                      </button>
                    </div>

                    {/* Warning banner */}
                    {hasLiveMatches && (
                      <div className="win95-banner-warning">
                        <span className="warning-icon">⚡</span>
                        <div className="warning-text">
                          <strong>Partidos en vivo:</strong> Puedes editar los marcadores para simular la tabla.
                        </div>
                      </div>
                    )}

                    {/* Sunken content viewport */}
                    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto' }}>
                      {renderMatchesContent()}
                    </div>
                  </div>

                  {/* Windows Status Bar */}
                  <div className="win95-status-bar">
                    <div className="status-bar-pane pane-desc">
                      Partidos: {matches.length} cargados
                    </div>
                    <div className="status-bar-pane pane-time">
                      Mundial 2026
                    </div>
                  </div>
                </div>
              )}

              {/* Standings Window (Tabla de Posiciones) */}
              {isStandingsOpen && !isStandingsMinimized && (
                <div 
                  className={`win95-window desktop-window standings-window ${focusedWindow === 'standings' ? 'focused' : 'inactive'}`}
                  onClick={() => setFocusedWindow('standings')}
                  style={{ zIndex: focusedWindow === 'standings' ? 100 : 50, left: winPositions.standings.x, top: winPositions.standings.y }}
                >
                  {/* Title Bar */}
                  <div className="win95-title-bar" onMouseDown={(e) => handleDragStart('standings', e)} style={{ cursor: 'move', userSelect: 'none' }}>
                    <div className="win95-title-text">
                      <span className="win95-title-icon">📊</span>
                      <span>Tabla de Posiciones - MundialStats 2026</span>
                    </div>
                    <div className="win95-title-buttons">
                      <button className="win95-title-btn" title="Minimizar" onClick={(e) => { e.stopPropagation(); setIsStandingsMinimized(true); }}>_</button>
                      <button className="win95-title-btn" title="Maximizar" disabled>⬜</button>
                      <button className="win95-title-btn close" title="Cerrar" onClick={(e) => { e.stopPropagation(); setIsStandingsOpen(false); }}>X</button>
                    </div>
                  </div>

                  {/* Menu Bar */}
                  <div className="win95-menu-bar">
                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'archivo_s' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('archivo_s'); }}>
                        <u>A</u>rchivo
                      </button>
                      {activeMenu === 'archivo_s' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}>
                            <u>S</u>alir (Reiniciar)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ver_s' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ver_s'); }}>
                        <u>V</u>er
                      </button>
                      {activeMenu === 'ver_s' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); closeMenu(); }}>
                            Mostrar <u>P</u>artidos
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); closeMenu(); }}>
                            Mostrar Mejores <u>T</u>erceros
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); closeMenu(); }}>
                            Mostrar Cuadro <u>E</u>liminatorio
                          </button>
                          <div className="win95-dropdown-separator"></div>
                          <button className="win95-dropdown-item" onClick={() => { fetchData(); closeMenu(); }}>
                            <u>A</u>ctualizar datos (Fetch)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'tema_s' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('tema_s'); }}>
                        <u>T</u>ema
                      </button>
                      {activeMenu === 'tema_s' && (
                        <div className="win95-dropdown-menu">
                          <button className={`win95-dropdown-item ${theme === 'win95' ? 'checked' : ''}`} onClick={() => { toggleTheme('win95'); closeMenu(); }}>
                            {theme === 'win95' && '✓ '}Windows 95 / 98
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'winxp' ? 'checked' : ''}`} onClick={() => { toggleTheme('winxp'); closeMenu(); }}>
                            {theme === 'winxp' && '✓ '}Windows XP (Luna)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win7' ? 'checked' : ''}`} onClick={() => { toggleTheme('win7'); closeMenu(); }}>
                            {theme === 'win7' && '✓ '}Windows 7 (Aero)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-light' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-light'); closeMenu(); }}>
                            {theme === 'win10-light' && '✓ '}Windows 10 Light
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-dark' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-dark'); closeMenu(); }}>
                            {theme === 'win10-dark' && '✓ '}Windows 10 Dark
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ayuda_s' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ayuda_s'); }}>
                        A<u>y</u>uda
                      </button>
                      {activeMenu === 'ayuda_s' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setShowAbout(true); closeMenu(); }}>
                            <u>A</u>cerca de MundialStats...
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Window Body */}
                  <div className="win95-window-body">
                    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto' }}>
                      {renderStandingsContent()}
                    </div>
                  </div>

                  {/* Windows Status Bar */}
                  <div className="win95-status-bar">
                    <div className="status-bar-pane pane-desc">
                      Tablas de Posiciones: Grupos A - L
                    </div>
                    <div className="status-bar-pane pane-time">
                      Mundial 2026
                    </div>
                  </div>
                </div>
              )}

              {/* Mejores Terceros Window */}
              {isThirdsOpen && !isThirdsMinimized && (
                <div 
                  className={`win95-window desktop-window thirds-window ${focusedWindow === 'thirds' ? 'focused' : 'inactive'}`}
                  onClick={() => setFocusedWindow('thirds')}
                  style={{ zIndex: focusedWindow === 'thirds' ? 100 : 50, left: winPositions.thirds.x, top: winPositions.thirds.y }}
                >
                  {/* Title Bar */}
                  <div className="win95-title-bar" onMouseDown={(e) => handleDragStart('thirds', e)} style={{ cursor: 'move', userSelect: 'none' }}>
                    <div className="win95-title-text">
                      <span className="win95-title-icon">🏆</span>
                      <span>Mejores Terceros - MundialStats 2026</span>
                    </div>
                    <div className="win95-title-buttons">
                      <button className="win95-title-btn" title="Minimizar" onClick={(e) => { e.stopPropagation(); setIsThirdsMinimized(true); }}>_</button>
                      <button className="win95-title-btn" title="Maximizar" disabled>⬜</button>
                      <button className="win95-title-btn close" title="Cerrar" onClick={(e) => { e.stopPropagation(); setIsThirdsOpen(false); }}>X</button>
                    </div>
                  </div>

                  {/* Menu Bar */}
                  <div className="win95-menu-bar">
                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'archivo_t' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('archivo_t'); }}>
                        <u>A</u>rchivo
                      </button>
                      {activeMenu === 'archivo_t' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}>
                            <u>S</u>alir (Reiniciar)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ver_t' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ver_t'); }}>
                        <u>V</u>er
                      </button>
                      {activeMenu === 'ver_t' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); closeMenu(); }}>
                            Mostrar <u>P</u>artidos
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); closeMenu(); }}>
                            Mostrar Tabla de <u>P</u>osiciones
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); closeMenu(); }}>
                            Mostrar Cuadro <u>E</u>liminatorio
                          </button>
                          <div className="win95-dropdown-separator"></div>
                          <button className="win95-dropdown-item" onClick={() => { fetchData(); closeMenu(); }}>
                            <u>A</u>ctualizar datos (Fetch)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'tema_t' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('tema_t'); }}>
                        <u>T</u>ema
                      </button>
                      {activeMenu === 'tema_t' && (
                        <div className="win95-dropdown-menu">
                          <button className={`win95-dropdown-item ${theme === 'win95' ? 'checked' : ''}`} onClick={() => { toggleTheme('win95'); closeMenu(); }}>
                            {theme === 'win95' && '✓ '}Windows 95 / 98
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'winxp' ? 'checked' : ''}`} onClick={() => { toggleTheme('winxp'); closeMenu(); }}>
                            {theme === 'winxp' && '✓ '}Windows XP (Luna)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win7' ? 'checked' : ''}`} onClick={() => { toggleTheme('win7'); closeMenu(); }}>
                            {theme === 'win7' && '✓ '}Windows 7 (Aero)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-light' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-light'); closeMenu(); }}>
                            {theme === 'win10-light' && '✓ '}Windows 10 Light
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-dark' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-dark'); closeMenu(); }}>
                            {theme === 'win10-dark' && '✓ '}Windows 10 Dark
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ayuda_t' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ayuda_t'); }}>
                        A<u>y</u>uda
                      </button>
                      {activeMenu === 'ayuda_t' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setShowAbout(true); closeMenu(); }}>
                            <u>A</u>cerca de MundialStats...
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Window Body */}
                  <div className="win95-window-body" style={{ minHeight: 0 }}>
                    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                      {renderThirdsContent()}
                    </div>
                  </div>

                  {/* Windows Status Bar */}
                  <div className="win95-status-bar">
                    <div className="status-bar-pane pane-desc">
                      Mejores terceros: Clasifican los 8 mejores
                    </div>
                    <div className="status-bar-pane pane-time">
                      Mundial 2026
                    </div>
                  </div>
                </div>
              )}

              {/* Cuadro Eliminatorio Window */}
              {isBracketOpen && !isBracketMinimized && (
                <div 
                  className={`win95-window desktop-window bracket-window ${focusedWindow === 'bracket' ? 'focused' : 'inactive'}`}
                  onClick={() => setFocusedWindow('bracket')}
                  style={{ zIndex: focusedWindow === 'bracket' ? 100 : 50, left: winPositions.bracket.x, top: winPositions.bracket.y }}
                >
                  {/* Title Bar */}
                  <div className="win95-title-bar" onMouseDown={(e) => handleDragStart('bracket', e)} style={{ cursor: 'move', userSelect: 'none' }}>
                    <div className="win95-title-text">
                      <span className="win95-title-icon">🏅</span>
                      <span>Cuadro Eliminatorio - MundialStats 2026</span>
                    </div>
                    <div className="win95-title-buttons">
                      <button className="win95-title-btn" title="Minimizar" onClick={(e) => { e.stopPropagation(); setIsBracketMinimized(true); }}>_</button>
                      <button className="win95-title-btn" title="Maximizar" disabled>⬜</button>
                      <button className="win95-title-btn close" title="Cerrar" onClick={(e) => { e.stopPropagation(); setIsBracketOpen(false); }}>X</button>
                    </div>
                  </div>

                  {/* Menu Bar */}
                  <div className="win95-menu-bar">
                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'archivo_b' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('archivo_b'); }}>
                        <u>A</u>rchivo
                      </button>
                      {activeMenu === 'archivo_b' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}>
                            <u>S</u>alir (Reiniciar)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ver_b' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ver_b'); }}>
                        <u>V</u>er
                      </button>
                      {activeMenu === 'ver_b' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); closeMenu(); }}>
                            Mostrar <u>P</u>artidos
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); closeMenu(); }}>
                            Mostrar Tabla de <u>P</u>osiciones
                          </button>
                          <button className="win95-dropdown-item" onClick={() => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); closeMenu(); }}>
                            Mostrar Mejores <u>T</u>erceros
                          </button>
                          <div className="win95-dropdown-separator"></div>
                          <button className="win95-dropdown-item" onClick={() => { fetchData(); closeMenu(); }}>
                            <u>A</u>ctualizar datos (Fetch)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'tema_b' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('tema_b'); }}>
                        <u>T</u>ema
                      </button>
                      {activeMenu === 'tema_b' && (
                        <div className="win95-dropdown-menu">
                          <button className={`win95-dropdown-item ${theme === 'win95' ? 'checked' : ''}`} onClick={() => { toggleTheme('win95'); closeMenu(); }}>
                            {theme === 'win95' && '✓ '}Windows 95 / 98
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'winxp' ? 'checked' : ''}`} onClick={() => { toggleTheme('winxp'); closeMenu(); }}>
                            {theme === 'winxp' && '✓ '}Windows XP (Luna)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win7' ? 'checked' : ''}`} onClick={() => { toggleTheme('win7'); closeMenu(); }}>
                            {theme === 'win7' && '✓ '}Windows 7 (Aero)
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-light' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-light'); closeMenu(); }}>
                            {theme === 'win10-light' && '✓ '}Windows 10 Light
                          </button>
                          <button className={`win95-dropdown-item ${theme === 'win10-dark' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10-dark'); closeMenu(); }}>
                            {theme === 'win10-dark' && '✓ '}Windows 10 Dark
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="win95-menu-item-wrapper">
                      <button className={`win95-menu-btn ${activeMenu === 'ayuda_b' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleMenu('ayuda_b'); }}>
                        A<u>y</u>uda
                      </button>
                      {activeMenu === 'ayuda_b' && (
                        <div className="win95-dropdown-menu">
                          <button className="win95-dropdown-item" onClick={() => { setShowAbout(true); closeMenu(); }}>
                            <u>A</u>cerca de MundialStats...
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Window Body */}
                  <div className="win95-window-body" style={{ minHeight: 0 }}>
                    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                      {renderBracketContent()}
                    </div>
                  </div>

                  {/* Windows Status Bar */}
                  <div className="win95-status-bar">
                    <div className="status-bar-pane pane-desc">
                      Fase Eliminatoria: Dieciseisavos a Final
                    </div>
                    <div className="status-bar-pane pane-time">
                      Mundial 2026
                    </div>
                  </div>
                </div>
              )}

              {/* LEEME.txt Block Editor (Notepad) */}
              {showReadme && (
                <div 
                  className={`win95-window desktop-window readme-window ${focusedWindow === 'readme' ? 'focused' : 'inactive'}`}
                  onClick={() => setFocusedWindow('readme')}
                  style={{ zIndex: focusedWindow === 'readme' ? 100 : 50, left: winPositions.readme.x, top: winPositions.readme.y, width: '320px', height: '350px' }}
                >
                  <div className="win95-title-bar" onMouseDown={(e) => handleDragStart('readme', e)} style={{ cursor: 'move', userSelect: 'none' }}>
                    <div className="win95-title-text">
                      <span className="win95-title-icon">📝</span>
                      <span>LEEME.txt - Bloc de notas</span>
                    </div>
                    <div className="win95-title-buttons">
                      <button className="win95-title-btn close" onClick={() => setShowReadme(false)}>X</button>
                    </div>
                  </div>
                  <div className="win95-window-body">
                    <textarea 
                      className="win95-input-control text-editor-area" 
                      readOnly 
                      value={`=== MundialStats 2026 ===

Bienvenido al simulador interactivo de la Copa Mundial de la FIFA 2026.

Instrucciones:
1. Haz clic en "Partidos 2026" para ver el fixture y modificar marcadores de partidos en vivo.
2. Abre la "Tabla de Posiciones" para ver el impacto en tiempo real.
3. Usa la barra de tareas e Inicio para cambiar el tema visual de Windows (95, XP, Vista, 7, 10).
4. Para reiniciar el software, usa la Papelera de Reciclaje o el menú de Inicio.`}
                      style={{ flex: 1, resize: 'none', fontFamily: 'Courier New, monospace', fontSize: '11px', lineHeight: '1.3' }}
                    />
                    <div className="about-btn-row" style={{ marginTop: '8px' }}>
                      <button className="win95-btn" onClick={() => setShowReadme(false)}>Cerrar</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* About Dialog moved to app-container root — see below desktop-shell-wrapper */}
        </div>

        {/* Taskbar fixed bottom */}
        <div className="win95-taskbar">
          {/* Start Button */}
          <button 
            className={`win95-start-btn ${isStartMenuOpen ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsStartMenuOpen(prev => !prev); }}
          >
            <span className="start-icon">🏁</span>
            <span>Inicio</span>
          </button>

          <div className="win95-taskbar-divider"></div>

          {/* Task Buttons */}
          <div className="win95-active-tasks">
            {isMatchesOpen && (
              <button 
                className={`taskbar-item ${(!isMatchesMinimized && focusedWindow === 'matches') ? 'active' : ''}`}
                onClick={() => {
                  if (isMatchesMinimized) {
                    setIsMatchesMinimized(false);
                    setFocusedWindow('matches');
                  } else if (focusedWindow === 'matches') {
                    setIsMatchesMinimized(true);
                  } else {
                    setFocusedWindow('matches');
                  }
                }}
              >
                <span className="taskbar-icon">⚽</span>
                <span>Partidos</span>
              </button>
            )}

            {isStandingsOpen && (
              <button 
                className={`taskbar-item ${(!isStandingsMinimized && focusedWindow === 'standings') ? 'active' : ''}`}
                onClick={() => {
                  if (isStandingsMinimized) {
                    setIsStandingsMinimized(false);
                    setFocusedWindow('standings');
                  } else if (focusedWindow === 'standings') {
                    setIsStandingsMinimized(true);
                  } else {
                    setFocusedWindow('standings');
                  }
                }}
              >
                <span className="taskbar-icon">📊</span>
                <span>Posiciones</span>
              </button>
            )}

            {isThirdsOpen && (
              <button 
                className={`taskbar-item ${(!isThirdsMinimized && focusedWindow === 'thirds') ? 'active' : ''}`}
                onClick={() => {
                  if (isThirdsMinimized) {
                    setIsThirdsMinimized(false);
                    setFocusedWindow('thirds');
                  } else if (focusedWindow === 'thirds') {
                    setIsThirdsMinimized(true);
                  } else {
                    setFocusedWindow('thirds');
                  }
                }}
              >
                <span className="taskbar-icon">🏆</span>
                <span>Mejores Terceros</span>
              </button>
            )}

            {isBracketOpen && (
              <button 
                className={`taskbar-item ${(!isBracketMinimized && focusedWindow === 'bracket') ? 'active' : ''}`}
                onClick={() => {
                  if (isBracketMinimized) {
                    setIsBracketMinimized(false);
                    setFocusedWindow('bracket');
                  } else if (focusedWindow === 'bracket') {
                    setIsBracketMinimized(true);
                  } else {
                    setFocusedWindow('bracket');
                  }
                }}
              >
                <span className="taskbar-icon">🏅</span>
                <span>Cuadro Eliminatorio</span>
              </button>
            )}
          </div>

          {/* System Tray */}
          <div className="win95-system-tray">
            {isFallback ? (
              <span className="tray-icon" title="Sin conexión - Fallback local">⚠️</span>
            ) : (
              <span className="tray-icon" title="Conexión en vivo activa">🖧</span>
            )}
            <span className="tray-time">{currentTime}</span>
          </div>
        </div>

        {/* Start Menu Popup */}
        {isStartMenuOpen && (
          <div className="win95-start-menu">
            <div className="start-menu-sidebar">
              <span className="sidebar-text">
                {theme === 'win95' ? 'Windows 95' :
                 theme === 'winxp' ? 'Windows XP' :
                 theme === 'win7' ? 'Windows 7' :
                 theme === 'win10-light' ? 'Windows 10 Light' :
                 theme === 'win10-dark' ? 'Windows 10 Dark' : 'Windows'}
              </span>
            </div>
            <div className="start-menu-list">
              <button 
                className="start-menu-item"
                onClick={() => {
                  setIsMatchesOpen(true);
                  setIsMatchesMinimized(false);
                  setFocusedWindow('matches');
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">⚽</span>
                <span className="item-label">Partidos 2026</span>
              </button>
              <button 
                className="start-menu-item"
                onClick={() => {
                  setIsStandingsOpen(true);
                  setIsStandingsMinimized(false);
                  setFocusedWindow('standings');
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">📊</span>
                <span className="item-label">Tabla de Posiciones</span>
              </button>
              <button 
                className="start-menu-item"
                onClick={() => {
                  setIsThirdsOpen(true);
                  setIsThirdsMinimized(false);
                  setFocusedWindow('thirds');
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">🏆</span>
                <span className="item-label">Mejores Terceros</span>
              </button>
              <button 
                className="start-menu-item"
                onClick={() => {
                  setIsBracketOpen(true);
                  setIsBracketMinimized(false);
                  setFocusedWindow('bracket');
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">🏅</span>
                <span className="item-label">Cuadro Eliminatorio</span>
              </button>
              
              {/* Submenu for Themes */}
              <div className="start-menu-item has-submenu">
                <span className="item-icon">🎨</span>
                <span className="item-label">Temas ➔</span>
                <div className="start-menu-submenu">
                  <button className={`submenu-item ${theme === 'win95' ? 'active' : ''}`} onClick={() => { toggleTheme('win95'); setIsStartMenuOpen(false); }}>
                    Windows 95 / 98
                  </button>
                  <button className={`submenu-item ${theme === 'winxp' ? 'active' : ''}`} onClick={() => { toggleTheme('winxp'); setIsStartMenuOpen(false); }}>
                    Windows XP (Luna)
                  </button>
                  <button className={`submenu-item ${theme === 'win7' ? 'active' : ''}`} onClick={() => { toggleTheme('win7'); setIsStartMenuOpen(false); }}>
                    Windows 7 (Aero)
                  </button>
                  <button className={`submenu-item ${theme === 'win10-light' ? 'active' : ''}`} onClick={() => { toggleTheme('win10-light'); setIsStartMenuOpen(false); }}>
                    Windows 10 Light
                  </button>
                  <button className={`submenu-item ${theme === 'win10-dark' ? 'active' : ''}`} onClick={() => { toggleTheme('win10-dark'); setIsStartMenuOpen(false); }}>
                    Windows 10 Dark
                  </button>
                </div>
              </div>

              <div className="start-menu-divider"></div>

              <button 
                className="start-menu-item"
                onClick={() => {
                  handleSalir();
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">🔄</span>
                <span className="item-label">Reiniciar Sistema</span>
              </button>
              <button 
                className="start-menu-item"
                onClick={() => {
                  setShowAbout(true);
                  setIsStartMenuOpen(false);
                }}
              >
                <span className="item-icon">❔</span>
                <span className="item-label">Acerca de...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile OS Shell Environment (Mobiles & Tablets Only) */}
      <div className="win95-mobile-shell">
        {/* Top Status Bar based on theme */}
        {theme === 'win10' ? (
          /* Android Status Bar */
          <div className="status-bar-android">
            <div className="status-bar-left">
              <span className="notif-icon">⚽</span>
              <span className="notif-icon">💬</span>
            </div>
            <div className="status-bar-center">{currentTime}</div>
            <div className="status-bar-right">
              <span className="signal-icon">📶</span>
              <span className="battery-icon">🔋 85%</span>
            </div>
          </div>
        ) : theme === 'win7' ? (
          /* iOS Status Bar */
          <div className="status-bar-ios">
            <div className="status-bar-left">
              <span className="carrier-text">Henry7001 5G</span>
              <span className="signal-icon">📶</span>
            </div>
            <div className="status-bar-center">{currentTime}</div>
            <div className="status-bar-right">
              <span className="battery-percent">85%</span>
              <span className="battery-icon">🔋</span>
            </div>
          </div>
        ) : (
          /* Windows Mobile / Pocket PC Status Bar */
          <div className="status-bar-winmobile">
            <div className="status-bar-left">
              <span className="winmobile-logo">🏁</span>
              <span className="winmobile-title">Pocket PC</span>
            </div>
            <div className="status-bar-right">
              <span className="signal-icon">📶</span>
              <span className="time-text">{currentTime}</span>
            </div>
          </div>
        )}

        {/* Mobile Header / Navigation Bar */}
        <div className="mobile-header">
          {theme.startsWith('win10') ? (
            /* Android Header */
            <div className="header-android">
              <h1>MundialStats 2026</h1>
              <button className="android-action-btn" onClick={fetchData} disabled={isRefreshing} title="Actualizar">
                🔄
              </button>
            </div>
          ) : theme === 'win7' ? (
            /* iOS Header */
            <div className="header-ios">
              <button className="ios-nav-btn-left" onClick={handleSalir}>Reset</button>
              <h1>MundialStats</h1>
              <button className="ios-nav-btn-right" onClick={fetchData} disabled={isRefreshing}>Refresh</button>
            </div>
          ) : (
            /* Windows Mobile Header */
            <div className="header-winmobile">
              <span>MundialStats 2026</span>
              <button className="winmobile-ok-btn" onClick={fetchData} disabled={isRefreshing}>ok</button>
            </div>
          )}
        </div>

        {/* Mobile Content Area */}
        <div className="mobile-content-area">
          {loading ? (
            <div className="win95-loading-wrapper" style={{ margin: 'auto', textAlign: 'center' }}>
              <div className="win95-hourglass">⌛</div>
              <p>Cargando base de datos...</p>
            </div>
          ) : (
            <>
              {activeMobileTab === 'matches' && (
                <div className="mobile-tab-content matches-tab">
                  {renderMatchesContent()}
                </div>
              )}

              {activeMobileTab === 'standings' && (
                <div className="mobile-tab-content standings-tab">
                  {renderStandingsContent()}
                </div>
              )}

              {activeMobileTab === 'thirds' && (
                <div className="mobile-tab-content thirds-tab">
                  {renderThirdsContent()}
                </div>
              )}

              {activeMobileTab === 'bracket' && (
                <div className="mobile-tab-content bracket-tab">
                  {renderBracketContent()}
                </div>
              )}

              {activeMobileTab === 'settings' && (
                <div className="mobile-tab-content settings-tab">
                  <div className="mobile-settings-page">
                    {/* Theme selection panel */}
                    <fieldset className="win95-groupbox">
                      <legend>Estilo de Interfaz</legend>
                      <div className="theme-options-list">
                        <button className={`win95-btn ${theme === 'winxp' ? 'default-btn' : ''}`} onClick={() => toggleTheme('winxp')}>
                          Windows Mobile
                        </button>
                        <button className={`win95-btn ${theme === 'ios' ? 'default-btn' : ''}`} onClick={() => toggleTheme('ios')}>
                          iOS
                        </button>
                        <button className={`win95-btn ${theme === 'android-light' ? 'default-btn' : ''}`} onClick={() => toggleTheme('android-light')}>
                          Android (Claro)
                        </button>
                        <button className={`win95-btn ${theme === 'android-dark' ? 'default-btn' : ''}`} onClick={() => toggleTheme('android-dark')}>
                          Android (Oscuro)
                        </button>
                      </div>
                    </fieldset>

                    {/* About application */}
                    <fieldset className="win95-groupbox" style={{ marginTop: '15px' }}>
                      <legend>Acerca de</legend>
                      <p style={{ fontSize: '11px', lineHeight: '1.4' }}>
                        <strong>MundialStats 2026</strong><br/>
                        Versión 1.0 (Mobile Edition)<br/>
                        Simulador interactivo de la Copa del Mundo 2026.<br/>
                        Derechos reservados © 2026 Henry7001
                      </p>
                      <button className="win95-btn" style={{ marginTop: '10px', width: '100%' }} onClick={() => setShowAbout(true)}>
                        Ver Licencia
                      </button>
                    </fieldset>

                    {/* Share system */}
                    <button className="win95-btn" style={{ marginTop: '20px', width: '100%', color: 'var(--color-win-text)', fontWeight: 'bold' }} onClick={handleShare}>
                      Compartir Simulación
                    </button>

                    {/* Reset system */}
                    <button className="win95-btn" style={{ marginTop: '10px', width: '100%', color: 'var(--color-loss-text)', fontWeight: 'bold' }} onClick={handleSalir}>
                      Reiniciar Simulación
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar based on theme */}
        {theme.startsWith('android') ? (
          /* Android Bottom Navigation */
          <div className="nav-android">
            <button className={`nav-android-item ${activeMobileTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveMobileTab('matches')}>
              <span className="nav-icon">📅</span>
              <span className="nav-label">Partidos</span>
            </button>
            <button className={`nav-android-item ${activeMobileTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('standings')}>
              <span className="nav-icon">🏆</span>
              <span className="nav-label">Posiciones</span>
            </button>
            <button className={`nav-android-item ${activeMobileTab === 'thirds' ? 'active' : ''}`} onClick={() => setActiveMobileTab('thirds')}>
              <span className="nav-icon">⭐</span>
              <span className="nav-label">Terceros</span>
            </button>
            <button className={`nav-android-item ${activeMobileTab === 'bracket' ? 'active' : ''}`} onClick={() => setActiveMobileTab('bracket')}>
              <span className="nav-icon">🏅</span>
              <span className="nav-label">Cuadro</span>
            </button>
            <button className={`nav-android-item ${activeMobileTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('settings')}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Ajustes</span>
            </button>
          </div>
        ) : theme === 'ios' ? (
          /* iOS Bottom Navigation */
          <div className="nav-ios">
            <button className={`nav-ios-item ${activeMobileTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveMobileTab('matches')}>
              <span className="nav-icon">📅</span>
              <span className="nav-label">Partidos</span>
            </button>
            <button className={`nav-ios-item ${activeMobileTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('standings')}>
              <span className="nav-icon">🏆</span>
              <span className="nav-label">Tablas</span>
            </button>
            <button className={`nav-ios-item ${activeMobileTab === 'thirds' ? 'active' : ''}`} onClick={() => setActiveMobileTab('thirds')}>
              <span className="nav-icon">⭐</span>
              <span className="nav-label">Terceros</span>
            </button>
            <button className={`nav-ios-item ${activeMobileTab === 'bracket' ? 'active' : ''}`} onClick={() => setActiveMobileTab('bracket')}>
              <span className="nav-icon">🏅</span>
              <span className="nav-label">Cuadro</span>
            </button>
            <button className={`nav-ios-item ${activeMobileTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('settings')}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Ajustes</span>
            </button>
          </div>
        ) : (
          /* Windows Mobile / Pocket PC Command Bar */
          <div className="nav-winmobile">
            <button className={`nav-winmobile-item ${activeMobileTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveMobileTab('matches')}>
              Partidos
            </button>
            <button className={`nav-winmobile-item ${activeMobileTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('standings')}>
              Posiciones
            </button>
            <button className={`nav-winmobile-item ${activeMobileTab === 'thirds' ? 'active' : ''}`} onClick={() => setActiveMobileTab('thirds')}>
              Terceros
            </button>
            <button className={`nav-winmobile-item ${activeMobileTab === 'bracket' ? 'active' : ''}`} onClick={() => setActiveMobileTab('bracket')}>
              Cuadro
            </button>
            <button className={`nav-winmobile-item ${activeMobileTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveMobileTab('settings')}>
              Herram.
            </button>
          </div>
        )}
      </div>

      {/* About Dialog (Acerca de) Modal — rendered at app root so it shows on both desktop & mobile */}
      {showAbout && (
        <div className="win95-modal-overlay">
          <div className="win95-window win95-dialog about-dialog">
            <div className="win95-title-bar">
              <div className="win95-title-text">
                <span>Acerca de MundialStats</span>
              </div>
              <div className="win95-title-buttons">
                <button className="win95-title-btn close" onClick={() => setShowAbout(false)}>X</button>
              </div>
            </div>
            <div className="win95-dialog-body">
              <div className="about-main-info">
                <div className="about-system-icon">🏆</div>
                <div className="about-text-content">
                  <h2>MundialStats 2026</h2>
                  <p>Versión 1.0 (Build 9500)</p>
                  <p>Derechos reservados © 2026 Henry7001</p>
                  <p className="license-text">Este programa está licenciado para el uso interactivo de simulación de la Copa del Mundo 2026.</p>
                </div>
              </div>
              <div className="win95-sunken about-description-box">
                Este software realiza solicitudes HTTP directas a una base de datos pública de fútbol en GitHub (openfootball/worldcup.json) para obtener los resultados programados del Mundial 2026. Permite modificar interactivamente los marcadores de los partidos en vivo para actualizar instantáneamente las tablas de posiciones de los Grupos A al L.
              </div>
              <div className="about-btn-row">
                <button className="win95-btn default-btn" onClick={() => setShowAbout(false)}>Aceptar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
