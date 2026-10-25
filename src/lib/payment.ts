// Ways to pay, shown on the RSVP page.

// Venmo: the handle is the part after /u/ in the profile URL.
export const VENMO_HANDLES = ["UmerMemon", "anthony10101", "Alvintphan"];

export function venmoUrl(handle: string) {
  return `https://account.venmo.com/u/${encodeURIComponent(handle)}`;
}

// Zelle has no link format, so these are shown as plain numbers to copy. The
// other two organizers still need adding.
export const ZELLE_ACCOUNTS = [{ name: "Anthony", phone: "714-791-1606" }];
