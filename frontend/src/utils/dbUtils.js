export const clearIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase('TaskTrackerDB');
    
    deleteRequest.onsuccess = () => {
      console.log('IndexedDB cleared successfully');
      resolve();
    };
    
    deleteRequest.onerror = () => {
      console.error('Error clearing IndexedDB:', deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onblocked = () => {
      console.warn('IndexedDB deletion blocked. Close all tabs and try again.');
    };
  });
};

// Call this in development console to reset the database
if (typeof window !== 'undefined') {
  window.clearIndexedDB = clearIndexedDB;
}