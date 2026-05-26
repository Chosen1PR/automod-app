import { parseAllDocuments, YAMLParseError } from "yaml";

// Allowed directives that may only appear at the top level of an AutoModerator rule.
const VALID_TOP_LEVEL_ONLY = new Set([
  "type",
  "priority",
  "moderators_exempt",
  "comment",
  "comment_locked",
  "comment_stickied",
  "modmail",
  "modmail_subject",
  "message",
  "message_subject",
]);

// Fields that configure an action taken by AutoModerator.
const VALID_ACTION_FIELDS = new Set([
  "action",
  "action_reason",
  "set_flair",
  "overwrite_flair",
  "set_sticky",
  "set_nsfw",
  "set_spoiler",
  "set_contest_mode",
  "set_original_content",
  "set_suggested_sort",
  "set_locked",
  "set_post_crowd_control_level",
  "report_reason",
  "comment",
  "comment_locked",
  "comment_stickied",
  "modmail",
  "modmail_subject",
  "message",
  "message_subject",
]);


// Non-search fields that represent properties, thresholds, or boolean checks.
const VALID_NON_SEARCH_FIELDS = new Set([
  "reports",
  "body_longer_than",
  "body_shorter_than",
  "is_edited",
  "is_original_content",
  "is_poll",
  "is_gallery",
  "discussion_type",
  "is_meta_discussion",
  "past_archive_date",
  "is_top_level",
  "is_nsfw",
  "event_label",
  "contributor_quality",
  "comment_karma",
  "post_karma",
  "combined_karma",
  "comment_subreddit_karma",
  "post_subreddit_karma",
  "combined_subreddit_karma",
  "account_age",
  "satisfy_any_threshold",
  "has_verified_email",
  "is_gold",
  "is_submitter",
  "is_contributor",
  "is_moderator",
  "ignore_blockquotes",
]);

// Search-style fields supported by AutoModerator checks.
const VALID_SEARCH_FIELDS = new Set([
  "id",
  "title",
  "domain",
  "url",
  "body",
  "flair_text",
  "flair_css_class",
  "flair_template_id",
  "poll_option_text",
  "poll_option_count",
  "crosspost_id",
  "crosspost_title",
  "media_author",
  "media_author_url",
  "media_title",
  "media_description",
  "name",
]);

// Subgroup keys that can nest rule conditions under a specific entity.
const VALID_SUBGROUPS = new Set([
  "author",
  "crosspost_author",
  "crosspost_subreddit",
  "subreddit",
  "parent_submission",
]);

// Supported values for the rule `type` field.
const VALID_TYPE_VALUES = new Set([
  "comment",
  "submission",
  "text submission",
  "link submission",
  "crosspost submission",
  "poll submission",
  "gallery submission",
  "any",
]);

// Supported values for the `set_suggested_sort` action.
const VALID_SET_SUGGESTED_SORT = new Set([
  "best",
  "new",
  "qa",
  "top",
  "controversial",
  "hot",
  "old",
  "random",
  "confidence",
  "",
]);

// Valid standard conditions for the `standard` directive.
const VALID_STANDARD_CONDITIONS = new Set([
  "image hosting sites",
  "direct image links",
  "video hosting sites",
  "streaming sites",
  "crowdfunding sites",
  "meme generator sites",
  "facebook links",
  "amazon affiliate links",
]);

// Actions accepted by the `action` field.
const VALID_ACTION_VALUES = new Set([
  "approve",
  "remove",
  "spam",
  "filter",
  "report",
]);

// Search match methods used as modifiers on search keys.
const VALID_MATCH_METHODS = new Set([
  "includes-word",
  "includes",
  "starts-with",
  "ends-with",
  "full-exact",
  "full-text",
]);

// All supported search modifiers, including regex and case sensitivity.
const VALID_SEARCH_MODIFIERS = new Set([
  ...Array.from(VALID_MATCH_METHODS),
  "regex",
  "case-sensitive",
]);

// Simple type guards used throughout validation.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Convert a YAML parse error into a displayable message.
function formatYamlError(error: YAMLParseError): string {
  return error.message;
}

