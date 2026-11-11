export { Room } from './room.js';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      // 집은 하나. 모두 같은 방으로 들어온다.
      const id = env.ROOM.idFromName('home');
      return env.ROOM.get(id).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};
