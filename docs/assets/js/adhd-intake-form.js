import { createIntakeTurnstile } from './intake-turnstile.js';
import {
  requestSubmission,
  submissionUiState,
} from './intake-submission-contract.js';


// These rules are shared by rendering, clearing and payload construction.
export const adhdStepRoute = (supportFor) => supportFor === 'adult' || supportFor === 'child'
  ? [1, 2, 4, 5] : supportFor === 'parent' ? [1, 3, 4, 5] : supportFor === 'combined' ? [1, 2, 3, 4, 5] : [1, 5];
export function adhdConsentState(supportFor, adultConsent, childConsent, childAuthority, learnerRoute) {
  const adult = ['adult', 'parent', 'combined'].includes(supportFor) && Boolean(adultConsent);
  const child = ['child', 'combined'].includes(supportFor) && Boolean(childConsent && childAuthority && learnerRoute);
  const additional = supportFor === 'combined' ? adult && child : supportFor === 'child' ? child : adult;
  return { adult, child, additional };
}

export function adhdChildAgeState(value) {
  if (!value) return 'missing';
  if (!/^(0|[1-9]\d{0,2})$/.test(value) || Number(value) > 120) return 'invalid';
  return Number(value) < 10 ? 'under10' : Number(value) >= 18 ? 'adult' : 'eligible';
}

export function adhdConsentHelp(supportFor, consent) {
  if (consent.additional) return null;
  const childTarget = { step: 2, heading: 'child-consent-heading' };
  const adultTarget = { step: supportFor === 'adult' ? 2 : 3, heading: 'adult-consent-heading' };
  const routes = {
    adult: { ...adultTarget, label: 'Go back to coaching consent', text: 'To add optional information here, go back to the Coaching context step and give consent for us to use the health, disability or neurodiversity information you choose to provide. You can also leave this section blank and continue.' },
    parent: { ...adultTarget, label: 'Go back to parent/carer consent', text: 'To add optional information here, go back to the Parent/carer context step and give consent for us to use the relevant information you choose to provide about yourself. You can also leave this section blank and continue.' },
    child: { ...childTarget, label: 'Go back to child consent', text: 'To add optional information here, go back to the Coaching context step and complete the optional child information consent and authority section. You can also leave this section blank and continue.' },
    combined: { ...(!consent.child ? childTarget : adultTarget), label: 'Review consent sections', text: 'To add optional information here, the relevant consent sections for both you and the child or young person need to be completed. Go back to review the consent sections, or leave this section blank and continue.' },
  };
  return routes[supportFor] || null;
}

