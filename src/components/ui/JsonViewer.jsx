import React from 'react';

export default function JsonViewer({ data }) {
  if (!data) return null;
  
  const jsonString = JSON.stringify(data, null, 2);
  
  return (
    <div className="bg-[#1e1e1e] rounded-md p-4 overflow-auto text-sm font-mono text-gray-300 max-h-[400px]">
      <pre>
        <code>
          {jsonString.split('\n').map((line, i) => {
            // Simple syntax highlighting
            let formattedLine = line;
            if (line.includes('":')) {
              formattedLine = line.replace(/"([^"]+)":/, '<span class="text-blue-400">"$1"</span>:');
            }
            if (line.match(/:\s*"/)) {
              formattedLine = formattedLine.replace(/:\s*"([^"]*)"/, ': <span class="text-green-400">"$1"</span>');
            }
            if (line.match(/:\s*\d+/)) {
              formattedLine = formattedLine.replace(/:\s*(\d+)/, ': <span class="text-orange-400">$1</span>');
            }
            if (line.match(/:\s*(true|false|null)/)) {
               formattedLine = formattedLine.replace(/:\s*(true|false|null)/, ': <span class="text-purple-400">$1</span>');
            }

            return (
              <div key={i} className="table-row">
                <span className="table-cell text-gray-600 select-none pr-4 text-right border-r border-gray-700 w-8">{i + 1}</span>
                <span className="table-cell pl-4" dangerouslySetInnerHTML={{ __html: formattedLine }} />
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}