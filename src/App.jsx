import { useState, useEffect, useRef } from 'react';
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
          (match.status === 'completed' || match.status === 'in_progress') && 
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

function App() {
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'standings'
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'group' | 'knockout'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'scheduled'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State and ref for interactive score edits
  const [customScores, setCustomScores] = useState({});
  const customScoresRef = useRef({});

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

    // Apply custom scores to matches state and recalculate standings
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          home_team: { ...m.home_team, goals: team === 'home' ? newScore : m.home_team.goals },
          away_team: { ...m.away_team, goals: team === 'away' ? newScore : m.away_team.goals }
        };
      }
      return m;
    });

    setMatches(updatedMatches);
    setGroups(calculateGroupsStandings(updatedMatches, fallback2026Teams));
  };

  // Normalization layer to convert 2026 schema to unified display schema
  const normalizeAndSetData = (rawMatches, teamsList, groupsList, stadiaList) => {
    const normalizedMatches = normalizeMatchesData(rawMatches, teamsList, stadiaList);
    
    // Apply custom scores (only for live or scheduled matches, not completed ones)
    const currentCustom = customScoresRef.current;
    const mergedMatches = normalizedMatches.map(m => {
      if (currentCustom[m.id] && m.status !== 'completed') {
        return {
          ...m,
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

  // Filter and Search Matches
  const filteredMatches = matches.filter(match => {
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
      `grupo ${String(match.group || '').toLowerCase()}`.includes(searchQuery.toLowerCase());

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

  const hasLiveMatches = matches.some(m => m.status === 'in_progress');

  return (
    <>
      {hasLiveMatches && (
        <div className="live-warning-banner">
          <div className="live-warning-content">
            <span className="live-warning-icon">⚡</span>
            <span>
              <strong>Partidos en vivo en progreso:</strong> Por limitaciones de recursos, los resultados no se actualizan automáticamente en tiempo real. Puedes <strong>modificar los marcadores directamente</strong> en las tarjetas para proyectar cómo iría la tabla de posiciones.
            </span>
          </div>
        </div>
      )}
      <header>
        <div className="brand">
          <span className="brand-icon">🏆</span>
          <h1>MundialStats 2026</h1>
        </div>
        <p>Resultados, marcadores en vivo, fixtures y tablas de posiciones del Mundial 2026 (Canadá, EE. UU. y México). <strong>Horarios en hora de Ecuador (UTC-5)</strong>.</p>
      </header>

      {/* Connection status banner */}
      <div className="status-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isFallback ? (
            <div className="status-badge fallback">
              <AlertCircle size={16} />
              <span>Caché / Datos locales</span>
            </div>
          ) : (
            <div className="status-badge live">
              <CheckCircle2 size={16} />
              <span>Conectado a API en vivo</span>
            </div>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isFallback 
              ? 'Se cargaron datos en caché/locales por falta de conexión o caída de la API.' 
              : 'Actualizado con datos del servidor en vivo.'}
          </span>
        </div>
        
        <button 
          className="refresh-btn" 
          onClick={fetchData} 
          disabled={isRefreshing}
          title="Actualizar datos desde el servidor"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <CalendarDays size={16} />
            <span>Partidos ({matches.length})</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            <TableProperties size={16} />
            <span>Posiciones (Grupos A-L)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="spinner-wrapper">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando datos del Mundial 2026...</p>
        </div>
      ) : (
        <>
          {activeTab === 'matches' ? (
            <div className="matches-view-container">
              {/* Search & Filters */}
              <div className="controls">
                <div className="search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Buscar país, estadio, ciudad o grupo..." 
                    className="input-control"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="filters-wrapper">
                  <div className="filter-wrapper" style={{ flex: 1 }}>
                    <select 
                      className="input-control" 
                      style={{ paddingLeft: '16px' }}
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                    >
                      <option value="all">Todas las Fases</option>
                      <option value="group">Fase de Grupos</option>
                      <option value="knockout">Fase Eliminatoria</option>
                    </select>
                  </div>
                  
                  <div className="filter-wrapper" style={{ flex: 1 }}>
                    <select 
                      className="input-control" 
                      style={{ paddingLeft: '16px' }}
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
              </div>

              {/* Matches List */}
              {filteredMatches.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">⚽</span>
                  <h3>No se encontraron partidos</h3>
                  <p>Intenta ajustar la búsqueda o los filtros aplicados.</p>
                </div>
              ) : (
                <div className="matches-list">
                  {filteredMatches.map((match) => {
                    const homeTeamName = match.home_team?.name || 'Por definir';
                    const awayTeamName = match.away_team?.name || 'Por definir';
                    const homeTeamCode = match.home_team_country || '';
                    const awayTeamCode = match.away_team_country || '';
                    
                    const homeTeamEs = getCountryNameEs(homeTeamCode, homeTeamName);
                    const awayTeamEs = getCountryNameEs(awayTeamCode, awayTeamName);
                    const homeFlag = getCountryFlagUrl(homeTeamCode, homeTeamName);
                    const awayFlag = getCountryFlagUrl(awayTeamCode, awayTeamName);

                    const isHomeWinner = match.status === 'completed' && match.winner_code === homeTeamCode;
                    const isAwayWinner = match.status === 'completed' && match.winner_code === awayTeamCode;
                    
                    let statusLabel = 'Programado';
                    let statusClass = 'scheduled';
                    if (match.status === 'completed') {
                      statusLabel = 'Finalizado';
                      statusClass = 'completed';
                    } else if (match.status === 'in_progress') {
                      statusLabel = 'En Vivo';
                      statusClass = 'live';
                    }

                    return (
                      <div key={match.id} className={`match-card ${statusClass}`}>
                        <div>
                          <div className="match-meta">
                            <span className="match-stage">{getStageNameEs(match.stage_name)}</span>
                            <span className={`match-status ${statusClass}`}>{statusLabel}</span>
                          </div>
                          
                          <div className="match-teams">
                            {/* Home Team */}
                            <div className="match-team-row">
                              <div className="match-team-info">
                                <img src={homeFlag} alt={homeTeamEs} className="match-team-flag" />
                                <span className={`match-team-name ${isHomeWinner ? 'winner' : match.status === 'completed' ? 'loser' : ''}`}>
                                  {homeTeamEs}
                                </span>
                              </div>
                              {match.status === 'in_progress' ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  className="match-score-input"
                                  value={match.home_team.goals}
                                  onChange={(e) => handleScoreChange(match.id, 'home', parseInt(e.target.value) || 0)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className={`match-team-score ${isHomeWinner ? 'winner' : match.status === 'completed' ? 'loser' : ''}`}>
                                  {match.status !== 'future_unscheduled' && match.status !== 'future_scheduled' ? match.home_team.goals : '-'}
                                </span>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="match-team-row">
                              <div className="match-team-info">
                                <img src={awayFlag} alt={awayTeamEs} className="match-team-flag" />
                                <span className={`match-team-name ${isAwayWinner ? 'winner' : match.status === 'completed' ? 'loser' : ''}`}>
                                  {awayTeamEs}
                                </span>
                              </div>
                              {match.status === 'in_progress' ? (
                                <input 
                                  type="number" 
                                  min="0"
                                  className="match-score-input"
                                  value={match.away_team.goals}
                                  onChange={(e) => handleScoreChange(match.id, 'away', parseInt(e.target.value) || 0)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className={`match-team-score ${isAwayWinner ? 'winner' : match.status === 'completed' ? 'loser' : ''}`}>
                                  {match.status !== 'future_unscheduled' && match.status !== 'future_scheduled' ? match.away_team.goals : '-'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Penalties shootout */}
                        {match.status === 'completed' && (match.home_team.penalties > 0 || match.away_team.penalties > 0) ? (
                          <div className="match-penalties">
                            Penaltis: {match.home_team.penalties} - {match.away_team.penalties}
                          </div>
                        ) : null}

                        <div className="match-details">
                          <div className="match-venue" title="Estadio y País">
                            <MapPin size={12} />
                            <span>{match.venue}, {match.location}</span>
                          </div>
                          <div className="match-date" title="Fecha y hora local">
                            <Calendar size={12} />
                            <span>{formatMatchDate(match.datetime)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Standings View */
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group.letter} className="group-card">
                  <div className="group-header">
                    <span>Grupo {group.letter}</span>
                  </div>
                  
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th className="text-center" style={{ width: '40px' }}>POS</th>
                          <th>Equipo</th>
                          <th className="text-center" title="Partidos Jugados">PJ</th>
                          <th className="text-center" title="Victorias">G</th>
                          <th className="text-center" title="Empates">E</th>
                          <th className="text-center" title="Derrotas">P</th>
                          <th className="text-center hide-mobile" title="Goles a Favor">GF</th>
                          <th className="text-center hide-mobile" title="Goles en Contra">GC</th>
                          <th className="text-center" title="Diferencia de Goles">DG</th>
                          <th className="text-center text-bold">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.teams.map((team, idx) => {
                          const isQualifying = idx < 2; // Top 2 advance
                          const teamEs = getCountryNameEs(team.country, team.name);
                          const flagUrl = getCountryFlagUrl(team.country, team.name);

                          return (
                            <tr key={team.country} className={isQualifying ? 'qualifying' : ''}>
                              <td className="text-center text-bold" style={{ color: isQualifying ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
                                {idx + 1}
                              </td>
                              <td>
                                <div className="team-cell">
                                  <img src={flagUrl} alt={teamEs} className="team-flag" />
                                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={teamEs}>
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
                              <td className="text-center" style={{ color: team.goal_differential > 0 ? 'var(--color-win)' : team.goal_differential < 0 ? 'var(--color-loss)' : 'inherit' }}>
                                {team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}
                              </td>
                              <td className="text-center text-bold">{team.group_points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <footer>
        <p>MundialStats &copy; {new Date().getFullYear()} - Creado con React y API Pública de Fútbol.</p>
        <p style={{ marginTop: '4px', fontSize: '0.75rem', opacity: 0.7 }}>
          Calendarios y fixtures obtenidos vía <a href="https://github.com/rezarahiminia/worldcup2026" target="_blank" rel="noopener noreferrer">rezarahiminia/worldcup2026</a>.
        </p>
      </footer>
    </>
  );
}

export default App;
