/** Marking scheme: +2 for a correct answer, -1 for a wrong one, 0 for skipped. */
export const CORRECT_MARKS = 2;
export const WRONG_MARKS = -1;

export function computeScore(totalCorrect: number, totalWrong: number): number {
  return totalCorrect * CORRECT_MARKS + totalWrong * WRONG_MARKS;
}

export function maxPossibleScore(totalQuestions: number): number {
  return totalQuestions * CORRECT_MARKS;
}
