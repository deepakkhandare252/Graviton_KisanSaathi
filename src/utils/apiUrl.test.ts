import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveApiBaseUrl,
  shouldFallbackToSameOrigin,
  formatNetworkErrorMessage
} from './apiUrl';

test('resolveApiBaseUrl defaults to /api when unset or relative', () => {
  assert.equal(resolveApiBaseUrl(undefined), '/api');
  assert.equal(resolveApiBaseUrl(''), '/api');
  assert.equal(resolveApiBaseUrl('/api/'), '/api');
});

test('resolveApiBaseUrl prevents remote hosted origins from calling localhost:8080', () => {
  const remoteLoc = {
    hostname: 'ais-dev-wm5dznrhcfbhnfa45dlwcu-219627828194.asia-northeast1.run.app',
    origin: 'https://ais-dev-wm5dznrhcfbhnfa45dlwcu-219627828194.asia-northeast1.run.app'
  };
  assert.equal(resolveApiBaseUrl('http://localhost:8080/api', remoteLoc), '/api');
  assert.equal(resolveApiBaseUrl('http://127.0.0.1:8080/api', remoteLoc), '/api');
});

test('resolveApiBaseUrl preserves Spring Boot localhost:8080 on local dev while normalizing same-origin', () => {
  const local3000 = { hostname: 'localhost', origin: 'http://localhost:3000' };
  const local8080 = { hostname: 'localhost', origin: 'http://localhost:8080' };

  assert.equal(resolveApiBaseUrl('http://localhost:8080/api', local3000), 'http://localhost:8080/api');
  assert.equal(resolveApiBaseUrl('http://localhost:8080/api', local8080), '/api');
});

test('shouldFallbackToSameOrigin triggers once for unreachable cross-origin API bases', () => {
  assert.equal(shouldFallbackToSameOrigin('http://localhost:8080/api', 0, false), true);
  assert.equal(shouldFallbackToSameOrigin('http://localhost:8080/api', 0, true), false);
  assert.equal(shouldFallbackToSameOrigin('/api', 0, false), false);
  assert.equal(shouldFallbackToSameOrigin('http://localhost:8080/api', 401, false), false);
});

test('formatNetworkErrorMessage distinguishes offline, timeout, and unreachable backend', () => {
  assert.match(
    formatNetworkErrorMessage({ status: 0, isOnline: false }),
    /appear to be offline/i
  );
  assert.match(
    formatNetworkErrorMessage({ status: 0, isOnline: true, errorCode: 'ECONNABORTED' }),
    /timed out/i
  );
  assert.match(
    formatNetworkErrorMessage({ status: 0, isOnline: true }),
    /Unable to reach the backend API server/i
  );
  assert.equal(
    formatNetworkErrorMessage({ status: 400, isOnline: true, dataError: 'Invalid OTP' }),
    'Invalid OTP'
  );
});
