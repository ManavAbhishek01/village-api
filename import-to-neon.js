const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 NeonDB mein data import shuru...');

  const rows = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream('all_villages.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.state_name && row.village_name) rows.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📦 ${rows.length} rows CSV se load ho gayi!`);

  // States
  const stateMap = new Map();
  for (const row of rows) {
    const code = parseInt(row.mdds_stc);
    if (!stateMap.has(code)) {
      stateMap.set(code, row.state_name.trim());
    }
  }

  console.log(`🗺️ ${stateMap.size} states insert ho rahe hain...`);
  for (const [code, name] of stateMap) {
    await prisma.state.upsert({
      where: { code },
      update: {},
      create: { code, name }
    });
  }
  console.log('✅ States done!');

  // Districts
  const districtMap = new Map();
  for (const row of rows) {
    const code = parseInt(row.mdds_dtc);
    if (!districtMap.has(code)) {
      districtMap.set(code, { name: row.district_name.trim(), stateCode: parseInt(row.mdds_stc) });
    }
  }

  console.log(`🏙️ ${districtMap.size} districts insert ho rahe hain...`);
  const stateRecords = await prisma.state.findMany();
  const stateIdMap = new Map(stateRecords.map(s => [s.code, s.id]));

  for (const [code, { name, stateCode }] of districtMap) {
    const stateId = stateIdMap.get(stateCode);
    if (!stateId) continue;
    await prisma.district.upsert({
      where: { code },
      update: {},
      create: { code, name, stateId }
    });
  }
  console.log('✅ Districts done!');

  // SubDistricts
  const subMap = new Map();
  for (const row of rows) {
    const code = parseInt(row.mdds_sub);
    if (!subMap.has(code)) {
      subMap.set(code, { name: row.sub_district.trim(), districtCode: parseInt(row.mdds_dtc) });
    }
  }

  console.log(`🏘️ ${subMap.size} sub-districts insert ho rahe hain...`);
  const districtRecords = await prisma.district.findMany();
  const districtIdMap = new Map(districtRecords.map(d => [d.code, d.id]));

  for (const [code, { name, districtCode }] of subMap) {
    const districtId = districtIdMap.get(districtCode);
    if (!districtId) continue;
    await prisma.subDistrict.upsert({
      where: { code },
      update: {},
      create: { code, name, districtId }
    });
  }
  console.log('✅ Sub-Districts done!');

  // Villages - batch insert
  console.log('🏡 Villages insert ho rahe hain...');
  const subDistrictRecords = await prisma.subDistrict.findMany();
  const subIdMap = new Map(subDistrictRecords.map(s => [s.code, s.id]));

  let count = 0;
  const BATCH = 500;
  let batch = [];

  for (const row of rows) {
    const subDistrictId = subIdMap.get(parseInt(row.mdds_sub));
    if (!subDistrictId) continue;
    batch.push({
      code: parseInt(row.mdds_plcn),
      name: row.village_name.trim(),
      subDistrictId
    });

    if (batch.length >= BATCH) {
      await prisma.village.createMany({ data: batch, skipDuplicates: true });
      count += batch.length;
      batch = [];
      process.stdout.write(`\r📦 ${count} villages imported...`);
    }
  }

  if (batch.length > 0) {
    await prisma.village.createMany({ data: batch, skipDuplicates: true });
    count += batch.length;
  }

  console.log(`\n✅ Total ${count} villages imported!`);
  console.log('🎉 NeonDB import complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());