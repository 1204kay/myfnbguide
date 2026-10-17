// Each section's own picture (Kay 10-17: every place gets a picture that says its title, never the situation's
// picture again with the other parts faded), drawn from the section's title and line and what its practices do;
// numbers only as a labelled 举例. One file per situation, keyed here by "slug/key"; a section without one shows none.
import type { Section } from "./kit";
import { sections as busyNoProfit } from "./busy-no-profit";
import { sections as cashFlow } from "./cash-flow";
import { sections as competition } from "./competition";
import { sections as firstMonths } from "./first-months";
import { sections as hiring } from "./hiring";
import { sections as hospitality } from "./hospitality";
import { sections as inventory } from "./inventory";
import { sections as location } from "./location";
import { sections as openingCost } from "./opening-cost";
import { sections as partners } from "./partners";
import { sections as payments } from "./payments";
import { sections as pricing } from "./pricing";
import { sections as regulars } from "./regulars";
import { sections as retention } from "./retention";
import { sections as scheduling } from "./scheduling";
import { sections as secondShop } from "./second-shop";
import { sections as slowWeekdays } from "./slow-weekdays";
import { sections as smallBudgetMarketing } from "./small-budget-marketing";
import { sections as smallFormats } from "./small-formats";
import { sections as takeout } from "./takeout";
import { sections as ticketSize } from "./ticket-size";
import { sections as waste } from "./waste";
import { sections as wrongPerson } from "./wrong-person";

const BY_SITUATION: Record<string, Record<string, Section>> = {
  "busy-no-profit": busyNoProfit,
  "cash-flow": cashFlow,
  "competition": competition,
  "first-months": firstMonths,
  "hiring": hiring,
  "hospitality": hospitality,
  "inventory": inventory,
  "location": location,
  "opening-cost": openingCost,
  "partners": partners,
  "payments": payments,
  "pricing": pricing,
  "regulars": regulars,
  "retention": retention,
  "scheduling": scheduling,
  "second-shop": secondShop,
  "slow-weekdays": slowWeekdays,
  "small-budget-marketing": smallBudgetMarketing,
  "small-formats": smallFormats,
  "takeout": takeout,
  "ticket-size": ticketSize,
  "waste": waste,
  "wrong-person": wrongPerson,
};

export const SECTIONS: Record<string, Section> = Object.fromEntries(
  Object.entries(BY_SITUATION).flatMap(([slug, sections]) => Object.entries(sections).map(([key, section]) => [`${slug}/${key}`, section])),
);
