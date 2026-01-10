import express from "express";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  settings
} from "@devvit/web/server";

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Menu item for editing automod
router.post("/internal/menu/edit-automod", async (_req, res) => {
  // First, check if mod has permission to edit Automod.
  const mod = (await reddit.getUserById(context.userId!))!;
  let hasConfigPermission = false;
  let hasWikiPermission = false;
  let hasAllPermissions = false;
  const permissions = await mod.getModPermissionsForSubreddit(context.subredditName);
  const permissionErrorMessage = "You do not have permission to edit Automod.";
  if (permissions) {
    for (let i = 0; i < permissions.length; i++) {
      if (permissions[i] == "all") {
        hasAllPermissions = true;
        break;
      }
      else if (permissions[i] == "config") {
        hasConfigPermission = true;
        if (hasWikiPermission) break;
      }
      else if (permissions[i] == "wiki") {
        hasWikiPermission = true;
        if (hasConfigPermission) break;
      }
    }
    const hasIndividualPermissions = (hasConfigPermission && hasWikiPermission);
    if (!(hasAllPermissions || hasIndividualPermissions)) {
      res.json({
        showToast: permissionErrorMessage
      });
      return;
    }
  }
  else {
    res.json({
      showToast: permissionErrorMessage
    });
    return;
  }
  // If we got here, we have the necessary permissions.
  // Get the current Automod config.
  const wikiPage = await reddit.getWikiPage(context.subredditName, 'config/automoderator');
  let automodConfig = "";
  try {
    automodConfig = wikiPage.content ?? "";
  }
  catch (error) {
    automodConfig = "";
  }
  res.json({
    showForm: {
      name: 'editAutomodForm',
      form: {
        title: 'Configure Automod',
        fields: [
          {
            type: 'paragraph',
            name: 'automodConfig',
            label: 'Automod Config',
            lineHeight: 15,
            defaultValue: automodConfig,
            required: true
          },
          {
            type: 'string',
            name: 'editReason',
            label: 'Edit Reason',
            helpText: '200 character limit',
            required: true
          }
        ],
      },
      acceptLabel: 'Submit',
      cancelLabel: 'Cancel',
      data: {
        automodConfig: automodConfig
      }
    }
  });
});

// Form submission handler for Automod
router.post("/internal/forms/edit-automod-submit", async (req, res) => {
  // Get input values
  var automodConfig = req.body.automodConfig as string ?? "";
  var editReason = req.body.editReason as string ?? "";
  // Check length of edit reason
  if (editReason.length > 200) {
    res.json({
      showToast: "Error: Edit reason is too long."
    });
    return;
  }
  // Append username to edit reason
  editReason += ` | Edited by u/${context.username!}`;
  // Apply text replacements based on settings
  const allSettings = await settings.getAll();
  const replaceQuotesSetting = allSettings['replace-quotes'] as boolean ?? false;
  const replaceEmDashSetting = allSettings['replace-em-dash'] as boolean ?? false;
  if (replaceQuotesSetting) {
    automodConfig = replaceSmartQuotes(automodConfig);
  }
  if (replaceEmDashSetting) {
    automodConfig = replaceEmDashHyphen(automodConfig);
  }
  // Update the wiki page
  const defaultErrorMessage = "Error: Please check for mistakes in your config and try again.";
  try {
    const wikiPage = await reddit.updateWikiPage({
      subredditName: context.subredditName,
      page: 'config/automoderator',
      content: automodConfig,
      reason: editReason,
    });
    if (wikiPage) {
      res.json({
        showToast: "Automod updated successfully."
      });
      return;
    }
    else {
      res.json({
        showToast: defaultErrorMessage
      });
    }
  }
  catch (err) {
    res.json({
      showToast: defaultErrorMessage
    });
  }
});
app.use(router);

// Helpers for text replacements
function replaceSmartQuotes(text: string): string {
  return text
    .replace(/‘|’/g, "'")
    .replace(/“|”/g, '"');
}
function replaceEmDashHyphen(text: string): string {
  return text.replace(/—-/g, '---');
}

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());