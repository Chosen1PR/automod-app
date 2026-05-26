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

*Note: **Very large** automod configs **may** break the app. This is a Devvit limitation; too much data sent over the app is rejected at the server level. It is quite rare for a subreddit to have a large enough config to break the app, but it **may** happen for Reddit's largest communities, or those that require a very large amount of automation.*

*Also, in **some** cases, you **may** see an inaccurate error message. The validation logic in this app is based on the [official documentation for AutoModerator](https://www.reddit.com/r/reddit.com/wiki/automoderator/full-documentation/). Automod has some idiosyncrasies and quirks that are not well documented, so in some cases, the config may fail to save for a different reason than what the app says. If your YAML is 100% valid, the config **should** still save correctly.*

---

## Changelog

### [1.1.5] (2026-05-26)

#### Bug Fixes

Fixed an issue where `author` was only recognized as a sub-group and not a search field.

### [1.1.3] (2026-05-25)

#### Bug Fixes

Fixed three issues relating to incorrectly displayed error messages by the syntax checker. The app now correctly recognizes:

- negative karma values.
- top-level action fields like `comment` and `message`.
- custom suffixes added to search fields.

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