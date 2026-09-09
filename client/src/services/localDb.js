const DB_NAME =
  "studyos_guest_db";

const DB_VERSION =
  1;

const STORE_NAMES = [
  "tasks",
  "subjects",
  "notes",
  "events",
  "studySessions",
];

let dbPromise =
  null;

// =========================================================
// OPEN DATABASE
// =========================================================

const openDb =
  () => {
    if (
      dbPromise
    ) {
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

const putNormalRecord =
  async (
    db,
    storeName,
    value
  ) => {
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

const removeNormalRecord =
  async (
    db,
    storeName,
    id
  ) => {
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
          store.delete(
            id
          );

        request.onsuccess =
          () => {
            resolve(
              true
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
            resolve(
              true
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