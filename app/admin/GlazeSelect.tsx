'use client';

import { useState } from 'react';
import { ColourPicker } from './ColourPicker';
import type { Glaze } from '@/app/_lib/customMug';
import type { GlazeEntry } from '@/app/_data/projects';

interface Props {
  index: number;
  glazes: Glaze[];
  defaultEntry?: GlazeEntry;
}

type Mode = 'none' | 'preset' | 'custom';

export function GlazeSelect({ index, glazes, defaultEntry }: Props) {
  const initMode = (): Mode => {
    if (!defaultEntry?.name) return 'none';
    if (defaultEntry.slug && glazes.some(g => g.slug === defaultEntry.slug)) return 'preset';
    return 'custom';
  };

  const initSlug = (): string => {
    if (!defaultEntry?.slug) return '';
    return glazes.some(g => g.slug === defaultEntry.slug) ? defaultEntry.slug : '';
  };

  const [mode, setMode] = useState<Mode>(initMode);
  const [presetSlug, setPresetSlug] = useState<string>(initSlug);
  const [customName, setCustomName] = useState(defaultEntry && initMode() === 'custom' ? (defaultEntry.name ?? '') : '');
  const [customNote, setCustomNote] = useState(defaultEntry && initMode() === 'custom' ? (defaultEntry.note ?? '') : '');
  const [customColour, setCustomColour] = useState(defaultEntry && initMode() === 'custom' ? (defaultEntry.colour ?? '') : '');

  const n = `glaze_${index}`;
  const preset = glazes.find(g => g.slug === presetSlug);
  const selectValue = mode === 'none' ? '' : mode === 'custom' ? '__custom__' : presetSlug;

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
        <optgroup label="Build a Mug glazes">
          {glazes.map(g => (
            <option key={g.id} value={g.slug}>{g.name}</option>
          ))}
        </optgroup>
        <option value="__custom__">Custom (not in Build a Mug)</option>
      </select>

      {mode === 'preset' && preset && (
        <>
          <input type="hidden" name={`${n}_name`} value={preset.name} />
          <input type="hidden" name={`${n}_note`} value={preset.note} />
          <input type="hidden" name={`${n}_colour`} value={preset.colour ?? ''} />
          <input type="hidden" name={`${n}_slug`} value={preset.slug} />
          <p className="text-sm text-muted-foreground px-1 flex items-center gap-2">
            {preset.colour && (
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-muted shrink-0" style={{ background: preset.colour }} />
            )}
            <span>{preset.name}</span>
            {preset.note && <span className="opacity-60">— {preset.note}</span>}
          </p>
        </>
      )}

      {mode === 'custom' && (
        <div className="grid grid-cols-3 gap-2">
          <input
            name={`${n}_name`}
            type="text"
            placeholder="Label (shown to customer)"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
          />
          <input
            name={`${n}_note`}
            type="text"
            placeholder="Note (sent to you on order)"
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
          />
          <ColourPicker
            name={`${n}_colour`}
            value={customColour}
            onChange={setCustomColour}
          />
        </div>
      )}
    </div>
  );
}
