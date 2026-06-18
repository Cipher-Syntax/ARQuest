import api from './api';

export const userService = {
  getUsers: async () => {
    const response = await api.get('/api/auth/users/');
    return response.data.data;
  },
  getLeaderboard: async () => {
    const response = await api.get('/api/auth/leaderboard/');
    return response.data.data;
  }
};
