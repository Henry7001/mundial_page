import { getCountryNameEs } from './countries';

// Pre-defined pairings for the 16 Round of 32 matches in the 2026 World Cup format
export const slotMappings = [
  { id: 73, name: 'M73', home: { type: 'runner_up', group: 'A' }, away: { type: 'runner_up', group: 'B' } },
  { id: 77, name: 'M77', home: { type: 'winner', group: 'I' }, away: { type: 'third', allowed: ['C','D','F','G','H'] } },
  { id: 75, name: 'M75', home: { type: 'winner', group: 'F' }, away: { type: 'runner_up', group: 'C' } },
  { id: 76, name: 'M76', home: { type: 'winner', group: 'C' }, away: { type: 'runner_up', group: 'F' } },
  { id: 74, name: 'M74', home: { type: 'winner', group: 'E' }, away: { type: 'third', allowed: ['A','B','C','D','F'] } },
  { id: 78, name: 'M78', home: { type: 'runner_up', group: 'E' }, away: { type: 'runner_up', group: 'I' } },
  { id: 79, name: 'M79', home: { type: 'winner', group: 'A' }, away: { type: 'third', allowed: ['C','E','F','H','I'] } },
  { id: 80, name: 'M80', home: { type: 'winner', group: 'L' }, away: { type: 'third', allowed: ['E','H','I','J','K'] } },
  { id: 81, name: 'M81', home: { type: 'winner', group: 'D' }, away: { type: 'third', allowed: ['B','E','F','I','J'] } },
  { id: 82, name: 'M82', home: { type: 'winner', group: 'G' }, away: { type: 'third', allowed: ['A','E','H','I','J'] } },
  { id: 83, name: 'M83', home: { type: 'runner_up', group: 'K' }, away: { type: 'runner_up', group: 'L' } },
  { id: 84, name: 'M84', home: { type: 'winner', group: 'H' }, away: { type: 'runner_up', group: 'J' } },
  { id: 85, name: 'M85', home: { type: 'winner', group: 'B' }, away: { type: 'third', allowed: ['E','F','G','I','J'] } },
  { id: 86, name: 'M86', home: { type: 'winner', group: 'J' }, away: { type: 'runner_up', group: 'H' } },
  { id: 87, name: 'M87', home: { type: 'winner', group: 'K' }, away: { type: 'third', allowed: ['D','E','I','J','L'] } },
  { id: 88, name: 'M88', home: { type: 'runner_up', group: 'D' }, away: { type: 'runner_up', group: 'G' } },
];

export const calculateGroupsStandings = (normalizedMatches, teamsList) => {
  const letters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
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
        group_points: 0,
      }));

    normalizedMatches.forEach(match => {
      if (
        (match.stage_name === 'First stage' || match.stage_name === 'group') &&
        (match.status === 'completed' || match.status === 'in_progress' || match.status === 'simulated') &&
        match.group === letter
      ) {
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

    return { letter, teams: teamsInGroup };
  });
};

export const calculateBestThirds = (groupsList) => {
  if (!groupsList || groupsList.length === 0) return [];
  const thirds = groupsList
    .map(group => {
      const thirdTeam = group.teams && group.teams[2];
      if (!thirdTeam) return null;
      return { ...thirdTeam, group: group.letter };
    })
    .filter(Boolean);

  thirds.sort((a, b) => {
    if (b.group_points !== a.group_points) return b.group_points - a.group_points;
    if (b.goal_differential !== a.goal_differential) return b.goal_differential - a.goal_differential;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.group.localeCompare(b.group);
  });

  return thirds;
};

const resolveTeam = (slot, groupsList, bestThirdsList, showPossibleMatches = true, matchId = null, allocatedThirdsMap = {}, apiMatch = null, isHome = true) => {
  if (!showPossibleMatches && apiMatch) {
    const apiTeam = isHome ? apiMatch.home_team : apiMatch.away_team;
    const apiCountry = isHome ? apiMatch.home_team_country : apiMatch.away_team_country;
    if (apiTeam && apiTeam.name) {
      return {
        country: apiCountry || 'TBD',
        name: apiTeam.name,
        isPlaceholder: !apiCountry,
        label: getCountryNameEs(apiCountry || 'TBD', apiTeam.name),
      };
    }
  }
  if (!groupsList || groupsList.length === 0) {
    return { country: 'TBD', name: 'Por definir', isPlaceholder: true, label: 'Por definir' };
  }
  if (slot.type === 'winner' || slot.type === 'runner_up') {
    const group = groupsList.find(g => g.letter === slot.group);
    if (group && group.teams && group.teams.length > 0) {
      const isDecided = showPossibleMatches
        ? group.teams.some(t => t.games_played > 0)
        : group.teams.every(t => t.games_played === 3);
      if (isDecided) {
        const team = slot.type === 'winner' ? group.teams[0] : group.teams[1];
        if (team) {
          return {
            country: team.country,
            name: team.name,
            isPlaceholder: false,
            label: getCountryNameEs(team.country, team.name),
          };
        }
      }
      return {
        country: 'TBD',
        name: `Por definir (${slot.type === 'winner' ? '1°' : '2°'}${slot.group})`,
        isPlaceholder: true,
        label: `${slot.type === 'winner' ? '1°' : '2°'} Grupo ${slot.group}`,
      };
    }
  } else if (slot.type === 'third') {
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
          label: getCountryNameEs(thirdTeam.country, thirdTeam.name),
        };
      }
    }
    const thirdSlots = slotMappings.filter(m => m.away.type === 'third' || m.home.type === 'third');
    const slotIndex = thirdSlots.findIndex(m => m.id === matchId);
    return {
      country: 'TBD',
      name: 'Por definir (Mejor 3°)',
      isPlaceholder: true,
      label: `3° TBD${slotIndex >= 0 ? ` (#${slotIndex + 1})` : ''}`,
    };
  }
  return { country: 'TBD', name: 'Por definir', isPlaceholder: true, label: 'Por definir' };
};

