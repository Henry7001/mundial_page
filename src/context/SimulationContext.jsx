import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { extractArray, mapOpenFootballMatches } from '../utils/dataHelpers';
import { normalizeMatchesData } from '../utils/normalizeData';
import { calculateGroupsStandings, calculateBestThirds, resolveKnockoutBracket } from '../utils/simulationEngine';
import {
  fallback2026Games,
  fallback2026Teams,
  fallback2026Groups,
  fallback2026Stadia,
} from '../data/fallbackData2026';

const SimulationContext = createContext(null);

export const useSimulation = () => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside SimulationProvider');
  return ctx;
};

export function SimulationProvider({ children }) {
  const isGroupStageOver = new Date() > new Date('2026-06-28T00:00:00-05:00');

  // --- Core data state ---
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const customScoresRef = useRef({});
  const rawMatchesRef = useRef([]);

  // --- Simulation / score state ---
  const [customScores, setCustomScores] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('sim')) {
        const simVal = urlParams.get('sim');
        if (simVal.includes('.') || simVal.includes('-')) {
          const parsed = {};
          simVal.split(',').forEach(item => {
            const parts = item.split('.');
            if (parts.length === 2) {
              const id = parts[0];
              const scores = parts[1].split('-');
              if (scores.length === 2) parsed[id] = { home: parseInt(scores[0]), away: parseInt(scores[1]) };
            }
          });
          return parsed;
        } else {
          return JSON.parse(atob(simVal));
        }
      }
      const saved = localStorage.getItem('mundialstats-customScores');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [knockoutScores, setKnockoutScores] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('ko_sim')) {
        const koVal = urlParams.get('ko_sim');
        if (koVal.includes('.') || koVal.includes('-')) {
          const parsed = {};
          koVal.split(',').forEach(item => {
            const hasPens = item.includes('p');
            const mainPart = hasPens ? item.split('p')[0] : item;
            const pensPart = hasPens ? item.split('p')[1] : null;
            const parts = mainPart.split('.');
            if (parts.length === 2) {
              const id = parts[0];
              const scores = parts[1].split('-');
              if (scores.length === 2) {
                parsed[id] = { home: parseInt(scores[0]), away: parseInt(scores[1]) };
                if (pensPart) {
                  const pens = pensPart.split('-');
                  if (pens.length === 2) { parsed[id].homePens = parseInt(pens[0]); parsed[id].awayPens = parseInt(pens[1]); }
                }
              }
            }
          });
          return parsed;
        } else {
          return JSON.parse(atob(koVal));
        }
      }
      const saved = localStorage.getItem('mundialstats-knockoutScores');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  // --- Persist scores to localStorage ---
  useEffect(() => { localStorage.setItem('mundialstats-customScores', JSON.stringify(customScores)); }, [customScores]);
  useEffect(() => { localStorage.setItem('mundialstats-knockoutScores', JSON.stringify(knockoutScores)); }, [knockoutScores]);

  // --- Theme state ---
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mundialstats-theme');
    const valid = ['win95','winxp','win7','win10-light','win10-dark','ios','android-light','android-dark'];
    return valid.includes(saved) ? saved : 'win95';
  });

  // --- UI interaction state ---
  const [activeMenu, setActiveMenu] = useState(null);
  const [showPossibleMatches, setShowPossibleMatches] = useState(false);

  // --- Search & filter ---
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState(isGroupStageOver ? 'knockout' : 'all');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Bracket round ---
  const [activeKnockoutRound, setActiveKnockoutRound] = useState('r32');

  // --- Desktop window open/minimized/maximized state ---
  const [isMatchesOpen, setIsMatchesOpen] = useState(true);
  const [isMatchesMinimized, setIsMatchesMinimized] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(!isGroupStageOver);
  const [isStandingsMinimized, setIsStandingsMinimized] = useState(false);
  const [isThirdsOpen, setIsThirdsOpen] = useState(!isGroupStageOver);
  const [isThirdsMinimized, setIsThirdsMinimized] = useState(false);
  const [isBracketOpen, setIsBracketOpen] = useState(true);
  const [isBracketMinimized, setIsBracketMinimized] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAboutMinimized, setIsAboutMinimized] = useState(false);
  const [focusedWindow, setFocusedWindow] = useState(isGroupStageOver ? 'bracket' : 'matches');
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState(isGroupStageOver ? 'bracket' : 'matches');

  const [winPositions, setWinPositions] = useState({
    matches: { x: 40, y: 12 },
    standings: { x: 620, y: 12 },
    thirds: { x: 330, y: 64 },
    bracket: { x: 190, y: 110 },
    readme: { x: 280, y: 120 },
    about: { x: 400, y: 200 },
  });
  const [winSizes, setWinSizes] = useState({
    matches: { width: 560, height: 480 },
    standings: { width: 420, height: 400 },
    thirds: { width: 420, height: 350 },
    bracket: { width: 800, height: 500 },
    readme: { width: 320, height: 350 },
    about: { width: 380, height: 300 },
  });
  const [maximizedWindows, setMaximizedWindows] = useState({
    matches: false, standings: false, thirds: false, bracket: false, readme: false, about: false,
  });

  // --- Digital clock ---
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

  // --- Drag & resize refs ---
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);

  // --- Derived memoized data ---
  const memoizedThirdsList = useMemo(() => calculateBestThirds(groups), [groups]);
  const memoizedBracketMatches = useMemo(
    () => resolveKnockoutBracket(groups, memoizedThirdsList, knockoutScores, showPossibleMatches, matches),
    [groups, memoizedThirdsList, knockoutScores, showPossibleMatches, matches]
  );

  const allDisplayMatches = useMemo(() => {
    const groupMatches = matches.filter(
      m => m.stage_name === 'First stage' || m.stage_name === 'group' || !m.stage_name || parseInt(m.id) <= 72
    );
    const bracketList = Object.values(memoizedBracketMatches).map(bm => {
      const originalMatch = matches.find(m => String(m.id) === String(bm.id));
      let status = 'future_scheduled';
      if (originalMatch && originalMatch.status === 'completed') status = 'completed';
      else if (bm.homeScore !== null && bm.awayScore !== null) status = 'simulated';
      else if (originalMatch && originalMatch.status === 'in_progress') status = 'in_progress';
      return {
        id: bm.id,
        venue: originalMatch?.venue || 'Estadio',
        location: originalMatch?.location || 'Por definir',
        status,
        stage_name: bm.stage,
        home_team_id: null,
        away_team_id: null,
        home_team_country: bm.home.country,
        away_team_country: bm.away.country,
        datetime: originalMatch?.datetime || originalMatch?.date || originalMatch?.local_date || null,
        group: '',
        winner_code: bm.winner ? bm.winner.country : null,
        home_team: { country: bm.home.country, name: bm.home.name, goals: bm.homeScore, penalties: bm.homePens || 0 },
        away_team: { country: bm.away.country, name: bm.away.name, goals: bm.awayScore, penalties: bm.awayPens || 0 },
        isKnockout: true,
        isPlaceholder: bm.home.isPlaceholder || bm.away.isPlaceholder,
      };
    });
    return [...groupMatches, ...bracketList].sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [matches, memoizedBracketMatches]);

  // --- Data normalization ---
  const normalizeAndSetData = useCallback((rawMatches, teamsList, groupsList, stadiaList) => {
    rawMatchesRef.current = rawMatches;
    const normalizedMatches = normalizeMatchesData(rawMatches, teamsList, stadiaList);
    const currentCustom = customScoresRef.current;
    const mergedMatches = normalizedMatches.map(m => {
      if (currentCustom[m.id] && m.status !== 'completed') {
        return {
          ...m,
          status: m.status === 'in_progress' ? 'in_progress' : 'simulated',
          home_team: { ...m.home_team, goals: currentCustom[m.id].home },
          away_team: { ...m.away_team, goals: currentCustom[m.id].away },
        };
      }
      return m;
    });
    const calculatedGroups = calculateGroupsStandings(mergedMatches, teamsList);
    setMatches(mergedMatches);
    setGroups(calculatedGroups);
  }, []);

  // --- Fetch data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json', { cache: 'no-cache', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const raw = await res.json();
      const openMatches = extractArray(raw, 'matches');
      if (openMatches.length === 0) throw new Error('Estructura vacía');
      const mappedMatches = mapOpenFootballMatches(openMatches, fallback2026Teams);
      normalizeAndSetData(mappedMatches, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
      setIsFallback(false);
    } catch (error) {
      console.warn('API error, loading local 2026 dataset:', error.message);
      normalizeAndSetData(fallback2026Games, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
      setIsFallback(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [normalizeAndSetData]);

  useEffect(() => { fetchData(); }, []);

  // --- Score handlers ---
  const handleScoreChange = useCallback((matchId, team, newScore) => {
    const currentCustom = customScoresRef.current;
    const newCustomScores = { ...currentCustom, [matchId]: { ...currentCustom[matchId], [team === 'home' ? 'home' : 'away']: newScore } };
    if (newCustomScores[matchId].home === undefined) {
      const match = rawMatchesRef.current.find(m => String(m.id) === String(matchId));
      newCustomScores[matchId].home = team === 'home' ? newScore : (match?.home_score || 0);
    }
    if (newCustomScores[matchId].away === undefined) {
      const match = rawMatchesRef.current.find(m => String(m.id) === String(matchId));
      newCustomScores[matchId].away = team === 'away' ? newScore : (match?.away_score || 0);
    }
    customScoresRef.current = newCustomScores;
    setCustomScores(newCustomScores);
    normalizeAndSetData(rawMatchesRef.current, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
  }, [normalizeAndSetData]);

  const handleResetScore = useCallback((matchId) => {
    const newCustomScores = { ...customScoresRef.current };
    delete newCustomScores[matchId];
    customScoresRef.current = newCustomScores;
    setCustomScores(newCustomScores);
    normalizeAndSetData(rawMatchesRef.current, fallback2026Teams, fallback2026Groups, fallback2026Stadia);
  }, [normalizeAndSetData]);

  const handleKnockoutScoreChange = useCallback((matchId, team, val) => {
    setKnockoutScores(prev => {
      const prevScore = prev[matchId] || {};
      const newScore = { ...prevScore };
      if (val === null || isNaN(val)) { delete newScore[team]; }
      else { newScore[team] = val; }
      if (newScore.home === undefined || newScore.away === undefined || newScore.home !== newScore.away) {
        newScore.homePens = 0;
        newScore.awayPens = 0;
      }
      return { ...prev, [matchId]: newScore };
    });
  }, []);

  const handleKnockoutPensChange = useCallback((matchId, team, val) => {
    setKnockoutScores(prev => {
      const prevScore = prev[matchId] || {};
      return { ...prev, [matchId]: { ...prevScore, [team === 'home' ? 'homePens' : 'awayPens']: val } };
    });
  }, []);

  const handleResetKnockoutMatch = useCallback((matchId) => {
    setKnockoutScores(prev => {
      const newScores = { ...prev };
      delete newScores[matchId];
      return newScores;
    });
  }, []);

  // --- Theme ---
  const toggleTheme = useCallback((selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem('mundialstats-theme', selectedTheme);
  }, []);

  // --- Menu ---
  const toggleMenu = useCallback((menu) => { setActiveMenu(prev => prev === menu ? null : menu); }, []);
  const closeMenu = useCallback(() => { setActiveMenu(null); }, []);

  // --- Share ---
  const handleShare = useCallback(() => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      if (Object.keys(customScores).length > 0) {
        const serialized = Object.entries(customScores).map(([id, s]) => `${id}.${s.home}-${s.away}`).join(',');
        url.searchParams.set('sim', serialized);
      }
      if (Object.keys(knockoutScores).length > 0) {
        const serialized = Object.entries(knockoutScores).map(([id, s]) => {
          let str = `${id}.${s.home}-${s.away}`;
          if (s.homePens !== undefined && s.homePens !== null) str += `p${s.homePens}-${s.awayPens}`;
          return str;
        }).join(',');
        url.searchParams.set('ko_sim', serialized);
      }
      navigator.clipboard.writeText(url.toString());
      alert('¡Enlace copiado al portapapeles! Puedes compartirlo para que vean tu simulación.');
    } catch (err) {
      alert('Error al generar el enlace.');
    }
    setActiveMenu(null);
  }, [customScores, knockoutScores]);

  // --- Salir / Reset ---
  const handleSalir = useCallback(() => {
    setCustomScores({});
    customScoresRef.current = {};
    setSearchQuery('');
    setStageFilter('all');
    setStatusFilter('all');
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
    fetchData();
    alert('Se ha reiniciado el software MundialStats a su estado original.');
  }, [fetchData]);

  // --- Window management ---
  const toggleMaximize = useCallback((key) => {
    setMaximizedWindows(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleDragStart = useCallback((key, e) => {
    if (maximizedWindows[key]) return;
    e.preventDefault();
    e.stopPropagation();
    const p = winPositions[key];
    dragStateRef.current = { key, sx: e.clientX, sy: e.clientY, px: p.x, py: p.y };
  }, [maximizedWindows, winPositions]);

  const handleResizeStart = useCallback((key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const s = winSizes[key];
    resizeStateRef.current = { key, sx: e.clientX, sy: e.clientY, sw: s.width, sh: s.height };
  }, [winSizes]);

  // Mouse move & up for drag/resize
  useEffect(() => {
    const onMove = (e) => {
      if (dragStateRef.current) {
        const { key, sx, sy, px, py } = dragStateRef.current;
        setWinPositions(prev => ({ ...prev, [key]: { x: Math.max(0, px + (e.clientX - sx)), y: Math.max(0, py + (e.clientY - sy)) } }));
      } else if (resizeStateRef.current) {
        const { key, sx, sy, sw, sh } = resizeStateRef.current;
        setWinSizes(prev => {
          const newWidth = Math.max(320, sw + (e.clientX - sx));
          const newHeight = Math.max(200, sh + (e.clientY - sy));
          return { ...prev, [key]: { width: newWidth, height: newHeight } };
        });
      }
    };
    const onUp = () => { dragStateRef.current = null; resizeStateRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Shortcut click handler
  const handleShortcutClick = useCallback((shortcutId, action) => {
    if (selectedShortcut === shortcutId) {
      action();
      setSelectedShortcut(null);
    } else {
      setSelectedShortcut(shortcutId);
    }
  }, [selectedShortcut]);

  // Close menus on outside click
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

  const hasLiveMatches = matches.some(m => m.status === 'in_progress');

  const value = {
    // Data
    matches, groups, loading, isFallback, isRefreshing,
    memoizedThirdsList, memoizedBracketMatches, allDisplayMatches,
    isGroupStageOver, hasLiveMatches,
    // Scores
    customScores, knockoutScores,
    // Handlers
    fetchData, handleScoreChange, handleResetScore,
    handleKnockoutScoreChange, handleKnockoutPensChange, handleResetKnockoutMatch,
    handleShare, handleSalir,
    // Theme
    theme, toggleTheme,
    // Menu
    activeMenu, toggleMenu, closeMenu,
    // UI state
    showPossibleMatches, setShowPossibleMatches,
    searchQuery, setSearchQuery,
    stageFilter, setStageFilter,
    statusFilter, setStatusFilter,
    activeKnockoutRound, setActiveKnockoutRound,
    // Desktop windows
    isMatchesOpen, setIsMatchesOpen,
    isMatchesMinimized, setIsMatchesMinimized,
    isStandingsOpen, setIsStandingsOpen,
    isStandingsMinimized, setIsStandingsMinimized,
    isThirdsOpen, setIsThirdsOpen,
    isThirdsMinimized, setIsThirdsMinimized,
    isBracketOpen, setIsBracketOpen,
    isBracketMinimized, setIsBracketMinimized,
    showReadme, setShowReadme,
    isAboutOpen, setIsAboutOpen,
    isAboutMinimized, setIsAboutMinimized,
    focusedWindow, setFocusedWindow,
    isStartMenuOpen, setIsStartMenuOpen,
    selectedShortcut, handleShortcutClick,
    activeMobileTab, setActiveMobileTab,
    winPositions, winSizes, maximizedWindows,
    toggleMaximize, handleDragStart, handleResizeStart,
    // Clock
    currentTime,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}
