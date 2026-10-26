export default function Loading() {
  return (
    <div className="ink" aria-busy="true" aria-label="Loading">
      <div className="prof">
        <div className="prof-hero"><div className="prof-hero-pattern" /></div>
        <div className="pad stack" style={{ marginTop: 16 }}>
          <div className="skeleton" style={{ width: "70%", height: 44 }} />
          <div className="skeleton" style={{ height: 80 }} />
          <div className="skeleton" style={{ height: 52 }} />
        </div>
      </div>
    </div>
  );
}