export const resolveKnockoutBracket = (groupsList, bestThirdsList, knockoutScores, showPossibleMatches = true, apiMatches = []) => {
  const matches = {};

  const allocatedThirdsMap = {};
  const thirdSlots = slotMappings.filter(m => m.away.type === 'third' || m.home.type === 'third');

  if (bestThirdsList && bestThirdsList.length >= 8) {
    const thirdsToAllocate = bestThirdsList.slice(0, 8);
    const used = new Array(8).fill(false);
    const currentAllocation = {};
    let found = false;

    const backtrack = (slotIdx) => {
      if (slotIdx === 8) { found = true; return true; }
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
      thirdSlots.forEach((match, i) => { allocatedThirdsMap[match.id] = thirdsToAllocate[i]; });
    }
  } else {
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
    let homePens = score.homePens !== undefined && score.homePens !== null ? score.homePens : null;
    let awayPens = score.awayPens !== undefined && score.awayPens !== null ? score.awayPens : null;

    if (homeScore === null && awayScore === null && apiMatch && (apiMatch.status === 'completed' || apiMatch.status === 'simulated')) {
      homeScore = apiMatch.home_team.goals;
      awayScore = apiMatch.away_team.goals;
      homePens = apiMatch.home_team.penalties !== undefined && apiMatch.home_team.penalties !== null ? apiMatch.home_team.penalties : null;
      awayPens = apiMatch.away_team.penalties !== undefined && apiMatch.away_team.penalties !== null ? apiMatch.away_team.penalties : null;
    }

    let winner = null;
    let loser = null;
    if (homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) { winner = homeTeam; loser = awayTeam; }
      else if (awayScore > homeScore) { winner = awayTeam; loser = homeTeam; }
      else {
        const hp = homePens !== null ? homePens : 0;
        const ap = awayPens !== null ? awayPens : 0;
        if (hp > ap) { winner = homeTeam; loser = awayTeam; }
        else if (ap > hp) { winner = awayTeam; loser = homeTeam; }
        else { winner = homeTeam; loser = awayTeam; }
      }
    }

    matches[mapping.id] = { id: mapping.id, name: mapping.name, stage: 'r32', home: homeTeam, away: awayTeam, homeScore, awayScore, homePens, awayPens, winner, loser };
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
      homeTeam = { country: apiMatch.home_team_country || 'TBD', name: apiMatch.home_team.name, isPlaceholder: !apiMatch.home_team_country, label: getCountryNameEs(apiMatch.home_team_country || 'TBD', apiMatch.home_team.name) };
    } else if (showPossibleMatches && homeSource) {
      homeTeam = isLoser ? homeSource.loser : homeSource.winner;
    }

    if (awaySource && awaySource.winner) {
      awayTeam = isLoser ? awaySource.loser : awaySource.winner;
    } else if (apiMatch && apiMatch.away_team && apiMatch.away_team.name) {
      awayTeam = { country: apiMatch.away_team_country || 'TBD', name: apiMatch.away_team.name, isPlaceholder: !apiMatch.away_team_country, label: getCountryNameEs(apiMatch.away_team_country || 'TBD', apiMatch.away_team.name) };
    } else if (showPossibleMatches && awaySource) {
      awayTeam = isLoser ? awaySource.loser : awaySource.winner;
    }

    const score = knockoutScores[matchId] || {};
    let homeScore = score.home !== undefined ? score.home : null;
    let awayScore = score.away !== undefined ? score.away : null;
    let homePens = score.homePens !== undefined && score.homePens !== null ? score.homePens : null;
    let awayPens = score.awayPens !== undefined && score.awayPens !== null ? score.awayPens : null;

    if (homeScore === null && awayScore === null && apiMatch && (apiMatch.status === 'completed' || apiMatch.status === 'simulated')) {
      homeScore = apiMatch.home_team.goals;
      awayScore = apiMatch.away_team.goals;
      homePens = apiMatch.home_team.penalties !== undefined && apiMatch.home_team.penalties !== null ? apiMatch.home_team.penalties : null;
      awayPens = apiMatch.away_team.penalties !== undefined && apiMatch.away_team.penalties !== null ? apiMatch.away_team.penalties : null;
    }

    let winner = null;
    let loser = null;
    if (homeTeam && awayTeam && !homeTeam.isPlaceholder && !awayTeam.isPlaceholder && homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) { winner = homeTeam; loser = awayTeam; }
      else if (awayScore > homeScore) { winner = awayTeam; loser = homeTeam; }
      else {
        const hp = homePens !== null ? homePens : 0;
        const ap = awayPens !== null ? awayPens : 0;
        if (hp > ap) { winner = homeTeam; loser = awayTeam; }
        else if (ap > hp) { winner = awayTeam; loser = homeTeam; }
        else { winner = homeTeam; loser = awayTeam; }
      }
    }

    const defaultHomePlaceholder = { country: 'TBD', name: `Ganador M${homeSourceId}`, isPlaceholder: true, label: isLoser ? `Perdedor M${homeSourceId}` : `Ganador M${homeSourceId}` };
    const defaultAwayPlaceholder = { country: 'TBD', name: `Ganador M${awaySourceId}`, isPlaceholder: true, label: isLoser ? `Perdedor M${awaySourceId}` : `Ganador M${awaySourceId}` };

    matches[matchId] = { id: matchId, name: `M${matchId}`, stage, home: homeTeam || defaultHomePlaceholder, away: awayTeam || defaultAwayPlaceholder, homeScore, awayScore, homePens, awayPens, winner, loser };
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
