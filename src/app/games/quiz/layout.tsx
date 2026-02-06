/**
 * Quiz Game Layout
 *
 * Nesting point for all quiz routes (/games/quiz/*).
 * Currently a pass-through — quiz-specific shared UI goes here later.
 */

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
