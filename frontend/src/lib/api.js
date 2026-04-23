import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tg_token');
      localStorage.removeItem('tg_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
  me:     ()     => api.get('/auth/me'),
};

export const verifyAPI = {
  verify:  (text, chatId) => api.post('/verify', { text, chatId }),
  history: ()             => api.get('/verify/history'),
};

export const chatAPI = {
  list:        ()           => api.get('/chat'),
  create:      (title)      => api.post('/chat', { title }),
  get:         (id)         => api.get(`/chat/${id}`),
  rename:      (id, title)  => api.patch(`/chat/${id}`, { title }),
  delete:      (id)         => api.delete(`/chat/${id}`),
  saveMessage: (id, msg)    => api.post(`/chat/${id}/message`, msg),
};

export default api;
