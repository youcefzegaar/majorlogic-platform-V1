import { useState } from 'react';

export function useLocalStorage(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = (value) => {
    const nextValue = typeof value === 'function' ? value(state) : value;
    try {
      setState(nextValue);
      window.localStorage.setItem(key, JSON.stringify(nextValue));
    } catch (err) {
      console.warn(`[useLocalStorage] Failed to persist key "${key}":`, err);
      setState(nextValue);
    }
  };

  return [state, setValue];
}
