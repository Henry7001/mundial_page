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

  // Theme selection state (Windows retro versions)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mundialstats-theme');
    const validThemes = ['win95', 'winxp', 'win7', 'win10'];
    return validThemes.includes(saved) ? saved : 'win95';
  });

  // Windows Menu Active Dropdown State
  const [activeMenu, setActiveMenu] = useState(null); // null | 'archivo' | 'ver' | 'tema' | 'ayuda'
  
  // Show Acerca de Modal State
  const [showAbout, setShowAbout] = useState(false);

  // Desktop environment states
  const [isMatchesOpen, setIsMatchesOpen] = useState(true);
  const [isMatchesMinimized, setIsMatchesMinimized] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(true);
  const [isStandingsMinimized, setIsStandingsMinimized] = useState(false);
  const [focusedWindow, setFocusedWindow] = useState('matches'); // 'matches' | 'standings' | 'readme'
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState(null);

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
    setFocusedWindow('matches');
    fetchData(); // reload fresh copy
    alert("Se ha reiniciado el software MundialStats a su estado original.");
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
    <div className={`win95-app-container theme-${theme}`}>
      {/* Desktop Environment */}
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
                style={{ zIndex: focusedWindow === 'matches' ? 100 : 50 }}
              >
                {/* Title Bar */}
                <div className="win95-title-bar">
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
                        <button className={`win95-dropdown-item ${theme === 'win10' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10'); closeMenu(); }}>
                          {theme === 'win10' && '✓ '}Windows 10
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
                                      {match.status === 'in_progress' ? (
                                        <input 
                                          type="number" 
                                          min="0"
                                          className="win95-match-score-input"
                                          value={match.home_team.goals}
                                          onChange={(e) => handleScoreChange(match.id, 'home', parseInt(e.target.value) || 0)}
                                        />
                                      ) : (
                                        <span className={`retro-score-txt ${isHomeWinner ? 'winner-bold' : ''}`}>
                                          {match.status !== 'future_unscheduled' && match.status !== 'future_scheduled' ? match.home_team.goals : '-'}
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
                                      {match.status === 'in_progress' ? (
                                        <input 
                                          type="number" 
                                          min="0"
                                          className="win95-match-score-input"
                                          value={match.away_team.goals}
                                          onChange={(e) => handleScoreChange(match.id, 'away', parseInt(e.target.value) || 0)}
                                        />
                                      ) : (
                                        <span className={`retro-score-txt ${isAwayWinner ? 'winner-bold' : ''}`}>
                                          {match.status !== 'future_unscheduled' && match.status !== 'future_scheduled' ? match.away_team.goals : '-'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

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
                style={{ zIndex: focusedWindow === 'standings' ? 100 : 50 }}
              >
                {/* Title Bar */}
                <div className="win95-title-bar">
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
                        <button className={`win95-dropdown-item ${theme === 'win10' ? 'checked' : ''}`} onClick={() => { toggleTheme('win10'); closeMenu(); }}>
                          {theme === 'win10' && '✓ '}Windows 10
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

            {/* LEEME.txt Block Editor (Notepad) */}
            {showReadme && (
              <div 
                className={`win95-window readme-window ${focusedWindow === 'readme' ? 'focused' : 'inactive'}`}
                onClick={() => setFocusedWindow('readme')}
                style={{ zIndex: focusedWindow === 'readme' ? 100 : 50, position: 'absolute', top: '20%', left: '15%', width: '320px', height: '350px', minHeight: 'auto', alignSelf: 'center' }}
              >
                <div className="win95-title-bar">
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

        {/* About Dialog (Acerca de) Modal */}
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
                    <p>Derechos reservados © 2026 Antigravity Co.</p>
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
               theme === 'win10' ? 'Windows 10' : 'Windows'}
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
                <button className={`submenu-item ${theme === 'win10' ? 'active' : ''}`} onClick={() => { toggleTheme('win10'); setIsStartMenuOpen(false); }}>
                  Windows 10
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
  );
}

export default App;
