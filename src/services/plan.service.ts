import api from './api';
import type { AdminPlan, CreatePlanPayload, UpdatePlanPayload } from '../types';

async function listPlans(): Promise<AdminPlan[]> {
  const { data } = await api.get('/admin/plans');
  return data.data;
}

async function createPlan(payload: CreatePlanPayload): Promise<AdminPlan> {
  const { data } = await api.post('/admin/plans', payload);
  return data.data;
}

async function updatePlan(planId: string, payload: UpdatePlanPayload): Promise<AdminPlan> {
  const { data } = await api.put(`/admin/plans/${planId}`, payload);
  return data.data;
}

async function deletePlan(planId: string): Promise<{ id: string }> {
  const { data } = await api.delete(`/admin/plans/${planId}`);
  return data.data;
}

async function togglePlan(planId: string): Promise<AdminPlan> {
  const { data } = await api.put(`/admin/plans/${planId}/toggle`);
  return data.data;
}

async function reorderPlans(orderedIds: string[]): Promise<AdminPlan[]> {
  const { data } = await api.put('/admin/plans/reorder', { ordered_ids: orderedIds });
  return data.data;
}

const planService = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlan,
  reorderPlans,
};

export default planService;
