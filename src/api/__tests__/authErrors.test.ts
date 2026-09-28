/**
 * Supabase's auth errors are written for developers, and the one a fresh
 * project hits first - the built-in mailer's hourly cap - reads as though
 * the player mistyped something. These map them onto what is actually wrong
 * and who can fix it.
 */

import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from '../auth';

describe('friendlyAuthError', () => {
  it('explains the mail cap as a project limit, not a player mistake', () => {
    const out = friendlyAuthError('Email rate limit exceeded');
    expect(out).toMatch(/limit for sending email/i);
    expect(out).toMatch(/SMTP/i);
    // The player did nothing wrong, so it must not read like a rejection.
    expect(out).not.toMatch(/invalid|incorrect|denied/i);
  });

  it('covers the other wordings Supabase uses for throttling', () => {
    expect(friendlyAuthError('Too many requests')).toMatch(/limit for sending email/i);
    expect(friendlyAuthError('For security purposes, you can only request this after 51s')).toMatch(
      /wait a few seconds/i,
    );
  });

  it('points an existing account at sign-in rather than sign-up', () => {
    expect(friendlyAuthError('User already registered')).toMatch(/sign in instead/i);
  });

  it('keeps credential failures vague enough not to confirm an address exists', () => {
    const out = friendlyAuthError('Invalid login credentials');
    expect(out).toBe('That email and password do not match an account.');
    // Naming which half was wrong would let anyone test whether an email
    // has an account here.
    expect(out).not.toMatch(/password is wrong|no such user|not found/i);
  });

  it('explains a rejected domain instead of just repeating "invalid"', () => {
    expect(friendlyAuthError('Email address "a@example.com" is invalid')).toMatch(/blocked/i);
  });

  it('passes anything it does not recognise through untouched', () => {
    expect(friendlyAuthError('Something entirely new')).toBe('Something entirely new');
  });
});

describe('enabledOAuthProviders', () => {
  it('offers nothing when there is no project to ask', async () => {
    // The suite runs with credentials blanked, which is also what a local
    // clone looks like. Offering Google there would be a button that cannot
    // work, so the safe answer is none.
    const { enabledOAuthProviders } = await import('../auth');
    const providers = await enabledOAuthProviders();

    expect(providers.size).toBe(0);
    expect(providers.has('google')).toBe(false);
  });
});
