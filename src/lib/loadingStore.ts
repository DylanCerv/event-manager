type Listener = () => void;

class LoadingStore {
  private pendingCount = 0;
  private listeners = new Set<Listener>();

  getSnapshot = () => this.pendingCount;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  increment = () => {
    this.pendingCount += 1;
    this.emit();
  };

  decrement = () => {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
    this.emit();
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

export const loadingStore = new LoadingStore();

