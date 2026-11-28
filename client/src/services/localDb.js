const DB_NAME =
  "studyos_guest_db";

const DB_VERSION =
  2;

const STORE_NAMES = [
  "tasks",
  "subjects",
  "notes",
  "events",
  "studySessions",
  "flashcardDecks",
];

let dbPromise =
  null;

// =========================================================
// OPEN DATABASE
// =========================================================

const openDb = () => {
  if (dbPromise) return dbPromise;
  const flight = new Promise((resolve, reject) => {
    let request, settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error || new Error("Could not open guest storage."));
    };
    const timer = setTimeout(() => fail(new Error("Guest storage took too long to open. Close other StudyOS tabs and retry.")), 15_000);
    try { request = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (error) { fail(error); return; }

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "_id" });
      }
    };
    request.onblocked = () => fail(new Error("Guest storage is blocked by another tab. Close other StudyOS tabs and retry."));
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      settled = true;
      clearTimeout(timer);
      db.onversionchange = () => {
        if (dbPromise === flight) dbPromise = null;
        db.close();
      };
      db.onclose = () => { if (dbPromise === flight) dbPromise = null; };
      resolve(db);
    };
  });
  dbPromise = flight;
  // A failed open must not poison every future request in this tab.
  flight.catch(() => { if (dbPromise === flight) dbPromise = null; });
  return flight;
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
// SUBJECT ID HELPER
// =========================================================

const getSubjectId =
  (
    value
  ) => {
    if (
      !value
    ) {
      return "";
    }

    if (
      typeof value ===
      "object"
    ) {
      return String(
        value._id ||
          value.id ||
          ""
      );
    }

    return String(
      value
    );
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
          store.get(
            id
          );

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
// PUT NORMAL RECORD
// =========================================================

const commitRecord = (db, storeName, operation, result) =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error("Guest storage transaction was cancelled. Try again."));
    transaction.onerror = () => reject(transaction.error || new Error("Could not save guest data."));
    try { operation(transaction.objectStore(storeName)); }
    catch (error) {
      try { transaction.abort(); } catch { /* already ended */ }
      reject(error);
    }
  });

const putNormalRecord = (db, storeName, value) =>
  commitRecord(db, storeName, store => store.put(value), value);

// =========================================================
// UPDATE SUBJECT + PROPAGATE NAME
//
// All of this happens in ONE IndexedDB transaction.
//
// If:
// Mathematics -> Advanced Mathematics
//
// then all linked:
//
// Tasks
// Notes
// Study Sessions
//
// receive the new cached subjectName.
//
// updatedAt is intentionally NOT changed on those linked
// records. Renaming a Subject should not make a Note appear
// as if its content was edited just now.
// =========================================================

