import { useSimulation } from '../../context/SimulationContext';

const RESIZE_HANDLE_STYLE = {
  position: 'absolute', right: 0, bottom: 0, width: '12px', height: '12px',
  cursor: 'se-resize', zIndex: 999,
  background: 'linear-gradient(135deg, transparent 40%, #808080 40%, #808080 60%, transparent 60%, transparent 70%, #808080 70%, #808080 90%, transparent 90%)',
  backgroundSize: '3px 3px',
};

/**
 * Generic draggable/resizable desktop window shell.
 * Props:
 *   windowKey   — 'matches' | 'standings' | 'thirds' | 'bracket' | 'readme'
 *   titleIcon   — emoji icon string
 *   title       — window title string
 *   isOpen      — boolean
 *   isMinimized — boolean
 *   onClose     — () => void
 *   onMinimize  — () => void
 *   menuBarContent — JSX for the menu bar
 *   statusLeft  — string for left status bar panel
 *   children    — main body content
 */
export default function WindowShell({
  windowKey,
  titleIcon,
  title,
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  menuBarContent,
  statusLeft,
  noResize = false,
  noMaximize = false,
  children,
}) {
  const {
    focusedWindow, setFocusedWindow,
    winPositions, winSizes, maximizedWindows,
    toggleMaximize, handleDragStart, handleResizeStart,
  } = useSimulation();

  if (!isOpen || isMinimized) return null;

  const isMaximized = maximizedWindows[windowKey];
  const pos = winPositions[windowKey];
  const size = winSizes[windowKey];
  const isFocused = focusedWindow === windowKey;

  return (
    <div
      className={`win95-window desktop-window ${windowKey}-window ${isFocused ? 'focused' : 'inactive'}`}
      onClick={() => setFocusedWindow(windowKey)}
      style={{
        zIndex: isFocused ? 100 : 50,
        left: isMaximized ? 0 : pos.x,
        top: isMaximized ? 0 : pos.y,
        width: isMaximized ? '100%' : `${size.width}px`,
        height: isMaximized ? '100%' : `${size.height}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        position: 'absolute',
      }}
    >
      {/* Title Bar */}
      <div className="win95-title-bar" onMouseDown={(e) => handleDragStart(windowKey, e)} style={{ cursor: 'move', userSelect: 'none' }}>
        <div className="win95-title-text">
          <span className="win95-title-icon">{titleIcon}</span>
          <span>{title}</span>
        </div>
        <div className="win95-title-buttons">
          {onMinimize && (
            <button className="win95-title-btn" title="Minimizar" onClick={(e) => { e.stopPropagation(); onMinimize(); }}>_</button>
          )}
          {!noMaximize && (
            <button
              className="win95-title-btn"
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
              onClick={(e) => { e.stopPropagation(); toggleMaximize(windowKey); }}
            >
              {isMaximized
                ? <span style={{ display: 'inline-block', width: '8px', height: '8px', borderTop: '2px solid currentColor', borderLeft: '2px solid currentColor', borderRight: '1px solid currentColor', borderBottom: '1px solid currentColor', position: 'relative', top: '1px' }} />
                : <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '2px solid currentColor', borderTop: '3px solid currentColor', position: 'relative', top: '1px' }} />
              }
            </button>
          )}
          <button className="win95-title-btn close" title="Cerrar" onClick={(e) => { e.stopPropagation(); onClose(); }}>X</button>
        </div>
      </div>

      {/* Menu Bar */}
      {menuBarContent && <div className="win95-menu-bar">{menuBarContent}</div>}

      {/* Window Body */}
      <div className="win95-window-body" style={{ minHeight: 0 }}>
        {children}
      </div>

      {/* Status Bar */}
      <div className="win95-status-bar">
        <div className="status-bar-pane pane-desc">{statusLeft}</div>
        <div className="status-bar-pane pane-time">Mundial 2026</div>
      </div>

      {/* Resize Handle */}
      {!isMaximized && !noResize && (
        <div onMouseDown={(e) => handleResizeStart(windowKey, e)} style={RESIZE_HANDLE_STYLE} />
      )}
    </div>
  );
}
