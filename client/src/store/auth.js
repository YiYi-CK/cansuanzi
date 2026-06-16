import { defineStore } from 'pinia';
import api from '../api/client';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isOwner: (state) => state.user?.role === 'owner',
    restaurantId: (state) => state.user?.restaurantId,
  },
  actions: {
    async login(email, password) {
      const res = await api.post('/auth/login', { email, password });
      this.token = res.data.token;
      this.user = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    },
    async register(data) {
      const res = await api.post('/auth/register', data);
      this.token = res.data.token;
      this.user = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
