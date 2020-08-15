function getPlantUML(columns) {
  const schemas=Array.from(new Set(columns.map(c=>c.table_schema)))
  schemas.sort()
  return `
@startuml

${schemas.map(schema=>buildSchema(columns,schema)).join('\n\n')}
${buildForeignKeys(columns)}
@enduml
`
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

module.exports=getPlantUML