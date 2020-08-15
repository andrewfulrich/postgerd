const fs=require('fs')
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
    table_schema,
    table_name,
    column_name,
    column_default,
    is_nullable='YES' AS is_nullable,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position,
    (SELECT EXISTS (SELECT * FROM primary_keys pks WHERE 
      pks.table_schema=table_schema 
      AND pks.table_name=c.table_name
      AND pks.column_name=c.column_name)) as is_primary_key,
    (SELECT 
      fks.foreign_table_schema|| '.' ||fks.foreign_table_name|| '.' ||fks.foreign_column_name FROM foreign_keys fks
      WHERE fks.table_schema=table_schema
      AND fks.table_name=c.table_name
      AND fks.column_name=c.column_name) AS references
    FROM information_schema.columns c
	WHERE table_schema not in ('information_schema','pg_catalog')
    ORDER BY table_schema, table_name, ordinal_position
    `
  });

  const columns=result.rows
  const schemas=Array.from(new Set(columns.map(c=>c.table_schema)))
  schemas.sort()
  const erd=`
@startuml

${schemas.map(schema=>buildSchema(columns,schema)).join('\n\n')}
${buildForeignKeys(columns)}
@enduml
`
  if(argv.o !== undefined) {
    fs.writeFileSync(argv.o,erd)
  } else {
    console.log(erd)
  }
  //end()
}

function buildForeignKeys(columns) {
  const fks=columns.filter(c=>c.references !== null)
  const getName=(col)=>`${col.table_schema}.${col.table_name}.${col.column_name}`
  fks.sort((s1,s2)=>getName(s1).localeCompare(getName(s2)))
  return `
${fks.map(fk=>`${fk.references.split('.')[0]}.${fk.references.split('.')[1]} }|-- ${fk.table_schema}.${fk.table_name}`).join('\n')}
  `
}

function buildSchema(allColumns,schema) {
  const columns=allColumns.filter(c=>c.table_schema==schema)
  const tables=Array.from(new Set(columns.map(c=>c.table_name)))
  tables.sort()
  return `
package ${schema} <<Rectangle>> {
${tables.map(table=>buildTable(columns,table)).join('\n\n')}
}
`
}
function buildTable(schemaColumns,table) {
  const sortFunc=(c1,c2)=>c1.ordinal_position-c2.ordinal_position
  const columns=schemaColumns.filter(c=>c.table_name==table)
  const pks=columns.filter(c=>c.is_primary_key)
  pks.sort(sortFunc)
  const nonPks=columns.filter(c=>!c.is_primary_key)
  nonPks.sort(sortFunc)
  if(columns.length==0) throw new Error('no columns found for table '+table);
  return `
  entity "${table}" as ${columns[0].table_schema}.${table} {
    ${pks.map(pk=>`* ${pk.column_name} : ${dataTypeString(pk)}`).join('\n    ')}${pks.length>0?'\n    --':''}
    ${nonPks.map(npk=>`${npk.column_name} : ${dataTypeString(npk)}${npk.references? ` REFERENCES ${npk.references}` :''}`).join('\n    ')}
  }`
}
function dataTypeString(column) {
  const type=column.data_type.replace('character varying','varchar')
  let suffix;
  switch(type) {
    case 'varchar':
      suffix=`(${column.character_maximum_length})`
      break;
    case 'integer':
      suffix=`(${column.numeric_precision})`
      break;
    default:
      suffix=column.numeric_precision&&column.numeric_scale ? `(${column.numeric_precision,column.numeric_scale})` : ''
  }
  return `${type}${suffix}${!column.is_nullable?' NOT NULL':''}${column.column_default!==null?` DEFAULT ${column.column_default}`:''}`
}