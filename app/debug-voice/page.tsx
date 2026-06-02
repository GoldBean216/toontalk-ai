
'use client';

import React, { useState } from 'react';

export default function DebugVoicePage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const runDiagnostic = async () => {
        setIsLoading(true);
        setLogs(["Running diagnostic..."]);

        try {
            const res = await fetch('/api/debug/tts', { method: 'POST' });
            const data = await res.json();

            setLogs(prev => [
                ...prev,
                "--- Server Logs ---",
                ...(data.logs || []),
                "-------------------",
                data.success ? "✅ DIAGNOSTIC PASSED" : "❌ DIAGNOSTIC FAILED"
            ]);

        } catch (e: any) {
            setLogs(prev => [...prev, `Client Error: ${e.message}`]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto font-mono">
            <h1 className="text-2xl font-bold mb-4">Voice Generation Diagnostic</h1>

            <button
                onClick={runDiagnostic}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
            >
                {isLoading ? 'Testing...' : 'Run Test'}
            </button>

            <div className="mt-6 bg-gray-900 text-green-400 p-4 rounded shadow-lg min-h-[300px] whitespace-pre-wrap text-sm">
                {logs.length === 0 ? "Ready to test." : logs.join('\n')}
            </div>

            <h2 className="mt-8 text-xl font-bold">Troubleshooting Checklist</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>API Key:</strong> Ensure <code>GEMINI_API_KEY</code> is set in Vercel/Netlify.</li>
                <li><strong>Model:</strong> Is <code>gemini-2.5-flash</code> enabled in your Google Cloud project?</li>
                <li><strong>Region:</strong> If getting 403/404, the server region might be blocked.</li>
                <li><strong>Timeouts:</strong> If the request takes &gt;10s, it might be timing out (Serverless limits).</li>
            </ul>
        </div>
    );
}
