// var argv = require('minimist')(process.argv.slice(2));
// console.log(argv);

//get tables
const query = require('./query')

async function getInfo(schema) {
  const result=query({
    text:`
    WITH primary_keys AS (
      SELECT kcu.table_schema,
       kcu.table_name,
       tco.constraint_name,
       kcu.ordinal_position as position,
       kcu.column_name
      FROM information_schema.table_constraints tco
      JOIN information_schema.key_column_usage kcu 
          ON kcu.constraint_name = tco.constraint_name
          AND kcu.constraint_schema = tco.constraint_schema
          AND kcu.constraint_name = tco.constraint_name
      WHERE tco.constraint_type = 'PRIMARY KEY'
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
        WHERE tc.constraint_type = 'FOREIGN KEY'
    )
    SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type,
    character_maximum_length,
    numeric_precision,
    ordinal_position,
    (EXISTS SELECT * FROM primary_keys pks WHERE 
      pks.table_schema=table_schema 
      AND pks.table_name=table_name
      AND pks.column_name=column_name) as is_primary_key,
    (SELECT 
      fks.foreign_table_schema|| '.' ||fks.foreign_table_name|| '.' ||fks.foreign_column_name FROM foreign_keys fks
      WHERE fks.table_schema=table_schema
      AND fks.table_name=table_name
      AND fks.column_name=column_name) AS references
    FROM information_schema.columns
   WHERE table_schema = $1 ORDER BY table_name, ordinal_position`,
   values:[schema]
  });
}