function StatCard({ label, value, description }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>

      <strong>{value}</strong>

      <span className="stat-description">{description}</span>
    </div>
  );
}

export default StatCard;