'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;

/** Interactive fields must not accept input before their handlers are attached. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
}
