// Shown instantly while a page loads its data, so taps feel responsive on slow phone connections.
export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="topbar"><div className="skeleton" style={{ width: 160, height: 32 }} /></div>
      <div className="stack">
        <div className="skeleton" style={{ height: 48 }} />
        <div className="skeleton" style={{ height: 260 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    </div>
  );
}