// Parse a search key string and split it into field names and modifier tokens.
// Example valid keys: "title", "body (regex)", "url+domain (case-sensitive, regex)".
function parseSearchKey(key: string) {
  const match = key.trim().match(/^~?([A-Za-z0-9_]+(?:\+[A-Za-z0-9_]+)*)(?:\s*\(([^)]+)\))?$/);
  if (!match) return null;
  const [_, fieldGroup, modifierGroup] = match;
  if (!fieldGroup) return null;
  const fields = fieldGroup.split("+");
  const rawModifiers = modifierGroup ? modifierGroup.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return {
    fields,
    modifiers: rawModifiers,
  };
}

// Validate a search field value, allowing strings, numbers, booleans, or lists of those.
function validateSearchValue(value: unknown, path: string, errors: string[]) {
  const validateScalar = (scalar: unknown) => {
    if (isString(scalar) || isNumber(scalar) || isBoolean(scalar)) {
      return;
    }
    errors.push(`${path} must be a string, number, or boolean, or a list of those values.`);
  };

  if (Array.isArray(value)) {
    if (value.length === 0) {
      errors.push(`${path} list must not be empty.`);
      return;
    }
    value.forEach((item) => validateScalar(item));
    return;
  }
  validateScalar(value);
}

// Validate threshold values such as numeric comparisons and optional time units.
function validateThresholdValue(value: unknown, path: string, allowUnits = false, allowNegative = false, errors: string[]) {
  if (isNumber(value)) {
    if (!allowNegative && value < 0) {
      errors.push(`${path} must not be negative.`);
    }
    return;
  }
  if (!isString(value)) {
    errors.push(`${path} must be a number or a comparison string.`);
    return;
  }

  const trimmed = value.trim();
  const unitPattern = /^[<>]?\s*[+-]?\d+(?:\.\d+)?\s+([a-zA-Z]+)$/;
  const hasUnit = unitPattern.test(trimmed);
  if (hasUnit && !allowUnits) {
    errors.push(`${path} must not include a unit.`);
    return;
  }

  const signPattern = allowNegative ? "[+-]?" : "";
  const comparisonPattern = new RegExp(`^[<>]\\s*${signPattern}\\d+(?:\\.\\d+)?${allowUnits ? '(?:\\s+[a-zA-Z]+)?' : ''}$`);
  const numberPattern = new RegExp(`^${signPattern}\\d+(?:\\.\\d+)?${allowUnits ? '(?:\\s+[a-zA-Z]+)?' : ''}$`);

  if (!comparisonPattern.test(trimmed) && !numberPattern.test(trimmed)) {
    errors.push(`${path} must be a number or comparison string like < 10${allowUnits ? ' or 10 minutes' : ''}${allowNegative ? '' : ', and cannot be negative'}.`);
    return;
  }

  if (!allowNegative && /^\s*[<>]?\s*-/.test(trimmed)) {
    errors.push(`${path} must not be negative.`);
    return;
  }

  if (allowUnits && hasUnit) {
    const unitMatch = trimmed.match(unitPattern);
    if (unitMatch && unitMatch[1]) {
      const unit = unitMatch[1].toLowerCase();
      if (!["minutes", "minute", "hours", "hour", "days", "day", "weeks", "week", "months", "month", "years", "year"].includes(unit)) {
        errors.push(`${path} has an invalid unit '${unit}'.`);
      }
    }
  }
}

// Validate `set_flair` syntax, which supports a string, tuple list, or object form.
function validateSetFlair(value: unknown, path: string, errors: string[]) {
  if (isString(value)) return;
  if (Array.isArray(value)) {
    if (value.length !== 2) {
      errors.push(`${path} list must contain exactly two values when using list syntax.`);
      return;
    }
    if (!value.every((item) => isString(item))) {
      errors.push(`${path} list values must all be strings.`);
    }
    return;
  }
  if (isObject(value)) {
    const allowed = new Set(["text", "css_class", "template_id"]);
    const keys = Object.keys(value);
    if (!keys.includes("template_id")) {
      errors.push(`${path} object must include template_id when using dictionary syntax.`);
    }
    for (const key of keys) {
      if (!allowed.has(key)) {
        errors.push(`${path} object contains invalid key '${key}'.`);
      }
      if (!isString((value as Record<string, unknown>)[key])) {
        errors.push(`${path}.${key} must be a string.`);
      }
    }
    return;
  }
  errors.push(`${path} must be a string, a list of two strings, or an object with template_id.`);
}

