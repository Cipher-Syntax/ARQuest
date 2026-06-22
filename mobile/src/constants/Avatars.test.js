import { AVATARS } from './Avatars';

describe('Avatars', () => {
  it('exports a list of avatars with id and uri', () => {
    expect(AVATARS.length).toBeGreaterThan(0);
    expect(AVATARS[0]).toHaveProperty('id');
    expect(AVATARS[0]).toHaveProperty('uri');
  });
});
