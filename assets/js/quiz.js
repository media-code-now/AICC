// Security Awareness Demo: a public, client-side educational quiz.
// No answers are stored, logged, or sent anywhere.
(() => {
  const QUESTIONS = [
    {
      id: 'mfa',
      topic: 'Unexpected MFA approval request',
      prompt:
        'Your phone shows a sign-in approval request for your work account, but you are not trying to sign in. What should you do?',
      choices: [
        'Approve it so the notifications stop.',
        'Deny the request and report it to your IT or security contact.',
        'Ignore it and carry on with your work.'
      ],
      correct: 1,
      explanation:
        'An approval request you did not start can mean someone else has your password and is trying to sign in. Denying it blocks that attempt, and reporting it means your password can be changed and the account checked.',
      tip: 'Only approve sign-in requests you started yourself. If prompts keep appearing, report them, even if you have already denied them.'
    },
    {
      id: 'banking',
      topic: 'Vendor changing banking details',
      prompt:
        'An email that appears to come from a regular supplier says their bank account has changed and asks you to send the next payment to new details. What is the best response?',
      choices: [
        'Update the details, since the email comes from the supplier’s usual address.',
        'Reply to the email and ask them to confirm the change.',
        'Verify the change by calling the supplier on a phone number you already have on file before changing anything.'
      ],
      correct: 2,
      explanation:
        'Payment change requests are a common fraud method, and the sender’s email account may be compromised or imitated. Replying to the same email may reach the fraudster. Calling a number you already trust confirms the request through a separate channel.',
      tip: 'Always verify bank detail changes through a separate, known contact method, and follow your business’s payment approval process.'
    },
    {
      id: 'password',
      topic: 'A colleague asking to borrow a password',
      prompt:
        'A colleague is locked out before a deadline and asks to use your password to finish their work. What should you do?',
      choices: [
        'Share it, since you trust them and it is only for today.',
        'Politely decline, and help them contact IT or their manager to get the access they need.',
        'Share it, then change your password afterwards.'
      ],
      correct: 1,
      explanation:
        'Your password gives access to everything your account can reach, and anything done with it is recorded as you. Helping your colleague get their own access solves the problem without putting either of you at risk.',
      tip: 'Never share passwords, even with people you trust. Each person should have their own account and the access their role requires.'
    },
    {
      id: 'attachment',
      topic: 'A suspicious attachment',
      prompt:
        'You receive an unexpected email marked “Overdue invoice – urgent” with an attachment, from a company you do not recognize. What should you do?',
      choices: [
        'Open the attachment to see whether the invoice is genuine.',
        'Do not open it, and report the email using your business’s reporting process.',
        'Forward it to colleagues to ask if anyone recognizes it.'
      ],
      correct: 1,
      explanation:
        'Unexpected attachments combined with urgency are common signs of phishing. Opening the file could run harmful software, and forwarding it spreads the risk. Reporting it lets the right person check it safely.',
      tip: 'Pause when a message is unexpected and urgent. If in doubt, report it rather than opening attachments or links.'
    },
    {
      id: 'laptop',
      topic: 'A lost work laptop',
      prompt: 'You realize you left your work laptop on a train. What is the best next step?',
      choices: [
        'Report it to your manager or IT contact right away, even if you might still find it.',
        'Wait a few days to see whether it is handed in.',
        'Buy a replacement and avoid mentioning it.'
      ],
      correct: 0,
      explanation:
        'Reporting quickly gives your team the chance to protect accounts and data, for example by signing the device out or changing passwords. Reporting a lost device is the responsible thing to do, and the sooner it happens the more options there are.',
      tip: 'Report lost or stolen devices immediately. Quick reporting matters far more than how the device was lost.'
    }
  ];

  if (typeof window !== 'undefined') window.SecurityAwarenessDemo = { QUESTIONS };
  if (typeof document === 'undefined') return;

  const root = document.getElementById('demo-quiz');
  if (!root) return;

  const LETTERS = ['A', 'B', 'C'];
  let index = 0;
  let score = 0;
  let missed = [];

  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else node.setAttribute(k, v);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function renderQuestion() {
    const q = QUESTIONS[index];
    root.replaceChildren();

    const progress = el('p', { class: 'quiz-progress' }, `Question ${index + 1} of ${QUESTIONS.length}`);
    const bar = el('div', { class: 'quiz-bar', 'aria-hidden': 'true' });
    const fill = el('span');
    fill.style.width = `${(index / QUESTIONS.length) * 100}%`;
    bar.appendChild(fill);

    const form = el('form', { class: 'quiz-form', novalidate: '' });
    const fieldset = el('fieldset', { 'aria-describedby': `q-error-${q.id}` });
    const legend = el('legend', { class: 'quiz-legend', tabindex: '-1', id: `q-legend-${q.id}` });
    legend.append(el('span', { class: 'quiz-topic' }, q.topic), el('span', { class: 'quiz-prompt' }, q.prompt));
    fieldset.appendChild(legend);

    const options = el('div', { class: 'quiz-options' });
    q.choices.forEach((choice, i) => {
      const id = `q-${q.id}-${i}`;
      const label = el('label', { class: 'quiz-option', for: id });
      const input = el('input', { type: 'radio', name: `q-${q.id}`, id, value: String(i) });
      label.append(input, el('span', { class: 'quiz-letter', 'aria-hidden': 'true' }, LETTERS[i]), el('span', { class: 'quiz-text' }, choice));
      options.appendChild(label);
    });
    fieldset.appendChild(options);

    const error = el('p', { class: 'field-error', id: `q-error-${q.id}`, role: 'alert', hidden: '' });
    fieldset.appendChild(error);
    form.appendChild(fieldset);

    const feedback = el('div', { class: 'quiz-feedback', hidden: '', tabindex: '-1' });
    const actions = el('div', { class: 'quiz-actions' });
    const button = el('button', { type: 'submit', class: 'cta cta-primary' }, 'Check answer');
    actions.appendChild(button);
    form.append(feedback, actions);

    let answered = false;

    form.addEventListener('change', () => {
      error.hidden = true;
      error.textContent = '';
      fieldset.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();

      if (answered) {
        index += 1;
        if (index < QUESTIONS.length) {
          renderQuestion();
          root.querySelector('.quiz-legend').focus();
        } else {
          renderResults();
        }
        return;
      }

      const selected = form.querySelector('input[type="radio"]:checked');
      if (!selected) {
        error.textContent = 'Please choose an answer to continue.';
        error.hidden = false;
        fieldset.setAttribute('aria-invalid', 'true');
        form.querySelector('input[type="radio"]').focus();
        return;
      }

      answered = true;
      const choice = Number(selected.value);
      const isCorrect = choice === q.correct;
      if (isCorrect) score += 1;
      else missed.push(q);

      form.querySelectorAll('.quiz-option').forEach((label, i) => {
        const input = label.querySelector('input');
        input.disabled = true;
        if (i === q.correct) {
          label.classList.add('is-correct');
          label.appendChild(el('span', { class: 'quiz-badge' }, 'Recommended answer'));
        } else if (i === choice) {
          label.classList.add('is-incorrect');
          label.appendChild(el('span', { class: 'quiz-badge' }, 'Your answer'));
        }
      });

      feedback.className = `quiz-feedback ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
      feedback.replaceChildren(
        el('h3', {}, isCorrect ? 'That’s right. Well done.' : 'Not quite, and that’s completely fine.'),
        el('p', {}, isCorrect ? q.explanation : `The recommended answer is ${LETTERS[q.correct]}. ${q.explanation}`)
      );
      feedback.hidden = false;
      feedback.focus();

      button.textContent = index < QUESTIONS.length - 1 ? 'Next question' : 'See your results';
    });

    root.append(progress, bar, form);
  }

  function renderResults() {
    root.replaceChildren();
    const heading = el('h3', { class: 'quiz-result-title', tabindex: '-1' }, `You answered ${score} of ${QUESTIONS.length} questions in line with the recommended approach.`);

    let message;
    if (score === QUESTIONS.length) {
      message = 'Excellent. You recognized each situation and chose the safest response. The tips below are worth sharing with your team.';
    } else if (score >= 3) {
      message = 'Good work. You handled most situations well. Take a moment to review the tips below for the scenarios you missed.';
    } else {
      message = 'Thank you for trying the demo. These situations catch many people out, which is exactly why short, regular practice helps. The tips below are a good place to start.';
    }

    const tipsTitle = el('h4', {}, missed.length ? 'Tips for the scenarios you missed' : 'Tips to remember');
    const list = el('ul', { class: 'list-check quiz-tips' });
    (missed.length ? missed : QUESTIONS).forEach((q) => {
      const li = el('li');
      li.append(el('strong', {}, `${q.topic}: `), document.createTextNode(q.tip));
      list.appendChild(li);
    });

    const general = el('p', { class: 'form-note' }, 'Whatever the situation, reporting something that seems wrong is always the right call. Nobody should be made to feel bad for asking or reporting.');
    const disclaimer = el('p', { class: 'form-note' }, 'This demo is an educational exercise. It is not a security assessment or certification, and your answers have not been saved or sent anywhere.');

    const actions = el('div', { class: 'quiz-actions' });
    const restart = el('button', { type: 'button', class: 'cta cta-secondary-dark' }, 'Try the demo again');
    restart.addEventListener('click', () => {
      index = 0;
      score = 0;
      missed = [];
      renderQuestion();
      root.querySelector('.quiz-legend').focus();
    });
    const cta = el('a', { class: 'cta cta-primary', href: 'security-assessment.html' }, 'Request a Security Assessment');
    actions.append(restart, cta);

    root.append(heading, el('p', {}, message), tipsTitle, list, general, disclaimer, actions);
    heading.focus();
  }

  renderQuestion();
})();
