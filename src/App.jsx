import { SimulationProvider, useSimulation } from './context/SimulationContext';
import MatchesWindow from './windows/MatchesWindow';
import StandingsWindow from './windows/StandingsWindow';
import ThirdsWindow from './windows/ThirdsWindow';
import BracketWindow from './windows/BracketWindow';
import ReadmeWindow from './windows/ReadmeWindow';
import AboutWindow from './windows/AboutWindow';
import TeamInfoWindow from './windows/TeamInfoWindow';
import { getCountryNameEs, getCountryFlagUrl } from './utils/countries';
import { getStageNameEs, formatMatchDate } from './utils/dataHelpers';

// ============================================================
// DESKTOP SHELL — renders the full Windows 95 desktop UI
// ============================================================
function DesktopShell() {
  const {
    theme, toggleTheme,
    loading, isFallback, currentTime,
    isMatchesOpen, setIsMatchesOpen, isMatchesMinimized, setIsMatchesMinimized,
    isStandingsOpen, setIsStandingsOpen, isStandingsMinimized, setIsStandingsMinimized,
    isThirdsOpen, setIsThirdsOpen, isThirdsMinimized, setIsThirdsMinimized,
    isBracketOpen, setIsBracketOpen, isBracketMinimized, setIsBracketMinimized,
    showReadme, setShowReadme,
    isAboutOpen, setIsAboutOpen, isAboutMinimized, setIsAboutMinimized,
    focusedWindow, setFocusedWindow,
    isStartMenuOpen, setIsStartMenuOpen,
    selectedShortcut, handleShortcutClick,
    activeMobileTab, setActiveMobileTab,
    handleSalir, handleShare, fetchData,
    allDisplayMatches, groups, memoizedThirdsList, memoizedBracketMatches,
    customScores, knockoutScores,
    searchQuery, setSearchQuery,
    stageFilter, setStageFilter,
    statusFilter, setStatusFilter,
    showPossibleMatches, setShowPossibleMatches,
    handleScoreChange, handleResetScore,
    handleKnockoutScoreChange, handleKnockoutPensChange, handleResetKnockoutMatch,
    matches, isRefreshing, hasLiveMatches,
    openTeamInfo,
    isTeamInfoOpen, setIsTeamInfoOpen,
    isTeamInfoMinimized, setIsTeamInfoMinimized,
  } = useSimulation();

  // ---- Mobile render helpers (inline - reuses same logic as windows) ----
  const renderMatchesContent = () => {
    const filteredMatches = allDisplayMatches.filter(match => {
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
      if (stageFilter === 'group') { if (match.stage_name !== 'First stage' && match.stage_name !== 'group') return false; }
      else if (stageFilter === 'knockout') { if (match.stage_name === 'First stage' || match.stage_name === 'group') return false; }
      if (statusFilter === 'completed' && match.status !== 'completed') return false;
      if (statusFilter === 'scheduled' && match.status !== 'future_unscheduled' && match.status !== 'future_scheduled') return false;
      if (statusFilter === 'live' && match.status !== 'in_progress') return false;
      return true;
    });

    return (
      <div className="win95-view-content">
        <fieldset className="win95-groupbox filter-groupbox">
          <legend>Buscar y Filtrar Partidos</legend>
          <div className="win95-filters-grid">
            <div className="filter-input-row">
              <label htmlFor="search-input-m">Texto:</label>
              <input id="search-input-m" type="text" placeholder="Buscar país, estadio, ciudad..." className="win95-input-control" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="filter-select-row">
              <label htmlFor="stage-filter-m">Fase:</label>
              <select id="stage-filter-m" className="win95-select-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">Todas las Fases</option>
                <option value="group">Fase de Grupos</option>
                <option value="knockout">Fase Eliminatoria</option>
              </select>
            </div>
            <div className="filter-select-row">
              <label htmlFor="status-filter-m">Estado:</label>
              <select id="status-filter-m" className="win95-select-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos los Estados</option>
                <option value="completed">Finalizados</option>
                <option value="live">En Vivo</option>
                <option value="scheduled">Programados</option>
              </select>
            </div>
          </div>
        </fieldset>
        {filteredMatches.length === 0 ? (
          <div className="win95-sunken empty-state-retro"><span className="empty-state-icon">⚽</span><h3>No se encontraron registros</h3><p>Verifique los criterios de búsqueda o cambie los filtros.</p></div>
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
              const isHomeWinner = isKnockout ? koWinner && koWinner.country === homeTeamCode : match.status === 'completed' && match.winner_code === homeTeamCode;
              const isAwayWinner = isKnockout ? koWinner && koWinner.country === awayTeamCode : match.status === 'completed' && match.winner_code === awayTeamCode;
              let statusLabel = 'Programado'; let statusClass = 'scheduled';
              if (match.status === 'completed') { statusLabel = 'Finalizado'; statusClass = 'completed'; }
              else if (match.status === 'in_progress') { statusLabel = 'En Vivo'; statusClass = 'live'; }
              else if (match.status === 'simulated') { statusLabel = 'Simulado'; statusClass = 'simulated'; }
              return (
                <div key={match.id} className={`win95-match-card-win ${statusClass}`}>
                  <div className="win95-match-card-title"><span>Match #{match.id} - {getStageNameEs(match.stage_name)}</span><span className={`match-badge-retro ${statusClass}`}>{statusLabel}</span></div>
                  <div className="win95-match-card-body">
                    <div className="retro-team-rows">
                      <div className="retro-team-row">
                        <div className="retro-team-name-flag"><img src={homeFlag} alt={homeTeamEs} className="retro-flag" onClick={() => homeTeamCode && openTeamInfo(homeTeamCode)} style={{ cursor: homeTeamCode ? 'pointer' : 'default' }} /><span className={`retro-name-txt ${isHomeWinner ? 'winner-bold' : ''}`}>{homeTeamEs}</span></div>
                        {match.status !== 'completed' ? (<input type="number" min="0" className="win95-match-score-input" value={isKnockout ? (match.home_team.goals !== null && match.home_team.goals !== undefined ? match.home_team.goals : '') : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.home_team.goals : '')} placeholder="-" disabled={isKnockout && match.isPlaceholder} onChange={(e) => { const val = e.target.value === '' ? null : parseInt(e.target.value); if (isKnockout) handleKnockoutScoreChange(match.id, 'home', val); else handleScoreChange(match.id, 'home', val === null ? 0 : val); }} />) : <span className={`retro-score-txt ${isHomeWinner ? 'winner-bold' : ''}`}>{match.home_team.goals}</span>}
                      </div>
                      <div className="retro-team-row">
                        <div className="retro-team-name-flag"><img src={awayFlag} alt={awayTeamEs} className="retro-flag" onClick={() => awayTeamCode && openTeamInfo(awayTeamCode)} style={{ cursor: awayTeamCode ? 'pointer' : 'default' }} /><span className={`retro-name-txt ${isAwayWinner ? 'winner-bold' : ''}`}>{awayTeamEs}</span></div>
                        {match.status !== 'completed' ? (<input type="number" min="0" className="win95-match-score-input" value={isKnockout ? (match.away_team.goals !== null && match.away_team.goals !== undefined ? match.away_team.goals : '') : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.away_team.goals : '')} placeholder="-" disabled={isKnockout && match.isPlaceholder} onChange={(e) => { const val = e.target.value === '' ? null : parseInt(e.target.value); if (isKnockout) handleKnockoutScoreChange(match.id, 'away', val); else handleScoreChange(match.id, 'away', val === null ? 0 : val); }} />) : <span className={`retro-score-txt ${isAwayWinner ? 'winner-bold' : ''}`}>{match.away_team.goals}</span>}
                      </div>
                    </div>
                    {match.status === 'completed' && (match.home_team.penalties > 0 || match.away_team.penalties > 0) && (<div className="retro-match-penalties">Penaltis: {match.home_team.penalties} - {match.away_team.penalties}</div>)}
                    <div className="retro-match-details">
                      <div className="retro-detail-line"><span className="icon">📍</span><span>{match.venue}, {match.location}</span></div>
                      <div className="retro-detail-line"><span className="icon">📅</span><span>{formatMatchDate(match.datetime)}</span></div>
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

  const renderStandingsContent = () => (
    <div className="win95-standings-grid">
      {groups.map((group) => (
        <div key={group.letter} className="win95-group-box-win">
          <div className="win95-group-card-title"><span>Grupo {group.letter}</span></div>
          <div className="win95-sunken table-viewport">
            <table className="retro-table">
              <thead><tr><th style={{ width: '30px' }}>POS</th><th>Equipo</th><th className="text-center">PJ</th><th className="text-center">G</th><th className="text-center">E</th><th className="text-center">P</th><th className="text-center hide-mobile">GF</th><th className="text-center hide-mobile">GC</th><th className="text-center">DG</th><th className="text-center text-bold">PTS</th></tr></thead>
              <tbody>
                {group.teams.map((team, idx) => {
                  const isQualifying = idx < 2;
                  const teamEs = getCountryNameEs(team.country, team.name);
                  const flagUrl = getCountryFlagUrl(team.country, team.name);
                  return (
                    <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                      <td className="text-center text-bold idx-cell">{idx + 1}</td>
                      <td><div className="retro-table-team"><img src={flagUrl} alt={teamEs} className="retro-table-flag" onClick={() => openTeamInfo(team.country)} style={{ cursor: 'pointer' }} /><span className="retro-table-team-name" title={teamEs}>{teamEs}</span></div></td>
                      <td className="text-center">{team.games_played}</td><td className="text-center">{team.wins}</td><td className="text-center">{team.draws}</td><td className="text-center">{team.losses}</td>
                      <td className="text-center hide-mobile">{team.goals_for}</td><td className="text-center hide-mobile">{team.goals_against}</td>
                      <td className="text-center dg-cell" style={{ color: team.goal_differential > 0 ? 'var(--color-win-text)' : team.goal_differential < 0 ? 'var(--color-loss-text)' : 'inherit' }}>{team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}</td>
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

  const renderThirdsContent = () => (
    <div className="win95-view-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <fieldset className="win95-groupbox filter-groupbox"><legend>Criterios de Clasificación</legend><div style={{ fontSize: '11px', lineHeight: '1.4', padding: '2px' }}>Los <strong>8 mejores terceros</strong> de la fase de grupos avanzan a Dieciseisavos de Final. Se ordenan por: <strong>PTS</strong> ➔ <strong>DG</strong> ➔ <strong>GF</strong> ➔ <strong>G (Victorias)</strong>.</div></fieldset>
      <div className="win95-group-box-win" style={{ margin: 0 }}>
        <div className="win95-group-card-title"><span>Tabla General de Terceros Lugares</span></div>
        <div className="win95-sunken table-viewport">
          <table className="retro-table">
            <thead><tr><th style={{ width: '30px' }}>POS</th><th style={{ width: '45px' }} className="text-center">Grp</th><th>Equipo</th><th className="text-center">PJ</th><th className="text-center">G</th><th className="text-center">E</th><th className="text-center">P</th><th className="text-center hide-mobile">GF</th><th className="text-center hide-mobile">GC</th><th className="text-center">DG</th><th className="text-center text-bold">PTS</th><th className="text-center" style={{ width: '80px' }}>Estado</th></tr></thead>
            <tbody>
              {memoizedThirdsList.map((team, idx) => {
                const isQualifying = idx < 8;
                const teamEs = getCountryNameEs(team.country, team.name);
                const flagUrl = getCountryFlagUrl(team.country, team.name);
                return (
                  <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                    <td className="text-center text-bold idx-cell">{idx + 1}</td>
                    <td className="text-center text-bold" style={{ opacity: 0.8 }}>{team.group}</td>
                    <td><div className="retro-table-team"><img src={flagUrl} alt={teamEs} className="retro-table-flag" onClick={() => openTeamInfo(team.country)} style={{ cursor: 'pointer' }} /><span className="retro-table-team-name" title={teamEs}>{teamEs}</span></div></td>
                    <td className="text-center">{team.games_played}</td><td className="text-center">{team.wins}</td><td className="text-center">{team.draws}</td><td className="text-center">{team.losses}</td>
                    <td className="text-center hide-mobile">{team.goals_for}</td><td className="text-center hide-mobile">{team.goals_against}</td>
                    <td className="text-center dg-cell" style={{ color: team.goal_differential > 0 ? 'var(--color-win-text)' : team.goal_differential < 0 ? 'var(--color-loss-text)' : 'inherit' }}>{team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}</td>
                    <td className="text-center text-bold pts-cell">{team.group_points}</td>
                    <td className="text-center"><span className={`retro-badge-status ${isQualifying ? 'qualify' : 'eliminate'}`} style={{ fontWeight: 'bold', padding: '1px 4px', fontSize: '9px', border: '1px solid', borderColor: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)', color: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)', background: isQualifying ? 'rgba(0,128,0,0.05)' : 'rgba(204,0,0,0.05)' }}>{isQualifying ? 'Clasificado' : 'Eliminado'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`win95-app-container theme-${theme}`}>

      {/* Desktop Environment */}
      <div className="desktop-shell-wrapper">
        <div className="win95-desktop">
          {/* Desktop Icons */}
          <div className="desktop-shortcuts">
            {[
              { id: 'matches', icon: '⚽', label: 'Partidos 2026', action: () => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); } },
              { id: 'standings', icon: '📊', label: 'Posiciones', action: () => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); } },
              { id: 'thirds', icon: '🏆', label: 'Mejores Terceros', action: () => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); } },
              { id: 'bracket', icon: '🏅', label: 'Cuadro Eliminatorio', action: () => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); } },
              { id: 'reset', icon: '🗑️', label: 'Papelera de Reciclaje', action: handleSalir },
              { id: 'readme', icon: '📝', label: 'LEEME.txt', action: () => { setShowReadme(true); setFocusedWindow('readme'); } },
            ].map(({ id, icon, label, action }) => (
              <div key={id} className={`desktop-shortcut ${selectedShortcut === id ? 'selected' : ''}`} onClick={() => handleShortcutClick(id, action)}>
                <span className="shortcut-icon">{icon}</span>
                <span className="shortcut-label">{label}</span>
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="win95-window loading-dialog" style={{ width: '300px', margin: 'auto', zIndex: 1000, height: 'auto', minHeight: 'auto', alignSelf: 'center' }}>
              <div className="win95-title-bar"><div className="win95-title-text"><span className="win95-title-icon">⌛</span><span>Iniciando MundialStats...</span></div></div>
              <div className="win95-dialog-body" style={{ textAlign: 'center', padding: '20px' }}>
                <div className="win95-hourglass" style={{ fontSize: '32px', marginBottom: '10px' }}>⌛</div>
                <p>Cargando base de datos de la Copa Mundial 2026...</p>
                <div className="win95-sunken loading-progress-bar" style={{ height: '14px', marginTop: '15px', position: 'relative', background: '#fff' }}><div className="progress-blocks"></div></div>
              </div>
            </div>
          ) : (
            <>
              <MatchesWindow />
              <StandingsWindow />
              <ThirdsWindow />
              <BracketWindow />
              <ReadmeWindow />
              <AboutWindow />
              <TeamInfoWindow />
            </>
          )}
        </div>

        {/* Taskbar */}
        <div className="win95-taskbar">
          <button className={`win95-start-btn ${isStartMenuOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsStartMenuOpen(prev => !prev); }}>
            <span className="start-icon">🏁</span>
            <span>Inicio</span>
          </button>
          <div className="win95-taskbar-divider"></div>
          <div className="win95-active-tasks">
            {isMatchesOpen && <button className={`taskbar-item ${(!isMatchesMinimized && focusedWindow === 'matches') ? 'active' : ''}`} onClick={() => { if (isMatchesMinimized) { setIsMatchesMinimized(false); setFocusedWindow('matches'); } else if (focusedWindow === 'matches') setIsMatchesMinimized(true); else setFocusedWindow('matches'); }}><span className="taskbar-icon">⚽</span><span>Partidos</span></button>}
            {isStandingsOpen && <button className={`taskbar-item ${(!isStandingsMinimized && focusedWindow === 'standings') ? 'active' : ''}`} onClick={() => { if (isStandingsMinimized) { setIsStandingsMinimized(false); setFocusedWindow('standings'); } else if (focusedWindow === 'standings') setIsStandingsMinimized(true); else setFocusedWindow('standings'); }}><span className="taskbar-icon">📊</span><span>Posiciones</span></button>}
            {isThirdsOpen && <button className={`taskbar-item ${(!isThirdsMinimized && focusedWindow === 'thirds') ? 'active' : ''}`} onClick={() => { if (isThirdsMinimized) { setIsThirdsMinimized(false); setFocusedWindow('thirds'); } else if (focusedWindow === 'thirds') setIsThirdsMinimized(true); else setFocusedWindow('thirds'); }}><span className="taskbar-icon">🏆</span><span>Mejores Terceros</span></button>}
            {isBracketOpen && <button className={`taskbar-item ${(!isBracketMinimized && focusedWindow === 'bracket') ? 'active' : ''}`} onClick={() => { if (isBracketMinimized) { setIsBracketMinimized(false); setFocusedWindow('bracket'); } else if (focusedWindow === 'bracket') setIsBracketMinimized(true); else setFocusedWindow('bracket'); }}><span className="taskbar-icon">🏅</span><span>Cuadro Eliminatorio</span></button>}
            {isAboutOpen && <button className={`taskbar-item ${(!isAboutMinimized && focusedWindow === 'about') ? 'active' : ''}`} onClick={() => { if (isAboutMinimized) { setIsAboutMinimized(false); setFocusedWindow('about'); } else if (focusedWindow === 'about') setIsAboutMinimized(true); else setFocusedWindow('about'); }}><span className="taskbar-icon">❔</span><span>Acerca de</span></button>}
            {isTeamInfoOpen && <button className={`taskbar-item ${(!isTeamInfoMinimized && focusedWindow === 'teamInfo') ? 'active' : ''}`} onClick={() => { if (isTeamInfoMinimized) { setIsTeamInfoMinimized(false); setFocusedWindow('teamInfo'); } else if (focusedWindow === 'teamInfo') setIsTeamInfoMinimized(true); else setFocusedWindow('teamInfo'); }}><span className="taskbar-icon">ℹ️</span><span>Info de Equipo</span></button>}
          </div>
          <div className="win95-system-tray">
            {isFallback ? <span className="tray-icon" title="Sin conexión - Fallback local">⚠️</span> : <span className="tray-icon" title="Conexión en vivo activa">🖧</span>}
            <span className="tray-time">{currentTime}</span>
          </div>
        </div>

        {/* Start Menu */}
        {isStartMenuOpen && (
          <div className="win95-start-menu">
            <div className="start-menu-sidebar">
              <span className="sidebar-text">{theme === 'win95' ? 'Windows 95' : theme === 'winxp' ? 'Windows XP' : theme === 'win7' ? 'Windows 7' : theme === 'win10-light' ? 'Windows 10 Light' : theme === 'win10-dark' ? 'Windows 10 Dark' : 'Windows'}</span>
            </div>
            <div className="start-menu-list">
              {[
                { icon: '⚽', label: 'Partidos 2026', action: () => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); setIsStartMenuOpen(false); } },
                { icon: '📊', label: 'Tabla de Posiciones', action: () => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); setIsStartMenuOpen(false); } },
                { icon: '🏆', label: 'Mejores Terceros', action: () => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); setIsStartMenuOpen(false); } },
                { icon: '🏅', label: 'Cuadro Eliminatorio', action: () => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); setIsStartMenuOpen(false); } },
              ].map(({ icon, label, action }) => (
                <button key={label} className="start-menu-item" onClick={action}><span className="item-icon">{icon}</span><span className="item-label">{label}</span></button>
              ))}

              <div className="start-menu-item has-submenu">
                <span className="item-icon">🎨</span><span className="item-label">Temas ➔</span>
                <div className="start-menu-submenu">
                  {[['win95','Windows 95 / 98'],['winxp','Windows XP (Luna)'],['win7','Windows 7 (Aero)'],['win10-light','Windows 10 Light'],['win10-dark','Windows 10 Dark']].map(([key, label]) => (
                    <button key={key} className={`submenu-item ${theme === key ? 'active' : ''}`} onClick={() => { toggleTheme(key); setIsStartMenuOpen(false); }}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="start-menu-divider"></div>
              <button className="start-menu-item" onClick={() => { handleSalir(); setIsStartMenuOpen(false); }}><span className="item-icon">🔄</span><span className="item-label">Reiniciar Sistema</span></button>
              <button className="start-menu-item" onClick={() => { setIsAboutOpen(true); setFocusedWindow('about'); setIsStartMenuOpen(false); }}><span className="item-icon">❔</span><span className="item-label">Acerca de...</span></button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Shell */}
      <div className="win95-mobile-shell">
        {theme === 'win10' ? (
          <div className="status-bar-android"><div className="status-bar-left"><span className="notif-icon">⚽</span><span className="notif-icon">💬</span></div><div className="status-bar-center">{currentTime}</div><div className="status-bar-right"><span className="signal-icon">📶</span><span className="battery-icon">🔋 85%</span></div></div>
        ) : theme === 'win7' ? (
          <div className="status-bar-ios"><div className="status-bar-left"><span className="carrier-text">Henry7001 5G</span><span className="signal-icon">📶</span></div><div className="status-bar-center">{currentTime}</div><div className="status-bar-right"><span className="battery-percent">85%</span><span className="battery-icon">🔋</span></div></div>
        ) : (
          <div className="status-bar-winmobile"><div className="status-bar-left"><span className="winmobile-logo">🏁</span><span className="winmobile-title">Pocket PC</span></div><div className="status-bar-right"><span className="signal-icon">📶</span><span className="time-text">{currentTime}</span></div></div>
        )}

        <div className="mobile-header">
          {theme.startsWith('win10') ? (
            <div className="header-android"><h1>MundialStats 2026</h1><button className="android-action-btn" onClick={fetchData} disabled={isRefreshing} title="Actualizar">🔄</button></div>
          ) : theme === 'win7' ? (
            <div className="header-ios"><button className="ios-nav-btn-left" onClick={handleSalir}>Reset</button><h1>MundialStats</h1><button className="ios-nav-btn-right" onClick={fetchData} disabled={isRefreshing}>Refresh</button></div>
          ) : (
            <div className="header-winmobile"><span>MundialStats 2026</span><button className="winmobile-ok-btn" onClick={fetchData} disabled={isRefreshing}>ok</button></div>
          )}
        </div>

        <div className="mobile-content-area">
          {loading ? (
            <div className="win95-loading-wrapper" style={{ margin: 'auto', textAlign: 'center' }}><div className="win95-hourglass">⌛</div><p>Cargando base de datos...</p></div>
          ) : (
            <>
              {activeMobileTab === 'matches' && <div className="mobile-tab-content matches-tab">{renderMatchesContent()}</div>}
              {activeMobileTab === 'standings' && <div className="mobile-tab-content standings-tab">{renderStandingsContent()}</div>}
              {activeMobileTab === 'thirds' && <div className="mobile-tab-content thirds-tab">{renderThirdsContent()}</div>}
              {activeMobileTab === 'bracket' && <div className="mobile-tab-content bracket-tab"><BracketWindow /></div>}
              {activeMobileTab === 'settings' && (
                <div className="mobile-tab-content settings-tab">
                  <div className="mobile-settings-page">
                    <fieldset className="win95-groupbox"><legend>Estilo de Interfaz</legend>
                      <div className="theme-options-list">
                        {[['winxp','Windows Mobile'],['ios','iOS'],['android-light','Android (Claro)'],['android-dark','Android (Oscuro)']].map(([key, label]) => (
                          <button key={key} className={`win95-btn ${theme === key ? 'default-btn' : ''}`} onClick={() => toggleTheme(key)}>{label}</button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="win95-groupbox" style={{ marginTop: '15px' }}><legend>Acerca de</legend>
                      <p style={{ fontSize: '11px', lineHeight: '1.4' }}><strong>MundialStats 2026</strong><br/>Versión 1.0 (Mobile Edition)<br/>Simulador interactivo de la Copa del Mundo 2026.<br/>Derechos reservados © 2026 Henry7001</p>
                      <button className="win95-btn" style={{ marginTop: '10px', width: '100%' }} onClick={() => setIsAboutOpen(true)}>Ver Licencia</button>
                    </fieldset>
                    <button className="win95-btn" style={{ marginTop: '20px', width: '100%', color: 'var(--color-win-text)', fontWeight: 'bold' }} onClick={handleShare}>Compartir Simulación</button>
                    <button className="win95-btn" style={{ marginTop: '10px', width: '100%', color: 'var(--color-loss-text)', fontWeight: 'bold' }} onClick={handleSalir}>Reiniciar Simulación</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Bottom Nav */}
        {theme.startsWith('android') ? (
          <div className="nav-android">
            {[['matches','📅','Partidos'],['standings','🏆','Posiciones'],['thirds','⭐','Terceros'],['bracket','🏅','Cuadro'],['settings','⚙️','Ajustes']].map(([tab, icon, label]) => (
              <button key={tab} className={`nav-android-item ${activeMobileTab === tab ? 'active' : ''}`} onClick={() => setActiveMobileTab(tab)}><span className="nav-icon">{icon}</span><span className="nav-label">{label}</span></button>
            ))}
          </div>
        ) : theme === 'ios' ? (
          <div className="nav-ios">
            {[['matches','📅','Partidos'],['standings','🏆','Tablas'],['thirds','⭐','Terceros'],['bracket','🏅','Cuadro'],['settings','⚙️','Ajustes']].map(([tab, icon, label]) => (
              <button key={tab} className={`nav-ios-item ${activeMobileTab === tab ? 'active' : ''}`} onClick={() => setActiveMobileTab(tab)}><span className="nav-icon">{icon}</span><span className="nav-label">{label}</span></button>
            ))}
          </div>
        ) : (
          <div className="nav-winmobile">
            {[['matches','Partidos'],['standings','Posiciones'],['thirds','Terceros'],['bracket','Cuadro'],['settings','Herram.']].map(([tab, label]) => (
              <button key={tab} className={`nav-winmobile-item ${activeMobileTab === tab ? 'active' : ''}`} onClick={() => setActiveMobileTab(tab)}>{label}</button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================
// ROOT — wraps everything in the SimulationProvider
// ============================================================
function App() {
  return (
    <SimulationProvider>
      <DesktopShell />
    </SimulationProvider>
  );
}

export default App;
