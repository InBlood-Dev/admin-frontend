import api from './api';

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  last_updated: string | null;
  updated_by: { id: string; name: string } | null;
}

async function listPages(): Promise<LegalPage[]> {
  const { data } = await api.get('/admin/legal-pages');
  return data.data;
}

async function getPage(slug: string): Promise<LegalPage> {
  const { data } = await api.get(`/admin/legal-pages/${slug}`);
  return data.data;
}

async function savePage(slug: string, payload: { title: string; content: string }): Promise<LegalPage> {
  const { data } = await api.put(`/admin/legal-pages/${slug}`, payload);
  return data.data;
}

async function deletePage(slug: string): Promise<void> {
  await api.delete(`/admin/legal-pages/${slug}`);
}

const legalService = { listPages, getPage, savePage, deletePage };
export default legalService;
