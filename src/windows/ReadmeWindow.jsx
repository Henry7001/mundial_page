import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';

export default function ReadmeWindow() {
  const { showReadme, setShowReadme, maximizedWindows } = useSimulation();

  return (
    <WindowShell
      windowKey="readme"
      titleIcon="📝"
      title="LEEME.txt - Bloc de notas"
      isOpen={showReadme}
      isMinimized={false}
      onClose={() => setShowReadme(false)}
      onMinimize={null}
      menuBarContent={null}
      statusLeft=""
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <textarea
          className="win95-input-control text-editor-area"
          readOnly
          value={`=== MundialStats 2026 ===\n\nBienvenido al simulador interactivo de la Copa Mundial de la FIFA 2026.\n\nInstrucciones:\n1. Haz clic en "Partidos 2026" para ver el fixture y modificar marcadores de partidos en vivo.\n2. Abre la "Tabla de Posiciones" para ver el impacto en tiempo real.\n3. Usa la barra de tareas e Inicio para cambiar el tema visual de Windows (95, XP, Vista, 7, 10).\n4. Para reiniciar el software, usa la Papelera de Reciclaje o el menú de Inicio.`}
          style={{ flex: 1, resize: 'none', fontFamily: 'Courier New, monospace', fontSize: '11px', lineHeight: '1.3' }}
        />
      </div>
    </WindowShell>
  );
}
