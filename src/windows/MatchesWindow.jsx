import { RefreshCw } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';
import { MenuItemWrapper, ThemeMenuItems, ViewMenuItems, AyudaMenuItems } from '../components/ui/MenuHelpers';
import { getCountryNameEs, getCountryFlagUrl } from '../utils/countries';
import { getStageNameEs, formatMatchDate } from '../utils/dataHelpers';

function MatchesMenuBar() {
  const { handleShare, handleSalir, closeMenu } = useSimulation();
  return (
    <>
      <MenuItemWrapper menuKey="archivo_m" label={<><u>A</u>rchivo</>}>
        <button className="win95-dropdown-item" onClick={handleShare}><u>C</u>ompartir Simulación</button>
        <div className="win95-dropdown-separator" />
        <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}><u>S</u>alir (Reiniciar)</button>
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ver_m" label={<><u>V</u>er</>}>
        <ViewMenuItems exclude="matches" />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="tema_m" label={<><u>T</u>ema</>}>
        <ThemeMenuItems />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ayuda_m" label={<>A<u>y</u>uda</>}>
        <AyudaMenuItems />
      </MenuItemWrapper>
    </>
  );
}

export default function MatchesWindow() {
  const {
    matches, isFallback, isRefreshing, hasLiveMatches,
    customScores, knockoutScores, memoizedBracketMatches,
    allDisplayMatches,
    searchQuery, setSearchQuery,
    stageFilter, setStageFilter,
    statusFilter, setStatusFilter,
    isMatchesOpen, setIsMatchesOpen,
    isMatchesMinimized, setIsMatchesMinimized,
    fetchData,
    handleKnockoutScoreChange, handleKnockoutPensChange, handleResetKnockoutMatch,
    openTeamInfo,
  } = useSimulation();

  // Filter matches
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

  const bodyContent = (
    <>
      {/* Toolbar */}
      <div className="win95-toolbar">
        <div className="win95-status-field field-badge">
          {isFallback ? <span className="retro-badge fallback">⚠️ SIN CONEXIÓN</span> : <span className="retro-badge live">🖧 CONECTADO</span>}
        </div>
        <div className="win95-status-field field-text">
          {isFallback ? 'Se cargaron datos locales por falta de conexión.' : 'Conectado a la API en vivo.'}
        </div>
        <button className="win95-btn toolbar-btn" onClick={fetchData} disabled={isRefreshing}>
          <RefreshCw size={12} className={isRefreshing ? 'spinner' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isRefreshing ? 'Cargando...' : 'Reintentar'}</span>
        </button>
      </div>

      {hasLiveMatches && (
        <div className="win95-banner-warning">
          <span className="warning-icon">⚡</span>
          <div className="warning-text"><strong>Partidos en vivo:</strong> Puedes editar los marcadores para simular la tabla.</div>
        </div>
      )}

      <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="win95-view-content">
          {/* Filters */}
          <fieldset className="win95-groupbox filter-groupbox">
            <legend>Buscar y Filtrar Partidos</legend>
            <div className="win95-filters-grid">
              <div className="filter-input-row">
                <label htmlFor="search-input">Texto:</label>
                <input id="search-input" type="text" placeholder="Buscar país, estadio, ciudad..." className="win95-input-control" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="filter-select-row">
                <label htmlFor="stage-filter">Fase:</label>
                <select id="stage-filter" className="win95-select-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="all">Todas las Fases</option>
                  <option value="group">Fase de Grupos</option>
                  <option value="knockout">Fase Eliminatoria</option>
                </select>
              </div>
              <div className="filter-select-row">
                <label htmlFor="status-filter">Estado:</label>
                <select id="status-filter" className="win95-select-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Todos los Estados</option>
                  <option value="completed">Finalizados</option>
                  <option value="live">En Vivo</option>
                  <option value="scheduled">Programados</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Match Cards */}
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
                const isHomeWinner = isKnockout ? koWinner && koWinner.country === homeTeamCode : match.status === 'completed' && match.winner_code === homeTeamCode;
                const isAwayWinner = isKnockout ? koWinner && koWinner.country === awayTeamCode : match.status === 'completed' && match.winner_code === awayTeamCode;

                let statusLabel = 'Programado'; let statusClass = 'scheduled';
                if (match.status === 'completed') { statusLabel = 'Finalizado'; statusClass = 'completed'; }
                else if (match.status === 'in_progress') { statusLabel = 'En Vivo'; statusClass = 'live'; }
                else if (match.status === 'simulated') { statusLabel = 'Simulado'; statusClass = 'simulated'; }

                return (
                  <div key={match.id} className={`win95-match-card-win ${statusClass}`}>
                    <div className="win95-match-card-title">
                      <span>Match #{match.id} - {getStageNameEs(match.stage_name)}</span>
                      <span className={`match-badge-retro ${statusClass}`}>{statusLabel}</span>
                    </div>
                    <div className="win95-match-card-body">
                      <div className="retro-team-rows">
                        {/* Home */}
                        <div className="retro-team-row">
                          <div className="retro-team-name-flag">
                            <img src={homeFlag} alt={homeTeamEs} className="retro-flag" onClick={() => homeTeamCode && openTeamInfo(homeTeamCode)} style={{ cursor: homeTeamCode ? 'pointer' : 'default' }} />
                            <span className={`retro-name-txt ${isHomeWinner ? 'winner-bold' : ''}`}>{homeTeamEs}</span>
                          </div>
                          {match.status !== 'completed' ? (
                            <input type="number" min="0" className="win95-match-score-input"
                              value={isKnockout ? (match.home_team.goals !== null && match.home_team.goals !== undefined ? match.home_team.goals : '') : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.home_team.goals : '')}
                              placeholder="-" disabled={isKnockout && match.isPlaceholder}
                              onChange={(e) => { const val = e.target.value === '' ? null : parseInt(e.target.value); if (isKnockout) handleKnockoutScoreChange(match.id, 'home', val); else handleScoreChange(match.id, 'home', val === null ? 0 : val); }}
                            />
                          ) : <span className={`retro-score-txt ${isHomeWinner ? 'winner-bold' : ''}`}>{match.home_team.goals}</span>}
                        </div>
                        {/* Away */}
                        <div className="retro-team-row">
                          <div className="retro-team-name-flag">
                            <img src={awayFlag} alt={awayTeamEs} className="retro-flag" onClick={() => awayTeamCode && openTeamInfo(awayTeamCode)} style={{ cursor: awayTeamCode ? 'pointer' : 'default' }} />
                            <span className={`retro-name-txt ${isAwayWinner ? 'winner-bold' : ''}`}>{awayTeamEs}</span>
                          </div>
                          {match.status !== 'completed' ? (
                            <input type="number" min="0" className="win95-match-score-input"
                              value={isKnockout ? (match.away_team.goals !== null && match.away_team.goals !== undefined ? match.away_team.goals : '') : (customScores[match.id] !== undefined || match.status === 'in_progress' ? match.away_team.goals : '')}
                              placeholder="-" disabled={isKnockout && match.isPlaceholder}
                              onChange={(e) => { const val = e.target.value === '' ? null : parseInt(e.target.value); if (isKnockout) handleKnockoutScoreChange(match.id, 'away', val); else handleScoreChange(match.id, 'away', val === null ? 0 : val); }}
                            />
                          ) : <span className={`retro-score-txt ${isAwayWinner ? 'winner-bold' : ''}`}>{match.away_team.goals}</span>}
                        </div>
                      </div>

                      {/* Penalty Row */}
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
                              <input type="number" min="0" className="win95-match-pens-input" style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }} value={knockoutScores[match.id]?.homePens || ''} placeholder="P" onChange={(e) => handleKnockoutPensChange(match.id, 'home', parseInt(e.target.value) || 0)} />
                              <span>-</span>
                              <input type="number" min="0" className="win95-match-pens-input" style={{ width: '25px', textAlign: 'center', height: '16px', padding: 0, fontSize: '10px' }} value={knockoutScores[match.id]?.awayPens || ''} placeholder="P" onChange={(e) => handleKnockoutPensChange(match.id, 'away', parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Reset button */}
                      {((!isKnockout && customScores[match.id] !== undefined) || (isKnockout && knockoutScores[match.id] !== undefined)) && (
                        <div className="retro-match-reset-row" style={{ marginTop: '2px', marginBottom: '6px', textAlign: 'right' }}>
                          <button className="win95-btn reset-score-btn" onClick={() => isKnockout ? handleResetKnockoutMatch(match.id) : handleResetScore(match.id)} style={{ fontSize: '9px', padding: '1px 5px', height: '17px', minHeight: 'unset', minWidth: 'unset', verticalAlign: 'middle' }} title="Restablecer original">Restablecer</button>
                        </div>
                      )}

                      {match.status === 'completed' && (match.home_team.penalties > 0 || match.away_team.penalties > 0) && (
                        <div className="retro-match-penalties">Penaltis: {match.home_team.penalties} - {match.away_team.penalties}</div>
                      )}

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
      </div>
    </>
  );

  return (
    <WindowShell
      windowKey="matches"
      titleIcon="⚽"
      title="Partidos - MundialStats 2026"
      isOpen={isMatchesOpen}
      isMinimized={isMatchesMinimized}
      onClose={() => setIsMatchesOpen(false)}
      onMinimize={() => setIsMatchesMinimized(true)}
      menuBarContent={<MatchesMenuBar />}
      statusLeft={`Partidos: ${matches.length} cargados`}
    >
      {bodyContent}
    </WindowShell>
  );
}
