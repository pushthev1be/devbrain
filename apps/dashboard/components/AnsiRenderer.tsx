import React from 'react';

interface AnsiRendererProps {
  text: string;
}

export const AnsiRenderer: React.FC<AnsiRendererProps> = ({ text }) => {
  const parseAnsi = (input: string) => {
    // Basic ANSI to CSS mapping
    const parts = input.split(/(\u001b\[[0-9;]*m)/g);
    let currentColor = 'inherit';
    let isBold = false;

    return parts.map((part, i) => {
      const match = part.match(/\u001b\[([0-9;]*)m/);
      if (match) {
        const code = match[1];
        if (code === '0') {
          currentColor = 'inherit';
          isBold = false;
        } else if (code === '31') currentColor = '#ef4444'; // Red
        else if (code === '32') currentColor = '#22c55e'; // Green
        else if (code === '33') currentColor = '#eab308'; // Yellow
        else if (code === '34') currentColor = '#3b82f6'; // Blue
        else if (code === '35') currentColor = '#a855f7'; // Purple
        else if (code === '36') currentColor = '#06b6d4'; // Cyan
        else if (code === '1') isBold = true;
        return null;
      }
      return (
        <span key={i} style={{ color: currentColor, fontWeight: isBold ? 'bold' : 'normal' }}>
          {part}
        </span>
      );
    });
  };

  return <span className="whitespace-pre-wrap">{parseAnsi(text)}</span>;
};