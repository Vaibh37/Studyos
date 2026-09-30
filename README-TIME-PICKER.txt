StudyOS due-time picker fix

Replaces the native browser <input type="time"> in AddTask with a StudyOS-native picker.

Files:
- client/src/components/StudyTimePicker.jsx
- client/src/components/StudyTimePicker.css
- client/src/components/AddTask.jsx
- client/src/pages/Tasks.composer.css

Features:
- exact hour + minute entry
- AM / PM selection
- Now shortcut
- Clear shortcut
- portal positioning
- light / dark styling
- disabled state until a due date exists
- stores the existing HH:mm format, so backend/task data stays compatible

Apply over the repo root and restart Vite.
