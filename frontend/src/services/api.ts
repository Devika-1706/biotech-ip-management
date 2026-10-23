import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const userService = {
  getUsers: (params?: any) => api.get('/users', { params }),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const projectService = {
  getProjects: (params?: any) => api.get('/projects', { params }),
  getProject: (id: string) => api.get(`/projects/${id}`),
  getOverview: (id: string) => api.get(`/projects/${id}/overview`),
  getPatents: (id: string, params?: any) => api.get(`/projects/${id}/patents`, { params }),
  getDisclosures: (id: string, params?: any) => api.get(`/projects/${id}/disclosures`, { params }),
  getAgreements: (id: string, params?: any) => api.get(`/projects/${id}/agreements`, { params }),
  getFilings: (id: string, params?: any) => api.get(`/projects/${id}/filings`, { params }),
  getCompliance: (id: string, params?: any) => api.get(`/projects/${id}/compliance`, { params }),
  getCollaborations: (id: string, params?: any) => api.get(`/projects/${id}/collaborations`, { params }),
  getDeadlines: (id: string) => api.get(`/projects/${id}/deadlines`),
  getDocuments: (id: string, params?: any) => api.get(`/projects/${id}/documents`, { params }),
  getActivity: (id: string, params?: any) => api.get(`/projects/${id}/activity`, { params }),
  createProject: (data: any) => api.post('/projects', data),
  updateProject: (id: string, data: any) => api.put(`/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
};

export const activityLogService = {
  getActivityLogs: (params?: any) => api.get('/activity-logs', { params }),
};

export const patentService = {
  getPatents: (params?: any) => api.get('/patents', { params }),
  getPatent: (id: string) => api.get(`/patents/${id}`),
  createPatent: (data: any) => api.post('/patents', data),
  updatePatent: (id: string, data: any) => api.put(`/patents/${id}`, data),
  deletePatent: (id: string) => api.delete(`/patents/${id}`),
};

export const disclosureService = {
  getDisclosures: (params?: any) => api.get('/disclosures', { params }),
  getDisclosure: (id: string) => api.get(`/disclosures/${id}`),
  createDisclosure: (data: any) => api.post('/disclosures', data),
  updateDisclosure: (id: string, data: any) => api.put(`/disclosures/${id}`, data),
  convertToPatent: (id: string, data: any) => api.post(`/disclosures/${id}/convert-to-patent`, data),
  deleteDisclosure: (id: string) => api.delete(`/disclosures/${id}`),
};

export const agreementService = {
  getAgreements: (params?: any) => api.get('/agreements', { params }),
  getAgreement: (id: string) => api.get(`/agreements/${id}`),
  createAgreement: (data: any) => api.post('/agreements', data),
  updateAgreement: (id: string, data: any) => api.put(`/agreements/${id}`, data),
  deleteAgreement: (id: string) => api.delete(`/agreements/${id}`),
};

export const filingService = {
  getFilings: (params?: any) => api.get('/filings', { params }),
  getFiling: (id: string) => api.get(`/filings/${id}`),
  createFiling: (data: any) => api.post('/filings', data),
  updateFiling: (id: string, data: any) => api.put(`/filings/${id}`, data),
  deleteFiling: (id: string) => api.delete(`/filings/${id}`),
};

export const complianceService = {
  getComplianceItems: (params?: any) => api.get('/compliance', { params }),
  getComplianceItem: (id: string) => api.get(`/compliance/${id}`),
  createComplianceItem: (data: any) => api.post('/compliance', data),
  updateComplianceItem: (id: string, data: any) => api.put(`/compliance/${id}`, data),
  deleteComplianceItem: (id: string) => api.delete(`/compliance/${id}`),
};

export const collaborationService = {
  getCollaborations: (params?: any) => api.get('/collaborations', { params }),
  getCollaboration: (id: string) => api.get(`/collaborations/${id}`),
  createCollaboration: (data: any) => api.post('/collaborations', data),
  updateCollaboration: (id: string, data: any) => api.put(`/collaborations/${id}`, data),
  deleteCollaboration: (id: string) => api.delete(`/collaborations/${id}`),
};

export const documentService = {
  getDocuments: (params?: any) => api.get('/documents', { params }),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  uploadDocument: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadDocumentUrl: (id: string) => `/api/documents/${id}/download`,
  deleteDocument: (id: string) => api.delete(`/documents/${id}`),
};

export const deadlineService = {
  getDeadlines: () => api.get('/deadlines'),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export const reportService = {
  getReports: () => api.get('/reports/statistics'),
};

export const searchService = {
  globalSearch: (q: string) => api.get('/search', { params: { q } }),
};

export const systemService = {
  getHealth: () => api.get('/health'),
};

export default api;
