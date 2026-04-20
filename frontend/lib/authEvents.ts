type Listener = () => void;

const listeners = new Set<Listener>();

export function onAuthExpired(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthExpired() {
  listeners.forEach((listener) => listener());
}
