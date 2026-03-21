import Link from "next/link";

export default function AdminPage() {
  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/manual-cut"
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition-colors border border-gray-700"
          >
            <h2 className="text-xl font-semibold mb-2">Manual Audio Cut</h2>
            <p className="text-gray-400">
              Cut and remove explanation parts from naat audio files
            </p>
          </Link>

          <Link
            href="/admin/ai-jobs"
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition-colors border border-gray-700"
          >
            <h2 className="text-xl font-semibold mb-2">AI Jobs</h2>
            <p className="text-gray-400">
              Inspect queued, running, completed, and failed AI detection jobs
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
