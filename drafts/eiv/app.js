(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let state;
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function render() {
    const result = EIVDemo.analyze(state);
    $('candidate-count').textContent = state.active.length;
    $('used-count').textContent =
      `${state.answers.length} / ${state.budget} questions`;
    const fragment = document.createDocumentFragment();
    for (const candidate of state.candidates.filter(
      (candidate) => !state.omission || candidate.decision === 'allow',
    )) {
      const active = state.active.includes(candidate.id);
      const card = element('div', `candidate${active ? '' : ' inactive'}`);
      card.setAttribute(
        'aria-label',
        `${candidate.id}: ${candidate.recipient}, ${candidate.format}, ${candidate.time}; ${candidate.decision}; ${active ? 'active' : 'eliminated'}`,
      );
      const top = element('div', 'candidate-id');
      top.append(
        element('span', '', candidate.id.toUpperCase()),
        element(
          'span',
          `candidate-outcome ${candidate.decision}`,
          candidate.decision,
        ),
      );
      card.append(
        top,
        element('div', 'candidate-name', candidate.recipient),
        element(
          'div',
          'candidate-detail',
          `${candidate.format} · ${candidate.time}`,
        ),
      );
      fragment.append(card);
    }
    $('candidates').replaceChildren(fragment);
    const titles = {
      ask: 'Ask before deciding',
      allow: 'Allow — incorrect for the declared intent',
      deny: 'Deny — consistent with the declared intent',
      abstain: 'Abstain — permission unresolved',
    };
    $('decision').dataset.decision = result.decision;
    $('decision').replaceChildren(
      element('h4', '', titles[result.decision]),
      element('p', '', result.reason),
    );
    $('question-area').hidden = result.decision !== 'ask';
    if (result.question) {
      $('question-text').textContent = result.question.prompt;
      $('answer-text').textContent =
        `Truthful simulated answer: ${EIVDemo.intent[result.question.id]}. This question separates ${result.score} opposite-decision pairs.`;
    }
    $('trace').replaceChildren(
      ...[
        ...state.trace,
        `Current decision: ${result.decision}. ${result.reason}`,
      ].map((message) => element('li', '', message)),
    );
  }
  function reset() {
    state = EIVDemo.create({
      strategy: $('strategy').value,
      budget: Number($('budget').value),
      omission: $('omission').checked,
    });
    render();
  }
  ['strategy', 'budget', 'omission'].forEach((id) =>
    $(id).addEventListener('change', reset),
  );
  $('reset').addEventListener('click', reset);
  $('answer').addEventListener('click', () => {
    state = EIVDemo.step(state);
    render();
  });
  $('unsure').addEventListener('click', () => {
    state = EIVDemo.step(state, 'unsure');
    render();
  });
  $('export').addEventListener('click', () => {
    const payload = {
      artifact: 'EIV portfolio educational simulation',
      disclaimer:
        'Not a Python verifier result, permission token, or benchmark observation.',
      declared_intent: EIVDemo.intent,
      state,
      result: EIVDemo.analyze(state),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2) + '\n'], {
        type: 'application/json',
      }),
    );
    const link = element('a');
    link.href = url;
    link.download = 'eiv-illustration-trace.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('copy').addEventListener('click', async () => {
    const code = $('quickstart').textContent;
    try {
      if (!navigator.clipboard || !window.isSecureContext)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      $('copy').textContent = 'Copied';
      $('copy-feedback').textContent = 'Quickstart commands copied.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents($('quickstart'));
      selection.removeAllRanges();
      selection.addRange(range);
      $('copy-feedback').textContent =
        'Commands selected. Press Ctrl+C or ⌘C to copy.';
    }
  });
  reset();
})();
