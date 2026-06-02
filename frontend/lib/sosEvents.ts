type Listener = () => void;

const listeners = new Set<Listener>();

export function onSosStart(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSosStart() {
  listeners.forEach((listener) => listener());
}
