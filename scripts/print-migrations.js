import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("database/migrations");
const seedsDir = path.resolve("database/seeds");

function listSqlFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

console.log("Migrations:");
for (const file of listSqlFiles(migrationsDir)) {
  console.log(`- database/migrations/${file}`);
}

console.log("Seeds:");
for (const file of listSqlFiles(seedsDir)) {
  console.log(`- database/seeds/${file}`);
}
