/**
 * Global Loading State
 *
 * This is a special Next.js file that shows during page transitions.
 * It provides visual feedback while content is loading.
 */

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        {/* Spinner */}
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )
}
