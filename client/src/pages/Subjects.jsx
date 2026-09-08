import {
  useEffect,
  useState,
} from "react";

import apiRequest from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  useAuth,
} from "../context/AuthContext";

function Subjects() {
  const {
    isGuest,
  } = useAuth();

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingSubject,
    setEditingSubject,
  ] = useState(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    color,
    setColor,
  ] = useState(
    "#6366f1"
  );

  // =========================================
  // DELETE MODAL
  // =========================================

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  // =========================================================
  // FETCH SUBJECTS
  // =========================================================

  const fetchSubjects =
    async () => {
      try {
        setLoading(true);

        let data;

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          data =
            await localDb.getAll(
              "subjects"
            );

          data =
            data.sort(
              (
                a,
                b
              ) =>
                new Date(
                  b.createdAt ||
                    0
                ) -
                new Date(
                  a.createdAt ||
                    0
                )
            );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          data =
            await apiRequest(
              "/api/subjects"
            );
        }

        setSubjects(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to fetch subjects:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchSubjects();
  }, [isGuest]);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm =
    () => {
      setName("");
      setCode("");
      setDescription("");
      setColor(
        "#6366f1"
      );

      setEditingSubject(
        null
      );

      setShowForm(
        false
      );
    };

  // =========================================================
  // OPEN ADD FORM
  // =========================================================

  const openAddForm =
    () => {
      setEditingSubject(
        null
      );

      setName("");
      setCode("");
      setDescription("");
      setColor(
        "#6366f1"
      );

      setShowForm(
        true
      );
    };

  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  const openEditForm =
    (subject) => {
      setEditingSubject(
        subject
      );

      setName(
        subject.name
      );

      setCode(
        subject.code ||
          ""
      );

      setDescription(
        subject.description ||
          ""
      );

      setColor(
        subject.color ||
          "#6366f1"
      );

      setShowForm(
        true
      );
    };

  // =========================================================
  // SAVE SUBJECT
  // =========================================================

  const saveSubject =
    async (event) => {
      event.preventDefault();

      const trimmedName =
        name.trim();

      if (!trimmedName) {
        return;
      }

      try {
        let savedSubject;

        const subjectData = {
          name:
            trimmedName,

          code:
            code.trim(),

          description:
            description.trim(),

          color,
        };

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          if (
            editingSubject
          ) {
            savedSubject = {
              ...editingSubject,

              ...subjectData,

              _id:
                editingSubject._id,

              createdAt:
                editingSubject.createdAt ||
                now,

              updatedAt:
                now,
            };
          } else {
            savedSubject = {
              _id:
                createLocalId(),

              ...subjectData,

              createdAt:
                now,

              updatedAt:
                now,
            };
          }

          await localDb.put(
            "subjects",
            savedSubject
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          savedSubject =
            await apiRequest(
              editingSubject
                ? `/api/subjects/${editingSubject._id}`
                : "/api/subjects",
              {
                method:
                  editingSubject
                    ? "PUT"
                    : "POST",

                body:
                  JSON.stringify(
                    subjectData
                  ),
              }
            );
        }

        // =====================================
        // UPDATE UI
        // =====================================

        if (
          editingSubject
        ) {
          setSubjects(
            (
              currentSubjects
            ) =>
              currentSubjects.map(
                (
                  subject
                ) =>
                  subject._id ===
                  savedSubject._id
                    ? savedSubject
                    : subject
              )
          );
        } else {
          setSubjects(
            (
              currentSubjects
            ) => [
              savedSubject,
              ...currentSubjects,
            ]
          );
        }

        window.dispatchEvent(
          new Event(
            "studyos-subjects-updated"
          )
        );

        resetForm();
      } catch (error) {
        console.error(
          "Failed to save subject:",
          error
        );
      }
    };

  // =========================================================
  // DELETE MODAL
  // =========================================================

  const openDeleteConfirmation =
    (subject) => {
      setDeleteTarget(
        subject
      );
    };

  const closeDeleteConfirmation =
    () => {
      if (deleting) {
        return;
      }

      setDeleteTarget(
        null
      );
    };

  // =========================================================
  // DELETE SUBJECT
  // =========================================================

  const confirmDeleteSubject =
    async () => {
      if (!deleteTarget) {
        return;
      }

      try {
        setDeleting(true);

        // =====================================
        // GUEST
        // =====================================

        if (isGuest) {
          await localDb.remove(
            "subjects",
            deleteTarget._id
          );
        }

        // =====================================
        // ACCOUNT
        // =====================================

        else {
          await apiRequest(
            `/api/subjects/${deleteTarget._id}`,
            {
              method:
                "DELETE",
            }
          );
        }

        setSubjects(
          (
            currentSubjects
          ) =>
            currentSubjects.filter(
              (
                subject
              ) =>
                subject._id !==
                deleteTarget._id
            )
        );

        window.dispatchEvent(
          new Event(
            "studyos-subjects-updated"
          )
        );

        setDeleteTarget(
          null
        );
      } catch (error) {
        console.error(
          "Failed to delete subject:",
          error
        );
      } finally {
        setDeleting(false);
      }
    };

  return (
    <div className="dashboard">

      {/* HEADER */}

      <header className="dashboard-header">

        <div>

          <h1>
            Subjects 📚
          </h1>

          <p>
            Organize your studies by subject.
          </p>

        </div>

        <button
          className="add-subject-button"
          onClick={openAddForm}
        >
          + Add Subject
        </button>

      </header>

      {/* ADD / EDIT FORM */}

      {showForm && (

        <section className="dashboard-card subject-form-card">

          <div className="card-header">

            <h2>
              {editingSubject
                ? "Edit Subject"
                : "Add New Subject"}
            </h2>

            <button
              type="button"
              onClick={resetForm}
            >
              Cancel
            </button>

          </div>

          <form
            className="subject-form"
            onSubmit={saveSubject}
          >

            <div className="subject-form-row">

              <label>
                Subject name

                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Subject code

                <input
                  type="text"
                  placeholder="e.g. MATH101"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                    )
                  }
                />
              </label>

            </div>

            <label>
              Description

              <textarea
                placeholder="A short description..."
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Subject color

              <input
                type="color"
                value={color}
                onChange={(event) =>
                  setColor(
                    event.target.value
                  )
                }
              />
            </label>

            <button
              type="submit"
              className="save-subject-button"
            >
              {editingSubject
                ? "Save Changes"
                : "Create Subject"}
            </button>

          </form>

        </section>

      )}

      {/* LOADING */}

      {loading ? (

        <div className="dashboard-card">
          <p>
            Loading subjects...
          </p>
        </div>

      ) : subjects.length ===
        0 ? (

        <div className="dashboard-card empty-subjects">

          <h2>
            No subjects yet 📚
          </h2>

          <p>
            Add your first subject to start organizing
            your studies.
          </p>

          <button
            className="add-subject-button"
            onClick={openAddForm}
          >
            + Add Subject
          </button>

        </div>

      ) : (

        <section className="subjects-grid">

          {subjects.map(
            (subject) => (

              <div
                className="subject-card"
                key={
                  subject._id
                }
              >

                <div
                  className="subject-color"
                  style={{
                    backgroundColor:
                      subject.color ||
                      "#6366f1",
                  }}
                />

                <div className="subject-card-content">

                  <div className="subject-card-header">

                    <div>

                      <h2>
                        {subject.name}
                      </h2>

                      {subject.code && (

                        <span className="subject-code">
                          {subject.code}
                        </span>

                      )}

                    </div>

                  </div>

                  <p className="subject-description">

                    {subject.description ||
                      "No description added yet."}

                  </p>

                  <div className="subject-card-actions">

                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(
                          subject
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      onClick={() =>
                        openDeleteConfirmation(
                          subject
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </div>

            )
          )}

        </section>

      )}

      {/* DELETE CONFIRMATION */}

      {deleteTarget && (

        <div
          className="delete-modal-overlay"
          onClick={
            closeDeleteConfirmation
          }
          role="presentation"
        >

          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              🗑️
            </div>

            <div className="delete-modal-content">

              <h2>
                Delete Subject?
              </h2>

              <p>
                Are you sure you want to delete{" "}
                <strong>
                  {deleteTarget.name}
                </strong>
                ?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-cancel-button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={
                  deleting
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={
                  confirmDeleteSubject
                }
                disabled={
                  deleting
                }
              >
                {deleting
                  ? "Deleting..."
                  : "Yes, Delete"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Subjects;