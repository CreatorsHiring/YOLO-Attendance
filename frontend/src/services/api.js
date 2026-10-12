import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Students API
export const getStudents = (params) => api.get('/students', { params });
export const getStudentById = (studentId) => api.get(`/students/${studentId}`);
export const createStudent = (data) => api.post('/students', data);

// Enrollment API
export const enrollStudentFace = (studentId, formData) =>
  api.post(`/students/${studentId}/enrollment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Sessions API
export const createSession = (data) => api.post('/sessions', data);
export const getSessions = (params) => api.get('/sessions', { params });
export const getSessionById = (sessionId) => api.get(`/sessions/${sessionId}`);
export const closeSession = (sessionId) => api.post(`/sessions/${sessionId}/close`);

// Attendance & Recognition API
export const recognizeFace = (sessionId, formData) =>
  api.post(`/sessions/${sessionId}/recognitions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const recordAttendance = (sessionId, data) =>
  api.post(`/sessions/${sessionId}/attendance`, data);

export const getSessionAttendance = (sessionId) =>
  api.get(`/sessions/${sessionId}/attendance`);

// Health check
export const checkHealth = () => api.get('/health');

export default api;
