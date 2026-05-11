'use client';

import { useState } from 'react';

export const PRESET_COLOURS = [
  { label: 'White',  hex: '#ffffff' },
  { label: 'Black',  hex: '#111111' },
  { label: 'Grey',   hex: '#808080' },
  { label: 'Red',    hex: '#c0392b' },
  { label: 'Orange', hex: '#e67e22' },
  { label: 'Yellow', hex: '#f1c40f' },
  { label: 'Green',  hex: '#27ae60' },
  { label: 'Teal',   hex: '#16a085' },
  { label: 'Blue',   hex: '#2980b9' },
  { label: 'Purple', hex: '#8e44ad' },
  { label: 'Pink',   hex: '#e91e63' },
  { label: 'Brown',  hex: '#795548' },
] as const;

interface ColourPickerProps {
  name: string;
  value: string;
  onChange: (hex: string) => void;
}

export function ColourPicker({ name, value, onChange }: ColourPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const isPreset = PRESET_COLOURS.some(c => c.hex === value);
  const isCustom = !!value && !isPreset;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <input type="hidden" name={name} value={value} />

      {/* None / clear */}
      <button
        type="button"
        title="No colour"
        onClick={() => { onChange(''); setShowCustom(false); }}
        className={`w-7 h-7 rounded-full border-2 text-xs flex items-center justify-center transition-all shrink-0 ${
          !value
            ? 'border-foreground bg-foreground text-background'
            : 'border-foreground/25 text-foreground/50 hover:border-foreground/50'
        }`}
      >
        ×
      </button>

      {/* Presets */}
      {PRESET_COLOURS.map(c => (
        <button
          key={c.hex}
          type="button"
          title={c.label}
          onClick={() => { onChange(c.hex); setShowCustom(false); }}
          className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
            value === c.hex
              ? 'border-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background'
              : 'border-black/10 hover:border-foreground/50'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}

      {/* Custom */}
      <button
        type="button"
        title={isCustom ? `Custom: ${value}` : 'Custom colour'}
        onClick={() => setShowCustom(v => !v)}
        className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 text-xs flex items-center justify-center ${
          isCustom
            ? 'border-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background'
            : 'border-foreground/25 hover:border-foreground/50'
        }`}
        style={isCustom ? { backgroundColor: value } : {}}
      >
        {!isCustom && '+'}
      </button>

      {showCustom && (
        <input
          type="color"
          value={isCustom ? value : '#808080'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer border-0 bg-transparent p-0"
        />
      )}
    </div>
  );
}
