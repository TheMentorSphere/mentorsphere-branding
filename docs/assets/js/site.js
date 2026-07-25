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

    const closeMenu = ({ restoreFocus = false } = {}) => {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
      if (toggleLabel) toggleLabel.textContent = 'Open navigation';
      if (restoreFocus) navToggle.focus();
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('open', !isOpen);
      document.body.classList.toggle('nav-open', !isOpen);
      if (toggleLabel) toggleLabel.textContent = isOpen ? 'Open navigation' : 'Close navigation';
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu({ restoreFocus: true });
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
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
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!contactForm.reportValidity()) {
        if (contactStatus) {
          contactStatus.textContent = 'Please complete the required fields before continuing.';
          contactStatus.classList.add('error');
        }
        return;
      }

      const data = new FormData(contactForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const service = String(data.get('service') || 'General enquiry').trim();
      const contactMethod = String(data.get('contact-method') || 'Email').trim();
      const message = String(data.get('message') || '').trim();

      const subject = `Website enquiry: ${service}`;
      const body = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Telephone: ${phone}` : null,
        `Preferred contact method: ${contactMethod}`,
        `Area of support: ${service}`,
        '',
        'Message:',
        message,
      ].filter((line) => line !== null).join('\n');

      const mailto = `mailto:luke@thementorsphere.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (contactStatus) {
        contactStatus.textContent = 'Your email application should now open with the message prepared.';
        contactStatus.classList.remove('error');
      }

      window.location.href = mailto;
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
})();
