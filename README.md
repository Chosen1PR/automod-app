## Features

This app allows moderators to edit their AutoModerator config from the Reddit app for iOS or Android. It also creates a more convenient shortcut on desktop for quick editing, but the page in Mod Tools is still the best place to be able to see more of your Automod code at once.

This app also respects mod permissions, so mods who are not explicitly allowed to edit Automod according to their mod permissions will not be able to edit Automod using this app either.

### General Usage Instructions

1. Install the app on your subreddit using the "Add to community" button.
2. Visit your subreddit using the Reddit mobile app.
3. Tap the three dots (...) in the upper right hand corner of the screen.
4. Select Automod.
5. Make your changes.
6. Provide a reason for editing. This reason must be under 200 characters long.
7. Submit your changes.

That's it! Due to developer platform limitations, this app is not able to provide detailed error messages if your Automod code is incorrect. Please ensure that your YAML code is free of any syntax errors and your edit reason is under 200 characters before submitting.

---

## Changelog

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