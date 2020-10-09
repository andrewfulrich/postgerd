# Changelog:

## v1.07

Fixed a bug with tables of the same name and different schema getting mixed up.

## v1.06

Fixed an error that was arising when the information schema table was returning more than one foreign key constraint result for the same schema/table/column. The solution is currently to just limit the result to one.