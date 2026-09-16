/**
 * Everything the wall says. A copy edit touches this file and nothing else.
 *
 * `{name}` is the guest's first name, upper-cased: the download page's rule
 * (`roam-tablet/src/components/download/DownloadExperience.tsx`), so a guest sees the same
 * name on their phone and on the wall. The booth already sends only the first word.
 *
 * Strings carrying `\n` are rendered with `whitespace-pre-line`.
 */
export const COPY = {
  /** The title card before each play: the brief's "'{Name}'s Roam - 3,2,1'". */
  countdownTitle: "{name}'S ROAM",
  /** The same card when a guest left the name blank. */
  countdownTitleUnnamed: "FREEDOM TO ROAM",
  upNextLabel: "UP NEXT:",
  upNextTitle: "{name}'S\nJOURNEY",
  upNextUnnamed: "THE NEXT\nJOURNEY",
  /** Nothing queued yet: an invitation rather than an empty box. */
  upNextEmpty: "YOUR\nJOURNEY",
};

export function displayName(firstName: string): string {
  return String(firstName || "").trim().split(/\s+/)[0].toUpperCase();
}

export function fillName(template: string, firstName: string): string {
  return template.replaceAll("{name}", displayName(firstName));
}

export function countdownTitle(firstName: string): string {
  return displayName(firstName) ? fillName(COPY.countdownTitle, firstName) : COPY.countdownTitleUnnamed;
}

export function upNextTitle(firstName: string | null): string {
  if (firstName === null) return COPY.upNextEmpty;
  return displayName(firstName) ? fillName(COPY.upNextTitle, firstName) : COPY.upNextUnnamed;
}
