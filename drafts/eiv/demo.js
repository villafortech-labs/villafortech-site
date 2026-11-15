/* A finite teaching model, separate from the Python verifier and frozen studies.
 * Its question score is the number of opposite-decision candidate pairs split.
 * No question selection uses the declared intent; the oracle does so only when
 * the reader explicitly applies a truthful answer. No network or real actions.
 */
(() => {
  'use strict';
  const QUESTIONS = [
    {
      id: 'format',
      prompt: 'Should the report use plain or rich text?',
      options: ['plain', 'rich'],
    },
    {
      id: 'time',
      prompt: 'Should the report be sent now or later?',
      options: ['now', 'later'],
    },
    {
      id: 'recipient',
      prompt: 'Did you mean Alex or Bea?',
      options: ['Alex', 'Bea'],
    },
  ];
  const INTENT = Object.freeze({
    recipient: 'Bea',
    format: 'plain',
    time: 'later',
  });
  function create({
    strategy = 'targeted',
    budget = 1,
    omission = false,
  } = {}) {
    if (
      !['targeted', 'first'].includes(strategy) ||
      !Number.isInteger(budget) ||
      budget < 0 ||
      budget > 3 ||
      typeof omission !== 'boolean'
    ) {
      throw new TypeError('Invalid illustration configuration');
    }
    const candidates = [];
    for (const recipient of ['Alex', 'Bea']) {
      for (const format of ['plain', 'rich']) {
        for (const time of ['now', 'later']) {
          candidates.push({
            id: `c${candidates.length + 1}`,
            recipient,
            format,
            time,
            decision: recipient === 'Alex' ? 'allow' : 'deny',
          });
        }
      }
    }
    const active = candidates
      .filter((candidate) => !omission || candidate.decision === 'allow')
      .map((candidate) => candidate.id);
    return {
      strategy,
      budget,
      omission,
      candidates,
      active,
      answers: [],
      terminal: null,
      trace: [
        `Generated ${active.length} candidate interpretations. Coverage is unverified.`,
      ],
    };
  }
  function analyze(state) {
    const active = state.candidates.filter((candidate) =>
      state.active.includes(candidate.id),
    );
    if (state.terminal)
      return {
        decision: 'abstain',
        reason: state.terminal,
        question: null,
        score: 0,
      };
    if (!active.length)
      return {
        decision: 'abstain',
        reason: 'No active interpretations remain.',
        question: null,
        score: 0,
      };
    if (active.every((candidate) => candidate.decision === 'allow'))
      return {
        decision: 'allow',
        reason:
          'Every supplied interpretation permits sending to Alex. The declared intent was Bea, so this is a false authorization.',
        question: null,
        score: 0,
      };
    if (active.every((candidate) => candidate.decision === 'deny'))
      return {
        decision: 'deny',
        reason:
          'Every remaining interpretation denies sending to Alex. This agrees with the declared intent: Bea.',
        question: null,
        score: 0,
      };
    const ranked = QUESTIONS.map((question, order) => {
      let score = 0;
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          if (
            active[i].decision !== active[j].decision &&
            active[i][question.id] !== active[j][question.id]
          )
            score++;
        }
      }
      return { question, order, score };
    }).filter((item) => item.score > 0);
    ranked.sort((a, b) =>
      state.strategy === 'targeted'
        ? b.score - a.score || a.order - b.order
        : a.order - b.order,
    );
    if (!ranked.length)
      return {
        decision: 'abstain',
        reason: 'No available question separates unlike decisions.',
        question: null,
        score: 0,
      };
    if (state.answers.length >= state.budget)
      return {
        decision: 'abstain',
        reason:
          'The question budget is exhausted, and interpretations still disagree. No permission is inferred.',
        question: null,
        score: 0,
      };
    return {
      decision: 'ask',
      reason:
        'Supplied interpretations disagree about this action. A question can restrict the candidate set.',
      question: ranked[0].question,
      score: ranked[0].score,
    };
  }
  function step(state, response = 'truthful') {
    if (!['truthful', 'unsure', 'other'].includes(response))
      throw new TypeError('Unknown answer mode');
    const result = analyze(state);
    if (result.decision !== 'ask')
      throw new Error('This state has no question to answer');
    const next = JSON.parse(JSON.stringify(state));
    const question = result.question;
    if (response !== 'truthful') {
      next.answers.push({ question: question.id, answer: response });
      next.terminal =
        response === 'other'
          ? "The user's intent is outside the offered options. A new interpretation set is needed."
          : 'The user answered “unsure”. The system abstains instead of inventing permission.';
      next.trace.push(
        `Asked ${question.id} (pair score ${result.score}). Received ${response}; abstaining.`,
      );
    } else {
      const answer = INTENT[question.id];
      const before = next.active.length;
      next.active = next.active.filter(
        (id) =>
          next.candidates.find((candidate) => candidate.id === id)[
            question.id
          ] === answer,
      );
      next.answers.push({ question: question.id, answer });
      next.trace.push(
        `Asked ${question.id} (pair score ${result.score}). Truthful answer: ${answer}. Restricted ${before} → ${next.active.length} candidates.`,
      );
    }
    return next;
  }
  globalThis.EIVDemo = Object.freeze({ create, analyze, step, intent: INTENT });
})();
