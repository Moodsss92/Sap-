/** Structure organisationnelle du business case Philo Televisions. */
export const BUSINESS_CASE = {
  name: "Philo Televisions",
  team: ["Moad", "Armel", "Mazen", "Thomas"],
  orgUnits: [
    { type: "Company codes", values: "C2NL (Pays-Bas), C2BE (Belgique)", note: "copiées de 1010" },
    { type: "Plants", values: "Breda, Delft (NL) · Brussels, Antwerp (BE)", note: "" },
    { type: "Purchasing organizations", values: "P2HQ, P2BR, P2BX, P2AN", note: "" },
    { type: "Sales organizations", values: "S2NL, S2BE", note: "" },
  ],
} as const;

export function businessCaseText(): string {
  return [
    `Business case ${BUSINESS_CASE.name} (SAP S/4HANA, modules MM et SD).`,
    ...BUSINESS_CASE.orgUnits.map((u) => `- ${u.type} : ${u.values}${u.note ? ` (${u.note})` : ""}`),
  ].join("\n");
}
