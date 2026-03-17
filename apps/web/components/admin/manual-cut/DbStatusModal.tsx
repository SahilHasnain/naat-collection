"use client";

import { Naat } from "./types";

interface Props {
  naat: Naat;
  onClose: () => void;
}

function formatValue(key: string, value: unknown) {
  if (value === null || value === undefined)
    return <span className="text-gray-600 italic">null</span>;

  if (typeof value === "boolean")
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${value ? "bg-green-700 text-green-200" : "bg-red-900 text-red-300"}`}>
        {value ? "true" : "false"}
      </span>
    );

  if (typeof value === "string" && (value.startsWith("[") || value.startsWith("{"))) {
    try {
      return (
        <pre className="text-xs text-yellow-300 bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(JSON.parse(value), null, 2)}
        </pre>
      );
    } catch {}
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return <span className="text-blue-300">{new Date(value).toLocaleString()}</span>;

  if (key === "$id" || key.endsWith("Id") || key.endsWith("id"))
    return <span className="font-mono text-purple-300 break-all">{String(value)}</span>;

  return <span className="text-gray-200 break-all">{String(value)}</span>;
}

export default function DbStatusModal({ naat, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">DB Document Status</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-sm">{naat.$id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(naat)
                .filter(([key]) => !key.startsWith("$permissions"))
                .map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-800 last:border-0">
                    <td className="py-2 pr-4 text-gray-400 font-mono text-xs align-top w-40 shrink-0">{key}</td>
                    <td className="py-2 align-top">{formatValue(key, value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
