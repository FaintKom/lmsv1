// app-root.jsx — cohesive prototype router.
// page (sidebar) + session slide-over + student activity full page.
function AppRoot() {
  const [page, setPage] = React.useState("today");
  const [session, setSession] = React.useState(null);
  const [student, setStudent] = React.useState(null);
  const nav = (k) => { setSession(null); setStudent(null); setPage(k); };

  if (student) return <window.StudentActivity student={student} onBack={() => setStudent(null)} onNav={nav} />;

  let Page;
  if (page === "today") Page = <window.TodayAgenda onNav={nav} onOpenSession={setSession} />;
  else if (page === "journal") Page = <window.JournalMatrixA onNav={nav} />;
  else if (page === "pacing") Page = <window.PacingFlow onNav={nav} />;
  else if (page === "schedule") Page = <window.SchedulerWeek onNav={nav} />;
  else if (page === "rooms") Page = <window.RoomBoard onNav={nav} />;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {Page}
      {session && <window.SessionDetail sessionId={session} onClose={() => setSession(null)} onOpenStudent={setStudent} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppRoot />);
