import type { SearchMemoryWrite } from "@/domain";
import { rememberSearchRecords } from "./lib/search-memory-client";

const path = process.argv[2];
if (!path) throw new Error("usage: bun run research:remember -- <results.json>");
const input = await Bun.file(path).json() as SearchMemoryWrite[] | { records: SearchMemoryWrite[] };
const records = Array.isArray(input) ? input : input.records;
if (!Array.isArray(records)) throw new Error("results file must contain a records array");
const result = await rememberSearchRecords(records);
process.stdout.write(JSON.stringify({ path, ...result }, null, 2));
