import { useState, useMemo } from 'react';
import { matches, users } from '../data/mock';

export default function MatchesPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return matches;
    return matches.filter((m) => (statusFilter === 'active' ? m.is_active : !m.is_active));
  }, [statusFilter]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Matches</h2>
          <p>{matches.length} total matches</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>All Matches</h3>
          <div className="table-header-actions">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Matches</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Match ID</th>
                <th>User A</th>
                <th>User B</th>
                <th>Matched At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.match_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{m.match_id}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{getUserName(m.user_a).charAt(0)}</div>
                      <span className="user-cell-name">{getUserName(m.user_a)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{getUserName(m.user_b).charAt(0)}</div>
                      <span className="user-cell-name">{getUserName(m.user_b)}</span>
                    </div>
                  </td>
                  <td>{formatDate(m.matched_at)}</td>
                  <td>
                    {m.is_active
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-muted">Inactive</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
