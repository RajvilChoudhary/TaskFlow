import axios from 'axios';
import { config } from '../config';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth interceptor to include JWT token in requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===================== BOARDS =====================
export const getBoards       = ()           => api.get('/boards');
export const createBoard     = (data)       => api.post('/boards', data);
export const getBoard        = (id)         => api.get(`/boards/${id}`);
export const updateBoard     = (id, data)   => api.put(`/boards/${id}`, data);
export const deleteBoard     = (id)         => api.delete(`/boards/${id}`);
export const getBoardMembers = (id)         => api.get(`/boards/${id}/members`);
export const getBoardLabels  = (id)         => api.get(`/boards/${id}/labels`);
export const createBoardLabel= (id, data)   => api.post(`/boards/${id}/labels`, data);
export const searchCards     = (id, q)      => api.get(`/boards/${id}/cards/search`, { params: { q } });
export const filterCards     = (id, params) => api.get(`/boards/${id}/cards/filter`, { params });

// ===================== LISTS =====================
export const createList  = (data)       => api.post('/lists', data);
export const updateList  = (id, data)   => api.put(`/lists/${id}`, data);
export const reorderList = (id, data)   => api.put(`/lists/${id}/reorder`, data);
export const deleteList  = (id)         => api.delete(`/lists/${id}`);

// ===================== CARDS =====================
export const createCard  = (data)       => api.post('/cards', data);
export const getCard     = (id)         => api.get(`/cards/${id}`);
export const updateCard  = (id, data)   => api.put(`/cards/${id}`, data);
export const moveCard    = (id, data)   => api.put(`/cards/${id}/move`, data);
export const deleteCard  = (id)         => api.delete(`/cards/${id}`);

// Card Labels
export const addCardLabel    = (cardId, labelId)         => api.post(`/cards/${cardId}/labels`, { label_id: labelId });
export const removeCardLabel = (cardId, labelId)         => api.delete(`/cards/${cardId}/labels/${labelId}`);

// Card Members
export const addCardMember    = (cardId, userId)  => api.post(`/cards/${cardId}/members`, { user_id: userId });
export const removeCardMember = (cardId, userId)  => api.delete(`/cards/${cardId}/members/${userId}`);

// ===================== LABELS =====================
export const updateLabel = (id, data)  => api.put(`/labels/${id}`, data);
export const deleteLabel = (id)        => api.delete(`/labels/${id}`);

// ===================== CHECKLISTS =====================
export const createChecklist  = (cardId, data) => api.post(`/cards/${cardId}/checklists`, data);
export const deleteChecklist  = (id)           => api.delete(`/checklists/${id}`);
export const addChecklistItem = (clId, data)   => api.post(`/checklists/${clId}/items`, data);
export const updateChecklistItem = (id, data)  => api.put(`/checklist-items/${id}`, data);
export const deleteChecklistItem = (id)        => api.delete(`/checklist-items/${id}`);

// ===================== COMMENTS =====================
export const getComments   = (cardId)       => api.get(`/cards/${cardId}/comments`);
export const addComment    = (cardId, data) => api.post(`/cards/${cardId}/comments`, data);
export const deleteComment = (id)           => api.delete(`/comments/${id}`);
export const getActivity   = (cardId)       => api.get(`/cards/${cardId}/activity`);

// ===================== ATTACHMENTS =====================
export const uploadAttachment  = (cardId, formData) =>
  api.post(`/cards/${cardId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteAttachment  = (id) => api.delete(`/attachments/${id}`);

// ===================== MEMBERS =====================
export const getMembers = () => api.get('/members');
export const globalSearch = (q) => api.get('/search', { params: { q } });

// ===================== AUTH =====================
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getCurrentUser = () => api.get('/auth/me');

// ===================== INVITATIONS =====================
export const sendInvitation = (data) => api.post('/invitations', data);
export const getInvitations = () => api.get('/invitations');
export const acceptInvitation = (id) => api.put(`/invitations/${id}/accept`);
export const declineInvitation = (id) => api.put(`/invitations/${id}/decline`);

// ===================== ADMIN =====================
export const getAllUsers = () => api.get('/admin/users');
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const getUserStats = () => api.get('/admin/stats');

export default api;
