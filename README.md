IMS-imports
=====

Code for loading different data dumps into the IMS API.

## sql-import.js

Useful for importing School of Math inventory DB dumps to the API.

Usage:  
```./sql-import.js <ANSI SQL dump> <IMS endpoint>```

The SQL dump must have been created using the following `mysqldump` flags:  
```mysqldump --skip-extended-insert --compact [options]... DB_name > dump.sql```