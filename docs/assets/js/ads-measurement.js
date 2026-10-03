(() => {
  // Consent-gated Google Ads conversion measurement for advertising landing
  // pages. It stays inert unless the page supplies a complete configuration and
  // the visitor has actively accepted advertising measurement. Before that, no
  // Google code is loaded and nothing is sent. It never reads or sends form
  // values, and advertising personalisation stays switched off.
  const consent = window.MentorSphereConsent;
  const configElement = document.querySelector('script[type="application/json"][data-ads-measurement-config]');
  if (!consent || !configElement) return;

  const PURPOSE = 'advertising';
  const GOOGLE_ADS_ID = /^AW-\d{6,15}$/;
  const CONVERSION_LABEL = /^[A-Za-z0-9_-]{6,64}$/;
  // Only two kinds of event can be measured: an enquiry the form provider has
  // confirmed, and a click through to the booking page. A booking-page click is
  // an observation only; the website cannot see whether a booking is made.
  const ENQUIRY_EVENT = /^[a-z0-9]+(?:_[a-z0-9]+)*_enquiry_success$/;
  const BOOKING_CLICK_EVENT = /^[a-z0-9]+(?:_[a-z0-9]+)*_booking_click$/;
  const CLICK_IDENTIFIERS = ['gclid', 'gbraid', 'wbraid'];

  let config = null;
  try {
    config = JSON.parse(configElement.textContent);
  } catch {
    return;
  }

  // Only an absent property means legacy scope 1. A present but malformed
  // requirement disables measurement rather than weakening consent protection.
  const requiredConsentScopeVersion = Object.prototype.hasOwnProperty.call(config || {}, 'requiredConsentScopeVersion')
    ? config.requiredConsentScopeVersion : 1;
  if (requiredConsentScopeVersion !== 1 && requiredConsentScopeVersion !== 2) return;

  const googleAdsId = typeof config?.googleAdsId === 'string' ? config.googleAdsId.trim() : '';
  const labels = new Map(
    Object.entries(config?.conversionLabels || {})
      .filter(([eventName, label]) => (ENQUIRY_EVENT.test(eventName) || BOOKING_CLICK_EVENT.test(eventName))
        && typeof label === 'string' && CONVERSION_LABEL.test(label.trim()))
      .map(([eventName, label]) => [eventName, label.trim()]),
  );
  if (!GOOGLE_ADS_ID.test(googleAdsId) || labels.size === 0) return;

  const forms = Array.from(document.querySelectorAll('form[data-measure-event]'))
    .filter((form) => ENQUIRY_EVENT.test(form.dataset.measureEvent) && labels.has(form.dataset.measureEvent));
  const links = Array.from(document.querySelectorAll('a[data-measure-event]'))
    .filter((link) => BOOKING_CLICK_EVENT.test(link.dataset.measureEvent) && labels.has(link.dataset.measureEvent));
  if (forms.length === 0 && links.length === 0) return;

  // Google Consent Mode signals, checked against Google's consent mode
  // reference (see documentation/advertising/GOOGLE_ADS_MEASUREMENT_RECORD.md):
  // - ad_storage covers the advertising cookies that keep the ad click;
  // - ad_user_data covers sending advertising measurement data to Google, and
  //   Google requires it for tag-based conversion tracking;
  // - ad_personalization and analytics_storage are never granted, because no
  //   remarketing, personalisation or Google Analytics is used.
  // Both variable signals follow the visitor's single advertising measurement
  // choice. No form data is ever given to the tag, so granting ad_user_data
  // does not enable enhanced conversions or any user-provided data.
  const measurementConsent = (state) => ({
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });

  // The page address Google receives: the canonical page plus any Google Ads
  // click identifier, without campaign tags, search terms, other query text or
  // fragments.
  const pageLocation = () => {
    const current = new URL(window.location.href);
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const base = new URL(canonical || current.href);
    const page = new URL(`${base.origin}${base.pathname}`);
    CLICK_IDENTIFIERS.forEach((name) => {
      const value = current.searchParams.get(name);
      if (value) page.searchParams.set(name, value);
    });
    return page.href;
  };

  const pageReferrer = () => {
    try {
      return document.referrer ? `${new URL(document.referrer).origin}/` : '';
    } catch {
      return '';
    }
  };

  let gtag = null;

  const loadTag = () => {
    if (gtag) {
      gtag('consent', 'update', measurementConsent('granted'));
      return;
    }
    window.dataLayer = window.dataLayer || [];
    // gtag.js expects the arguments object itself, not an array copy.
    gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag = gtag;
    gtag('consent', 'default', measurementConsent('denied'));
    gtag('consent', 'update', measurementConsent('granted'));
    // Has no effect while ad_storage is granted. If the visitor withdraws while
    // the tag is loaded, Google redacts ad click identifiers from any request.
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', false);
    gtag('js', new Date());
    gtag('config', googleAdsId, {
      send_page_view: false,
      // Minimises the title in Google's automatic page-view request. Google
      // Ads conversion requests can still use document.title; see the record.
      page_title: 'The MentorSphere',
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      page_location: pageLocation(),
      page_referrer: pageReferrer(),
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAdsId)}`;
    document.head.append(script);
  };

  const record = (eventName) => {
    if (consent.get(PURPOSE, requiredConsentScopeVersion) !== 'granted') return;
    const label = labels.get(eventName);
    if (!label) return;
    try {
      loadTag();
      gtag('event', 'conversion', { send_to: `${googleAdsId}/${label}` });
    } catch {
      // Measurement must never affect the visitor's enquiry or booking journey.
    }
  };

  consent.subscribe((purpose, value) => {
    if (purpose !== PURPOSE) return;
    if (value === 'granted') loadTag();
    else if (gtag) gtag('consent', 'update', measurementConsent('denied'));
  }, requiredConsentScopeVersion);

  // site.js dispatches this only after Formspree confirms a genuine enquiry.
  // The event carries no form data.
  forms.forEach((form) => {
    form.addEventListener('mentorsphere:enquiry-success', () => record(form.dataset.measureEvent));
  });

  // Recorded without delaying or preventing the normal link behaviour.
  links.forEach((link) => {
    link.addEventListener('click', () => record(link.dataset.measureEvent));
  });

  if (consent.get(PURPOSE, requiredConsentScopeVersion) === 'granted') loadTag();
  else consent.request(PURPOSE, requiredConsentScopeVersion);
})();
