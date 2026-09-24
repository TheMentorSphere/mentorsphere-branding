import { TURNSTILE_TOKEN_MAX_AGE_MS, turnstileTokenIsStale } from './intake-submission-contract.js';

// One owner for verification timing. This helper never submits or touches answers.
export function createIntakeTurnstile({ configEndpoint, container, status, submitButton, onVerified }) {
  let config = null;
  let widgetId = null;
  let generation = 0;
  let token = '';
  let issuedAt = null;
  let timer = null;
  let reviewing = false;
  let executing = false;
  let loading = false;
  let busy = false;
  let completed = false;
  let failed = false;
  let script = null;

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'button button-secondary';
  retry.textContent = 'Retry security check';
  retry.hidden = true;
  status.after(retry);
  submitButton.disabled = true;

  const clearToken = () => {
    clearTimeout(timer);
    timer = null;
    token = '';
    issuedAt = null;
    submitButton.disabled = true;
  };

  const fail = (message = 'The security check needs retrying. Your answers are still on this page. Select Retry security check.') => {
    failed = true;
    clearToken();
    executing = false;
    status.textContent = message;
    retry.hidden = !reviewing || busy || completed;
    retry.disabled = false;
  };

  const discardWidget = () => {
    generation += 1; // Ignore callbacks from a widget removed on navigation/completion.
    clearToken();
    executing = false;
    if (widgetId !== null) window.turnstile.remove(widgetId);
    widgetId = null;
  };

  const ready = () => {
    if (!reviewing || busy || completed || !config?.enabled || widgetId === null) return false;
    if (turnstileTokenIsStale(token, issuedAt)) return false;
    try {
      return !window.turnstile.isExpired(widgetId);
    } catch {
      return false;
    }
  };

  const execute = (reset = false) => {
    if (!reviewing || busy || completed || !config?.enabled || !window.turnstile || executing) return;
    clearToken();
    retry.hidden = true;
    failed = false;
    status.textContent = 'Preparing the security check. Please wait before submitting.';
    try {
      if (widgetId === null) {
        const currentGeneration = ++generation;
        const active = () => currentGeneration === generation && reviewing && !busy && !completed;
        widgetId = window.turnstile.render(container, {
          sitekey: config.siteKey,
          action: config.action,
          theme: 'light',
          size: 'compact',
          execution: 'execute',
          appearance: 'execute',
          retry: 'never',
          'refresh-expired': 'never',
          'refresh-timeout': 'never',
          'response-field': false,
          'before-interactive-callback': () => {
            // Let Cloudflare time the interactive challenge; do not rush the person.
            if (active()) { clearTimeout(timer); timer = null; }
          },
          callback: (value) => {
            if (!active() || !executing || !value) return;
            clearTimeout(timer);
            executing = false;
            token = value;
            issuedAt = Date.now();
            status.textContent = 'Security check complete. You can submit when ready.';
            retry.hidden = true;
            submitButton.disabled = false;
            onVerified();
            timer = setTimeout(() => execute(true), TURNSTILE_TOKEN_MAX_AGE_MS);
          },
          'expired-callback': () => {
            if (!active() || executing) return;
            execute(true);
          },
          'timeout-callback': () => { if (active()) fail(); },
          'error-callback': () => { if (active()) fail(); },
        });
      } else if (reset) {
        window.turnstile.reset(widgetId);
      }
      executing = true;
      // Also recover if the SDK never delivers any callback (for example offline).
      timer = setTimeout(() => fail(), 60_000);
      window.turnstile.execute(widgetId);
    } catch {
      fail();
    }
  };

  const load = async () => {
    if (loading || completed) return;
    loading = true;
    failed = false;
    retry.hidden = true;
    status.textContent = 'Preparing the security check.';
    try {
      const response = await fetch(configEndpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Configuration unavailable');
      config = await response.json();
      if (!config.enabled || !config.siteKey || !config.action) {
        config = null;
        clearToken();
        status.textContent = 'This form is not accepting submissions yet.';
        return;
      }
      if (!window.turnstile) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Security script timeout')), 15_000);
          window.mentorSphereIntakeTurnstileReady = () => { clearTimeout(timeout); resolve(); };
          script?.remove();
          script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=mentorSphereIntakeTurnstileReady&render=explicit';
          script.async = true;
          script.defer = true;
          script.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Security script unavailable')); });
          document.head.append(script);
        });
      }
      status.textContent = 'The security check will run on Review and submit.';
      execute();
    } catch {
      fail();
    } finally {
      loading = false;
    }
  };

  retry.addEventListener('click', () => {
    if (busy || completed || !reviewing) return;
    if (!config || !window.turnstile) void load();
    else execute(true);
  });

  return {
    load,
    get token() { return token; },
    setReview(value) {
      if (value === reviewing) return;
      reviewing = value;
      if (reviewing) {
        if (failed) fail();
        else if (!loading && config && window.turnstile) execute();
        else if (!loading && !config) retry.hidden = true;
      } else {
        discardWidget();
        retry.hidden = true;
      }
    },
    ensureReady() {
      if (ready()) return true;
      execute(true);
      return false; // No pending submission intent: a fresh, intentional click is required.
    },
    beginSubmission() {
      busy = true;
      clearToken(); // The payload already owns this single-use token.
      retry.hidden = true;
    },
    finishSubmission(success) {
      completed = success;
      busy = false;
      discardWidget();
      if (!completed) execute();
      else retry.hidden = true;
    },
  };
}
