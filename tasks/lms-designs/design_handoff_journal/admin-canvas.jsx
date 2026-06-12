// admin-canvas.jsx — lays the Journal admin prototypes onto the design canvas.
const AB_W = 1280, AB_H = 800;

function AdminCanvasApp() {
  const ab = (id, label, Comp) => (
    <window.DCArtboard id={id} label={label} width={AB_W} height={AB_H} style={{ background: "var(--paper)" }}>
      <Comp />
    </window.DCArtboard>
  );
  return (
    <window.DesignCanvas>
      <window.DCSection id="journal" title="Журнал — матрица посещаемости" subtitle="Плотная таблица + панель «зона риска». Ячейки кликабельны — статус меняется прямо в матрице.">
        {ab("jm-a", "Плотная матрица + зона риска", window.JournalMatrixA)}
      </window.DCSection>

      <window.DCSection id="pacing" title="Программа — движение группы по темам" subtitle="Борд всех групп → клик по группе → лента программы курса (план VS факт).">
        {ab("pc-flow", "Борд → лента курса (кликабельно)", window.PacingFlow)}
      </window.DCSection>

      <window.DCSection id="schedule" title="Расписание и кабинеты" subtitle="Бонус — ответ на «подумай, что ещё понадобится». Планирование заранее + детектор пересечений.">
        {ab("sc-week", "Недельный планировщик", window.SchedulerWeek)}
        {ab("sc-rooms", "Сетка кабинетов · детектор пересечений", window.RoomBoard)}
      </window.DCSection>
    </window.DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminCanvasApp />);
