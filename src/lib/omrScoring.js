// Parsing + scoring logic for the NEET Marks Calculator tool.
// Kept framework-free (plain functions, no React) so it's easy to unit-test
// or reuse if a future tool needs the same "Qno,Answer" CSV shape.

// Sentinel response values with special scoring treatment (see
// scoreResponses below) — not real option numbers.
export const DROPPED = 'DROPPED'; // NTA officially cancelled the question
export const MULTI_MARKED = 'MULTI_MARKED'; // two or more bubbles marked

/**
 * Parses a "Qno,Answer" CSV (optionally with a header row) into a
 * { [qno: string]: string } map. Blank / '-' responses are dropped (treated
 * as unattempted). This matches the format produced by the NEET OMR-portal
 * bookmarklet in this tool's README.
 *
 * A response of "Drop" (any case) means NTA officially cancelled that
 * question for everyone — the portal shows this instead of a recorded
 * option. It's preserved as the DROPPED sentinel so scoring can award it
 * zero marks either way, rather than being silently discarded as blank.
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
    if (/^drop(ped)?$/i.test(ans)) {
      responses[qno] = DROPPED;
    } else if (ans && ans !== '-') {
      responses[qno] = ans;
    }
  }

  return responses;
}

/**
 * Classifies a single response against its accepted answer(s). Returns
 * 'correct' | 'incorrect' | 'blank' | 'dropped' | 'multi'. Shared by
 * scoreResponses (for the aggregate tally) and the photo-review overlay
 * (for per-question dot coloring), so the two never disagree about what
 * counts as right.
 */
export function classifyAnswer(given, accepted) {
  if (given === DROPPED) return 'dropped';
  if (given === MULTI_MARKED) return 'multi';
  if (!given) return 'blank';
  return (accepted || []).includes(given) ? 'correct' : 'incorrect';
}

/**
 * Scores a parsed response map against an answer_keys row's `key` jsonb
 * ({ [qno]: string[] of accepted options }), using that row's marking
 * scheme. Handles multi-correct questions (any accepted option scores full
 * marks), blank/unattempted questions (0 marks), officially-dropped
 * questions (0 marks either way — see DROPPED), and multi-marked bubbles
 * (always scored as incorrect, regardless of whether one of the marked
 * options was correct — see MULTI_MARKED).
 */
export function scoreResponses(responses, answerKey) {
  const key = answerKey.key || {};
  const marksCorrect = answerKey.marks_correct ?? 4;
  const marksIncorrect = answerKey.marks_incorrect ?? -1;

  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  let dropped = 0;
  const incorrectQuestions = [];

  const allQuestions = Object.keys(key).sort((a, b) => Number(a) - Number(b));

  for (const qno of allQuestions) {
    const outcome = classifyAnswer(responses[qno], key[qno]);
    if (outcome === 'dropped') dropped += 1;
    else if (outcome === 'blank') blank += 1;
    else if (outcome === 'correct') correct += 1;
    else {
      // 'incorrect' or 'multi' — both score as wrong
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
    dropped,
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