// Validate that a search key uses allowed fields and modifiers.
function validateSearchKeyName(key: string, path: string, errors: string[]) {
  const parsed = parseSearchKey(key);
  if (!parsed) {
    errors.push(`${path} is not a valid search check name.`);
    return null;
  }

  parsed.fields.forEach((field) => {
    if (!VALID_SEARCH_FIELDS.has(field)) {
      errors.push(`${path} contains an unknown field '${field}'.`);
    }
  });

  parsed.modifiers.forEach((modifier) => {
    if (!VALID_SEARCH_MODIFIERS.has(modifier)) {
      errors.push(`${path} contains an invalid modifier '${modifier}'.`);
    }
  });

  const methods = parsed.modifiers.filter((modifier) => VALID_MATCH_METHODS.has(modifier));
  if (methods.length > 1) {
    errors.push(`${path} may only specify one match search method, but multiple were found.`);
  }

  return parsed;
}

// Validate a rule object recursively, including nested subgroup conditions.
function validateRuleObject(rule: unknown, path: string, errors: string[], inSubgroup = false) {
  if (!isObject(rule)) {
    errors.push(`${path} must be a mapping object.`);
    return;
  }

  for (const [key, value] of Object.entries(rule)) {
    if (VALID_SUBGROUPS.has(key)) {
      validateRuleObject(value, `${path}.${key}`, errors, true);
      continue;
    }

    if (VALID_TOP_LEVEL_ONLY.has(key) && inSubgroup) {
      errors.push(`${path}.${key} is only valid at the top level of a rule.`);
      continue;
    }

    if (key === "standard") {
      if (!isString(value)) {
        errors.push(`${path}.standard must be a string.`);
      } else if (!VALID_STANDARD_CONDITIONS.has(value)) {
        errors.push(`${path}.standard contains an unknown standard condition '${value}'.`);
      }
      continue;
    }

    if (VALID_ACTION_FIELDS.has(key)) {
      switch (key) {
        case "action":
          if (!isString(value) || !VALID_ACTION_VALUES.has(value)) {
            errors.push(`${path}.action must be one of ${Array.from(VALID_ACTION_VALUES).join(", ")}.`);
          }
          break;
        case "set_flair":
          validateSetFlair(value, `${path}.set_flair`, errors);
          break;
        case "set_suggested_sort":
          if (!isString(value) || !VALID_SET_SUGGESTED_SORT.has(value)) {
            errors.push(`${path}.set_suggested_sort must be one of ${Array.from(VALID_SET_SUGGESTED_SORT).map((v) => v === "" ? "blank" : v).join(", ")}.`);
          }
          break;
        case "set_sticky":
          if (!(isBoolean(value) || isNumber(value))) {
            errors.push(`${path}.set_sticky must be true, false, or a number.`);
          }
          break;
        case "set_post_crowd_control_level":
          if (!isString(value) || !["OFF", "LENIENT", "MEDIUM", "STRICT"].includes(value)) {
            errors.push(`${path}.set_post_crowd_control_level must be one of OFF, LENIENT, MEDIUM, or STRICT.`);
          }
          break;
        case "overwrite_flair":
        case "set_nsfw":
        case "set_spoiler":
        case "set_contest_mode":
        case "set_original_content":
        case "set_locked":
        case "comment_locked":
        case "comment_stickied":
          if (!isBoolean(value)) {
            errors.push(`${path}.${key} must be true or false.`);
          }
          break;
        case "action_reason":
        case "report_reason":
        case "comment":
        case "modmail":
        case "modmail_subject":
        case "message":
        case "message_subject":
          if (!isString(value)) {
            errors.push(`${path}.${key} must be a string.`);
          }
          break;
      }
      continue;
    }

    if (VALID_NON_SEARCH_FIELDS.has(key)) {
      switch (key) {
        case "reports":
        case "body_longer_than":
        case "body_shorter_than":
        case "comment_karma":
        case "post_karma":
        case "combined_karma":
        case "comment_subreddit_karma":
        case "post_subreddit_karma":
        case "combined_subreddit_karma":
          validateThresholdValue(value, `${path}.${key}`, false, true, errors);
          break;
        case "account_age":
          validateThresholdValue(value, `${path}.${key}`, true, false, errors);
          break;
        case "contributor_quality":
          if (!isString(value)) {
            errors.push(`${path}.contributor_quality must be a string.`);
          } else if (!/^[<>]?\s*(highest|high|moderate|low|lowest)$/.test(value.trim())) {
            errors.push(`${path}.contributor_quality must be one of highest, high, moderate, low, lowest, optionally prefixed by < or >.`);
          }
          break;
        case "discussion_type":
          if (!(value === "chat" || value === "null" || value === null)) {
            errors.push(`${path}.discussion_type must be 'chat' or 'null'.`);
          }
          break;
        case "event_label":
        case "ignore_blockquotes":
          if (key === "ignore_blockquotes") {
            if (!isBoolean(value)) {
              errors.push(`${path}.ignore_blockquotes must be true or false.`);
            }
          } else if (!isString(value)) {
            errors.push(`${path}.${key} must be a string.`);
          }
          break;
        default:
          if (!isBoolean(value)) {
            errors.push(`${path}.${key} must be a boolean.`);
          }
      }
      continue;
    }

    if (key === "type") {
      if (!isString(value) || !VALID_TYPE_VALUES.has(value)) {
        errors.push(`${path}.type must be one of ${Array.from(VALID_TYPE_VALUES).join(", ")}.`);
      }
      continue;
    }

    if (key === "priority") {
      if (!isNumber(value)) {
        errors.push(`${path}.priority must be a number.`);
      }
      continue;
    }

    if (key === "moderators_exempt") {
      if (!isBoolean(value)) {
        errors.push(`${path}.moderators_exempt must be true or false.`);
      }
      continue;
    }

    const keyInfo = validateSearchKeyName(key, `${path}.${key}`, errors);
    if (keyInfo) {
      validateSearchValue(value, `${path}.${key}`, errors);
      continue;
    }

    errors.push(`${path}.${key} is not a recognized AutoModerator directive.`);
  }
}

