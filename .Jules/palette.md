## 2024-06-05 - Added Missing Lang Attribute and Viewport Meta Tags
**Learning:** HTML responses didn't include `<html lang="en">` and viewport meta tags which resulted in missing language support for screen-readers and poorly scaled mobile views. Adding them is crucial for accessibility and basic UX on mobile devices.
**Action:** Remember to explicitly add these basic accessibility layout tags to any raw string-rendered HTML pages, since frameworks don't automatically provide them when returning raw templates.
