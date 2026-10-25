// Ways to pay, shown on the RSVP page, grouped by person. Leave a method out
// if that person doesn't take it.
export type Payee = {
  name: string;
  // Venmo: the handle is the part after /u/ in the profile URL.
  venmo?: string;
  // Zelle has no link format, so this is a phone or email to copy.
  zelle?: string;
  // Cash App: the cashtag is the part after cash.app/ in the profile URL.
  cashApp?: string;
};

export const PAYEES: Payee[] = [
  {
    name: "Umer",
    venmo: "UmerMemon",
    zelle: "memon.management@gmail.com",
    cashApp: "$MemonManagement",
  },
  { name: "Anthony", venmo: "anthony10101", zelle: "714-791-1606" },
  { name: "Alvin", venmo: "Alvintphan" },
];

export function venmoUrl(handle: string) {
  return `https://account.venmo.com/u/${encodeURIComponent(handle)}`;
}

export function cashAppUrl(cashtag: string) {
  return `https://cash.app/${cashtag}`;
}