// Walk YAML AST nodes and report duplicate keys inside mapping blocks.
function collectDuplicateKeys(doc: any, path: string, errors: string[]) {
  if (!doc || typeof doc !== "object" || !doc.items) {
    return;
  }
  const seen = new Map<string, number>();
  for (const item of doc.items) {
    const key = item.key?.value;
    if (typeof key !== "string") continue;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count + 1 > 1) {
      errors.push(`${path} contains duplicate key '${key}'.`);
    }
    if (item.value?.type === "MAP" || item.value?.type === "FLOW_MAP") {
      collectDuplicateKeys(item.value, `${path}.${key}`, errors);
    }
  }
}

// Validate the full AutoModerator YAML configuration string.
export function validateAutoModeratorSyntax(config: string) {
  const errors: string[] = [];

  let docs;
  try {
    docs = parseAllDocuments(config);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      return { valid: false, errors: [formatYamlError(error)] };
    }
    return { valid: false, errors: ["Unable to parse YAML configuration."] };
  }

  if (!docs || docs.length === 0) {
    errors.push("AutoModerator configuration must contain at least one rule.");
    return { valid: false, errors };
  }

  docs.forEach((doc, index) => {
    if (doc.errors?.length) {
      doc.errors.forEach((error: YAMLParseError) => {
        errors.push(`Rule ${index + 1}: ${formatYamlError(error)}`);
      });
    }
    collectDuplicateKeys(doc.contents, `Rule ${index + 1}`, errors);
    const rule = doc.toJSON();
    if (rule === null) {
      return;
    }
    if (Array.isArray(rule)) {
      errors.push(`Rule ${index + 1} must be a mapping object, not a list.`);
      return;
    }
    validateRuleObject(rule, `Rule ${index + 1}`, errors);
  });

  return { valid: errors.length === 0, errors };
}