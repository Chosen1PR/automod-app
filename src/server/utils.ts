import express from "express";
import {
  context,
  reddit,
  redis,
} from "@devvit/web/server";

import { UserId } from "./types";

import { validateAutoModeratorSyntax } from "./syntax";

export async function isModAllowedToEditAutomod(userId: UserId) {
  const mod = (await reddit.getUserById(userId))!;
  let hasConfigPermission = false;
  let hasWikiPermission = false;
  let hasAllPermissions = false;
  const permissions = await mod.getModPermissionsForSubreddit(context.subredditName);
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
    const hasNecessaryPermissions = (hasConfigPermission && hasWikiPermission);
    return (hasAllPermissions || hasNecessaryPermissions);
  }
  else {
    return false;
  }
}

export async function submitAutomodConfig(automodConfig: string, editReason: string, res: express.Response) {
  // Append username to edit reason
  const fullEditReason = editReason + ` | Edited by ${context.username!}`;
  const defaultErrorMsg = "An unknown error occurred. Please try again.";
  try {
    const wikiPage = await reddit.updateWikiPage({
      subredditName: context.subredditName,
      page: 'config/automoderator',
      content: automodConfig,
      reason: fullEditReason,
    });
    if (wikiPage) {
      await redis.hDel(context.username!, ['cachedConfig', 'cachedEditReason']);
      res.json({
        showToast: "Automod updated successfully."
      });
      return;
    }
    else {
      await redis.hSet(context.username!, { cachedConfig: automodConfig, cachedEditReason: editReason });
      const validation = validateAutoModeratorSyntax(automodConfig);
      if (!validation.valid) {
        loadErrorForm(validation.errors, res);
        return;
      }
      else {
        loadErrorForm([defaultErrorMsg], res);
        return;
      }
    }
  }
  catch (err) {
    await redis.hSet(context.username!, { cachedConfig: automodConfig, cachedEditReason: editReason });
    const validation = validateAutoModeratorSyntax(automodConfig);
    if (!validation.valid) {
      loadErrorForm(validation.errors, res);
      return;
    }
    else {
      loadErrorForm([defaultErrorMsg], res);
      return;
    }
  }
}

export function loadAutomodConfigForm(automodConfig: string, res: express.Response) {
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
        lineHeight: 19,
        defaultValue: automodConfig,
        required: true
      },
      {
        type: 'string',
        name: 'editReason',
        label: 'Edit Reason',
        helpText: '200 character limit',
        defaultValue: "",
        required: true
      }],
    },
    acceptLabel: 'Submit',
    cancelLabel: 'Cancel',
    data: {
      automodConfig: automodConfig,
      editReason: ""
    }
  }
 });
}

export function loadErrorForm(errors: string[], res: express.Response) {
  var errorMsg = (errors[0] ?? "Unknown error.");
  errorMsg = replaceMultipleNewlines(errorMsg);
  errorMsg += "\nPress OK to reload the Automod config. You will not lose your unsaved changes.";
  res.json({
    showForm: {
      name: 'syntaxErrorForm',
      form: {
        title: 'Automod Config Error',
        fields: [
        {
          type: 'paragraph',
          name: 'syntaxErrorMsg',
          label: 'Error Message',
          defaultValue: errorMsg,
          lineHeight: 15,
          disabled: true
        }]
      },
      acceptLabel: 'Ok',
      cancelLabel: 'Cancel',
      data: {
        syntaxErrorMsg: errorMsg
      }
    }
  });
}

export async function reloadCachedAutomodConfig(res: express.Response) {
  try {
    // Reopen the edit form.
    // Get the cached Automod config.
    let automodConfig = "";
    let editReason = "";
    try {
      const cache = await redis.hGetAll(context.username!);
      if (cache) {
        automodConfig = cache.cachedConfig ?? "";
        editReason = cache.cachedEditReason ?? "";
      }
      // If there is no cached config, ge the current config from the wiki page.
      if (automodConfig == "") {
        const wikiPage = await reddit.getWikiPage(context.subredditName, 'config/automoderator');
        automodConfig = wikiPage.content ?? "";
      }
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
              lineHeight: 19,
              defaultValue: automodConfig,
              required: true
            },
            {
              type: 'string',
              name: 'editReason',
              label: 'Edit Reason',
              helpText: '200 character limit',
              defaultValue: editReason,
              required: true
            }
          ],
        },
        acceptLabel: 'Submit',
        cancelLabel: 'Cancel',
        data: {
          automodConfig: automodConfig,
          editReason: editReason
        }
      }
    });
  }
  catch (err) {
    res.json({
      showToast: "Error reloading Automod config. Please try reopening the form."
    });
  }
}

// Helpers for text replacements
export function replaceSmartQuotes(text: string): string {
  return text
    .replace(/‘|’/g, "'")
    .replace(/“|”/g, '"');
}
export function replaceEmDashHyphen(text: string): string {
  return text.replace(/—-/g, '---');
}
function replaceMultipleNewlines(text: string): string {
    return text.trim().replace(/\n{2,}/g, '\n');
}