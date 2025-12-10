import { Tone } from '../types';
import { TONE_MAP } from '../constants';

export const getToneFromValue = (value: number): Tone => {
  const closest = TONE_MAP.reduce((prev, curr) => {
    return (Math.abs(curr.val - value) < Math.abs(prev.val - value) ? curr : prev);
  });
  return closest.tone as Tone;
};

export const getValueFromTone = (tone: Tone): number => {
  return TONE_MAP.find(t => t.tone === tone)?.val || 0;
};

export const getCurrentToneInfo = (value: number) => {
  return TONE_MAP.reduce((prev, curr) => {
    return (Math.abs(curr.val - value) < Math.abs(prev.val - value) ? curr : prev);
  });
};
