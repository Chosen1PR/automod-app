import express from "express";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  redis,
  settings
} from "@devvit/web/server";
import {
  loadAutomodConfigForm,
  loadErrorForm,
  reloadCachedAutomodConfig,
  replaceEmDashHyphen,
  replaceSmartQuotes,
  isModAllowedToEditAutomod,
  submitAutomodConfig,
} from "./utils";
//import { validateAutoModeratorSyntax } from "./syntax";

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
  const isModAllowed = await isModAllowedToEditAutomod(context.userId!);
  if (!isModAllowed) {
    res.json({
      showToast: "You do not have permission to edit Automod."
    });
    return;
  }
  // If we got here, we have the necessary permissions.
  // Get the current Automod config.
  let automodConfig = "";
  try {
    const wikiPage = await reddit.getWikiPage(context.subredditName, 'config/automoderator');
    automodConfig = wikiPage.content ?? "";
  }
  catch (error) {
    automodConfig = "";
  }
  loadAutomodConfigForm(automodConfig, res);
});

// Form submission handler for Automod
router.post("/internal/forms/edit-automod-submit", async (req, res) => {
  // Get input values
  var automodConfig = req.body.automodConfig as string ?? "";
  var editReason = req.body.editReason as string ?? "";
  // Check length of edit reason
  if (editReason.length > 200) {
    // Cache the current config so it can be reloaded later
    await redis.hSet(context.username!, { cachedConfig: automodConfig, cachedEditReason: editReason });
    loadErrorForm(["Edit reason cannot be longer than 200 characters."], res);
    return;
  }
  // Apply text replacements based on settings
  const allSettings = await settings.getAll();
  const replaceQuotesSetting = allSettings['replace-quotes'] as boolean ?? false;
  const replaceEmDashSetting = allSettings['replace-em-dash'] as boolean ?? false;
  if (replaceQuotesSetting)
    automodConfig = replaceSmartQuotes(automodConfig);
  if (replaceEmDashSetting)
    automodConfig = replaceEmDashHyphen(automodConfig);

  // This was the original location of the syntax validation.
  // It was moved to AFTER submission attempts to allow for the config to be saved
  // even if the validation in this app is outdated and throws false errors.

  // Submit changes
  await submitAutomodConfig(automodConfig, editReason, res);
});

// Form submission handler for Automod
router.post("/internal/forms/syntax-error-submit", async (_req, res) => {
  await reloadCachedAutomodConfig(res);
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());