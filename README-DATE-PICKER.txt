StudyOS date picker fix

Root cause:
StudyDatePicker used a portal but its structural layout/positioning CSS was not owned by the component.
After route lazy-loading, the calendar could render without fixed positioning/grid styles.

Files:
- client/src/components/StudyDatePicker.jsx
- client/src/components/StudyDatePicker.css

This keeps existing date selection behavior and adds self-contained portal styling.
