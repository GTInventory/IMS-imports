#!env node

const fs = require('fs')
const child_process = require('child_process')
const sqlite3 = require('better-sqlite3')
const dao = require('./dao')

var db;

// Step 1 of importing to API
function sqliteToApi() {
    // List of attributes that we'll try to find by name OR create
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
            col: 'formfactor',
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
            col: 'mac0',
            type: "String"
        },
        {
            name: "Category",
            type: "String"
        },
        {
            name: "Secondary MAC Address",
            col: 'mac1',
            type: "String"
        },
        {
            name: "Math Tag",
            type: "String",
            col: "mathtag"
        },
        {
            name: "Model Name",
            type: "String",
            col: "modelname"
        }
    ]
    attributes.forEach((attribute, i) => {
        dao.getAttributeByName(attribute.name, function(error, response) {
            if (error) {
                console.error(error);
            } else {
                var attr = response.result.find(function(x) {
                    return x.name == attribute.name;
                })
                if (attr) {
                    attributes[i].id = attr.id
                    attributeCompleted(attributes)
                } else { // attribute doesn't exist, let's create
                    dao.createAttribute(attribute.name, attribute.type, true, true, ".*", "", (err, res)=>{
                        attributes[i].id = res.result.id;
                        attributeCompleted(attributes)
                    });
                }
            }
        })
    })
}

// Step 2. Once the attributes are created, create the type
function attributeCompleted(attributes) {
    if (attributes.find((x) => typeof x.id === 'undefined')) return;
    dao.searchEquipmentTypesByName("Computer", (err, type) => {
        if (type.result.length == 1) {
            typeCompleted(attributes, type.result[0])
        } else { // type doesn't exist, let's create
            dao.createEquipmentType('Computers', attributes.map((attr) => {
                return {
                    id: attr.id
                }
            }), attributes.find((x) => x.name=='Hostname').id, function(err, res) {
                typeCompleted(attributes, {
                    id: res.result.id
                })
            })
        }
    })
}

// Step 3. Once the type is created, create the items
function typeCompleted(attributes, type) {
    // load computers from converted SQLite DB
    var computers = db.prepare('SELECT * FROM computer').all()

    // Convert to the input format
    var items = computers.map((computer) => {
        return {
            typeId: type.id,
            attributes: attributes.map(function(attr) {
                if ('col' in attr) {
                    return {
                        attributeId: attr.id,
                        value: computer[attr.col] || ''
                    }
                } else {
                    return {
                        attributeId: attr.id,
                        value: computer[attr.name.toLowerCase().replace(' ', '_')] || ''
                    }
                }
            })
        }
    })

    // import in slices of constant size bc a massive POST body can cause problems
    const slice_size = 50;
    for(var i = 0; i < items.length; i+=slice_size) {
        dao.createMultiEquipment(items.slice(i, i+slice_size), function(err, res) {
            console.log(res)
        })
    }
}

if (process.argv.length !== 4) {
    console.log('Usage: ./sql-import.js <ANSI SQL dump> <IMS endpoint>');
    process.exit(0)
} else {
    let dumpPath = process.argv[2]
    let imsEndpoint = process.argv[3]

    // set up temporary in-memory db for working
    db = new sqlite3(
        'import',
        { memory: true }
    )
    // run shell script to convert MySQl dump to SQLite dump
    child_process.execFile('./mysql2sqlite/mysql2sqlite', 
        [dumpPath],
        {
            shell: true,
            maxBuffer: 1000*1000*100
        },
        (err, stdout, stderr) => {
            // load the dump into sqlite
            let queries = stdout.toString().split(";\n")
            let queryCount = 0;
            queries.forEach(query => {
                db.exec(query)
            });
            sqliteToApi();
        })
}