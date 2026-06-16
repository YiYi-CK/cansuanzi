import client from './client';

export const authAPI = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (data) => client.post('/auth/register', data),
  me: () => client.get('/auth/me'),
};

export const employeesAPI = {
  list: () => client.get('/employees'),
  create: (data) => client.post('/employees', data),
  get: (id) => client.get(`/employees/${id}`),
  update: (id, data) => client.put(`/employees/${id}`, data),
  remove: (id) => client.delete(`/employees/${id}`),
  availabilities: (id) => client.get(`/employees/${id}/availabilities`),
  updateAvailabilities: (id, availabilities) => client.post(`/employees/${id}/availabilities`, { availabilities }),
};

export const shiftsAPI = {
  list: (date_from, date_to) => client.get('/shifts', { params: { date_from, date_to } }),
  create: (data) => client.post('/shifts', data),
  update: (id, data) => client.put(`/shifts/${id}`, data),
  remove: (id) => client.delete(`/shifts/${id}`),
};

export const approvalsAPI = {
  swaps: () => client.get('/approvals/swaps'),
  createSwap: (data) => client.post('/approvals/swaps', data),
  approveSwap: (id) => client.put(`/approvals/swaps/${id}/approve`),
  rejectSwap: (id) => client.put(`/approvals/swaps/${id}/reject`),
  undoSwap: (id) => client.put(`/approvals/swaps/${id}/undo`),
  leaves: () => client.get('/approvals/leaves'),
  createLeave: (data) => client.post('/approvals/leaves', data),
  approveLeave: (id) => client.put(`/approvals/leaves/${id}/approve`),
  rejectLeave: (id) => client.put(`/approvals/leaves/${id}/reject`),
  undoLeave: (id) => client.put(`/approvals/leaves/${id}/undo`),
};

export const reportsAPI = {
  posList: (date_from, date_to) => client.get('/reports/pos', { params: { date_from, date_to } }),
  posCreate: (data) => client.post('/reports/pos', data),
  posImportCSV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/reports/pos/import-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  posDelete: (id) => client.delete(`/reports/pos/${id}`),
};

export const expensesAPI = {
  list: (date_from, date_to) => client.get('/expenses', { params: { date_from, date_to } }),
  create: (data) => client.post('/expenses', data),
  remove: (id) => client.delete(`/expenses/${id}`),
};

export const payrollAPI = {
  get: (date_from, date_to) => client.get('/payroll', { params: { date_from, date_to } }),
};

export const dashboardAPI = {
  get: (date_from, date_to) => client.get('/dashboard', { params: { date_from, date_to } }),
};

export const settingsAPI = {
  get: () => client.get('/settings'),
  update: (data) => client.put('/settings', data),
};
