(() => {
  const currentScript = document.currentScript;

  if (currentScript && !document.querySelector('link[data-motion-styles]')) {
    const motionStyles = document.createElement('link');
    motionStyles.rel = 'stylesheet';
    motionStyles.href = new URL('../css/motion.css', currentScript.src).href;
    motionStyles.dataset.motionStyles = '';
    document.head.append(motionStyles);
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const motionAllowed = () => !reduceMotionQuery.matches && !saveData;

  const updateMotionState = () => {
    document.documentElement.classList.toggle('motion-ok', motionAllowed());
  };

  updateMotionState();

  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-primary-nav]');

  if (navToggle && nav) {
    const toggleLabel = navToggle.querySelector('.sr-only');
    const navItems = Array.from(nav.querySelectorAll('[data-nav-item]'));
    let pointerCloseTimer = 0;

    const closeSubmenu = (item) => {
      const toggle = item.querySelector('[data-submenu-toggle]');
      item.classList.remove('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    };

    const closeSubmenus = (exceptItem = null) => {
      navItems.forEach((item) => {
        if (item !== exceptItem) closeSubmenu(item);
      });
    };

    const openSubmenu = (item) => {
      const toggle = item.querySelector('[data-submenu-toggle]');
      closeSubmenus(item);
      item.classList.add('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = ({ restoreFocus = false } = {}) => {
      closeSubmenus();
      navToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
      if (toggleLabel) toggleLabel.textContent = 'Open navigation';
      if (restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeSubmenus();
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('open', !isOpen);
      document.body.classList.toggle('nav-open', !isOpen);
      if (toggleLabel) toggleLabel.textContent = isOpen ? 'Open navigation' : 'Close navigation';
    });

    navItems.forEach((item) => {
      const submenuToggle = item.querySelector('[data-submenu-toggle]');
      if (!submenuToggle) return;

      submenuToggle.addEventListener('click', () => {
        const isOpen = submenuToggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          closeSubmenu(item);
        } else {
          openSubmenu(item);
        }
      });

      item.addEventListener('focusin', (event) => {
        if (window.innerWidth > 880 && event.target.matches('a')) openSubmenu(item);
      });

      item.addEventListener('focusout', (event) => {
        if (!item.contains(event.relatedTarget)) closeSubmenu(item);
      });

      item.addEventListener('pointerenter', () => {
        if (!finePointerQuery.matches) return;
        window.clearTimeout(pointerCloseTimer);
        openSubmenu(item);
      });

      item.addEventListener('pointerleave', () => {
        if (!finePointerQuery.matches) return;
        window.clearTimeout(pointerCloseTimer);
        pointerCloseTimer = window.setTimeout(() => {
          if (!item.matches(':focus-within')) closeSubmenu(item);
        }, 140);
      });
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      const openItem = navItems.find((item) => item.classList.contains('is-open'));
      const mobileMenuOpen = nav.classList.contains('open');
      if (!openItem && !mobileMenuOpen) return;

      event.preventDefault();
      if (mobileMenuOpen) {
        closeMenu({ restoreFocus: true });
        return;
      }

      const submenuToggle = openItem.querySelector('[data-submenu-toggle]');
      closeSubmenu(openItem);
      if (submenuToggle) submenuToggle.focus();
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      closeSubmenus();
      if (window.innerWidth > 880) closeMenu();
    }, { passive: true });
  }

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const siteHeader = document.querySelector('.site-header');
  const backToTop = document.querySelector('[data-back-to-top]');
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.prepend(progressBar);

  let scrollFrame = 0;
  const updateScrollEffects = () => {
    const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
    progressBar.style.setProperty('--scroll-progress', String(progress));
    if (siteHeader) siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 700);
    scrollFrame = 0;
  };

  const requestScrollUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  };

  updateScrollEffects();
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
    });
  }

  const revealSelectors = [
    '.section-heading',
    '.split > *',
    '.card',
    '.feature-panel',
    '.step',
    '.icon-card',
    '.subject-card',
    '.price-card',
    '.quote-panel',
    '.cta-band',
    '.policy-card',
    '.form-card',
    '.contact-card',
    '.table-wrap',
    '.callout',
    '.trust-item',
    '.prose > h2',
  ].join(',');

  const revealElements = [...new Set(document.querySelectorAll(revealSelectors))];
  const revealGroups = document.querySelectorAll('.card-grid, .steps, .icon-grid, .subject-strip, .trust-grid, .policy-grid');

  revealGroups.forEach((group) => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${Math.min(index * 65, 260)}ms`);
    });
  });

  const showAllRevealElements = () => {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  };

  if (motionAllowed() && 'IntersectionObserver' in window) {
    revealElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const direction = element.matches('.split > :first-child') ? 'left'
        : element.matches('.split > :last-child') ? 'right'
          : index % 9 === 0 ? 'scale'
            : '';
      element.setAttribute('data-reveal', direction);
      if (rect.top < window.innerHeight * 0.94) element.classList.add('is-visible');
    });

    document.documentElement.classList.add('motion-ready');

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    });

    revealElements.forEach((element) => {
      if (!element.classList.contains('is-visible')) revealObserver.observe(element);
    });
  } else {
    showAllRevealElements();
  }

  const orbitVisual = document.querySelector('.orbit-visual');
  if (orbitVisual && finePointerQuery.matches && motionAllowed()) {
    let orbitFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const updateOrbit = () => {
      orbitVisual.style.setProperty('--parallax-x', `${pointerX * 14}px`);
      orbitVisual.style.setProperty('--parallax-y', `${pointerY * 14}px`);
      orbitVisual.style.setProperty('--parallax-soft-x', `${pointerX * 8}px`);
      orbitVisual.style.setProperty('--parallax-soft-y', `${pointerY * 8}px`);
      orbitVisual.style.setProperty('--parallax-centre-x', `${pointerX * -6}px`);
      orbitVisual.style.setProperty('--parallax-centre-y', `${pointerY * -6}px`);
      orbitFrame = 0;
    };

    orbitVisual.addEventListener('pointermove', (event) => {
      const bounds = orbitVisual.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
      if (!orbitFrame) orbitFrame = window.requestAnimationFrame(updateOrbit);
    });

    orbitVisual.addEventListener('pointerleave', () => {
      pointerX = 0;
      pointerY = 0;
      if (!orbitFrame) orbitFrame = window.requestAnimationFrame(updateOrbit);
    });
  }

  const contactForm = document.querySelector('[data-contact-form]');
  const contactStatus = document.querySelector('[data-form-status]');

  if (contactForm) {
    const submitButton = contactForm.querySelector('[data-submit-button]');
    const subjectInput = contactForm.querySelector('[data-enquiry-subject]');
    const sourceInput = contactForm.querySelector('[data-source-page]');
    const whatsappUrl = 'https://wa.me/447955723133?text=Hi%20Luke%2C%20I%20found%20The%20MentorSphere%20through%20your%20website%20and%20would%20like%20to%20enquire%20about%20support.';
    const errorElements = new Map(
      Array.from(contactForm.querySelectorAll('[data-error-for]')).map((element) => [element.dataset.errorFor, element]),
    );
    let submissionInProgress = false;

    const getErrorElement = (fieldName) => errorElements.get(fieldName);

    const clearFieldError = (field) => {
      if (!field || !field.name) return;
      field.removeAttribute('aria-invalid');
      const errorElement = getErrorElement(field.name);
      if (errorElement) errorElement.textContent = '';
    };

    const setFieldError = (field, message) => {
      if (!field || !field.name) return;
      field.setAttribute('aria-invalid', 'true');
      const errorElement = getErrorElement(field.name);
      if (errorElement) errorElement.textContent = message;
    };

    const clearAllFieldErrors = () => {
      contactForm.querySelectorAll('[aria-invalid="true"]').forEach(clearFieldError);
      contactForm.querySelectorAll('[data-error-for]').forEach((element) => {
        element.textContent = '';
      });
    };

    const validationMessageFor = (field) => {
      if (field.validity.typeMismatch && field.type === 'email') {
        return 'Enter an email address in the correct format, such as name@example.com.';
      }
      if (field.validity.valueMissing) return 'This field is required.';
      return field.validationMessage || 'Check this field and try again.';
    };

    const showStatus = ({ type, heading, message, includeFallbacks = false, focus = false }) => {
      if (!contactStatus) return;

      contactStatus.replaceChildren();
      contactStatus.hidden = false;
      contactStatus.classList.toggle('success', type === 'success');
      contactStatus.classList.toggle('error', type === 'error');

      const statusHeading = document.createElement('h3');
      statusHeading.textContent = heading;
      contactStatus.append(statusHeading);

      const statusMessage = document.createElement('p');
      statusMessage.textContent = message;
      contactStatus.append(statusMessage);

      if (includeFallbacks) {
        const fallbackMessage = document.createElement('p');
        fallbackMessage.append('You can also ');

        const emailLink = document.createElement('a');
        emailLink.href = 'mailto:luke@thementorsphere.co.uk';
        emailLink.textContent = 'email The MentorSphere';
        fallbackMessage.append(emailLink, ' or ');

        const whatsappLink = document.createElement('a');
        whatsappLink.href = whatsappUrl;
        whatsappLink.target = '_blank';
        whatsappLink.rel = 'noopener';
        whatsappLink.textContent = 'send a WhatsApp message';
        fallbackMessage.append(whatsappLink, '.');
        contactStatus.append(fallbackMessage);
      }

      if (focus) contactStatus.focus();
    };

    contactForm.addEventListener('invalid', (event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
        setFieldError(field, validationMessageFor(field));
      }
    }, true);

    contactForm.querySelectorAll('input, select, textarea').forEach((field) => {
      const clearWhenValid = () => {
        if (field.validity.valid) clearFieldError(field);
      };
      field.addEventListener('input', clearWhenValid);
      field.addEventListener('change', clearWhenValid);
    });

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (submissionInProgress) return;
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }

      submissionInProgress = true;
      clearAllFieldErrors();

      const originalButtonText = submitButton ? submitButton.textContent : 'Send enquiry';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending enquiry…';
      }

      showStatus({
        type: 'sending',
        heading: 'Sending enquiry',
        message: 'Please wait while your message is submitted.',
      });

      const data = new FormData(contactForm);
      const service = String(data.get('area_of_support') || 'General enquiry').trim();
      const subject = `Website enquiry: ${service}`;

      if (subjectInput) subjectInput.value = subject;
      if (sourceInput) sourceInput.value = window.location.href;
      data.set('subject', subject);
      data.set('source_page', window.location.href);

      try {
        const response = await fetch(contactForm.action, {
          method: contactForm.method,
          body: data,
          headers: {
            Accept: 'application/json',
          },
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
          contactForm.reset();
          clearAllFieldErrors();
          showStatus({
            type: 'success',
            heading: 'Enquiry sent',
            message: 'Thank you. Your message has been sent to The MentorSphere. Enquiries are normally acknowledged within 48 hours, although responses may take longer during illness, annual leave or unusually busy periods.',
            focus: true,
          });
          return;
        }

        const errors = Array.isArray(result.errors) ? result.errors : [];
        errors.forEach((error) => {
          const fieldName = typeof error.field === 'string' ? error.field : error.field?.name;
          const field = fieldName ? contactForm.elements.namedItem(fieldName) : null;
          if (field instanceof HTMLElement) {
            setFieldError(field, error.message || 'Check this field and try again.');
          }
        });

        showStatus({
          type: 'error',
          heading: 'Your enquiry could not be sent',
          message: 'Your message has not been submitted. Please check your connection and try again.',
          includeFallbacks: true,
          focus: true,
        });
      } catch {
        showStatus({
          type: 'error',
          heading: 'Your enquiry could not be sent',
          message: 'Your message has not been submitted. Please check your connection and try again.',
          includeFallbacks: true,
          focus: true,
        });
      } finally {
        submissionInProgress = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
    });
  }

  document.querySelectorAll('[data-copy-email]').forEach((button) => {
    button.addEventListener('click', async () => {
      const email = 'luke@thementorsphere.co.uk';
      try {
        await navigator.clipboard.writeText(email);
        const original = button.textContent;
        button.textContent = 'Email copied';
        button.classList.add('copy-confirmed');
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copy-confirmed');
        }, 1800);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  });

  const handleMotionPreference = (event) => {
    updateMotionState();
    if (event.matches) showAllRevealElements();
  };

  if (typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', handleMotionPreference);
  } else if (typeof reduceMotionQuery.addListener === 'function') {
    reduceMotionQuery.addListener(handleMotionPreference);
  }

  const loadAssistant = async () => {
    if (!currentScript) return;

    try {
      const response = await fetch('/api/assistant/config', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return;

      const config = await response.json();
      if (!config || config.enabled !== true) return;

      window.MentorSphereAssistantConfig = config;

      const assistantStyles = document.createElement('link');
      assistantStyles.rel = 'stylesheet';
      assistantStyles.href = new URL('../css/assistant.css', currentScript.src).href;
      document.head.append(assistantStyles);

      const assistantScript = document.createElement('script');
      assistantScript.src = new URL('assistant.js', currentScript.src).href;
      assistantScript.defer = true;
      document.body.append(assistantScript);
    } catch {
      // The public website remains fully usable when the optional assistant is unavailable.
    }
  };

  void loadAssistant();
})();
