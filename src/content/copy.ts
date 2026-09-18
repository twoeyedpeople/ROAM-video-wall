import { etaMinutes } from "@/machine/eta";

/**
 * Everything the wall says. A copy edit touches this file and nothing else.
 *
 * `{name}` is the guest's first name, upper-cased: the download page's rule
 * (`roam-tablet/src/components/download/DownloadExperience.tsx`), so a guest sees the same
 * name on their phone and on the wall. The booth already sends only the first word.
 *
 * The comps spell the panel's estimate "APROX". It is corrected here: it is the one line on
 * the wall a guest reads from arm's length, and a misspelling at 1920 wide is a defect, not
 * a house style. Revert this string alone if the client wants the comp's spelling.
 */
export const COPY = {
  /** The label over the name, on the title card, the countdown and the Up Next panel. */
  upNextLabel: "UP NEXT",

  /**
   * The title card (Figma `Screen-Video_06`): the name, with the ROAM logo under it. The
   * unnamed line is the tablet's own lockup, "FREEDOM TO" over the same mark.
   */
  titleName: "{name}'S",
  titleUnnamed: "FREEDOM TO",

  /** Under the countdown's digits (Figma `Screen-Video_07`). */
  countdownFooter: "{name}'S JOURNEY",
  countdownFooterUnnamed: "THE NEXT JOURNEY",

  /** The campaign line the interstitial builds, in the order it arrives. */
  campaignLead: "STAR IN",
  campaignLeadEnd: "YOUR",
  campaignOwn: "OWN",
  campaignFilm: "FILM",

  /** The Up Next panel (Figma `UpNext-Video_01`). */
  panelUnnamed: "SOMEONE",
  /** Nothing queued: an invitation rather than an empty box. */
  panelEmpty: "YOURS",
  panelEmptyNote: "STAR IN YOUR OWN FILM",
  panelEtaMinutes: "APPROX. {minutes} MIN AWAY",
  panelEtaMinutesPlural: "APPROX. {minutes} MINS AWAY",
  /** Under a minute, where a rounded figure would read as wrong within seconds. */
  panelEtaSoon: "UP AFTER THIS ONE",
};

export function displayName(firstName: string): string {
  return String(firstName || "").trim().split(/\s+/)[0].toUpperCase();
}

export function fillName(template: string, firstName: string): string {
  return template.replaceAll("{name}", displayName(firstName));
}

/** The title card's line: "{NAME}'S", or the lockup's own words when the name is blank. */
export function titleLine(firstName: string): string {
  return displayName(firstName) ? fillName(COPY.titleName, firstName) : COPY.titleUnnamed;
}

/** The countdown's footer. */
export function countdownFooter(firstName: string): string {
  return displayName(firstName) ? fillName(COPY.countdownFooter, firstName) : COPY.countdownFooterUnnamed;
}

/** The Up Next panel's headline: the name alone, per the comp. */
export function panelName(firstName: string | null): string {
  if (firstName === null) return COPY.panelEmpty;
  return displayName(firstName) || COPY.panelUnnamed;
}

/**
 * The panel's note. Under a minute it says so in words: a figure that rounds to "1 min"
 * and then to "0" while a guest watches reads as broken.
 */
export function panelNote(etaMs: number | null): string {
  if (etaMs === null) return COPY.panelEmptyNote;
  const minutes = etaMinutes(etaMs);
  if (minutes < 1) return COPY.panelEtaSoon;
  const template = minutes === 1 ? COPY.panelEtaMinutes : COPY.panelEtaMinutesPlural;
  return template.replace("{minutes}", String(minutes));
}
