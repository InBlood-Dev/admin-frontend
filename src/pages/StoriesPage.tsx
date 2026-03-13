import { useState, useMemo } from 'react';
import { Trash2, Flag, Image, Video } from 'lucide-react';
import { stories as initialStories } from '../data/mock';
import type { Story } from '../types';

export default function StoriesPage() {
  const [data, setData] = useState<Story[]>(initialStories);
  const [filter, setFilter] = useState<'all' | 'reported'>('all');
  const [mediaFilter, setMediaFilter] = useState('all');

  const filtered = useMemo(() => {
    return data.filter(s => {
      if (s.is_deleted) return false;
      const matchesFilter = filter === 'all' || s.is_reported;
      const matchesMedia = mediaFilter === 'all' || s.media_type === mediaFilter;
      return matchesFilter && matchesMedia;
    });
  }, [data, filter, mediaFilter]);

  const deleteStory = (id: string) => {
    setData(prev => prev.map(s => s.story_id === id ? { ...s, is_deleted: true } : s));
  };

  const markReviewed = (id: string) => {
    setData(prev => prev.map(s => s.story_id === id ? { ...s, is_reported: false, report_count: 0 } : s));
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const reportedCount = data.filter(s => s.is_reported && !s.is_deleted).length;
  const activeCount = data.filter(s => !s.is_deleted).length;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Stories Moderation</h2>
          <p>{activeCount} active stories &middot; {reportedCount} reported</p>
        </div>
        <div className="table-header-actions">
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value as 'all' | 'reported')}>
            <option value="all">All Stories</option>
            <option value="reported">Reported Only</option>
          </select>
          <select className="filter-select" value={mediaFilter} onChange={e => setMediaFilter(e.target.value)}>
            <option value="all">All Media</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
          </select>
        </div>
      </div>

      <div className="stories-grid">
        {filtered.map((s, i) => (
          <div className="story-card" key={s.story_id} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="story-card-media">
              {s.media_type === 'photo' ? <Image size={24} /> : <Video size={24} />}
              <span className="media-type-badge">{s.media_type === 'photo' ? 'Photo' : 'Video'}</span>
              {s.is_reported && <span className="reported-badge">Reported ({s.report_count})</span>}
            </div>
            <div className="story-card-info">
              <div className="story-card-user">
                <div className="user-avatar">{s.user_name.charAt(0)}</div>
                <span>{s.user_name}</span>
              </div>
              <div className="story-card-caption">{s.caption || 'No caption'}</div>
              <div className="story-card-meta">
                <span>{formatTime(s.created_at)}</span>
                <span>{s.view_count} views</span>
              </div>
              <div className="story-card-actions">
                {s.is_reported && (
                  <button className="btn btn-sm btn-green" onClick={() => markReviewed(s.story_id)}>
                    <Flag size={12} /> Clear
                  </button>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => deleteStory(s.story_id)}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <p>No stories found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
