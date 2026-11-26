/**
 * Dictionnaire local T-code → [chemin, titre].
 * Sert à l'auto-complétion du formulaire et de référence pour Claude (/api/analyze).
 * Les chemins sont des propositions : toujours vérifier dans le système.
 */
export type TcodeEntry = readonly [chemin: string, titre: string];

const S = "SPRO";
const ES_DEF = `${S} › Enterprise Structure › Definition`;
const ES_ASG = `${S} › Enterprise Structure › Assignment`;
const FI_GS = `${S} › Financial Accounting › Financial Accounting Global Settings`;
const TAX = `${FI_GS} › Tax on Sales/Purchases`;
const SD = `${S} › Sales and Distribution`;
const LOG = "SAP Menu › Logistics";
const MM = `${LOG} › Materials Management`;
const PP = `${LOG} › Production`;
const SDM = `${LOG} › Sales and Distribution`;
const LE = `${LOG} › Logistics Execution › Outbound Process › Goods Issue for Outbound Delivery › Outbound Delivery › Create`;
const PCA = "SAP Menu › Accounting › Controlling › Profit Center Accounting › Master Data › Profit Center › Individual Processing";

export const TCODES: Record<string, TcodeEntry> = {
  // ---------- FI ----------
  EC01: [`${ES_DEF} › Financial Accounting › Edit, Copy, Delete, Check Company Code`, "Copy the company code"],
  OX02: [`${ES_DEF} › Financial Accounting › Edit, Copy, Delete, Check Company Code › Edit Company Code Data`, "Edit company code data"],
  OBY6: [`${FI_GS} › Global Parameters for Company Code › Enter Global Parameters`, "Company code global parameters"],
  OB52: [`${FI_GS} › Ledgers › Fiscal Year and Posting Periods › Posting Periods › Open and Close Posting Periods`, "Open posting periods"],
  FBN1: [`${FI_GS} › Document › Document Number Ranges › Documents in Entry View › Define Document Number Ranges for Entry View`, "Accounting document number ranges"],
  OBBG: [`${TAX} › Basic Settings › Assign Country to Calculation Procedure`, "Assign tax procedure to country"],
  FTXP: [`${TAX} › Calculation › Define Tax Codes for Sales and Purchases`, "Define tax codes"],
  OB40: [`${TAX} › Posting › Define Tax Accounts`, "Define tax accounts"],
  OBCL: [`${TAX} › Posting › Allocate Tax Codes for Non-Taxable Transactions`, "Tax codes for non-taxable transactions"],
  OX19: [`${ES_ASG} › Controlling › Assign Company Code to Controlling Area`, "Assign company code to controlling area"],
  KE51: [`${PCA} › Create`, "Create a profit center"],
  KE53: [`${PCA} › Display`, "Display a profit center"],

  // ---------- Structure organisationnelle ----------
  EC02: [`${ES_DEF} › Logistics - General › Define, Copy, Delete, Check Plant › Copy, Delete, Check Plant`, "Copy the plant"],
  OX10: [`${ES_DEF} › Logistics - General › Define, Copy, Delete, Check Plant › Define Plant`, "Define the plant"],
  OX18: [`${ES_ASG} › Logistics - General › Assign Plant to Company Code`, "Assign plant to company code"],
  OX09: [`${ES_DEF} › Materials Management › Maintain Storage Location`, "Create storage locations"],
  OX08: [`${ES_DEF} › Materials Management › Maintain Purchasing Organization`, "Create the purchasing organization"],
  OX01: [`${ES_ASG} › Materials Management › Assign Purchasing Organization to Company Code`, "Assign purchasing org to company code"],
  OX17: [`${ES_ASG} › Materials Management › Assign Purchasing Organization to Plant`, "Assign purchasing org to plant"],
  OVX5: [`${ES_DEF} › Sales and Distribution › Define, Copy, Delete, Check Sales Organization`, "Create the sales organization"],
  OVXI: [`${ES_DEF} › Sales and Distribution › Define, Copy, Delete, Check Distribution Channel`, "Define the distribution channel"],
  OVXB: [`${ES_DEF} › Logistics - General › Define, Copy, Delete, Check Division`, "Define the division"],
  OVX3: [`${ES_ASG} › Sales and Distribution › Assign Sales Organization to Company Code`, "Assign sales org to company code"],
  OVXK: [`${ES_ASG} › Sales and Distribution › Assign Distribution Channel to Sales Organization`, "Assign distribution channel to sales org"],
  OVXA: [`${ES_ASG} › Sales and Distribution › Assign Division to Sales Organization`, "Assign division to sales org"],
  OVXG: [`${ES_ASG} › Sales and Distribution › Set up Sales Area`, "Set up the sales area"],
  OVX6: [`${ES_ASG} › Sales and Distribution › Assign Sales Organization - Distribution Channel - Plant`, "Assign sales org / channel to plant"],
  OVXC: [`${ES_DEF} › Logistics Execution › Define, Copy, Delete, Check Shipping Point`, "Create the shipping point"],
  OVXD: [`${ES_ASG} › Logistics Execution › Assign Shipping Point to Plant`, "Assign shipping point to plant"],

  // ---------- Données de base et flux ----------
  BP: ["SAP Menu › Cross-Application Components › SAP Business Partner › Business Partner › Maintain Business Partner", "Create the business partner"],
  MM01: [`${MM} › Material Master › Material › Create (General) › Immediately`, "Create the material master"],
  CS01: [`${PP} › Master Data › Bills of Material › Bill of Material › Material BOM › Create`, "Create the bill of materials (BOM)"],
  C223: [`${PP} › Master Data › Production Versions`, "Create the production version"],
  ME11: [`${MM} › Purchasing › Master Data › Info Record › Create`, "Create the purchasing info record"],
  ME01: [`${MM} › Purchasing › Master Data › Source List › Maintain`, "Maintain the source list"],
  ME31K: [`${MM} › Purchasing › Outline Agreement › Contract › Create`, "Create the purchasing contract"],
  ME31L: [`${MM} › Purchasing › Outline Agreement › Scheduling Agreement › Create`, "Create the scheduling agreement"],
  ME21N: [`${MM} › Purchasing › Purchase Order › Create › Vendor/Supplying Plant Known`, "Create the purchase order"],
  MIGO: [`${MM} › Inventory Management › Goods Movement › Goods Movement (MIGO)`, "Post goods receipt / goods issue"],
  MIRO: [`${MM} › Logistics Invoice Verification › Document Entry › Enter Invoice`, "Enter the vendor invoice"],
  MD61: [`${PP} › Production Planning › Demand Management › Planned Independent Requirements › Create`, "Create planned independent requirements (PIR)"],
  MD02: [`${PP} › MRP › Planning › Single-Item, Multi-Level`, "Run MRP (single-item, multi-level)"],
  MD04: [`${PP} › MRP › Evaluations › Stock/Requirements List`, "Stock/requirements list"],
  CO40: [`${PP} › Shop Floor Control › Order › Create › From Planned Order`, "Convert planned order to production order"],
  CO02: [`${PP} › Shop Floor Control › Order › Change`, "Change / release the production order"],
  VL10B: [`${LE} › Collective Processing of Documents Due for Delivery › Purchase Orders`, "Create deliveries for STOs"],
  VA21: [`${SDM} › Sales › Quotation › Create`, "Create the customer quotation"],
  VA01: [`${SDM} › Sales › Order › Create`, "Create the sales order"],
  VL01N: [`${LE} › Single Document › With Reference to Sales Order`, "Create the outbound delivery"],
  VF01: [`${SDM} › Billing › Billing Document › Create`, "Create the customer invoice"],
  VK11: [`${SDM} › Master Data › Conditions › Select Using Condition Type › Create`, "Create pricing conditions"],

  // ---------- Customizing SD ----------
  VOV8: [`${SD} › Sales › Sales Documents › Sales Document Header › Define Sales Document Types`, "Define sales document types"],
  VOV7: [`${SD} › Sales › Sales Documents › Sales Document Item › Define Item Categories`, "Define item categories"],
  VOV4: [`${SD} › Sales › Sales Documents › Sales Document Item › Assign Item Categories`, "Assign item categories"],
  VTAA: [`${SD} › Sales › Sales Documents › Maintain Copy Control for Sales Documents › Copying Control: Sales Document to Sales Document`, "Copy control: sales document to sales document"],
  "V/08": [`${SD} › Basic Functions › Pricing › Pricing Control › Define and Assign Pricing Procedures › Maintain Pricing Procedures`, "Define the pricing procedure"],
  OVKK: [`${SD} › Basic Functions › Pricing › Pricing Control › Define and Assign Pricing Procedures › Define Pricing Procedure Determination`, "Pricing procedure determination"],
  VKOA: [`${SD} › Basic Functions › Account Assignment/Costing › Revenue Account Determination › Assign G/L Accounts`, "Revenue account determination (VKOA)"],
};

export function normalizeTcode(t: string): string {
  return t.trim().toUpperCase().replace(/^\/[NO]/, "");
}

export function lookupTcode(t: string): TcodeEntry | undefined {
  return TCODES[normalizeTcode(t)];
}

/** Version texte injectée dans le prompt de /api/analyze. */
export function tcodesForPrompt(): string {
  return Object.entries(TCODES)
    .map(([code, [chemin, titre]]) => `${code} = ${titre}: ${chemin}`)
    .join("\n");
}
