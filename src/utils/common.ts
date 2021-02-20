
import * as fs from 'fs';

export function exists(file: string): Promise<boolean> {
  return new Promise<boolean>((resolve, _reject) => {
    fs.exists(file, (value) => {
      resolve(value);
    });
  });
}

/**
 * requires 'g' flag at minimum or else the pointer will not progress
 */
export function getAllMatches(str: string, regexp: RegExp): RegExpExecArray[] {
  let match: RegExpExecArray | null;
  let matches: RegExpExecArray[] = [];
  while ((match = regexp.exec(str)) !== null) {
    matches.push(match);
  }

  return matches;
}

export function isempty(obj: any): boolean | undefined {
  if (Array.isArray(obj))
    return obj.length === 0;
  if (typeof obj === 'string')
    return /^\s*$/.test(obj);
}

export function clamp(val: number, min: number, max: number) {
  if (val < min) return min;
  if (val > max) return max;

  return val;
}

export function getLastElement(array: object[]) {
  return array[array.length - 1];
}
