import AsyncStorage from '@react-native-async-storage/async-storage';

// Serialize read/modify/write transactions for each storage key. A failed write
// must not prevent later retries from running.
const queues = new Map<string, Promise<unknown>>();
export function storageTransaction<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  queues.set(key, result);
  return result;
}
export function writeStoredValue(key: string, value: unknown) {
  const snapshot = JSON.stringify(value);
  return storageTransaction(key, () => AsyncStorage.setItem(key, snapshot));
}
