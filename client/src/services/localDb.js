const DB_NAME =
  "studyos_guest_db";

const DB_VERSION = 1;

const STORE_NAMES = [
  "tasks",
  "subjects",
  "notes",
  "events",
  "studySessions",
];

let dbPromise = null;

// =========================================================
// OPEN DATABASE
// =========================================================

const openDb = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise =
    new Promise(
      (
        resolve,
        reject
      ) => {
        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );

        request.onupgradeneeded =
          () => {
            const db =
              request.result;

            STORE_NAMES.forEach(
              (
                storeName
              ) => {
                if (
                  !db.objectStoreNames.contains(
                    storeName
                  )
                ) {
                  db.createObjectStore(
                    storeName,
                    {
                      keyPath:
                        "_id",
                    }
                  );
                }
              }
            );
          };

        request.onsuccess =
          () => {
            resolve(
              request.result
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );

  return dbPromise;
};

// =========================================================
// CREATE LOCAL ID
// =========================================================

export const createLocalId =
  () => {
    if (
      typeof crypto !==
        "undefined" &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return `guest-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  };

// =========================================================
// GET ALL
// =========================================================

const getAll =
  async (
    storeName
  ) => {
    const db =
      await openDb();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            storeName,
            "readonly"
          );

        const store =
          transaction.objectStore(
            storeName
          );

        const request =
          store.getAll();

        request.onsuccess =
          () => {
            resolve(
              request.result ||
                []
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  };

// =========================================================
// GET ONE
// =========================================================

const getOne =
  async (
    storeName,
    id
  ) => {
    const db =
      await openDb();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            storeName,
            "readonly"
          );

        const store =
          transaction.objectStore(
            storeName
          );

        const request =
          store.get(id);

        request.onsuccess =
          () => {
            resolve(
              request.result ||
                null
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  };

// =========================================================
// PUT
// =========================================================

const put =
  async (
    storeName,
    value
  ) => {
    const db =
      await openDb();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            storeName,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            storeName
          );

        const request =
          store.put(
            value
          );

        request.onsuccess =
          () => {
            resolve(
              value
            );
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  };

// =========================================================
// DELETE
// =========================================================

const remove =
  async (
    storeName,
    id
  ) => {
    const db =
      await openDb();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            storeName,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            storeName
          );

        const request =
          store.delete(id);

        request.onsuccess =
          () => {
            resolve(true);
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  };

// =========================================================
// CLEAR
// =========================================================

const clear =
  async (
    storeName
  ) => {
    const db =
      await openDb();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            storeName,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            storeName
          );

        const request =
          store.clear();

        request.onsuccess =
          () => {
            resolve(true);
          };

        request.onerror =
          () => {
            reject(
              request.error
            );
          };
      }
    );
  };

// =========================================================
// EXPORT
// =========================================================

export const localDb = {
  getAll,
  getOne,
  put,
  remove,
  clear,
};

export default localDb;