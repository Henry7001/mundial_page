import { stadiumDisplayInfo } from './dataHelpers';

// Standalone match normalization helper
export const normalizeMatchesData = (rawMatches, teamsList, stadiaList) => {
  const normalizedMatches = rawMatches.map(match => {
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

    const isLive =
      match.time_elapsed === 'live' ||
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
    if (match.type && match.type !== 'group') stageName = match.type;

    const groupLetter = match.group || homeTeam?.groups || homeTeam?.group || '';

    const stdInfo = stadium ? stadiumDisplayInfo[String(stadium.id)] : null;
    const venue = stdInfo?.name || stadium?.name_en || 'Estadio';
    const location =
      stdInfo?.location ||
      (stadium?.city_en && stadium?.country_en
        ? `${stadium.city_en}, ${stadium.country_en}`
        : stadium?.city_en || 'Ciudad');

    return {
      id: match.id,
      venue,
      location,
      status,
      stage_name: stageName,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      home_team_country: homeTeam?.fifa_code || 'TBD',
      away_team_country: awayTeam?.fifa_code || 'TBD',
      datetime: match.date || match.local_date,
      group: String(groupLetter).toUpperCase(),
      winner_code: finished
        ? homeScore > awayScore
          ? homeTeam?.fifa_code
          : awayScore > homeScore
          ? awayTeam?.fifa_code
          : homePenalties > awayPenalties
          ? homeTeam?.fifa_code
          : awayPenalties > homePenalties
          ? awayTeam?.fifa_code
          : null
        : null,
      home_team: {
        country: homeTeam?.fifa_code || 'TBD',
        name: homeTeam?.name_en || 'Winner',
        goals: homeScore,
        penalties: homePenalties,
      },
      away_team: {
        country: awayTeam?.fifa_code || 'TBD',
        name: awayTeam?.name_en || 'Winner',
        goals: awayScore,
        penalties: awayPenalties,
      },
    };
  });

  normalizedMatches.sort((a, b) => {
    const dateA = new Date(a.datetime).getTime();
    const dateB = new Date(b.datetime).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return parseInt(a.id || 0) - parseInt(b.id || 0);
  });

  return normalizedMatches;
};
