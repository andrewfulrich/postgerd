#!/usr/bin/env node
const fs=require('fs')
const nomnoml=require('nomnoml')
const getNomNoml=require('./getNomNoml')
const getPlantUml=require('./getPlantUML')

const argv = require('minimist')(process.argv.slice(2));
// console.log(argv);

//get tables
const {query,end} = require('./query')

getInfo()
async function getInfo() {
  const result= await query({
    text:`
    WITH primary_keys AS (
      SELECT kcu.table_schema,
       kcu.table_name,
       tco.constraint_name,
       kcu.column_name
      FROM information_schema.table_constraints tco
      JOIN information_schema.key_column_usage kcu 
          ON kcu.constraint_name = tco.constraint_name
          AND kcu.constraint_schema = tco.constraint_schema
          AND kcu.constraint_name = tco.constraint_name
      WHERE tco.constraint_type = 'PRIMARY KEY'
		AND kcu.table_schema not in ('information_schema','pg_catalog')
    ),
    foreign_keys AS (
        SELECT
          tc.table_schema, 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND 
		tc.table_schema not in ('information_schema','pg_catalog')
    )
    SELECT 
    c.table_schema,
    c.table_name,
    c.column_name,
    c.column_default,
    c.is_nullable='YES' AS is_nullable,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.ordinal_position,
    (SELECT EXISTS (SELECT * FROM primary_keys pks WHERE 
      pks.table_schema=c.table_schema 
      AND pks.table_name=c.table_name
      AND pks.column_name=c.column_name)) as is_primary_key,
    (SELECT 
      fks.foreign_table_schema|| '.' ||fks.foreign_table_name|| '.' ||fks.foreign_column_name FROM foreign_keys fks
      WHERE fks.table_schema=c.table_schema
      AND fks.table_name=c.table_name
      AND fks.column_name=c.column_name LIMIT 1) AS references
    FROM information_schema.columns c
	WHERE table_schema not in ('information_schema','pg_catalog')
    ORDER BY table_schema, table_name, ordinal_position
    `
  });

  const columns=result.rows.filter(col=>argv.schema ? col.table_schema==argv.schema : true)
  let stringOutput;
  if(argv.plantuml !== undefined) {
    stringOutput=getPlantUml(columns)
  } else {
    const nml=getNomNoml(columns)
    stringOutput=argv.nomnoml ? nml : nomnoml.renderSvg(nml)
  }

  if(argv.o !== undefined) {
    fs.writeFileSync(argv.o,stringOutput)
    console.log('ERD has been written to '+argv.o)
  } else {
    console.log(stringOutput)
  }
  process.exit()
}
