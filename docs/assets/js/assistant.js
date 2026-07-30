(() => {
  const config = window.MentorSphereAssistantConfig;
  if (!config || !config.enabled || document.querySelector('[data-assistant-launcher]')) return;

  const session = {
    id: crypto.randomUUID(),
    messages: [],
    busy: false,
  };
  const maxMessageLength = Number(config.maxMessageLength) || 600;
  const maxConversationMessages = Number(config.maxConversationMessages) || 7;

  const create = (tagName, attributes = {}, text = '') => {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([name, value]) => {
      if (name === 'class') element.className = value;
      else if (name === 'hidden') element.hidden = Boolean(value);
      else element.setAttribute(name, String(value));
    });
    if (text) element.textContent = text;
    return element;
  };

  const track = (event) => {
    void fetch('/api/assistant/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, sessionId: session.id }),
      keepalive: true,
    }).catch(() => {});
  };

  const launcher = create('button', {
    class: 'assistant-launcher',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'mentorsphere-assistant-panel',
    'aria-label': 'Open MentorSphere Assistant',
    'data-assistant-launcher': '',
  });
  launcher.append(
    create('span', { class: 'assistant-launcher-icon', 'aria-hidden': 'true' }, '?'),
    create('span', { class: 'assistant-launcher-label' }, 'Ask MentorSphere'),
  );

  const panel = create('section', {
    class: 'assistant-panel',
    id: 'mentorsphere-assistant-panel',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'mentorsphere-assistant-title',
    hidden: true,
  });

  const header = create('header', { class: 'assistant-header' });
  const brand = create('div', { class: 'assistant-brand' });
  const logo = create('img', {
    src: '/assets/images/main-logo.svg',
    alt: '',
    width: '40',
    height: '40',
  });
  const brandText = create('div', { class: 'assistant-brand-text' });
  brandText.append(
    create('span', { class: 'assistant-brand-title', id: 'mentorsphere-assistant-title' }, 'MentorSphere Assistant'),
    create('span', { class: 'assistant-brand-status' }, 'Approved website information'),
  );
  brand.append(logo, brandText);

  const headerActions = create('div', { class: 'assistant-header-actions' });
  const minimiseButton = create('button', {
    class: 'assistant-icon-button',
    type: 'button',
    'aria-label': 'Minimise assistant',
    title: 'Minimise',
  }, '−');
  const closeButton = create('button', {
    class: 'assistant-icon-button',
    type: 'button',
    'aria-label': 'Close assistant',
    title: 'Close',
  }, '×');
  headerActions.append(minimiseButton, closeButton);
  header.append(brand, headerActions);

  const notice = create(
    'p',
    { class: 'assistant-notice' },
    'Ask about services, pricing, booking and policies. Please do not share confidential medical, safeguarding or identification information. This assistant cannot provide clinical, legal or emergency advice.',
  );

  const messages = create('div', {
    class: 'assistant-messages',
    role: 'log',
    'aria-live': 'polite',
    'aria-relevant': 'additions text',
    'aria-label': 'Conversation',
  });

  const composer = create('form', { class: 'assistant-composer', novalidate: '' });
  const error = create('p', {
    class: 'assistant-error',
    role: 'alert',
    hidden: true,
  });
  const inputRow = create('div', { class: 'assistant-input-row' });
  const label = create('label', { class: 'sr-only', for: 'mentorsphere-assistant-input' }, 'Your question');
  const input = create('textarea', {
    class: 'assistant-input',
    id: 'mentorsphere-assistant-input',
    name: 'message',
    rows: '2',
    maxlength: String(maxMessageLength),
    placeholder: 'Ask a question…',
    required: '',
  });
  const send = create('button', { class: 'assistant-send', type: 'submit' }, 'Send');
  inputRow.append(label, input, send);
  const composerFooter = create('div', { class: 'assistant-composer-footer' });
  const restartButton = create('button', { class: 'assistant-restart', type: 'button' }, 'Restart');
  const count = create('span', { 'aria-live': 'off' }, `0/${maxMessageLength}`);
  composerFooter.append(restartButton, count);
  composer.append(error, inputRow, composerFooter);
  panel.append(header, notice, messages, composer);
  document.body.append(launcher, panel);
  document.body.classList.add('assistant-enabled');

  const setError = (message = '') => {
    error.textContent = message;
    error.hidden = !message;
  };

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const addSources = (container, sources) => {
    if (!Array.isArray(sources) || sources.length === 0) return;
    const wrapper = create('div', { class: 'assistant-sources' });
    wrapper.append(create('span', { class: 'assistant-sources-label' }, 'Read more'));
    sources.forEach((source) => {
      if (!source || typeof source.title !== 'string' || typeof source.url !== 'string') return;
      let url;
      try {
        url = new URL(source.url);
      } catch {
        return;
      }
      if (url.protocol !== 'https:' || url.hostname !== 'www.thementorsphere.co.uk') return;
      const link = create('a', { href: url.href }, source.title);
      link.addEventListener('click', () => track('source_link_clicked'));
      wrapper.append(link);
    });
    if (wrapper.childElementCount > 1) container.append(wrapper);
  };

  const addFeedback = (container) => {
    const wrapper = create('div', { class: 'assistant-feedback' });
    wrapper.append(create('span', {}, 'Was this helpful?'));
    const yes = create('button', { type: 'button' }, 'Yes');
    const no = create('button', { type: 'button' }, 'No');
    const record = (event) => {
      track(event);
      wrapper.replaceChildren(create('span', {}, 'Thank you for the feedback.'));
    };
    yes.addEventListener('click', () => record('helpful_yes'));
    no.addEventListener('click', () => record('helpful_no'));
    wrapper.append(yes, no);
    container.append(wrapper);
  };

  const addMessage = (role, content, sources = [], includeFeedback = false) => {
    const item = create('article', {
      class: `assistant-message assistant-message-${role}`,
      'aria-label': role === 'user' ? 'You' : 'MentorSphere Assistant',
    });
    item.append(create('p', { class: 'assistant-bubble' }, content));
    if (role === 'assistant') {
      addSources(item, sources);
      if (includeFeedback) addFeedback(item);
    }
    messages.append(item);
    scrollToLatest();
    return item;
  };

  const welcome = () => {
    addMessage(
      'assistant',
      'Hello. I can help you find information about The MentorSphere’s tutoring, ADHD coaching, education and SEND support, pricing and policies. What would you like to know?',
    );
  };

  const openPanel = () => {
    panel.hidden = false;
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    input.focus();
    track('chat_opened');
  };

  const closePanel = () => {
    panel.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  };

  const setBusy = (busy) => {
    session.busy = busy;
    input.disabled = busy;
    send.disabled = busy;
  };

  const restart = () => {
    session.id = crypto.randomUUID();
    session.messages = [];
    messages.replaceChildren();
    setError();
    input.value = '';
    count.textContent = `0/${maxMessageLength}`;
    welcome();
    input.focus();
  };

  launcher.addEventListener('click', openPanel);
  minimiseButton.addEventListener('click', closePanel);
  closeButton.addEventListener('click', closePanel);
  restartButton.addEventListener('click', restart);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      closePanel();
    }
  });

  input.addEventListener('input', () => {
    count.textContent = `${input.value.length}/${maxMessageLength}`;
    if (input.value.trim()) setError();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (session.busy) return;
    const content = input.value.trim();
    if (!content) {
      setError('Enter a question before sending.');
      input.focus();
      return;
    }
    if (content.length > maxMessageLength) {
      setError(`Keep the question to ${maxMessageLength} characters or fewer.`);
      input.focus();
      return;
    }

    setError();
    addMessage('user', content);
    session.messages.push({ role: 'user', content });
    session.messages = session.messages.slice(-maxConversationMessages);
    input.value = '';
    count.textContent = `0/${maxMessageLength}`;
    setBusy(true);
    track('message_sent');
    const loading = create('div', {
      class: 'assistant-loading',
      role: 'status',
    }, 'Finding approved information…');
    messages.append(loading);
    scrollToLatest();

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          messages: session.messages,
        }),
      });
      const result = await response.json().catch(() => ({}));
      loading.remove();

      if (!response.ok || typeof result.answer !== 'string') {
        const message = typeof result.error === 'string'
          ? result.error
          : 'The assistant could not respond. Please try again.';
        setError(message);
        track('technical_error');
        return;
      }

      addMessage('assistant', result.answer, result.sources, true);
      session.messages.push({ role: 'assistant', content: result.answer });
      session.messages = session.messages.slice(-maxConversationMessages);
      if (result.kind === 'fallback') track('fallback_triggered');
    } catch {
      loading.remove();
      setError('The assistant could not connect. Check your connection and try again.');
      track('technical_error');
    } finally {
      setBusy(false);
      input.focus();
    }
  });

  welcome();
})();
