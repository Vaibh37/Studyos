import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileText,
  HardDrive,
  ListChecks,
  LogOut,
  Moon,
  Cloud,
  Palette,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  Sun,
  Target,
  Timer,
  Trash2,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import apiRequest, {
  API_URL,
} from "../services/api";

import {
  createLocalId,
  localDb,
} from "../services/localDb";

import {
  createCalendarEvent,
  getCalendarEvents,
} from "../services/calendarData";

import {
  createStudySession,
  getStudySessions,
} from "../services/studySessionData";

const PREFERENCE_KEYS = [
  "studyos_name",
  "studyos_theme",
  "studyos_study_goal",
  "studyos_priority",
  "studyos_study_reminders",
  "studyos_deadline_reminders",
  "studyos_focus_duration",
  "studyos_startup_page",
];

function Settings() {
  // =========================
  // ACCOUNT / AUTH
  // =========================

  const {
    firebaseUser,
    isAuthenticated,
    isGuest,
    logout,
  } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);

  // =========================
  // PROFILE
  // =========================

  const [name, setName] = useState(
    localStorage.getItem("studyos_name") || ""
  );

  // =========================
  // APPEARANCE
  // =========================

  const [theme, setTheme] = useState(
    localStorage.getItem("studyos_theme") || "dark"
  );

  // =========================
  // REAL APP PREFERENCES
  // =========================

  const [dailyGoalHours, setDailyGoalHours] = useState(() => {
    const stored = Number(localStorage.getItem("studyos_study_goal"));
    return Number.isFinite(stored) && stored > 0 ? stored : 2;
  });

  const [focusDuration, setFocusDuration] = useState(() => {
    const stored = Number(localStorage.getItem("studyos_focus_duration"));
    return Number.isFinite(stored) && stored >= 1 && stored <= 720
      ? Math.round(stored)
      : 50;
  });

  const validStartupPages = [
    "dashboard",
    "tasks",
    "subjects",
    "notes",
    "calendar",
    "focus",
    "progress",
    "settings",
  ];

  const [startupPage, setStartupPage] = useState(() => {
    const stored = localStorage.getItem("studyos_startup_page");
    return validStartupPages.includes(stored) ? stored : "dashboard";
  });

  // =========================
  // STATUS
  // =========================

  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [backendStatus, setBackendStatus] =
    useState("checking");

  const [checkingStatus, setCheckingStatus] =
    useState(false);

  const [dataCounts, setDataCounts] = useState({
    tasks: 0,
    subjects: 0,
    notes: 0,
    events: 0,
    sessions: 0,
  });

  // =========================
  // NOTIFICATIONS
  // =========================

  const getNotificationStatus = () => {
    if (!("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  };

  const [notificationStatus, setNotificationStatus] =
    useState(getNotificationStatus());

  // =========================
  // BACKUP / IMPORT
  // =========================

  const fileInputRef = useRef(null);

  const [exporting, setExporting] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [pendingBackup, setPendingBackup] =
    useState(null);

  const [showImportModal, setShowImportModal] =
    useState(false);

  // =========================
  // RESET PREFERENCES
  // =========================

  const [showResetModal, setShowResetModal] =
    useState(false);

  // =========================
  // DELETE ALL DATA
  // =========================

  const [showDeleteAllModal, setShowDeleteAllModal] =
    useState(false);

  const [deleteText, setDeleteText] =
    useState("");

  const [deletingAll, setDeletingAll] =
    useState(false);

  // =========================
  // SETTINGS UI
  // =========================

  const [activeSection, setActiveSection] = useState("account");

  // =========================
  // HELPERS
  // =========================

  const showSuccessMessage = (text) => {
    setError("");
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const showErrorMessage = (text) => {
    setMessage("");
    setError(text);
  };

  // =========================
  // ACCOUNT HELPERS
  // =========================

  const getAuthProviderLabel = () => {
    const providerId = firebaseUser?.providerData?.[0]?.providerId;

    if (providerId === "google.com") {
      return "Google";
    }

    if (providerId === "twitter.com") {
      return "X";
    }

    if (providerId === "password") {
      return "Email & Password";
    }

    return isAuthenticated ? "Firebase" : "Guest";
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      setError("");
      setMessage("");

      await logout();
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
      showErrorMessage("Couldn't sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const accountName = firebaseUser?.displayName?.trim();
    const existingName = localStorage.getItem("studyos_name");

    if (accountName && !existingName) {
      localStorage.setItem("studyos_name", accountName);
      setName(accountName);

      window.dispatchEvent(
        new Event("studyos-name-updated")
      );
    }
  }, [firebaseUser]);

  // =========================
  // THEME
  // =========================

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add(
        "light-theme"
      );
    } else {
      document.body.classList.remove(
        "light-theme"
      );
    }
  }, [theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);

    localStorage.setItem(
      "studyos_theme",
      newTheme
    );

    window.dispatchEvent(
      new Event("studyos-theme-updated")
    );

    showSuccessMessage(
      `Switched to ${newTheme} theme`
    );
  };

  // =========================
  // SAVE PROFILE
  // =========================

  const saveProfile = (event) => {
    event.preventDefault();

    const cleanName = name.trim();

    localStorage.setItem(
      "studyos_name",
      cleanName
    );

    setName(cleanName);

    window.dispatchEvent(
      new Event("studyos-name-updated")
    );

    setSaved(true);

    showSuccessMessage(
      "Profile saved successfully"
    );

    window.setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  // =========================
  // STARTUP PAGE
  // =========================

  const changeStartupPage = (page) => {
    if (!validStartupPages.includes(page)) {
      return;
    }

    setStartupPage(page);
    localStorage.setItem("studyos_startup_page", page);

    window.dispatchEvent(
      new Event("studyos-preferences-updated")
    );

    showSuccessMessage("Startup page saved");
  };

  // =========================
  // FOCUS / STUDY PREFERENCES
  // =========================

  const saveStudyPreferences = (event) => {
    event.preventDefault();

    const goal = Number(dailyGoalHours);
    const duration = Number(focusDuration);

    if (!Number.isFinite(goal) || goal < 0.25 || goal > 24) {
      showErrorMessage(
        "Daily study goal must be between 0.25 and 24 hours."
      );
      return;
    }

    if (
      !Number.isFinite(duration) ||
      duration < 1 ||
      duration > 720
    ) {
      showErrorMessage(
        "Default Focus duration must be between 1 and 720 minutes."
      );
      return;
    }

    const cleanGoal = Math.round(goal * 100) / 100;
    const cleanDuration = Math.round(duration);

    setDailyGoalHours(cleanGoal);
    setFocusDuration(cleanDuration);

    localStorage.setItem("studyos_study_goal", String(cleanGoal));
    localStorage.setItem(
      "studyos_focus_duration",
      String(cleanDuration)
    );

    window.dispatchEvent(
      new Event("studyos-focus-settings-updated")
    );

    window.dispatchEvent(
      new Event("studyos-preferences-updated")
    );

    showSuccessMessage("Study preferences saved");
  };

  // =========================
  // STORAGE HELPERS
  // =========================

  const getTasksData =
    async () => {
      if (isGuest) {
        return localDb.getAll(
          "tasks"
        );
      }

      return apiRequest(
        "/api/tasks"
      );
    };

  const getSubjectsData =
    async () => {
      if (isGuest) {
        return localDb.getAll(
          "subjects"
        );
      }

      return apiRequest(
        "/api/subjects"
      );
    };

  const getNotesData =
    async () => {
      if (isGuest) {
        return localDb.getAll(
          "notes"
        );
      }

      return apiRequest(
        "/api/notes"
      );
    };

  const getEventsData =
    async () => {
      return getCalendarEvents(
        isGuest
      );
    };

  const getSessionsData =
    async () => {
      return getStudySessions(
        isGuest
      );
    };

  const getAllStudyData =
    async () => {
      const [
        tasks,
        subjects,
        notes,
        events,
        studySessions,
      ] = await Promise.all([
        getTasksData(),
        getSubjectsData(),
        getNotesData(),
        getEventsData(),
        getSessionsData(),
      ]);

      return {
        tasks:
          Array.isArray(tasks)
            ? tasks
            : [],

        subjects:
          Array.isArray(subjects)
            ? subjects
            : [],

        notes:
          Array.isArray(notes)
            ? notes
            : [],

        events:
          Array.isArray(events)
            ? events
            : [],

        studySessions:
          Array.isArray(
            studySessions
          )
            ? studySessions
            : [],
      };
    };

  const dispatchStudyDataUpdated =
    () => {
      [
        "studyos-tasks-updated",
        "studyos-subjects-updated",
        "studyos-notes-updated",
        "studyos-events-updated",
        "studyos-sessions-updated",
      ].forEach(
        (eventName) => {
          window.dispatchEvent(
            new Event(
              eventName
            )
          );
        }
      );
    };

  // =========================
  // SYSTEM STATUS
  // =========================

  const refreshSystemStatus = async (
    showMessage = false
  ) => {
    try {
      setCheckingStatus(true);

      const healthResponse = await fetch(
        `${API_URL}/api/health`
      );

      if (!healthResponse.ok) {
        throw new Error(
          "Backend health check failed"
        );
      }

      setBackendStatus("online");

      const {
        tasks,
        subjects,
        notes,
        events,
        studySessions,
      } =
        await getAllStudyData();

      setDataCounts({
        tasks:
          tasks.length,

        subjects:
          subjects.length,

        notes:
          notes.length,

        events:
          events.length,

        sessions:
          studySessions.length,
      });

      if (showMessage) {
        showSuccessMessage(
          "System status refreshed"
        );
      }
    } catch (statusError) {
      console.error(
        "System status error:",
        statusError
      );

      setBackendStatus("offline");

      if (showMessage) {
        showErrorMessage(
          "StudyOS backend appears to be offline."
        );
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    refreshSystemStatus(false);
  }, [isGuest]);

  // =========================
  // BROWSER NOTIFICATION PERMISSION
  // =========================

  const requestNotificationPermission =
    async () => {
      if (!("Notification" in window)) {
        setNotificationStatus(
          "unsupported"
        );

        showErrorMessage(
          "This browser does not support notifications."
        );

        return;
      }

      try {
        const permission =
          await Notification.requestPermission();

        setNotificationStatus(permission);

        if (permission === "granted") {
          showSuccessMessage(
            "Browser notifications enabled"
          );
        } else if (
          permission === "denied"
        ) {
          showErrorMessage(
            "Notification permission was denied. You can change it from your browser site settings."
          );
        }
      } catch (notificationError) {
        console.error(
          notificationError
        );

        showErrorMessage(
          "Couldn't request notification permission."
        );
      }
    };

  // =========================
  // TEST NOTIFICATION
  // =========================

  const testNotification = () => {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      showErrorMessage(
        "Enable browser notifications first."
      );

      return;
    }

    try {
      new Notification("StudyOS 🎓", {
        body:
          "Notifications are working correctly.",
      });

      showSuccessMessage(
        "Test notification sent"
      );
    } catch (notificationError) {
      console.error(
        notificationError
      );

      showErrorMessage(
        "Couldn't send the test notification."
      );
    }
  };

  // =========================
  // EXPORT BACKUP
  // =========================

  const exportBackup = async () => {
    try {
      setExporting(true);
      setError("");
      setMessage("");

      const {
        tasks,
        subjects,
        notes,
        events,
        studySessions,
      } =
        await getAllStudyData();

      const preferences = {};

      PREFERENCE_KEYS.forEach(
        (key) => {
          const value =
            localStorage.getItem(key);

          if (value !== null) {
            preferences[key] = value;
          }
        }
      );

      const backup = {
        app: "StudyOS",

        version: 1,

        exportedAt:
          new Date().toISOString(),

        preferences,

        data: {
          tasks,
          subjects,
          notes,
          events,
          studySessions,
        },
      };

      const blob = new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          ),
        ],
        {
          type: "application/json",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      link.href = url;

      link.download =
        `studyos-backup-${date}.json`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);

      showSuccessMessage(
        "StudyOS backup exported"
      );
    } catch (backupError) {
      console.error(
        "Backup export failed:",
        backupError
      );

      showErrorMessage(
        "Couldn't export your StudyOS backup."
      );
    } finally {
      setExporting(false);
    }
  };

  // =========================
  // CHOOSE IMPORT FILE
  // =========================

  const chooseBackupFile = () => {
    fileInputRef.current?.click();
  };

  // =========================
  // READ IMPORT FILE
  // =========================

  const handleBackupFile = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();

      const backup =
        JSON.parse(text);

      if (
        backup?.app !== "StudyOS" ||
        !backup?.data
      ) {
        throw new Error(
          "This is not a valid StudyOS backup."
        );
      }

      setPendingBackup(backup);

      setShowImportModal(true);

      setError("");
      setMessage("");
    } catch (fileError) {
      console.error(
        "Backup read error:",
        fileError
      );

      showErrorMessage(
        fileError.message ||
          "Invalid backup file."
      );
    }
  };

  // =========================
  // IMPORT BACKUP
  // =========================

  const importBackup = async () => {
    if (!pendingBackup) {
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const {
        tasks = [],
        subjects = [],
        notes = [],
        events = [],
        studySessions = [],
      } =
        pendingBackup.data;

      const subjectIdMap =
        new Map();

      // -------------------------
      // SUBJECTS
      // -------------------------

      for (
        const subject
        of subjects
      ) {
        const subjectData = {
          name:
            subject.name ||
            "Untitled Subject",

          code:
            subject.code ||
            "",

          description:
            subject.description ||
            "",

          color:
            subject.color ||
            "#6366f1",
        };

        let createdSubject;

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          createdSubject = {
            _id:
              createLocalId(),

            ...subjectData,

            createdAt:
              now,

            updatedAt:
              now,
          };

          await localDb.put(
            "subjects",
            createdSubject
          );
        } else {
          createdSubject =
            await apiRequest(
              "/api/subjects",
              {
                method:
                  "POST",

                body:
                  JSON.stringify(
                    subjectData
                  ),
              }
            );
        }

        if (
          subject?._id &&
          createdSubject?._id
        ) {
          subjectIdMap.set(
            String(
              subject._id
            ),
            createdSubject._id
          );
        }
      }

      // -------------------------
      // NOTES
      // -------------------------

      for (
        const note
        of notes
      ) {
        const noteData = {
          title:
            note.title ||
            "Untitled Note",

          content:
            note.content ||
            "",
        };

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          await localDb.put(
            "notes",
            {
              _id:
                createLocalId(),

              ...noteData,

              createdAt:
                now,

              updatedAt:
                now,
            }
          );
        } else {
          await apiRequest(
            "/api/notes",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  noteData
                ),
            }
          );
        }
      }

      // -------------------------
      // EVENTS
      // -------------------------

      for (
        const calendarEvent
        of events
      ) {
        await createCalendarEvent(
          isGuest,
          {
            title:
              calendarEvent.title ||
              "Untitled Event",

            date:
              calendarEvent.date,

            type:
              calendarEvent.type ||
              "other",
          }
        );
      }

      // -------------------------
      // TASKS
      // -------------------------

      for (
        const task
        of tasks
      ) {
        const title =
          task.title ||
          "Untitled Task";

        if (isGuest) {
          const now =
            new Date()
              .toISOString();

          await localDb.put(
            "tasks",
            {
              _id:
                createLocalId(),

              title,

              completed:
                Boolean(
                  task.completed
                ),

              completedAt:
                task.completed
                  ? task.completedAt ||
                    now
                  : null,

              createdAt:
                now,

              updatedAt:
                now,
            }
          );
        } else {
          const createdTask =
            await apiRequest(
              "/api/tasks",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    title,
                  }),
              }
            );

          if (task.completed) {
            await apiRequest(
              `/api/tasks/${createdTask._id}`,
              {
                method:
                  "PATCH",

                body:
                  JSON.stringify({
                    completed:
                      true,
                  }),
              }
            );
          }
        }
      }

      // -------------------------
      // STUDY SESSIONS
      // -------------------------

      for (
        const session
        of studySessions
      ) {
        const mappedSubjectId =
          session.subjectId
            ? subjectIdMap.get(
                String(
                  session.subjectId
                )
              ) ||
              null
            : null;

        await createStudySession(
          isGuest,
          {
            subjectId:
              mappedSubjectId,

            subjectName:
              session.subjectName ||
              "General Study",

            plannedMinutes:
              Number(
                session.plannedMinutes
              ) ||
              1,

            durationSeconds:
              Number(
                session.durationSeconds
              ) ||
              1,

            startedAt:
              session.startedAt,

            endedAt:
              session.endedAt,
          }
        );
      }

      // -------------------------
      // PREFERENCES
      // -------------------------

      if (
        pendingBackup.preferences &&
        typeof pendingBackup
          .preferences ===
          "object"
      ) {
        Object.entries(
          pendingBackup.preferences
        ).forEach(
          ([key, value]) => {
            if (
              PREFERENCE_KEYS.includes(
                key
              )
            ) {
              localStorage.setItem(
                key,
                String(value)
              );
            }
          }
        );

        const importedName =
          localStorage.getItem(
            "studyos_name"
          ) || "";

        const importedTheme =
          localStorage.getItem(
            "studyos_theme"
          ) || "dark";

        setName(
          importedName
        );

        setTheme(
          importedTheme
        );

        const importedGoal =
          Number(
            localStorage.getItem(
              "studyos_study_goal"
            )
          );

        setDailyGoalHours(
          Number.isFinite(
            importedGoal
          ) &&
          importedGoal > 0
            ? importedGoal
            : 2
        );

        const importedFocusDuration =
          Number(
            localStorage.getItem(
              "studyos_focus_duration"
            )
          );

        setFocusDuration(
          Number.isFinite(
            importedFocusDuration
          ) &&
          importedFocusDuration >=
            1 &&
          importedFocusDuration <=
            720
            ? Math.round(
                importedFocusDuration
              )
            : 50
        );

        const importedStartup =
          localStorage.getItem(
            "studyos_startup_page"
          );

        setStartupPage(
          validStartupPages.includes(
            importedStartup
          )
            ? importedStartup
            : "dashboard"
        );

        window.dispatchEvent(
          new Event(
            "studyos-name-updated"
          )
        );

        window.dispatchEvent(
          new Event(
            "studyos-theme-updated"
          )
        );

        window.dispatchEvent(
          new Event(
            "studyos-focus-settings-updated"
          )
        );

        window.dispatchEvent(
          new Event(
            "studyos-preferences-updated"
          )
        );
      }

      dispatchStudyDataUpdated();

      setShowImportModal(
        false
      );

      setPendingBackup(
        null
      );

      await refreshSystemStatus(
        false
      );

      showSuccessMessage(
        "Backup imported successfully"
      );
    } catch (importError) {
      console.error(
        "Import failed:",
        importError
      );

      showErrorMessage(
        importError.message ||
          "Backup import failed."
      );
    } finally {
      setImporting(false);
    }
  };

  // =========================
  // COPY DIAGNOSTICS
  // =========================

  const copyDiagnostics = async () => {
    const diagnostics = {
      app: "StudyOS",

      mode:
        isGuest
          ? "guest"
          : "account",

      timestamp:
        new Date().toISOString(),

      backend:
        backendStatus,

      api:
        API_URL,

      notificationPermission:
        notificationStatus,

      theme,

      preferences: {
        dailyGoalHours,
        focusDuration,
        startupPage,
      },

      data: dataCounts,

      browser:
        navigator.userAgent,
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          diagnostics,
          null,
          2
        )
      );

      showSuccessMessage(
        "Diagnostics copied"
      );
    } catch (clipboardError) {
      console.error(
        clipboardError
      );

      showErrorMessage(
        "Couldn't copy diagnostics."
      );
    }
  };

  // =========================
  // RESET PREFERENCES
  // =========================

  const resetPreferences = () => {
    PREFERENCE_KEYS.forEach(
      (key) => {
        localStorage.removeItem(key);
      }
    );

    setName("");
    setTheme("dark");
    setDailyGoalHours(2);
    setFocusDuration(50);
    setStartupPage("dashboard");

    document.body.classList.remove(
      "light-theme"
    );

    window.dispatchEvent(
      new Event(
        "studyos-name-updated"
      )
    );

    window.dispatchEvent(
      new Event(
        "studyos-theme-updated"
      )
    );

    window.dispatchEvent(
      new Event("studyos-focus-settings-updated")
    );

    window.dispatchEvent(
      new Event("studyos-preferences-updated")
    );

    setShowResetModal(false);

    showSuccessMessage(
      "Preferences reset"
    );
  };

  // =========================
  // DELETE COLLECTION
  // =========================

  const deleteCollection =
    async (
      endpoint,
      storeName
    ) => {
      if (isGuest) {
        await localDb.clear(
          storeName
        );

        return;
      }

      if (
        endpoint ===
        "study-sessions"
      ) {
        await apiRequest(
          "/api/study-sessions",
          {
            method:
              "DELETE",
          }
        );

        return;
      }

      const items =
        await apiRequest(
          `/api/${endpoint}`
        );

      if (
        !Array.isArray(
          items
        )
      ) {
        return;
      }

      for (
        const item
        of items
      ) {
        await apiRequest(
          `/api/${endpoint}/${item._id}`,
          {
            method:
              "DELETE",
          }
        );
      }
    };

  // =========================
  // DELETE ALL STUDY DATA
  // =========================

  const deleteAllStudyData =
    async () => {
      if (
        deleteText !==
        "DELETE"
      ) {
        return;
      }

      try {
        setDeletingAll(
          true
        );

        await Promise.all([
          deleteCollection(
            "tasks",
            "tasks"
          ),

          deleteCollection(
            "subjects",
            "subjects"
          ),

          deleteCollection(
            "notes",
            "notes"
          ),

          deleteCollection(
            "events",
            "events"
          ),

          deleteCollection(
            "study-sessions",
            "studySessions"
          ),
        ]);

        dispatchStudyDataUpdated();

        setShowDeleteAllModal(
          false
        );

        setDeleteText(
          ""
        );

        await refreshSystemStatus(
          false
        );

        showSuccessMessage(
          isGuest
            ? "All guest StudyOS data deleted"
            : "All account StudyOS data deleted"
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Delete all failed:",
          deleteError
        );

        showErrorMessage(
          "Couldn't delete all data. Some records may still remain."
        );
      } finally {
        setDeletingAll(
          false
        );
      }
    };

  // =========================
  // STATUS LABEL
  // =========================

  const getNotificationLabel = () => {
    if (
      notificationStatus ===
      "granted"
    ) {
      return "Enabled";
    }

    if (
      notificationStatus ===
      "denied"
    ) {
      return "Blocked";
    }

    if (
      notificationStatus ===
      "unsupported"
    ) {
      return "Unsupported";
    }

    return "Not enabled";
  };

  // =========================
  // UI
  // =========================

  const totalStoredItems =
    dataCounts.tasks +
    dataCounts.subjects +
    dataCounts.notes +
    dataCounts.events +
    dataCounts.sessions;

  const settingsSections = [
    {
      id: "account",
      label: "Account",
      description: "Identity and sign out",
      icon: BadgeCheck,
    },
    {
      id: "general",
      label: "General",
      description: "Profile and overview",
      icon: UserRound,
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Theme and interface",
      icon: Palette,
    },
    {
      id: "focus",
      label: "Focus & Goals",
      description: "Study targets and timer",
      icon: Target,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Browser alerts",
      icon: Bell,
    },
    {
      id: "data",
      label: "Data & Backup",
      description: "Storage and restore",
      icon: Database,
    },
    {
      id: "system",
      label: "System",
      description: "API and diagnostics",
      icon: Server,
    },
    {
      id: "danger",
      label: "Danger Zone",
      description: "Reset and deletion",
      icon: ShieldAlert,
    },
  ];

  const activeSectionMeta =
    settingsSections.find(
      (section) => section.id === activeSection
    ) || settingsSections[0];

  const ActiveSectionIcon = activeSectionMeta.icon;

  return (
    <div className="dashboard settings-page settings-v2-page">
      <header className="dashboard-header settings-v2-header">
        <div>
          <p className="settings-v2-eyebrow">STUDYOS CONTROL CENTER</p>
          <h1>Settings</h1>
          <p>
            Manage your account, profile, study goals, Focus defaults, browser
            permissions, backups and StudyOS data.
          </p>
        </div>

        <div
          className={`settings-v2-api-pill settings-v2-api-${backendStatus}`}
          title={`API: ${API_URL}`}
        >
          <span className="settings-v2-status-dot" />
          {backendStatus === "checking" && "Checking API"}
          {backendStatus === "online" && "API Online"}
          {backendStatus === "offline" && "API Offline"}
        </div>
      </header>

      {message && (
        <div className="settings-v2-notice settings-v2-notice-success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="settings-v2-notice settings-v2-notice-error">
          <XCircle size={19} />
          <div>
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="settings-v2-shell">
        <aside className="settings-v2-nav" aria-label="Settings sections">
          <div className="settings-v2-nav-heading">
            <span>Settings</span>
            <small>{totalStoredItems} stored items</small>
          </div>

          <div className="settings-v2-nav-list">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={`settings-v2-nav-item ${
                    isActive ? "active" : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="settings-v2-nav-icon">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>

                  <span className="settings-v2-nav-copy">
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="settings-v2-nav-footer">
            <div className="settings-v2-nav-footer-mark">S</div>
            <div>
              <strong>StudyOS</strong>
              <span>Local development build</span>
            </div>
          </div>
        </aside>

        <main className="settings-v2-content">
          <div className="settings-v2-section-heading">
            <div className="settings-v2-section-icon">
              <ActiveSectionIcon size={21} strokeWidth={1.9} />
            </div>
            <div>
              <h2>{activeSectionMeta.label}</h2>
              <p>{activeSectionMeta.description}</p>
            </div>
          </div>

          {activeSection === "account" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>{isAuthenticated ? "Signed-in account" : "Guest session"}</h3>
                    <p>
                      {isAuthenticated
                        ? "Firebase handles your sign-in and your cloud study data is private to this account."
                        : "Guest mode stores study data only in this browser using IndexedDB."}
                    </p>
                  </div>
                  {isAuthenticated ? <Cloud size={21} /> : <UserRound size={21} />}
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>{isAuthenticated ? (firebaseUser?.displayName || "StudyOS user") : "Guest"}</strong>
                    <span>
                      {isAuthenticated
                        ? (firebaseUser?.email || "No email available")
                        : "No account or email is connected to this session."}
                    </span>
                  </div>

                  <div className="settings-v2-row-actions">
                    <span className="settings-v2-status-badge settings-v2-notification-granted">
                      {isAuthenticated ? getAuthProviderLabel() : "Guest"}
                    </span>
                  </div>
                </div>

                {isAuthenticated && (
                  <div className="settings-v2-info-panel">
                    <BadgeCheck size={18} />
                    <div>
                      <strong>Account protection is active</strong>
                      <p>
                        Firebase verifies your sign-in and your MongoDB study data is
                        scoped to this account.
                      </p>
                    </div>
                  </div>
                )}

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>{isAuthenticated ? "Sign out" : "Exit guest mode"}</strong>
                    <span>
                      {isAuthenticated
                        ? "Ends this Firebase session and returns to the StudyOS welcome screen."
                        : "Returns to the welcome screen so you can choose Google, Email, X later, or Guest again."}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-v2-danger-outline"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <LogOut size={16} />
                    {loggingOut
                      ? "Signing out..."
                      : isAuthenticated
                      ? "Sign out"
                      : "Exit guest"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === "general" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Profile</h3>
                    <p>
                      This is the name StudyOS uses on your dashboard greeting.
                    </p>
                  </div>
                  <UserRound size={21} />
                </div>

                <form className="settings-v2-form" onSubmit={saveProfile}>
                  <label className="settings-v2-field">
                    <span>Display name</span>
                    <small>Maximum 50 characters.</small>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      maxLength={50}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>

                  <div className="settings-v2-form-footer">
                    <span className="settings-v2-form-hint">
                      {name.trim()
                        ? `Dashboard greeting: ${name.trim()}`
                        : "No name will be shown in the dashboard greeting."}
                    </span>

                    <button
                      type="submit"
                      className="settings-v2-primary-button"
                    >
                      {saved ? "Saved" : "Save profile"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Startup</h3>
                    <p>Choose which page StudyOS opens to after a fresh reload.</p>
                  </div>
                  <Timer size={21} />
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Startup page</strong>
                    <span>This takes effect the next time StudyOS is opened or reloaded.</span>
                  </div>

                  <div className="settings-v2-row-actions">
                    <select
                      className="settings-v3-select"
                      value={startupPage}
                      onChange={(event) => changeStartupPage(event.target.value)}
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="tasks">Tasks</option>
                      <option value="subjects">Subjects</option>
                      <option value="notes">Notes</option>
                      <option value="calendar">Calendar</option>
                      <option value="focus">Focus</option>
                      <option value="progress">Progress</option>
                      <option value="settings">Settings</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>StudyOS overview</h3>
                    <p>A live snapshot of data currently stored by your app.</p>
                  </div>
                  <HardDrive size={21} />
                </div>

                <div className="settings-v2-stat-grid">
                  <div className="settings-v2-stat-card">
                    <span><ListChecks size={18} /> Tasks</span>
                    <strong>{dataCounts.tasks}</strong>
                  </div>
                  <div className="settings-v2-stat-card">
                    <span><BookOpen size={18} /> Subjects</span>
                    <strong>{dataCounts.subjects}</strong>
                  </div>
                  <div className="settings-v2-stat-card">
                    <span><FileText size={18} /> Notes</span>
                    <strong>{dataCounts.notes}</strong>
                  </div>
                  <div className="settings-v2-stat-card">
                    <span><CalendarDays size={18} /> Events</span>
                    <strong>{dataCounts.events}</strong>
                  </div>
                  <div className="settings-v2-stat-card">
                    <span><Timer size={18} /> Focus sessions</span>
                    <strong>{dataCounts.sessions}</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "appearance" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Theme</h3>
                    <p>Choose the visual theme used across StudyOS.</p>
                  </div>
                  <Palette size={21} />
                </div>

                <div className="settings-v2-theme-grid">
                  <button
                    type="button"
                    className={`settings-v2-theme-card ${
                      theme === "dark" ? "active" : ""
                    }`}
                    onClick={() => changeTheme("dark")}
                    aria-pressed={theme === "dark"}
                  >
                    <div className="settings-v2-theme-preview settings-v2-theme-preview-dark">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="settings-v2-theme-copy">
                      <span className="settings-v2-theme-icon"><Moon size={18} /></span>
                      <div>
                        <strong>Dark</strong>
                        <small>Low-light StudyOS interface</small>
                      </div>
                    </div>
                    {theme === "dark" && <CheckCircle2 size={19} />}
                  </button>

                  <button
                    type="button"
                    className={`settings-v2-theme-card ${
                      theme === "light" ? "active" : ""
                    }`}
                    onClick={() => changeTheme("light")}
                    aria-pressed={theme === "light"}
                  >
                    <div className="settings-v2-theme-preview settings-v2-theme-preview-light">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="settings-v2-theme-copy">
                      <span className="settings-v2-theme-icon"><Sun size={18} /></span>
                      <div>
                        <strong>Light</strong>
                        <small>Bright StudyOS interface</small>
                      </div>
                    </div>
                    {theme === "light" && <CheckCircle2 size={19} />}
                  </button>
                </div>
              </div>

              <div className="settings-v2-info-panel">
                <Palette size={18} />
                <div>
                  <strong>Theme changes save instantly</strong>
                  <p>
                    You do not need to press a separate save button after changing
                    the theme.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeSection === "focus" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Study targets</h3>
                    <p>These values feed directly into Progress and new Focus sessions.</p>
                  </div>
                  <Target size={21} />
                </div>

                <form className="settings-v2-form" onSubmit={saveStudyPreferences}>
                  <label className="settings-v2-field">
                    <span>Daily study goal</span>
                    <small>Used by the Progress daily-goal meter. Example: 2 = two hours.</small>
                    <div className="settings-v3-unit-field">
                      <input
                        type="number"
                        min="0.25"
                        max="24"
                        step="0.25"
                        value={dailyGoalHours}
                        onChange={(event) => setDailyGoalHours(event.target.value)}
                      />
                      <span>hours / day</span>
                    </div>
                  </label>

                  <label className="settings-v2-field">
                    <span>Default Focus duration</span>
                    <small>Used whenever a fresh Focus timer opens with no active session.</small>
                    <div className="settings-v3-unit-field">
                      <input
                        type="number"
                        min="1"
                        max="720"
                        step="1"
                        value={focusDuration}
                        onChange={(event) => setFocusDuration(event.target.value)}
                      />
                      <span>minutes</span>
                    </div>
                  </label>

                  <div className="settings-v2-form-footer">
                    <span className="settings-v2-form-hint">
                      Progress goal: {dailyGoalHours || 0}h · Focus default: {focusDuration || 0}m
                    </span>

                    <button
                      type="submit"
                      className="settings-v2-primary-button"
                    >
                      Save study preferences
                    </button>
                  </div>
                </form>
              </div>

              <div className="settings-v2-info-panel">
                <Timer size={18} />
                <div>
                  <strong>These are real app settings</strong>
                  <p>
                    The daily goal is read by Progress and the Focus duration is read by the Focus timer.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeSection === "notifications" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Browser notifications</h3>
                    <p>
                      StudyOS needs browser permission before it can show desktop
                      notifications.
                    </p>
                  </div>
                  <Bell size={21} />
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Permission</strong>
                    <span>Current browser notification permission.</span>
                  </div>

                  <div className="settings-v2-row-actions">
                    <span
                      className={`settings-v2-status-badge settings-v2-notification-${notificationStatus}`}
                    >
                      {getNotificationLabel()}
                    </span>

                    {notificationStatus !== "granted" &&
                      notificationStatus !== "unsupported" && (
                        <button
                          type="button"
                          className="settings-v2-secondary-button"
                          onClick={requestNotificationPermission}
                        >
                          Enable notifications
                        </button>
                      )}
                  </div>
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Test notification</strong>
                    <span>
                      Send a real desktop notification to verify everything works.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-v2-secondary-button"
                    onClick={testNotification}
                    disabled={notificationStatus !== "granted"}
                  >
                    <Bell size={16} />
                    Send test
                  </button>
                </div>
              </div>

              {notificationStatus === "denied" && (
                <div className="settings-v2-warning-panel">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>Notifications are blocked by the browser</strong>
                    <p>
                      Re-enable permission from your browser's site settings, then
                      come back here and test again.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === "data" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Stored study data</h3>
                    <p>
                      {isGuest
                        ? "Live counts from this browser's guest IndexedDB storage."
                        : "Live counts from your private StudyOS cloud data."}
                    </p>
                  </div>
                  <Database size={21} />
                </div>

                <div className="settings-v2-data-list">
                  <div className="settings-v2-data-item">
                    <ListChecks size={18} />
                    <span>Tasks</span>
                    <strong>{dataCounts.tasks}</strong>
                  </div>
                  <div className="settings-v2-data-item">
                    <BookOpen size={18} />
                    <span>Subjects</span>
                    <strong>{dataCounts.subjects}</strong>
                  </div>
                  <div className="settings-v2-data-item">
                    <FileText size={18} />
                    <span>Notes</span>
                    <strong>{dataCounts.notes}</strong>
                  </div>
                  <div className="settings-v2-data-item">
                    <CalendarDays size={18} />
                    <span>Calendar events</span>
                    <strong>{dataCounts.events}</strong>
                  </div>
                  <div className="settings-v2-data-item">
                    <Timer size={18} />
                    <span>Focus sessions</span>
                    <strong>{dataCounts.sessions}</strong>
                  </div>
                </div>
              </div>

              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>Backup & restore</h3>
                    <p>
                      Keep a portable JSON backup of your StudyOS data and local
                      preferences.
                    </p>
                  </div>
                  <HardDrive size={21} />
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Export StudyOS backup</strong>
                    <span>
                      Downloads tasks, subjects, notes, events, Focus sessions and preferences.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-v2-primary-button"
                    disabled={exporting}
                    onClick={exportBackup}
                  >
                    <Download size={16} />
                    {exporting ? "Exporting..." : "Export backup"}
                  </button>
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Import StudyOS backup</strong>
                    <span>
                      Adds records from a StudyOS JSON backup to your current data.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-v2-secondary-button"
                    disabled={importing}
                    onClick={chooseBackupFile}
                  >
                    <Upload size={16} />
                    Import backup
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBackupFile}
                    className="settings-v2-hidden-input"
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "system" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-panel">
                <div className="settings-v2-panel-header">
                  <div>
                    <h3>StudyOS API</h3>
                    <p>Connection information for your local backend.</p>
                  </div>
                  <Server size={21} />
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Backend status</strong>
                    <span>
                      Health check plus Tasks, Subjects, Notes, Events and Focus endpoints.
                    </span>
                  </div>

                  <div className="settings-v2-row-actions">
                    <span
                      className={`settings-v2-status-badge settings-v2-backend-${backendStatus}`}
                    >
                      <span className="settings-v2-status-dot" />
                      {backendStatus === "checking" && "Checking"}
                      {backendStatus === "online" && "Online"}
                      {backendStatus === "offline" && "Offline"}
                    </span>

                    <button
                      type="button"
                      className="settings-v2-secondary-button"
                      disabled={checkingStatus}
                      onClick={() => refreshSystemStatus(true)}
                    >
                      <RefreshCw
                        size={16}
                        className={checkingStatus ? "settings-v2-spin" : ""}
                      />
                      {checkingStatus ? "Checking..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>API address</strong>
                    <span className="settings-v2-mono">{API_URL}</span>
                  </div>
                </div>

                <div className="settings-v2-row">
                  <div className="settings-v2-row-copy">
                    <strong>Diagnostics</strong>
                    <span>
                      Copy current API, browser, theme and data-count information.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settings-v2-secondary-button"
                    onClick={copyDiagnostics}
                  >
                    <Copy size={16} />
                    Copy diagnostics
                  </button>
                </div>
              </div>

              <div className="settings-v2-info-panel">
                <Server size={18} />
                <div>
                  <strong>Development environment</strong>
                  <p>
                    This build currently talks directly to your local Express API at
                    {` ${API_URL}`}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeSection === "danger" && (
            <section className="settings-v2-section-stack">
              <div className="settings-v2-danger-panel">
                <div className="settings-v2-danger-copy">
                  <div className="settings-v2-danger-icon">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3>Reset local preferences</h3>
                    <p>
                      Clears your display name, theme and StudyOS preferences from
                      this browser. MongoDB study data remains untouched.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="settings-v2-danger-outline"
                  onClick={() => setShowResetModal(true)}
                >
                  Reset preferences
                </button>
              </div>

              <div className="settings-v2-danger-panel settings-v2-danger-panel-critical">
                <div className="settings-v2-danger-copy">
                  <div className="settings-v2-danger-icon">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3>Delete all StudyOS data</h3>
                    <p>
                      {isGuest
                        ? "Permanently deletes all guest tasks, subjects, notes, calendar events and Focus sessions from this browser. This cannot be undone."
                        : "Permanently deletes all tasks, subjects, notes, calendar events and Focus sessions belonging to this account. This cannot be undone."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="settings-v2-danger-solid"
                  onClick={() => {
                    setDeleteText("");
                    setShowDeleteAllModal(true);
                  }}
                >
                  <Trash2 size={16} />
                  Delete everything
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {showImportModal && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!importing) {
              setShowImportModal(false);
            }
          }}
        >
          <div
            className="settings-v2-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-v2-modal-icon settings-v2-modal-icon-neutral">
              <Upload size={22} />
            </div>

            <h2>Import StudyOS backup?</h2>
            <p>
              Imported items will be added to your current StudyOS data. Existing
              items are not automatically removed, so importing the same backup more
              than once can create duplicates.
            </p>

            <div className="settings-v2-modal-actions">
              <button
                type="button"
                className="settings-v2-secondary-button"
                disabled={importing}
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="settings-v2-primary-button"
                disabled={importing}
                onClick={importBackup}
              >
                <Upload size={16} />
                {importing ? "Importing..." : "Import backup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div
          className="delete-modal-overlay"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="settings-v2-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-v2-modal-icon settings-v2-modal-icon-warning">
              <RotateCcw size={22} />
            </div>

            <h2>Reset preferences?</h2>
            <p>
              Your display name, theme and local StudyOS preferences will return to
              their defaults. Tasks, subjects, notes and events stay safe.
            </p>

            <div className="settings-v2-modal-actions">
              <button
                type="button"
                className="settings-v2-secondary-button"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="settings-v2-danger-outline"
                onClick={resetPreferences}
              >
                Reset preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!deletingAll) {
              setShowDeleteAllModal(false);
            }
          }}
        >
          <div
            className="settings-v2-modal settings-v2-modal-danger"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-v2-modal-icon settings-v2-modal-icon-danger">
              <ShieldAlert size={22} />
            </div>

            <h2>Delete all StudyOS data?</h2>
            <p>
              This permanently deletes every task, subject, note, calendar event and Focus session
              currently stored by StudyOS.
            </p>

            <label className="settings-v2-delete-field">
              <span>
                Type <strong>DELETE</strong> to confirm
              </span>
              <input
                type="text"
                value={deleteText}
                disabled={deletingAll}
                placeholder="DELETE"
                autoComplete="off"
                onChange={(event) => setDeleteText(event.target.value)}
              />
            </label>

            <div className="settings-v2-modal-actions">
              <button
                type="button"
                className="settings-v2-secondary-button"
                disabled={deletingAll}
                onClick={() => setShowDeleteAllModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="settings-v2-danger-solid"
                disabled={deleteText !== "DELETE" || deletingAll}
                onClick={deleteAllStudyData}
              >
                <Trash2 size={16} />
                {deletingAll ? "Deleting..." : "Delete all data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
