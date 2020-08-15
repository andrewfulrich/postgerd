# PostgERD

PostgERD connects to your postgres database with environment variable credentials (using [dotenv](https://github.com/motdotla/dotenv#readme) if needed) and generates an ERD svg from what it finds there. Can also output [PlantUML](https://plantuml.com/) or [nomnoml](http://www.nomnoml.com/). Supports multiple db schemas.

Note: Foreign key connections across schemas are only supported in the PlantUML output.

## Installation

To install:

```
npm install --save-dev postgerd
```

Also make sure you have [postgres connection environment variables](https://www.postgresql.org/docs/9.3/libpq-envars.html) set (that is, either DATABASE_URL or PGUSER,PGPASSWORD,PGHOST, and PGDATABASE).

## To output an svg:

```
npx postgerd -o myOutput.svg
```

## To restrict it to a single schema in the database

```
npx postgerd -o myOutput.svg --schema my_schema
```

## To output a plantuml file:

```
npx postgerd -o myOutput.plantuml --plantuml
```

## To output a nomnoml file:

```
npx postgerd -o myOutput.nomnoml --nomnoml
```