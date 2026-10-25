// Organizers who collect payment. Shown on the RSVP page as Venmo links.
// Add the others here: the handle is the part after /u/ in their Venmo URL.
export const VENMO_HANDLES = ["UmerMemon", "anthony10101", "Alvintphan"];

export function venmoUrl(handle: string) {
  return `https://account.venmo.com/u/${encodeURIComponent(handle)}`;
}