const putSubject =
  async (
    db,
    value
  ) => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            [
              "subjects",
              "tasks",
              "notes",
              "studySessions",
            ],
            "readwrite"
          );

        const subjectStore =
          transaction.objectStore(
            "subjects"
          );

        let settled =
          false;

        // ===================================================
        // COMPLETE
        // ===================================================

        transaction.oncomplete =
          () => {
            if (
              settled
            ) {
              return;
            }

            settled =
              true;

            resolve(
              value
            );
          };

        // ===================================================
        // ERROR
        // ===================================================

        const fail =
          (
            error
          ) => {
            if (
              settled
            ) {
              return;
            }

            settled =
              true;

            reject(
              error ||
                transaction.error ||
                new Error(
                  "Failed to save subject"
                )
            );
          };

        transaction.onerror =
          () => {
            fail(
              transaction.error
            );
          };

        transaction.onabort =
          () => {
            fail(
              transaction.error
            );
          };

        // ===================================================
        // CHECK EXISTING SUBJECT
        // ===================================================

        const existingRequest =
          subjectStore.get(
            value._id
          );

        existingRequest.onerror =
          () => {
            try {
              transaction.abort();
            } catch {
              // Already aborting.
            }
          };

        existingRequest.onsuccess =
          () => {
            const existing =
              existingRequest.result ||
              null;

            const oldName =
              existing?.name ||
              "";

            const newName =
              value?.name ||
              "";

            const nameChanged =
              Boolean(
                existing
              ) &&
              oldName !==
                newName;

            // ===============================================
            // SAVE SUBJECT
            // ===============================================

            subjectStore.put(
              value
            );

            // ===============================================
            // NEW SUBJECT OR SAME NAME
            // ===============================================

            if (
              !nameChanged
            ) {
              return;
            }

            const targetId =
              String(
                value._id
              );

            // ===============================================
            // PROPAGATION HELPER
            // ===============================================

            const propagateName =
              (
                storeName
              ) => {
                const store =
                  transaction.objectStore(
                    storeName
                  );

                const cursorRequest =
                  store.openCursor();

                cursorRequest.onerror =
                  () => {
                    try {
                      transaction.abort();
                    } catch {
                      // Already aborting.
                    }
                  };

                cursorRequest.onsuccess =
                  () => {
                    const cursor =
                      cursorRequest.result;

                    if (
                      !cursor
                    ) {
                      return;
                    }

                    const record =
                      cursor.value;

                    if (
                      getSubjectId(
                        record?.subjectId
                      ) ===
                      targetId
                    ) {
                      cursor.update({
                        ...record,

                        subjectName:
                          newName,
                      });
                    }

                    cursor.continue();
                  };
              };

            // ===============================================
            // TASKS
            // ===============================================

            propagateName(
              "tasks"
            );

            // ===============================================
            // NOTES
            // ===============================================

            propagateName(
              "notes"
            );

            // ===============================================
            // FOCUS HISTORY
            // ===============================================

            propagateName(
              "studySessions"
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

    if (
      storeName ===
      "subjects"
    ) {
      return putSubject(
        db,
        value
      );
    }

    return putNormalRecord(
      db,
      storeName,
      value
    );
  };

// =========================================================
// DELETE NORMAL RECORD
// =========================================================

const removeNormalRecord = (db, storeName, id) =>
  commitRecord(db, storeName, store => store.delete(id), true);

// =========================================================
// DELETE SUBJECT + UNLINK REFERENCES
//
// ONE IndexedDB transaction:
//
// Tasks
//   subjectId   -> null
//   subjectName -> ""
//
// Notes
//   subjectId   -> null
//   subjectName -> ""
//
// Study Sessions
//   subjectId   -> null
//   subjectName stays unchanged
// =========================================================

const removeSubject =
  async (
    db,
    id
  ) => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            [
              "subjects",
              "tasks",
              "notes",
              "studySessions",
            ],
            "readwrite"
          );

        const targetId =
          String(
            id
          );

        let settled =
          false;

        // ===================================================
        // COMPLETE
        // ===================================================

        transaction.oncomplete =
          () => {
            if (
              settled
            ) {
              return;
            }

            settled =
              true;

            resolve(
              true
            );
          };

        // ===================================================
        // ERROR
        // ===================================================

        const fail =
          (
            error
          ) => {
            if (
              settled
            ) {
              return;
            }

            settled =
              true;

            reject(
              error ||
                transaction.error ||
                new Error(
                  "Failed to delete subject"
                )
            );
          };

        transaction.onerror =
          () => {
            fail(
              transaction.error
            );
          };

        transaction.onabort =
          () => {
            fail(
              transaction.error
            );
          };

        // ===================================================
        // DELETE SUBJECT
        // ===================================================

        transaction
          .objectStore(
            "subjects"
          )
          .delete(
            id
          );

        // ===================================================
        // UNLINK HELPER
        // ===================================================

        const unlinkStore =
          (
            storeName,
            {
              clearSubjectName =
                false,
            } = {}
          ) => {
            const store =
              transaction.objectStore(
                storeName
              );

            const cursorRequest =
              store.openCursor();

            cursorRequest.onerror =
              () => {
                try {
                  transaction.abort();
                } catch {
                  // Already aborting.
                }
              };

            cursorRequest.onsuccess =
              () => {
                const cursor =
                  cursorRequest.result;

                if (
                  !cursor
                ) {
                  return;
                }

                const record =
                  cursor.value;

                if (
                  getSubjectId(
                    record?.subjectId
                  ) ===
                  targetId
                ) {
                  const updatedRecord = {
                    ...record,

                    subjectId:
                      null,
                  };

                  if (
                    clearSubjectName
                  ) {
                    updatedRecord.subjectName =
                      "";
                  }

                  cursor.update(
                    updatedRecord
                  );
                }

                cursor.continue();
              };
          };

        // ===================================================
        // TASKS
        // ===================================================

        unlinkStore(
          "tasks",
          {
            clearSubjectName:
              true,
          }
        );

        // ===================================================
        // NOTES
        // ===================================================

        unlinkStore(
          "notes",
          {
            clearSubjectName:
              true,
          }
        );

        // ===================================================
        // STUDY SESSIONS
        // ===================================================

        unlinkStore(
          "studySessions",
          {
            clearSubjectName:
              false,
          }
        );
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

    if (
      storeName ===
      "subjects"
    ) {
      return removeSubject(
        db,
        id
      );
    }

    return removeNormalRecord(
      db,
      storeName,
      id
    );
  };

// =========================================================
// CLEAR
// =========================================================

const clear = async storeName =>
  commitRecord(await openDb(), storeName, store => store.clear(), true);

// Guest flashcard revisions are checked and committed in one transaction.
async function mutateFlashcardDeck(id, transform) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("flashcardDecks", "readwrite");
    const store = tx.objectStore("flashcardDecks");
    let result, failure;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure || tx.error || new Error("Deck save was cancelled."));
    tx.onerror = () => reject(failure || tx.error);
    const get = store.get(id);
    get.onsuccess = () => {
      const count = store.count();
      count.onsuccess = () => {
        try {
          result = transform(get.result || null, count.result);
          store.put(result);
        } catch (error) { failure = error; tx.abort(); }
      };
    };
  });
}

// =========================================================
// EXPORT
// =========================================================

export const localDb = {
  getAll,
  getOne,
  put,
  remove,
  clear,
  mutateFlashcardDeck,
};

export default localDb;