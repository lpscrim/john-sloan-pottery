'use client';

import { useState } from 'react';
import type { MugShape } from '@/app/_lib/customMug';

interface Props {
  index?: never; // not index-based — one shape per product
  shapes: MugShape[];
  defaultSlug?: string | null;
  defaultLabel?: string | null;
}

type Mode = 'none' | 'preset' | 'custom';

export function ShapeSelect({ shapes, defaultSlug, defaultLabel }: Props) {
  const initMode = (): Mode => {
    if (!defaultSlug && !defaultLabel) return 'none';
    if (defaultSlug && shapes.some(s => s.slug === defaultSlug)) return 'preset';
    return 'custom';
  };

  const [mode, setMode] = useState<Mode>(initMode);
  const [presetSlug, setPresetSlug] = useState(
    defaultSlug && shapes.some(s => s.slug === defaultSlug) ? defaultSlug : ''
  );
  const [customLabel, setCustomLabel] = useState(
    initMode() === 'custom' ? (defaultLabel ?? '') : ''
  );

  const selectValue = mode === 'none' ? '' : mode === 'custom' ? '__custom__' : presetSlug;
  const preset = shapes.find(s => s.slug === presetSlug);

  function handleSelect(value: string) {
    if (value === '') {
      setMode('none');
      setPresetSlug('');
    } else if (value === '__custom__') {
      setMode('custom');
      setPresetSlug('');
    } else {
      setMode('preset');
      setPresetSlug(value);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-muted p-3">
      <select
        value={selectValue}
        onChange={e => handleSelect(e.target.value)}
        className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
      >
        <option value="">None</option>
        <optgroup label="Build a Mug shapes (sold-out redirects to configurator)">
          {shapes.map(s => (
            <option key={s.id} value={s.slug}>{s.name}</option>
          ))}
        </optgroup>
        <option value="__custom__">Custom (not in Build a Mug)</option>
      </select>

      {/* Hidden inputs always present so the action can read them */}
      <input type="hidden" name="mug_shape_slug" value={mode === 'preset' ? presetSlug : ''} />
      <input type="hidden" name="shape_label" value={mode === 'preset' ? (preset?.name ?? '') : mode === 'custom' ? customLabel : ''} />

      {mode === 'preset' && preset && (
        <p className="text-sm text-muted-foreground px-1">
          {preset.name}
          {preset.description && <span className="opacity-60"> — {preset.description}</span>}
          <span className="ml-2 text-xs opacity-50">(sold-out buy button redirects to Build a Mug)</span>
        </p>
      )}

      {mode === 'custom' && (
        <input
          type="text"
          placeholder="Style label (e.g. Anagama Jar, Tea Bowl…)"
          value={customLabel}
          onChange={e => {
            setCustomLabel(e.target.value);
          }}
          className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
        />
      )}
    </div>
  );
}
