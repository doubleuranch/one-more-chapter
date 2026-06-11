type Listener = (active: boolean) => void;
const _listeners = new Set<Listener>();

export function fireConfetti() {
  _listeners.forEach(l => l(true));
  setTimeout(() => _listeners.forEach(l => l(false)), 1800);
}

export function subscribeConfetti(listener: Listener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
