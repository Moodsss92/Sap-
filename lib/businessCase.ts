/** Structure organisationnelle du business case Philo Televisions. */
export const BUSINESS_CASE = {
  name: "Philo Televisions",
  team: ["Moad", "Armel", "Mazen", "Thomas"],
  orgUnits: [
    { type: "Company codes", values: "C2NL (Netherlands), C2BE (Belgium)", note: "copied from 1010" },
    { type: "Plants", values: "Breda, Delft (NL) · Brussels, Antwerp (BE)", note: "" },
    { type: "Purchasing organizations", values: "P2HQ, P2BR, P2BX, P2AN", note: "" },
    { type: "Sales organizations", values: "S2NL, S2BE", note: "" },
  ],
} as const;

export function businessCaseText(): string {
  return [
    `Business case ${BUSINESS_CASE.name} (SAP S/4HANA, MM and SD modules).`,
    ...BUSINESS_CASE.orgUnits.map((u) => `- ${u.type} : ${u.values}${u.note ? ` (${u.note})` : ""}`),
  ].join("\n");
}
