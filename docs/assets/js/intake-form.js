(() => {
  'use strict';

  document.documentElement.classList.replace('no-js', 'js');

  const form = document.querySelector('[data-intake-form]');
  if (!form) return;

  const API_ENDPOINT = '/api/forms/primary-learner-profile';
  const CONFIG_ENDPOINT = `${API_ENDPOINT}/config`;
  const STEP_NAMES = ['About you', 'About the learner', 'Learning and support profile', 'Initial session preferences', 'Review and submit'];
  const CONTACT_METHODS = ['Email', 'Telephone', 'Text message', 'WhatsApp'];
  const PHONE_CONTACT_METHODS = new Set(['Telephone', 'Text message', 'WhatsApp']);
  const SPECIAL_CATEGORY_RELATIONSHIPS = new Set(['Parent', 'Guardian or carer']);
  const NEEDS_AREAS_VISIBLE = new Set([
    'Yes: diagnosed',
    'Yes: suspected or informally identified',
    'An assessment is currently underway',
  ]);

  const steps = Array.from(form.querySelectorAll('[data-step]'));
  const progress = document.querySelector('[data-progress]');
  const stepCount = document.querySelector('[data-step-count]');
  const progressName = document.querySelector('[data-progress-name]');
  const progressSteps = Array.from(document.querySelectorAll('[data-progress-step]'));
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
  const dateOfBirth = form.querySelector('#learner-date-of-birth');
  const specialCategoryYes = form.querySelector('[data-special-category-yes]');
  const specialCategoryRestriction = form.querySelector('[data-special-category-restriction]');

  let currentStep = 1;
  let submissionId = crypto.randomUUID();
  let submissionInProgress = false;
  let turnstileToken = '';
  let turnstileWidgetId = null;
  let turnstileAction = '';

  const fieldWrapper = (path) => form.querySelector(`[data-field-path="${path}"]`);
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

  const isHidden = (wrapper) => wrapper.hidden || Boolean(wrapper.closest('[hidden]'));

  const validateWrapper = (wrapper) => {
    clearFieldError(wrapper);
    if (isHidden(wrapper)) return '';

    const path = wrapper.dataset.fieldPath || '';
    if (path === 'supportProfile.specialCategoryProvided' && singleValue('special_category_choice') === 'Yes' &&
      !SPECIAL_CATEGORY_RELATIONSHIPS.has(singleValue('relationship'))) {
      return 'This form cannot accept health, disability, SEND, neurodiversity, diagnosis or EHCP information from this relationship. Ask Luke to arrange an appropriate information-sharing route.';
    }
    if (path === 'turnstileToken') {
      if (!turnstileToken) return wrapper.dataset.requiredMessage || 'Complete the security check.';
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

  const updateProgress = () => {
    progress.value = currentStep;
    progress.textContent = `Step ${currentStep} of 5`;
    stepCount.textContent = `Step ${currentStep} of 5`;
    progressName.textContent = STEP_NAMES[currentStep - 1];
    progressSteps.forEach((item, index) => {
      const stepNumber = index + 1;
      item.classList.toggle('is-current', stepNumber === currentStep);
      item.classList.toggle('is-complete', stepNumber < currentStep);
    });
  };

  const goToStep = (stepNumber, announce = true) => {
    currentStep = Math.min(5, Math.max(1, stepNumber));
    steps.forEach((step) => {
      step.hidden = Number(step.dataset.step) !== currentStep;
    });
    if (currentStep === 5) renderReview();
    updateProgress();
    clearErrorSummary();
    const heading = form.querySelector(`[data-step="${currentStep}"] h2`);
    if (heading && announce) heading.focus();
    if (announce) liveStatus.textContent = `Step ${currentStep} of 5: ${STEP_NAMES[currentStep - 1]}.`;
  };

  const setConditionalField = (name, visible, required = false, clearWhenHidden = true) => {
    const field = form.querySelector(`[data-conditional="${name}"]`);
    if (!field) return;
    field.hidden = !visible;
    const control = field.querySelector('input, select, textarea');
    if (control) control.required = visible && required;
    if (!visible) {
      clearFieldError(field);
      if (clearWhenHidden) {
        field.querySelectorAll('input, select, textarea').forEach((element) => {
          if (element.type === 'checkbox' || element.type === 'radio') element.checked = false;
          else element.value = '';
        });
      }
    }
  };

  const updateRelationshipOther = () => setConditionalField('relationship-other', singleValue('relationship') === 'Other', true);
  const updateYearGroupOther = () => setConditionalField('year-group-other', singleValue('learner_year_group') === 'Other', true);
  const updateSubjectOther = () => setConditionalField('subject-other', multipleValues('learner_subjects').includes('Other'), true);
  const updateRelevantAreas = () => {
    const visible = singleValue('special_category_choice') === 'Yes' &&
      SPECIAL_CATEGORY_RELATIONSHIPS.has(singleValue('relationship')) &&
      NEEDS_AREAS_VISIBLE.has(singleValue('needs_status'));
    const field = form.querySelector('[data-conditional="relevant-areas"]');
    const wasVisible = field && !field.hidden;
    setConditionalField('relevant-areas', visible, false, true);
    if (wasVisible && !visible) liveStatus.textContent = 'The optional relevant-areas choices were cleared because they no longer apply.';
  };

  const clearContainerControls = (container) => {
    container.querySelectorAll('input, select, textarea').forEach((element) => {
      if (element.type === 'checkbox' || element.type === 'radio') element.checked = false;
      else element.value = '';
    });
    clearFieldError(container);
  };

  const updateSpecialCategoryControls = () => {
    const relationship = singleValue('relationship');
    const relationshipAllowed = SPECIAL_CATEGORY_RELATIONSHIPS.has(relationship);
    if (specialCategoryYes) specialCategoryYes.disabled = !relationshipAllowed;
    if (specialCategoryRestriction) specialCategoryRestriction.hidden = relationshipAllowed || !relationship;

    if (!relationshipAllowed && singleValue('special_category_choice') === 'Yes' && specialCategoryYes) {
      specialCategoryYes.checked = false;
      liveStatus.textContent = 'Optional health, disability, SEND, neurodiversity, diagnosis and EHCP fields were cleared. Ask Luke to arrange a separate information-sharing route.';
    }

    const provided = relationshipAllowed && singleValue('special_category_choice') === 'Yes';
    form.querySelectorAll('[data-special-category-field]').forEach((field) => {
      if (field.dataset.conditional === 'relevant-areas') return;
      field.hidden = !provided;
      if (!provided) clearContainerControls(field);
    });
    form.querySelectorAll('[data-special-category-confirmation]').forEach((field) => {
      field.hidden = !provided;
      field.dataset.required = provided ? 'true' : 'false';
      const input = field.querySelector('input');
      if (input) input.required = provided;
      if (!provided) clearContainerControls(field);
    });
    updateRelevantAreas();
  };

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

  const formatDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return displayValue(value);
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  };

  const reviewData = () => [
    {
      title: 'About you',
      step: 1,
      rows: [
        ['Email address', singleValue('respondent_email')],
        ['Name', `${singleValue('respondent_first_name')} ${singleValue('respondent_surname')}`.trim()],
        ['Relationship', singleValue('relationship')],
        ['Relationship details', singleValue('relationship_other')],
        ['Preferred contact methods', canonicalContactMethods().join('; ')],
        ['Mobile number', singleValue('respondent_mobile')],
        ['Suitable contact times', multipleValues('suitable_contact_times')],
      ],
    },
    {
      title: 'About the learner',
      step: 2,
      rows: [
        ['Learner', `${singleValue('learner_first_name')} ${singleValue('learner_surname')}`.trim()],
        ['Date of birth', formatDate(singleValue('learner_date_of_birth'))],
        ['Year group or equivalent', singleValue('learner_year_group')],
        ['Year group details', singleValue('year_group_other')],
        ['Subjects', multipleValues('learner_subjects')],
        ['Other subject', singleValue('subject_other')],
      ],
    },
    {
      title: 'Learning and support profile',
      step: 3,
      rows: [
        ['Optional health, disability, SEND or neurodiversity information', singleValue('special_category_choice')],
        ['Needs status', singleValue('needs_status')],
        ['Relevant areas', multipleValues('relevant_areas')],
        ['Helpful support information', singleValue('support_needs')],
        ['Helpful strategies', singleValue('helpful_strategies')],
        ['Unhelpful approaches', singleValue('unhelpful_approaches')],
        ['Other background', singleValue('other_background')],
        ['EHCP status', singleValue('ehcp_status')],
      ],
    },
    {
      title: 'Initial session preferences',
      step: 4,
      rows: [
        ['Session length', singleValue('session_length')],
        ['Session frequency', singleValue('session_frequency')],
        ['Wider MentorSphere support', singleValue('wider_support')],
      ],
    },
  ];

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

  const intakePayload = () => ({
    formVersion: 'primary-learner-profile-v4',
    submissionId,
    honeypot: singleValue('organisation_website'),
    turnstileToken,
    respondent: {
      email: singleValue('respondent_email'),
      firstName: singleValue('respondent_first_name'),
      surname: singleValue('respondent_surname'),
      relationship: singleValue('relationship'),
      relationshipOther: singleValue('relationship_other'),
      mobile: singleValue('respondent_mobile'),
      preferredContactMethods: canonicalContactMethods(),
      suitableContactTimes: multipleValues('suitable_contact_times'),
    },
    learner: {
      firstName: singleValue('learner_first_name'),
      surname: singleValue('learner_surname'),
      dateOfBirth: singleValue('learner_date_of_birth'),
      yearGroup: singleValue('learner_year_group'),
      yearGroupOther: singleValue('year_group_other'),
      subjects: multipleValues('learner_subjects'),
      subjectOther: singleValue('subject_other'),
    },
    supportProfile: {
      specialCategoryProvided: singleValue('special_category_choice') === 'Yes',
      needsStatus: singleValue('needs_status'),
      relevantAreas: multipleValues('relevant_areas'),
      supportNeeds: singleValue('support_needs'),
      helpfulStrategies: singleValue('helpful_strategies'),
      unhelpfulApproaches: singleValue('unhelpful_approaches'),
      otherBackground: singleValue('other_background'),
      ehcpStatus: singleValue('ehcp_status'),
    },
    sessionPreferences: {
      sessionLength: singleValue('session_length'),
      sessionFrequency: singleValue('session_frequency'),
      widerSupport: singleValue('wider_support'),
    },
    confirmations: {
      authorised: Boolean(namedControl('authorised_confirmation')?.checked),
      privacyAcknowledged: Boolean(namedControl('privacy_confirmation')?.checked),
      specialCategoryConsent: Boolean(namedControl('special_category_consent')?.checked),
      specialCategoryAuthority: Boolean(namedControl('special_category_authority')?.checked),
      learnerConsentRoute: singleValue('learner_consent_route'),
    },
  });

  const showSubmitStatus = (message, kind) => {
    submitStatus.textContent = message;
    submitStatus.className = `intake-submit-status is-${kind}`;
    submitStatus.hidden = false;
    submitStatus.focus();
  };

  const resetTurnstile = () => {
    turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    turnstileStatus.textContent = 'Complete the security check before submitting.';
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
    for (let stepNumber = 1; stepNumber <= 5; stepNumber += 1) {
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

  const loadTurnstile = async () => {
    try {
      const response = await fetch(CONFIG_ENDPOINT, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Configuration unavailable');
      const config = await response.json();
      if (!config.enabled || !config.siteKey || !config.action) {
        turnstileStatus.textContent = 'This form is not accepting submissions yet.';
        return;
      }
      turnstileAction = config.action;
      window.mentorSphereTurnstileReady = () => {
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey: config.siteKey,
          action: turnstileAction,
          theme: 'light',
          callback: (token) => {
            turnstileToken = token;
            clearFieldError(fieldWrapper('turnstileToken'));
            turnstileStatus.textContent = 'Security check complete.';
          },
          'expired-callback': () => {
            turnstileToken = '';
            turnstileStatus.textContent = 'The security check expired. Please complete it again.';
          },
          'error-callback': () => {
            turnstileToken = '';
            turnstileStatus.textContent = 'The security check could not load. Please refresh the page or request an alternative format.';
          },
        });
        submitButton.disabled = false;
      };
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=mentorSphereTurnstileReady&render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('error', () => {
        turnstileStatus.textContent = 'The security check could not load. Please refresh the page or request an alternative format.';
      });
      document.head.append(script);
    } catch {
      turnstileStatus.textContent = 'The security check is temporarily unavailable. Please try again later or request an alternative format.';
    }
  };

  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('[data-field-path]');
    if (wrapper) clearFieldError(wrapper);
    if (event.target.name === 'respondent_mobile') updateMobileRequirement();
  });

  form.addEventListener('change', (event) => {
    const wrapper = event.target.closest('[data-field-path]');
    if (wrapper) clearFieldError(wrapper);
    if (event.target.name === 'relationship') {
      updateRelationshipOther();
      updateSpecialCategoryControls();
    }
    if (event.target.name === 'preferred_contact_methods') updateMobileRequirement();
    if (event.target.name === 'learner_year_group') updateYearGroupOther();
    if (event.target.name === 'learner_subjects') updateSubjectOther();
    if (event.target.name === 'needs_status') updateRelevantAreas();
    if (event.target.name === 'special_category_choice') updateSpecialCategoryControls();
  });

  form.querySelectorAll('[data-continue]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep).length === 0) goToStep(currentStep + 1);
    });
  });

  form.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goToStep(currentStep - 1));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submissionInProgress || !validateEveryStep()) return;

    submissionInProgress = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    submitStatus.hidden = true;
    form.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(intakePayload()),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success === true) {
        showSubmitStatus('Thank you. The learner profile has been submitted. Luke will review it and follow up using your preferred contact methods.', 'success');
        form.querySelectorAll('input, select, textarea, button').forEach((control) => {
          control.disabled = true;
        });
        submissionId = crypto.randomUUID();
        liveStatus.textContent = 'The learner profile was submitted successfully.';
        return;
      }
      if (result.fieldErrors && typeof result.fieldErrors === 'object') applyServerErrors(result.fieldErrors);
      showSubmitStatus(result.error || 'The form could not be submitted. Your answers remain on this page. Please try again.', 'error');
      resetTurnstile();
    } catch {
      showSubmitStatus('A network problem prevented submission. Your answers remain on this page. Check your connection and try again.', 'error');
      resetTurnstile();
    } finally {
      submissionInProgress = false;
      form.removeAttribute('aria-busy');
      if (!submitStatus.classList.contains('is-success')) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit learner profile';
      }
    }
  });

  if (dateOfBirth) dateOfBirth.max = new Date().toISOString().slice(0, 10);
  updateRelationshipOther();
  updateMobileRequirement();
  updateYearGroupOther();
  updateSubjectOther();
  updateSpecialCategoryControls();
  goToStep(1, false);
  void loadTurnstile();
})();