(() => {
  'use strict';

  if (typeof document === 'undefined') return;
  document.documentElement.classList.replace('no-js', 'js');

  const form = document.querySelector('[data-intake-form]');
  if (!form) return;

  const API_ENDPOINT = '/api/forms/adhd-coaching-intake';
  const CONFIG_ENDPOINT = `${API_ENDPOINT}/config`;
  const STEP_NAMES = ['About you', 'Coaching context', 'Parent/carer context', 'Additional information', 'Review and submit'];
  const CONTACT_METHODS = ['Email', 'Telephone', 'Text message', 'WhatsApp'];
  const PHONE_CONTACT_METHODS = new Set(['Telephone', 'Text message', 'WhatsApp']);
  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const progress = document.querySelector('[data-progress]');
  const stepCount = document.querySelector('[data-step-count]');
  const progressName = document.querySelector('[data-progress-name]');
  const progressSteps = Array.from(document.querySelectorAll('[data-progress-step]'));
  const progressButtons = Array.from(document.querySelectorAll('[data-progress-button]'));
  const liveStatus = document.querySelector('[data-live-status]');
  const errorSummary = form.querySelector('[data-error-summary]');
  const errorSummaryList = form.querySelector('[data-error-summary-list]');
  const reviewSections = form.querySelector('[data-review-sections]');
  const submitButton = form.querySelector('[data-submit-button]');
  const submitStatus = form.querySelector('[data-submit-status]');
  const turnstileContainer = form.querySelector('[data-turnstile-container]');
  const turnstileStatus = form.querySelector('[data-turnstile-status]');
  const mobileInput = form.querySelector('#respondent-mobile');
  const mobileMarker = form.querySelector('[data-mobile-marker]');

  let currentStep = 1;
  let highestValidatedStep = 0;
  let submissionId = crypto.randomUUID();
  let submissionInProgress = false;
  let submissionCompleted = false;
  const security = createIntakeTurnstile({
    configEndpoint: CONFIG_ENDPOINT,
    container: turnstileContainer,
    status: turnstileStatus,
    submitButton,
    onVerified: () => clearFieldError(fieldWrapper('turnstileToken')),
  });
  let previousSupportFor = '';

  const fieldWrapper = (path) => form.querySelector(
    `[data-field-path="${path}"], [data-field-aliases~="${path}"]`,
  );
  const namedControl = (name) => form.elements.namedItem(name);

  const singleValue = (name) => {
    const controls = form.querySelectorAll(`[name="${name}"]`);
    for (const control of controls) {
      if (control.checked) return control.value;
    }
    const element = namedControl(name);
    return element && typeof element.value === 'string' ? element.value.trim() : '';
  };

  const multipleValues = (name) => Array.from(form.querySelectorAll(`[name="${name}"]:checked`), (control) => control.value);
  const canonicalContactMethods = () => {
    const selected = new Set(multipleValues('preferred_contact_methods'));
    return CONTACT_METHODS.filter((method) => selected.has(method));
  };

  const errorElement = (wrapper) => wrapper ? wrapper.querySelector('[data-field-error]') : null;

  const primaryControl = (wrapper) => {
    if (!wrapper) return null;
    const control = wrapper.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (control && !control.id) {
      const path = wrapper.dataset.fieldPath || 'field';
      control.id = `field-${path.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    }
    return control;
  };

  const invalidTarget = (wrapper) => {
    if (!wrapper) return null;
    return wrapper.querySelector('.choice-grid') || primaryControl(wrapper) || wrapper;
  };

  const clearFieldError = (wrapper) => {
    if (!wrapper) return;
    const target = invalidTarget(wrapper);
    if (target) target.removeAttribute('aria-invalid');
    const message = errorElement(wrapper);
    if (message) message.textContent = '';
  };

  const setFieldError = (wrapper, message) => {
    if (!wrapper) return;
    const target = invalidTarget(wrapper);
    if (target) target.setAttribute('aria-invalid', 'true');
    const output = errorElement(wrapper);
    if (output) output.textContent = message;
  };

  const validateWrapper = (wrapper) => {
    clearFieldError(wrapper);
    if (wrapper.closest('[data-branch][hidden], [data-consent-group][hidden], [data-sensitive][hidden]') || wrapper.hidden) return '';
    if (wrapper.closest('[data-conditional][hidden]')) return '';

    const path = wrapper.dataset.fieldPath || '';
    if (path === 'child.age') {
      const age = adhdChildAgeState(singleValue('child_age'));
      if (age === 'missing' || age === 'invalid') return "Enter the child or young person's age in completed years.";
      if (age === 'under10') return 'Direct coaching is currently offered from age 10. You can switch to Parent/carer support.';
      if (age === 'adult') return 'For someone aged 18 or over, use Adult coaching.';
    }
    if (path === 'confirmations.childSpecialCategoryConsent') {
      const partial = namedControl('child_special_category_consent')?.checked ||
        namedControl('child_special_category_authority')?.checked || singleValue('learner_consent_route');
      if (partial && !consentState().child) return 'Complete all three child consent controls, or clear them to continue without optional sensitive information.';
    }
    if (path === 'turnstileToken') {
      if (!security.token) return wrapper.dataset.requiredMessage || 'Complete the security check.';
      return '';
    }

    const controls = Array.from(wrapper.querySelectorAll('input:not([type="hidden"]), select, textarea'));
    if (controls.length === 0) return '';
    const required = wrapper.dataset.required === 'true' || controls.some((control) => control.required);
    const checkable = controls.every((control) => control.type === 'radio' || control.type === 'checkbox');

    if (checkable) {
      if (required && !controls.some((control) => control.checked)) {
        return wrapper.dataset.requiredMessage || 'Choose an option.';
      }
      return '';
    }

    const control = controls[0];
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    if (required && !value) return wrapper.dataset.requiredMessage || 'Enter this information.';
    if (value && !control.checkValidity()) {
      if (control.type === 'email') return 'Enter a valid email address.';
      if (control.type === 'date') return 'Enter a valid date.';
      return control.validationMessage || 'Check this information.';
    }
    return '';
  };

  const wrappersForStep = (stepNumber) => {
    const step = steps.find((candidate) => Number(candidate.dataset.step) === stepNumber);
    return step ? Array.from(step.querySelectorAll('[data-field-path]')) : [];
  };

  const clearErrorSummary = () => {
    errorSummary.hidden = true;
    errorSummaryList.replaceChildren();
  };

  const showErrorSummary = (errors) => {
    errorSummaryList.replaceChildren();
    for (const { wrapper, message } of errors) {
      const control = primaryControl(wrapper);
      const item = document.createElement('li');
      if (control) {
        const link = document.createElement('a');
        link.href = `#${control.id}`;
        link.textContent = message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          control.focus();
        });
        item.append(link);
      } else {
        item.textContent = message;
      }
      errorSummaryList.append(item);
    }
    errorSummary.hidden = false;
    errorSummary.focus();
  };

  const validateStep = (stepNumber) => {
    const errors = [];
    for (const wrapper of wrappersForStep(stepNumber)) {
      const message = validateWrapper(wrapper);
      if (message) {
        setFieldError(wrapper, message);
        errors.push({ wrapper, message });
      }
    }
    if (errors.length > 0) showErrorSummary(errors);
    else clearErrorSummary();
    return errors;
  };

  const route = () => adhdStepRoute(singleValue('support_for'));
  const consentState = () => adhdConsentState(singleValue('support_for'),
    namedControl('adult_special_category_consent')?.checked,
    namedControl('child_special_category_consent')?.checked,
    namedControl('child_special_category_authority')?.checked,
    singleValue('learner_consent_route'));

  const updateProgress = () => {
    const activeSteps = route();
    const position = activeSteps.indexOf(currentStep) + 1;
    progress.max = activeSteps.length;
    progress.value = position;
    progress.textContent = `Step ${position} of ${activeSteps.length}`;
    stepCount.textContent = progress.textContent;
    progressName.textContent = STEP_NAMES[currentStep - 1];
    progressSteps.forEach((item, index) => {
      const stepNumber = index + 1;
      item.hidden = !activeSteps.includes(stepNumber);
      item.classList.toggle('is-current', stepNumber === currentStep);
      item.classList.toggle('is-complete', stepNumber <= highestValidatedStep && stepNumber !== currentStep);
    });
    progressButtons.forEach((button) => {
      const stepNumber = Number(button.dataset.progressButton);
      const position = activeSteps.indexOf(stepNumber) + 1;
      button.querySelector('[aria-hidden]').textContent = String(position);
      button.setAttribute('aria-label', `Go to section ${position}: ${STEP_NAMES[stepNumber - 1]}`);
      const isCurrent = stepNumber === currentStep;
      const available = !submissionCompleted && !isCurrent && activeSteps.includes(stepNumber) && stepNumber <= highestValidatedStep;
      button.disabled = !available;
      button.setAttribute('aria-disabled', String(!available));
      if (isCurrent) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };

  const goToStep = (stepNumber, announce = true) => {
    currentStep = route().includes(stepNumber) ? stepNumber : 1;
    steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== currentStep; });
    if (currentStep === 5) renderReview();
    security.setReview(currentStep === 5);
    updateProgress();
    clearErrorSummary();
    const heading = form.querySelector(`[data-step="${currentStep}"] h2`);
    if (heading && announce) heading.focus();
    if (announce) liveStatus.textContent = `Step ${route().indexOf(currentStep) + 1} of ${route().length}: ${STEP_NAMES[currentStep - 1]}.`;
  };

  const clearContainerControls = (container) => {
    container.querySelectorAll('input, select, textarea').forEach((control) => {
      if (control.type === 'checkbox' || control.type === 'radio') control.checked = false;
      else control.value = '';
    });
    container.querySelectorAll('[data-field-path]').forEach(clearFieldError);
    clearFieldError(container);
  };

  const updateConditionals = () => {
    form.querySelectorAll('[data-conditional]').forEach((field) => {
      const source = field.dataset.conditional;
      const selected = multipleValues(source).includes('Other') || singleValue(source) === 'Other';
      field.hidden = !selected;
      if (!selected) clearContainerControls(field);
    });
  };

  const updateBranches = () => {
    const supportFor = singleValue('support_for');
    if (supportFor !== previousSupportFor) {
      clearContainerControls(form.querySelector('[data-sensitive="additional"]'));
      previousSupportFor = supportFor;
    }
    form.querySelectorAll('[data-branch]').forEach((branch) => {
      const visible = branch.dataset.branch.split(' ').includes(supportFor);
      branch.hidden = !visible;
      if (!visible) clearContainerControls(branch);
    });
    // One respondent consent control moves to the relevant screen without duplication.
    const adultConsent = form.querySelector('[data-adult-consent]');
    const adultDestination = form.querySelector(supportFor === 'adult' ? '[data-adult-consent-slot]' : '[data-parent-consent-slot]');
    adultDestination.append(adultConsent);
    adultConsent.hidden = !['adult', 'parent', 'combined'].includes(supportFor);
    if (adultConsent.hidden) clearContainerControls(adultConsent);
    const combinedChoice = form.querySelector('[data-parent-support-choice]');
    combinedChoice.value = supportFor === 'combined' ? 'Yes' : 'No';
    updateAgeEligibility();
    updateSensitiveControls();
    updateProgress();
  };

  function updateAgeEligibility() {
    const hasChild = ['child', 'combined'].includes(singleValue('support_for'));
    const age = adhdChildAgeState(singleValue('child_age'));
    form.querySelector('[data-age-under10]').hidden = !hasChild || age !== 'under10';
    form.querySelector('[data-age-adult]').hidden = !hasChild || age !== 'adult';
  }

  function updateSensitiveControls() {
    const consent = consentState();
    let cleared = false;
    form.querySelectorAll('[data-sensitive]').forEach((field) => {
      const visible = consent[field.dataset.sensitive];
      if (!visible && !field.hidden) cleared = true;
      field.hidden = !visible;
      if (!visible) clearContainerControls(field);
    });
    const additionalHelp = form.querySelector('[data-additional-consent-help]');
    const help = adhdConsentHelp(singleValue('support_for'), consent);
    additionalHelp.hidden = !help;
    if (help) {
      form.querySelector('[data-consent-help-text]').textContent = help.text;
      form.querySelector('[data-review-consent]').textContent = help.label;
    }
    form.querySelector('[data-additional-scope]').textContent = singleValue('support_for') === 'child'
      ? 'Only include information about the child or young person covered by the consent above. Do not include health information about yourself or anyone else.'
      : singleValue('support_for') === 'combined'
        ? 'Only include information about yourself and the child or young person covered by the separate consents above. Do not include other people’s health information.'
        : 'Only include information about yourself. Do not include children’s or other people’s diagnoses or health information.';
    updateConditionals();
    if (cleared) liveStatus.textContent = 'Optional sensitive information was cleared because consent is no longer complete.';
  }

  const updateMobileRequirement = () => {
    const selectedPhoneMethods = canonicalContactMethods().filter((method) => PHONE_CONTACT_METHODS.has(method));
    const required = selectedPhoneMethods.length > 0;
    const wrapper = fieldWrapper('respondent.mobile');
    mobileInput.required = required;
    mobileMarker.textContent = required ? 'Required for selected contact methods' : 'Optional';
    mobileMarker.className = required ? 'field-marker' : 'field-optional';
    if (wrapper) {
      wrapper.dataset.requiredMessage = required
        ? `Enter a mobile number because you selected ${selectedPhoneMethods.join(', ')}.`
        : 'Enter a valid mobile number.';
    }
    if (!required || mobileInput.value.trim()) clearFieldError(wrapper);
  };

  const displayValue = (value) => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
    return value && String(value).trim() ? String(value).trim() : 'Not provided';
  };


  const reviewData = () => {
    const sections = [];
    for (const stepNumber of route().filter((number) => number !== 5)) {
      const rows = [];
      for (const wrapper of wrappersForStep(stepNumber)) {
        if (wrapper.hidden || wrapper.closest('[data-branch][hidden], [data-consent-group][hidden], [data-sensitive][hidden], [data-conditional][hidden]')) continue;
        const controls = Array.from(wrapper.querySelectorAll('input, select, textarea'));
        if (!controls.length) continue;
        const label = wrapper.dataset.reviewLabel || wrapper.querySelector('legend, label')?.textContent.trim();
        if (!label) continue;
        const first = controls[0];
        const answer = first.type === 'checkbox' || first.type === 'radio'
          ? controls.filter((control) => control.checked).map((control) => control.type === 'checkbox' && controls.length === 1 ? 'Yes' : control.closest('label')?.textContent.trim() || control.value)
          : first.value;
        rows.push([label, answer]);
      }
      sections.push({ title: STEP_NAMES[stepNumber - 1], step: stepNumber, rows });
    }
    return sections;
  };

  function renderReview() {
    reviewSections.replaceChildren();
    for (const section of reviewData()) {
      const card = document.createElement('section');
      card.className = 'review-card';

      const header = document.createElement('div');
      header.className = 'review-card-header';
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'review-edit';
      edit.textContent = `Edit ${section.title.toLowerCase()}`;
      edit.addEventListener('click', () => goToStep(section.step));
      header.append(heading, edit);

      const list = document.createElement('dl');
      list.className = 'review-list';
      for (const [label, rawValue] of section.rows) {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = displayValue(rawValue);
        list.append(term, description);
      }
      card.append(header, list);
      reviewSections.append(card);
    }
  }


  const intakePayload = () => {
    const supportFor = singleValue('support_for');
    const consent = consentState();
    const authorityPrivacyConfirmed = Boolean(namedControl('authority_privacy_confirmation')?.checked);
    const adult = supportFor === 'adult' && consent.adult;
    const child = ['child', 'combined'].includes(supportFor);
    const parent = ['parent', 'combined'].includes(supportFor) && consent.adult;
    const value = (allowed, name) => allowed ? singleValue(name) : '';
    const values = (allowed, name) => allowed ? multipleValues(name) : [];
    return {
      formVersion: 'adhd-coaching-intake-v1', submissionId,
      honeypot: singleValue('organisation_website'), turnstileToken: security.token,
      respondent: { email: singleValue('respondent_email'), firstName: singleValue('respondent_first_name'), surname: singleValue('respondent_surname'), mobile: singleValue('respondent_mobile'), preferredContactMethods: canonicalContactMethods() },
      supportFor,
      adult: { adhdStatus: value(adult, 'adult_status'), adhdStatusOther: value(adult, 'adult_status_other'), difficulties: values(adult, 'adult_difficulties'), difficultiesOther: value(adult, 'adult_difficulties_other'), priority: value(adult, 'adult_priority'), priorityOther: value(adult, 'adult_priority_other') },
      child: { name: value(child, 'child_name'), age: value(child, 'child_age'), educationalStage: value(child, 'child_stage'), educationalStageOther: value(child, 'child_stage_other'), neurodivergence: values(consent.child, 'child_neurodivergence'), neurodivergenceOther: value(consent.child, 'child_neurodivergence_other'), difficulties: values(consent.child, 'child_difficulties'), difficultiesOther: value(consent.child, 'child_difficulties_other') },
      parent: { household: values(parent, 'parent_household'), householdOther: value(parent, 'parent_household_other'), dailyImpact: value(parent, 'parent_impact'), dailyImpactOther: value(parent, 'parent_impact_other'), help: values(parent, 'parent_help'), helpOther: value(parent, 'parent_help_other') },
      additionalInformation: value(consent.additional, 'additional_information'),
      confirmations: {
        authorised: authorityPrivacyConfirmed, privacyAcknowledged: authorityPrivacyConfirmed,
        adultSpecialCategoryConsent: consent.adult,
        childSpecialCategoryConsent: child && Boolean(namedControl('child_special_category_consent')?.checked),
        childSpecialCategoryAuthority: child && Boolean(namedControl('child_special_category_authority')?.checked),
        learnerConsentRoute: value(child, 'learner_consent_route'),
      },
    };
  };

  const showSubmitStatus = (message, kind, referenceText = '') => {
    submitStatus.replaceChildren();
    const messageText = document.createElement('span');
    messageText.textContent = message;
    submitStatus.append(messageText);
    if (referenceText) {
      const reference = document.createElement('span');
      reference.className = 'intake-request-reference';
      reference.textContent = referenceText;
      submitStatus.append(reference);
    }
    submitStatus.className = `intake-submit-status is-${kind}`;
    submitStatus.hidden = false;
    submitStatus.focus();
  };

  const applyServerErrors = (fieldErrors) => {
    const errors = [];
    let firstStep = 5;
    for (const [path, message] of Object.entries(fieldErrors)) {
      const wrapper = fieldWrapper(path);
      if (!wrapper || typeof message !== 'string') continue;
      setFieldError(wrapper, message);
      errors.push({ wrapper, message });
      const containingStep = wrapper.closest('[data-step]');
      if (containingStep) firstStep = Math.min(firstStep, Number(containingStep.dataset.step));
    }
    if (firstStep !== currentStep) goToStep(firstStep, false);
    if (errors.length) showErrorSummary(errors);
  };

  const validateEveryStep = () => {
    for (const stepNumber of route()) {
      const errors = [];
      for (const wrapper of wrappersForStep(stepNumber)) {
        const message = validateWrapper(wrapper);
        if (message) {
          setFieldError(wrapper, message);
          errors.push({ wrapper, message });
        }
      }
      if (errors.length) {
        if (currentStep !== stepNumber) goToStep(stepNumber, false);
        showErrorSummary(errors);
        return false;
      }
    }
    clearErrorSummary();
    return true;
  };

  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('[data-field-path]');
    if (wrapper) clearFieldError(wrapper);
    const containingStep = event.target.closest('[data-step]');
    const editedStep = containingStep ? Number(containingStep.dataset.step) : 0;
    if (editedStep > 0 && editedStep <= highestValidatedStep) {
      highestValidatedStep = editedStep - 1;
      updateProgress();
    }
    if (event.target.name === 'respondent_mobile') updateMobileRequirement();
    if (event.target.name === 'child_age') updateAgeEligibility();
  });

  form.addEventListener('change', (event) => {
    const wrapper = event.target.closest('[data-field-path]');
    if (wrapper) clearFieldError(wrapper);
    const editedStep = Number(event.target.closest('[data-step]')?.dataset.step || 0);
    if (editedStep && editedStep <= highestValidatedStep) highestValidatedStep = editedStep - 1;
    if (event.target.name === 'support_for') updateBranches();
    if (event.target.name === 'parent_support_wanted') {
      const newBranch = singleValue('parent_support_wanted') === 'Yes' ? 'combined' : 'child';
      form.querySelector(`[name="support_for"][value="${newBranch}"]`).checked = true;
      updateBranches();
    }
    if (event.target.name === 'preferred_contact_methods') updateMobileRequirement();
    if (event.target.name === 'child_age') updateAgeEligibility();
    updateSensitiveControls();
    updateProgress();
  });

  progressButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!button.disabled) goToStep(Number(button.dataset.progressButton));
    });
  });

  form.querySelector('[data-review-consent]').addEventListener('click', () => {
    const help = adhdConsentHelp(singleValue('support_for'), consentState());
    if (!help) return;
    goToStep(help.step);
    form.querySelector(`#${help.heading}`).focus();
  });

  form.querySelectorAll('[data-age-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      form.querySelector(`[name="support_for"][value="${button.dataset.ageSwitch}"]`).checked = true;
      highestValidatedStep = 0;
      updateBranches();
      goToStep(1);
      liveStatus.textContent = 'Support route changed. Your contact details have been kept. Please review who the support is for before continuing.';
    });
  });

  form.querySelectorAll('[data-continue]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep).length === 0) {
        highestValidatedStep = Math.max(highestValidatedStep, currentStep);
        goToStep(route()[route().indexOf(currentStep) + 1]);
      }
    });
  });

  form.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goToStep(route()[route().indexOf(currentStep) - 1]));
  });

  form.querySelector('[data-clear-child-consent]').addEventListener('click', () => {
    for (const name of ['child_special_category_consent', 'child_special_category_authority', 'learner_consent_route']) {
      form.querySelectorAll(`[name="${name}"]`).forEach((control) => { control.checked = false; });
    }
    highestValidatedStep = Math.min(highestValidatedStep, 1);
    updateSensitiveControls();
    clearFieldError(fieldWrapper('confirmations.childSpecialCategoryConsent'));
    updateProgress();
    liveStatus.textContent = 'Optional child consent and sensitive answers have been cleared. You can continue without them.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submissionInProgress || submissionCompleted) return;
    if (!security.ensureReady()) return;
    if (!validateEveryStep()) return;

    const payload = intakePayload();
    submissionInProgress = true;
    security.beginSubmission();
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    submitStatus.replaceChildren();
    submitStatus.hidden = true;
    form.setAttribute('aria-busy', 'true');

    try {
      const outcome = await requestSubmission(fetch, API_ENDPOINT, payload);
      const ui = submissionUiState(outcome);
      if (outcome.kind === 'created') ui.message = 'Thank you. Your optional intake form has been submitted. Luke will review it before following up.';
      if (outcome.kind === 'failure') {
        ui.message = 'We could not confirm that your intake form was received. Your answers are still on this page. Please try again or contact Luke.';
        ui.buttonText = 'Submit optional intake form';
      }
      showSubmitStatus(ui.message, ui.messageKind, ui.referenceText);
      submitButton.textContent = ui.buttonText;
      submitButton.disabled = ui.buttonDisabled;
      submissionCompleted = ui.completed;
      if (outcome.kind === 'created') liveStatus.textContent = 'The optional intake form was submitted successfully.';
      else if (outcome.kind === 'duplicate') liveStatus.textContent = 'This response was already received and its existing record was verified.';
      else liveStatus.textContent = 'Submission could not be confirmed. Your answers remain on the review section.';
    } finally {
      submissionInProgress = false;
      security.finishSubmission(submissionCompleted);
      form.removeAttribute('aria-busy');
      updateProgress();
    }
  });

  updateMobileRequirement();
  updateBranches();
  goToStep(1, false);
  void security.load();
})();
