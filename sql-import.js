#!env node
const fs = require('fs')
const child_process = require('child_process')
const sqlite3 = require('sqlite3').verbose()
const dao = require('./dao')

function synchronousLoader(queries, i, cb) {
    console.log(queries[i])
    db.query(queries[i], {
        raw: true
    }).then(() => {
        if (queries.length !== i)
            synchronousLoader(queries, i+1, cb)
        else
            cb()
    })
}

function sqliteToApi() {
    // begin custom code for importing SoM data
    let attributes = [
        {
            name: "Purchase ID",
            type: "Integer"
        },
        {
            name: "Room",
            type: "String"
        },
        {
            name: "Hostname",
            type: "String"
        },
        {
            name: "Manufacturer",
            type: "String"
        },
        {
            name: "Model",
            type: "String"
        },
        {
            name: "Serial",
            type: "String"
        },
        {
            name: "Form Factor",
            type: "String"
        },
        {
            name: "OS",
            type: "String"
        },
        {
            name: "RAM",
            type: "Integer"
        },
        {
            name: "Disk",
            type: "Integer"
        },
        {
            name: "CPU",
            type: "String"
        },
        {
            name: "Chipset",
            type: "String"
        },
        {
            name: "MAC Address",
            type: "String"
        },
        {
            name: "Category",
            type: "String"
        },
        {
            name: "Secondary MAC Address",
            type: "String"
        },
        {
            name: "Math Tag",
            type: "String"
        },
        {
            name: "Model Name",
            type: "String"
        }
    ].map((attribute) => {
        dao.createAttribute(attribute.name, attribute.type, true, true, ".*", "", (err, res)=>{
            console.log(res);
        })
    })
}

sqliteToApi()

if (process.argv.length !== 4) {
    console.log('Usage: ./sql-import.js <ANSI SQL dump> <IMS endpoint>');
    process.exit(0)
} else {
    let dumpPath = process.argv[2]
    let imsEndpoint = process.argv[3]

    // set up temporary in-memory db for working
    var db = new sqlite3.Database(':memory:');
    // run shell script to convert MySQl dump to SQLite dump
    child_process.execFile('./mysql2sqlite/mysql2sqlite', 
        [dumpPath],
        {
            shell: true,
            maxBuffer: Infinity
        },
        (err, stdout, stderr) => {
            // load the dump into sqlite
            let queries = stdout.toString().split(";\n")
            db.serialize(() => {
                let queryCount = 0;
                queries.forEach(query => {
                    db.run(query, null, (error, result) => {
                        // ignore errors in here - the ones thrown are just warnings
                        //console.log(error)
                        queryCount++;
                        // begin the API import?
                        if(queryCount == queries.length) sqliteToApi();
                    });
                });
            })
        })
}