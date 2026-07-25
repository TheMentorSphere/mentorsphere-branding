(() => {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-primary-nav]');

  if (navToggle && nav) {
    const closeMenu = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('open', !isOpen);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
        navToggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        closeMenu();
      }
    });
  }

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const backToTop = document.querySelector('[data-back-to-top]');
  if (backToTop) {
    const updateBackToTop = () => {
      backToTop.classList.toggle('visible', window.scrollY > 700);
    };

    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    backToTop.addEventListener('click', () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
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
        window.setTimeout(() => {
          button.textContent = original;
        }, 1800);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  });
})();
