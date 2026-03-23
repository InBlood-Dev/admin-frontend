import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Save, Trash2, FileText, Clock, User } from 'lucide-react';
import legalService from '../services/legal.service';
import type { LegalPage } from '../services/legal.service';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';

const DEFAULT_PAGES = [
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-of-service', title: 'Terms of Service' },
  { slug: 'cookie-policy', title: 'Cookie Policy' },
  { slug: 'safety-tips', title: 'Safety Tips' },
  { slug: 'community-guidelines', title: 'Community Guidelines' },
];

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return e?.response?.data?.errors?.[0]?.message || e?.response?.data?.message || (err instanceof Error ? err.message : 'Something went wrong');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function LegalPagesPage() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await legalService.listPages();
      setPages(data);
    } catch (err) {
      setError({ title: 'Failed to load pages', message: extractError(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  function openEditor(page: LegalPage) {
    setEditing(page);
    setCreating(false);
    setFormTitle(page.title);
    setFormSlug(page.slug);
    setFormContent(page.content);
  }

  function openCreate(preset?: { slug: string; title: string }) {
    setEditing(null);
    setCreating(true);
    setFormTitle(preset?.title ?? '');
    setFormSlug(preset?.slug ?? '');
    setFormContent('');
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formSlug.trim() || !formContent.trim()) {
      setError({ title: 'Validation Error', message: 'Title, slug, and content are all required.' });
      return;
    }
    setSaving(true);
    try {
      await legalService.savePage(formSlug.trim(), { title: formTitle.trim(), content: formContent });
      closeEditor();
      await fetchPages();
    } catch (err) {
      setError({ title: 'Failed to save', message: extractError(err) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    try {
      await legalService.deletePage(slug);
      closeEditor();
      await fetchPages();
    } catch (err) {
      setError({ title: 'Failed to delete', message: extractError(err) });
    }
    setConfirmDelete(null);
  }

  const existingSlugs = new Set(pages.map(p => p.slug));
  const missingDefaults = DEFAULT_PAGES.filter(d => !existingSlugs.has(d.slug));

  // ── Editor View ─────────────────────────────────────────────────────────
  if (editing || creating) {
    return (
      <div className="animate-in">
        <div className="page-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={closeEditor}><ArrowLeft size={16} /></button>
            <div>
              <h2>{creating ? 'Create Legal Page' : 'Edit Legal Page'}</h2>
              {editing && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {editing.updated_by && <><User size={11} style={{ display: 'inline', marginRight: 4 }} />Last edited by {editing.updated_by.name}</>}
                  {editing.last_updated && <><Clock size={11} style={{ display: 'inline', margin: '0 4px 0 10px' }} />{new Date(editing.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => setConfirmDelete(editing.slug)}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="legal-editor-form">
          <div className="legal-editor-row">
            <div className="legal-editor-field" style={{ flex: 2 }}>
              <label>Title</label>
              <input
                className="form-input"
                value={formTitle}
                onChange={e => {
                  setFormTitle(e.target.value);
                  if (creating) setFormSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Privacy Policy"
              />
            </div>
            <div className="legal-editor-field" style={{ flex: 1 }}>
              <label>Slug</label>
              <input
                className="form-input"
                value={formSlug}
                onChange={e => creating && setFormSlug(slugify(e.target.value))}
                placeholder="privacy-policy"
                readOnly={!creating}
                style={!creating ? { opacity: 0.6 } : undefined}
              />
            </div>
          </div>
          <div className="legal-editor-field">
            <label>Content <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(HTML)</span></label>
            <textarea
              className="form-input legal-content-textarea"
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              placeholder="<h2>Section Title</h2>\n<p>Content paragraph...</p>"
            />
          </div>
          <div className="legal-preview-toggle">
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Preview rendered content</summary>
              <div className="legal-preview" dangerouslySetInnerHTML={{ __html: formContent }} />
            </details>
          </div>
        </div>

        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Delete Legal Page"
          message={`Are you sure you want to delete "${formTitle}"? This cannot be undone.`}
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Delete"
          confirmVariant="danger"
        />
        <ErrorModal isOpen={!!error} title={error?.title ?? 'Error'} message={error?.message ?? ''} onClose={() => setError(null)} actionLabel="OK" />
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Legal Pages</h2>
          <p>Manage privacy policy, terms, and other legal content displayed on the website.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openCreate()}>
          <Plus size={14} /> New Page
        </button>
      </div>

      {loading ? (
        <div className="table-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 180, height: 14 }} />
              <div className="skeleton" style={{ width: 120, height: 14 }} />
              <div style={{ marginLeft: 'auto' }}><div className="skeleton" style={{ width: 60, height: 28, borderRadius: 6 }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-header">
              <h3>{pages.length} Legal Page{pages.length !== 1 ? 's' : ''}</h3>
            </div>
            {pages.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                No legal pages yet. Create one or use the suggestions below.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</th>
                    <th style={{ padding: '12px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Slug</th>
                    <th style={{ padding: '12px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Updated</th>
                    <th style={{ padding: '12px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Updated By</th>
                    <th style={{ padding: '12px 22px', width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map(page => (
                    <tr key={page.id} className="table-row-hover" onClick={() => openEditor(page)} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '14px 22px', fontSize: 13, fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={14} color="var(--text-muted)" />
                          {page.title}
                        </div>
                      </td>
                      <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{page.slug}</code>
                      </td>
                      <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {page.last_updated ? new Date(page.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {page.updated_by?.name ?? '—'}
                      </td>
                      <td style={{ padding: '14px 22px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditor(page); }}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Suggested missing pages */}
          {missingDefaults.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10 }}>Suggested pages to create:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {missingDefaults.map(d => (
                  <button key={d.slug} className="btn btn-ghost btn-sm" onClick={() => openCreate(d)} style={{ fontSize: 12 }}>
                    <Plus size={12} /> {d.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ErrorModal isOpen={!!error} title={error?.title ?? 'Error'} message={error?.message ?? ''} onClose={() => setError(null)} actionLabel="OK" />
    </div>
  );
}
