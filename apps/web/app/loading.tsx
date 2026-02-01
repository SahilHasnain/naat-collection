export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Loading Naat Collection...</p>
      </div>
    </div>
  );
}
