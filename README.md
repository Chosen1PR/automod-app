## Features

This tool allows moderators to edit their AutoModerator configuration directly from the Reddit app on iOS or Android. It also adds a convenient desktop shortcut for quick edits. However, due to form size limitations, the Mod Tools page remains the best option for viewing larger portions of Automod code at once.

It respects existing moderator permissions, meaning only mods with explicit access to edit Automod can make changes.

It also includes a built-in **Syntax Checker** powered by a YAML parser, which identifies the exact line causing an error if the configuration fails to save.

### General Usage Instructions

1. Install the app on your subreddit using the "Add to community" button above. If you do not see this button, make sure you are logged in to developers.reddit.com and moderate at least one subreddit.
2. Visit your subreddit using the Reddit mobile app or mobile site (*not* old.reddit).
3. Tap the three dots (...) in the upper right corner of the screen.
4. Select Automod.
5. Tap the appropriate text field and make your changes.
6. Provide a reason for editing. This reason must be under 200 characters long.
7. Submit your changes.

That's it!

---

## Changelog

### [1.1.1] (2026-05-25)

#### Bug Fixes

Fixed two issues relating to incorrectly displayed error messages by the syntax validator.

- App now correctly recognizes negative karma values as valid.
- App now correctly recognizes top-level action fields like `comment` and `message`.

### [1.1.0] (2026-05-24)

#### Features

This update is a doozy! It features a brand new **Syntax Checker** powered by a YAML parser, which identifies the exact line causing an error if the configuration fails to save.

Additionally, you no longer have to start over from scratch in these cases. After errors, you can simply reload your unsaved changes and pick up right where you left off.

### [1.0.6] (2026-05-18)

#### Features

- App icon now appears as app account's avatar.
- Updated description on app profile page.
- Updated Devvit CLI to 0.12.24.

### [1.0.5] (2026-02-19)

- Fixed a typo and updated the Devvit version to 0.12.13.

### [1.0.3] (2026-01-09)

#### Features

- Added setting to replace smart quotes (‘’/“”) with standard quotes ('/") to avoid formatting errors.
- Added setting to replace sequences of an em-dash followed by a hyphen (—-) with three hyphens (---) to avoid formating errors.
- New app icon.

### [1.0.2] (2025-12-24)

#### Features

- Updated Devvit version to 0.12.7. No functional changes to the app.

### [1.0.0] Initial version (2025-12-20)

#### Features

- Edit your AutoModerator config directly from the Reddit mobile app via a menu item on your subreddit.
- Accessible via mobile or desktop.
- Easily see which mod made changes to Automod in the mod log.
- Allow only authorized mods to make changes to Automod.

#### Bug Fixes

None yet (initial version). Please send a private message to the developer (u/Chosen1PR) to report bugs.