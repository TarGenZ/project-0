// Parsing + scoring logic for the NEET Marks Calculator tool.
// Kept framework-free (plain functions, no React) so it's easy to unit-test
// or reuse if a future tool needs the same "Qno,Answer" CSV shape.

/**
 * Parses a "Qno,Answer" CSV (optionally with a header row) into a
 * { [qno: string]: string } map. Blank / '-' responses are dropped (treated
 * as unattempted). This matches the format produced by the NEET OMR-portal
 * bookmarklet in this tool's README.
 */
export function parseResponseCsv(text) {
  const responses = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const [rawQ, rawA] = line.split(',').map((s) => (s ?? '').trim());
    if (!rawQ || /^q(no)?$/i.test(rawQ)) continue; // skip header row
    const qno = String(Number(rawQ));
    if (!Number.isFinite(Number(qno))) continue;
    const ans = (rawA ?? '').trim();
    if (ans && ans !== '-') responses[qno] = ans;
  }

  return responses;
}

/**
 * Scores a parsed response map against an answer_keys row's `key` jsonb
 * ({ [qno]: string[] of accepted options }), using that row's marking
 * scheme. Handles multi-correct questions (any accepted option scores full
 * marks) and blank/unattempted questions (0 marks).
 */
export function scoreResponses(responses, answerKey) {
  const key = answerKey.key || {};
  const marksCorrect = answerKey.marks_correct ?? 4;
  const marksIncorrect = answerKey.marks_incorrect ?? -1;

  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  const incorrectQuestions = [];

  const allQuestions = Object.keys(key).sort((a, b) => Number(a) - Number(b));

  for (const qno of allQuestions) {
    const given = responses[qno];
    const accepted = key[qno] || [];

    if (!given) {
      blank += 1;
      continue;
    }
    if (accepted.includes(given)) {
      correct += 1;
    } else {
      incorrect += 1;
      incorrectQuestions.push(qno);
    }
  }

  const score = correct * marksCorrect + incorrect * marksIncorrect;

  return {
    score,
    correct,
    incorrect,
    blank,
    total: allQuestions.length,
    incorrectQuestions,
    marksCorrect,
    marksIncorrect,
  };
}

/**
 * Parses the admin's "Qno,Answer" paste (one question per line, comma
 * before the answer, extra commas for multi-correct e.g. "2,1,3") into the
 * { [qno]: string[] } shape stored in answer_keys.key.
 */
export function parseAnswerKeyPaste(text) {
  const key = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const [rawQ, ...answers] = parts;
    if (/^q(no)?$/i.test(rawQ)) continue; // skip header row
    const qno = String(Number(rawQ));
    if (!Number.isFinite(Number(qno))) continue;
    key[qno] = answers;
  }

  return key;
}
