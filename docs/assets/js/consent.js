(() => {
  // Shared consent manager for optional website purposes. It is loaded on every
  // public page so that a choice can be reviewed or changed anywhere, but it
  // never loads third-party code itself. It remembers the visitor's choice in
  // this browser only, tells page scripts about it, and treats nothing optional
  // as accepted until the visitor actively accepts it.
  const STORAGE_KEY = 'mentorsphere-consent';
  const STORAGE_VERSION = 1;
  const CHOICE_LIFETIME_DAYS = 182;
  const POLICY_URL = '/privacy-policy/#advertising-measurement';

  const PURPOSES = {
    advertising: {
      title: 'Advertising measurement',
      description: 'Can The MentorSphere use Google Ads cookies to measure whether its adverts lead to enquiries or booking-page visits? Nothing is sent to Google unless you accept, and your enquiry details are never shared.',
      moreLabel: 'How advertising measurement works',
      // Both buttons show a short verb on small screens. The purpose stays in
      // each button's accessible name, and is visible on wider screens.
      acceptLabel: 'Accept',
      rejectLabel: 'Reject',
      labelContext: ' advertising measurement',
      acceptedMessage: 'You have accepted advertising measurement.',
      rejectedMessage: 'You have rejected advertising measurement.',
      // First-party storage this purpose may create once accepted. It is
      // removed whenever the purpose is not accepted.
      cookiePrefix: '_gcl_',
      storagePrefix: '_gcl_',
    },
  };

  const CHOICES = ['granted', 'denied'];
  const listeners = new Set();
  let memoryRecord = null;

  const storage = (() => {
    try {
      const probe = `${STORAGE_KEY}-probe`;
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  })();

  // Browser storage is the source of truth whenever it works, so a page never
  // relies on a stale copy of a choice changed on another page or in another
  // tab. The in-memory copy is used only when the choice could not be stored.
  const readRecord = () => {
    if (memoryRecord) return memoryRecord;
    if (!storage) return null;
    try {
      const record = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      return record && record.version === STORAGE_VERSION && typeof record.choices === 'object' ? record : null;
    } catch {
      return null;
    }
  };

  const writeRecord = (record) => {
    memoryRecord = null;
    try {
      if (!storage) throw new Error('Storage is unavailable');
      storage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // The choice still applies for the rest of this page view.
      memoryRecord = record;
    }
  };

  const get = (purpose) => {
    if (!PURPOSES[purpose]) return null;
    const entry = readRecord()?.choices?.[purpose];
    if (!entry || !CHOICES.includes(entry.value)) return null;
    const decidedAt = Date.parse(entry.date);
    if (!Number.isFinite(decidedAt)) return null;
    if (Date.now() - decidedAt > CHOICE_LIFETIME_DAYS * 24 * 60 * 60 * 1000) return null;
    return entry.value;
  };

  const clearPurposeStorage = (purpose) => {
    const { cookiePrefix, storagePrefix } = PURPOSES[purpose];
    try {
      const names = document.cookie
        .split(';')
        .map((part) => part.split('=')[0].trim())
        .filter((name) => name.startsWith(cookiePrefix));
      const labels = window.location.hostname.split('.');
      const domains = labels.map((_, index) => labels.slice(index).join('.')).filter((domain) => domain.includes('.'));
      names.forEach((name) => {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        domains.forEach((domain) => {
          document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
        });
      });
    } catch {
      // Cookies may be unavailable; there is then nothing to remove.
    }
    if (!storage) return;
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && key.startsWith(storagePrefix)) storage.removeItem(key);
      }
    } catch {
      // Storage may be unavailable; there is then nothing to remove.
    }
  };

  const notify = (purpose, value) => {
    listeners.forEach((listener) => {
      try {
        listener(purpose, value);
      } catch {
        // One page script must not stop another from hearing the choice.
      }
    });
  };

  const set = (purpose, value) => {
    if (!PURPOSES[purpose] || !CHOICES.includes(value)) return;
    const record = readRecord() || { version: STORAGE_VERSION, choices: {} };
    writeRecord({
      version: STORAGE_VERSION,
      choices: { ...record.choices, [purpose]: { value, date: new Date().toISOString().slice(0, 10) } },
    });
    // Tell page scripts first, so they stop before their storage is removed.
    notify(purpose, value);
    if (value !== 'granted') clearPurposeStorage(purpose);
  };

  const subscribe = (listener) => {
    if (typeof listener === 'function') listeners.add(listener);
  };

  // Remove leftover storage for any purpose that is not currently accepted,
  // for example after a choice has expired or was withdrawn on another page.
  Object.keys(PURPOSES).forEach((purpose) => {
    if (get(purpose) !== 'granted') clearPurposeStorage(purpose);
  });

  // Re-apply the stored choice when it may have changed while this page was not
  // listening: in another tab, or on another page before this one was restored
  // from the back/forward cache. Listeners receive null when no choice applies
  // and must treat anything other than 'granted' as not accepted.
  const resync = () => {
    Object.keys(PURPOSES).forEach((purpose) => {
      const value = get(purpose);
      notify(purpose, value);
      if (value !== 'granted') clearPurposeStorage(purpose);
    });
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    memoryRecord = null;
    resync();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resync();
  });

  let banner = null;
  let bannerParts = null;
  let bannerPurpose = null;
  let settingsTrigger = null;

  const element = (tag, attributes = {}, text = '') => {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    if (text) node.textContent = text;
    return node;
  };

  const updateBannerSpace = () => {
    const open = Boolean(banner && !banner.hidden);
    document.documentElement.classList.toggle('consent-banner-open', open);
    document.documentElement.style.setProperty('--consent-banner-space', open ? `${banner.offsetHeight}px` : '0px');
  };

  const hideBanner = ({ restoreFocus = false } = {}) => {
    if (!banner) return;
    banner.hidden = true;
    updateBannerSpace();
    if (restoreFocus && settingsTrigger) settingsTrigger.focus();
    settingsTrigger = null;
  };

  const choose = (value) => {
    set(bannerPurpose, value);
    const purpose = PURPOSES[bannerPurpose];
    bannerParts.question.hidden = true;
    bannerParts.confirmationText.textContent = `${value === 'granted' ? purpose.acceptedMessage : purpose.rejectedMessage} You can change this at any time using Cookie settings at the bottom of this page.`;
    bannerParts.confirmation.hidden = false;
    updateBannerSpace();
    bannerParts.confirmation.focus();
  };

  const buildBanner = () => {
    banner = element('div', { class: 'consent-banner', role: 'region', 'aria-labelledby': 'consent-banner-title', 'data-consent-banner': '' });
    banner.hidden = true;
    const inner = element('div', { class: 'container consent-banner-inner' });

    const question = element('div', { class: 'consent-banner-question' });
    const title = element('h2', { class: 'consent-banner-title', id: 'consent-banner-title', tabindex: '-1' });
    // The explanation and the link to the full details share one paragraph, so
    // the route to further information never needs a line of its own.
    const description = element('p', { class: 'consent-banner-text' });
    const descriptionText = element('span');
    const policyLink = element('a', { href: POLICY_URL });
    description.append(descriptionText, ' ', policyLink);
    const current = element('p', { class: 'consent-banner-current' });
    const actions = element('div', { class: 'consent-banner-actions' });
    const accept = element('button', { type: 'button', class: 'consent-button', 'data-consent-choice': 'granted' });
    const reject = element('button', { type: 'button', class: 'consent-button', 'data-consent-choice': 'denied' });
    const close = element('button', { type: 'button', class: 'consent-link-button', 'data-consent-close': '' }, 'Close without changing');
    actions.append(accept, reject, close);
    question.append(title, description, current, actions);

    const confirmation = element('div', { class: 'consent-banner-confirmation', role: 'alert', tabindex: '-1' });
    const confirmationText = element('p');
    const hide = element('button', { type: 'button', class: 'consent-link-button', 'data-consent-hide': '' }, 'Hide this message');
    confirmation.append(confirmationText, hide);
    confirmation.hidden = true;

    inner.append(question, confirmation);
    banner.append(inner);

    accept.addEventListener('click', () => choose('granted'));
    reject.addEventListener('click', () => choose('denied'));
    close.addEventListener('click', () => hideBanner({ restoreFocus: true }));
    hide.addEventListener('click', () => hideBanner({ restoreFocus: true }));
    banner.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && settingsTrigger) hideBanner({ restoreFocus: true });
    });

    bannerParts = { question, title, descriptionText, policyLink, current, accept, reject, close, confirmation, confirmationText };

    // Keep the choice early in the reading and keyboard order, straight after
    // the skip link, while it is displayed at the bottom of the screen.
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) skipLink.after(banner);
    else document.body.prepend(banner);

    if ('ResizeObserver' in window) new window.ResizeObserver(updateBannerSpace).observe(banner);
    else window.addEventListener('resize', updateBannerSpace, { passive: true });
  };

  const showBanner = (purpose, { trigger = null } = {}) => {
    if (!banner) buildBanner();
    const details = PURPOSES[purpose];
    const value = get(purpose);
    bannerPurpose = purpose;
    settingsTrigger = trigger;
    bannerParts.title.textContent = details.title;
    bannerParts.descriptionText.textContent = details.description;
    bannerParts.policyLink.textContent = details.moreLabel;
    [[bannerParts.accept, details.acceptLabel], [bannerParts.reject, details.rejectLabel]].forEach(([button, label]) => {
      // One inline wrapper keeps the space before the context words, which a
      // flex container would otherwise drop.
      const wrapper = element('span', { class: 'consent-button-label' });
      wrapper.append(label, element('span', { class: 'consent-button-context' }, details.labelContext));
      button.replaceChildren(wrapper);
    });
    bannerParts.current.textContent = value === 'granted'
      ? 'Your current choice: accepted.'
      : value === 'denied' ? 'Your current choice: rejected.' : 'You have not made a choice yet.';
    bannerParts.current.hidden = !trigger;
    bannerParts.close.hidden = !trigger;
    bannerParts.question.hidden = false;
    bannerParts.confirmation.hidden = true;
    banner.hidden = false;
    updateBannerSpace();
    if (trigger) bannerParts.title.focus();
  };

  const request = (purpose) => {
    if (!PURPOSES[purpose] || get(purpose)) return;
    if (banner && !banner.hidden) return;
    showBanner(purpose);
  };

  const open = (trigger = null, purpose = 'advertising') => {
    if (PURPOSES[purpose]) showBanner(purpose, { trigger: trigger || document.activeElement || null });
  };

  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom && !footerBottom.querySelector('[data-consent-open]')) {
    const item = element('p');
    item.append(element('button', { type: 'button', class: 'consent-settings-link', 'data-consent-open': '' }, 'Cookie settings'));
    footerBottom.append(item);
  }

  document.querySelectorAll('[data-consent-open]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => open(button));
  });

  window.MentorSphereConsent = Object.freeze({ get, set, subscribe, request, open });
})();
