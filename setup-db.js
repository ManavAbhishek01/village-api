const Database = require('better-sqlite3');
const fs = require('fs');
const csv = require('csv-parser');

console.log('🚀 Database setup shuru ho raha hai...');

const db = new Database('villages.db');

// Tables banao
db.exec(`
  CREATE TABLE IF NOT EXISTS states (
    id INTEGER PRIMARY KEY,
    code INTEGER UNIQUE,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY,
    code INTEGER UNIQUE,
    name TEXT NOT NULL,
    state_code INTEGER,
    FOREIGN KEY (state_code) REFERENCES states(code)
  );

  CREATE TABLE IF NOT EXISTS sub_districts (
    id INTEGER PRIMARY KEY,
    code INTEGER UNIQUE,
    name TEXT NOT NULL,
    district_code INTEGER,
    FOREIGN KEY (district_code) REFERENCES districts(code)
  );

  CREATE TABLE IF NOT EXISTS villages (
    id INTEGER PRIMARY KEY,
    code INTEGER,
    name TEXT NOT NULL,
    sub_district_code INTEGER,
    FOREIGN KEY (sub_district_code) REFERENCES sub_districts(code)
  );

  CREATE INDEX IF NOT EXISTS idx_village_name ON villages(name);
  CREATE INDEX IF NOT EXISTS idx_state_name ON states(name);
`);

console.log('✅ Tables ban gayi!');

// Data insert karo
const insertState = db.prepare(`INSERT OR IGNORE INTO states (code, name) VALUES (?, ?)`);
const insertDistrict = db.prepare(`INSERT OR IGNORE INTO districts (code, name, state_code) VALUES (?, ?, ?)`);
const insertSubDistrict = db.prepare(`INSERT OR IGNORE INTO sub_districts (code, name, district_code) VALUES (?, ?, ?)`);
const insertVillage = db.prepare(`INSERT INTO villages (code, name, sub_district_code) VALUES (?, ?, ?)`);

const insertAll = db.transaction((rows) => {
  for (const row of rows) {
    if (!row.state_name || !row.village_name) continue;
    insertState.run(parseInt(row.mdds_stc), row.state_name.trim());
    insertDistrict.run(parseInt(row.mdds_dtc), row.district_name.trim(), parseInt(row.mdds_stc));
    insertSubDistrict.run(parseInt(row.mdds_sub), row.sub_district.trim(), parseInt(row.mdds_dtc));
    insertVillage.run(parseInt(row.mdds_plcn), row.village_name.trim(), parseInt(row.mdds_sub));
  }
});

let rows = [];
let count = 0;

fs.createReadStream('all_villages.csv')
  .pipe(csv())
  .on('data', (row) => {
    rows.push(row);
    count++;
    if (rows.length >= 10000) {
      insertAll(rows);
      rows = [];
      process.stdout.write(`\r📦 ${count} rows import ho gaye...`);
    }
  })
  .on('end', () => {
    if (rows.length > 0) insertAll(rows);
    console.log(`\n✅ Total ${count} villages import ho gayi!`);
    console.log('🎉 Database ready hai!');
    db.close();
  });