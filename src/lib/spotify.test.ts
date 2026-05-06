import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import {
  fetchClientCredentialsToken,
  __resetTokenCacheForTests,
} from './spotify';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('fetchClientCredentialsToken', () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = 'cid';
    process.env.SPOTIFY_CLIENT_SECRET = 'csecret';
    vi.stubGlobal('fetch', vi.fn());
    __resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  it('POSTs to accounts.spotify.com with Basic auth and returns the token', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'abc', expires_in: 3600 }),
    });

    const token = await fetchClientCredentialsToken();

    expect(token).toBe('abc');
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://accounts.spotify.com/api/token');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(call[1].headers.Authorization).toBe(
      'Basic ' + Buffer.from('cid:csecret').toString('base64'),
    );
    expect(call[1].body).toBe('grant_type=client_credentials');
  });

  it('caches the token across calls within TTL', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'cached', expires_in: 3600 }),
    });

    const t1 = await fetchClientCredentialsToken();
    const t2 = await fetchClientCredentialsToken();

    expect(t1).toBe('cached');
    expect(t2).toBe('cached');
    expect((global.fetch as any).mock.calls).toHaveLength(1);
  });

  it('dedups concurrent first-time calls into a single token request', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'shared', expires_in: 3600 }),
    });

    const [t1, t2, t3] = await Promise.all([
      fetchClientCredentialsToken(),
      fetchClientCredentialsToken(),
      fetchClientCredentialsToken(),
    ]);

    expect(t1).toBe('shared');
    expect(t2).toBe('shared');
    expect(t3).toBe('shared');
    expect((global.fetch as any).mock.calls).toHaveLength(1);
  });

  it('throws when SPOTIFY_CLIENT_ID is missing', async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/SPOTIFY_CLIENT_ID/);
  });

  it('throws when SPOTIFY_CLIENT_SECRET is missing', async () => {
    delete process.env.SPOTIFY_CLIENT_SECRET;
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/SPOTIFY_CLIENT_SECRET/);
  });

  it('throws when token fetch returns non-ok', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 401, text: async () => 'no' });
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/401/);
  });

  it('throws when token response is missing access_token', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ expires_in: 3600 }),
    });
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/missing expected fields/);
  });
});
