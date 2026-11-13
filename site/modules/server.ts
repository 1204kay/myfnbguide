// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";
import archive from "@aihot/archive/server";
import checker from "@aihot/checker/server";
import dailypick from "@aihot/dailypick/server";
import reference, { titlesShownAs } from "@aihot/reference/server";
import social from "@aihot/social/server";
import trends from "@aihot/trends/server";
import usd from "@aihot/usd/server";
import { addUsd } from "@aihot/usd/backend/convert";
import { currentRates } from "@aihot/usd/backend/rates";

export const SERVER_MODULES: readonly ServerModule[] = [reference, archive, social, checker, trends, dailypick, usd];

// 十一说 counts its title's length as the site shows it: with the dollar note usd adds after an amount in another currency.
titlesShownAs(async (title, context) => { const rates = await currentRates(); return rates ? addUsd(title, rates.perUsd, context) : title; });
