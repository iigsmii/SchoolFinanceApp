import { useEffect, useRef } from 'react';

/**
 * Stack of "close me" handlers for whatever overlay (modal, preview, picker) is currently open.
 * The hardware/gesture Back button must close the top-most overlay first and only navigate to the
 * previous screen when nothing is open, otherwise Back jumps out of the whole screen.
 */
const handlers: Array<() => void> = [];

/** Closes the top-most open overlay. Returns true when one was closed. */
export function runTopBackHandler(): boolean {
  const top = handlers[handlers.length - 1];
  if (!top) return false;
  top();
  return true;
}

/** Registers `onClose` as the Back action while `active` is true. */
export function useBackClose(active: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => closeRef.current();
    handlers.push(handler);
    return () => {
      const index = handlers.lastIndexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
    };
  }, [active]);
}
