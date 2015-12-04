///<reference path='node.d.ts'/>
// Imports
import fs = require('fs')
import http = require('http')

// Constants
const fileName = 'from.json'
const encoding = 'UTF-8'
const postUrl = 'localhost'
const postPort = 8080
const postPath = '/rest/patients'
const postAuth = 'Admin:admin'

// Initialization
console.log('Starting to reformat the JSON from file `' + fileName + '`')

var fileFrom = fs.readFileSync(fileName, encoding)
var jsonFrom = JSON.parse(fileFrom.toString())

// Main loop; looping over all patients, applying the same set of operations
// then sending off to phenotips
for (var i in jsonFrom) {
    let patientJson = jsonFrom[i]
    // not the nicest thing to do
    let converted = idConversion(patientJson)
    converted['contact'] = contactConversion(patientJson)
    converted['features'] = featuresConversion(patientJson)
    converted['disorders'] = disordersConversion(patientJson)
    converted['genes'] = genesConversion(patientJson)
    let convertedJson = JSON.stringify(converted)

    console.log('Sending patient to PhenoTips')
    // making rest calls
    let request = http.request({
            host: postUrl, port: postPort, path: postPath, method: 'POST', auth: postAuth,
            headers: {
                'Content-Type': 'application/json'
            }
        },
        (res) =>
        {
            console.log("Status " + res.statusCode)
            res.on('data', function (chunk)
            {
                console.log('Body: ' + chunk);
            });
        })
    request.write(convertedJson)
    request.end()
    request.on('error', (e) =>
    {
        console.log("There has been an error " + e)
    })
}

// Conversion functions
function contactConversion(fullJson:any):ContactInfo
{
    let json = fullJson['contact']
    let converted:ContactInfo = {
        user_id: "",
        name: getOrEmpty(json['name']),
        email: "",
        institution: getOrEmpty(json['institution'])
    }
    return converted
}
function idConversion(fullJson:any):Ids
{
    return {
        id: getOrEmpty(fullJson['id']),
        external_id: getOrEmpty(fullJson['label'])
    }
}
function featuresConversion(fullJson:any):Feature[]
{
    let featureList = fullJson['features']
    // "type":"phenotype",
    if (featureList instanceof Array) {
        return featureList.map((f) =>
        {
            f['type'] = 'phenotype'
            return f
        })
    } else {
        return []
    }
}
function disordersConversion(fullJson:any):Disorder[]
{
    let disorderList = fullJson['disorders']
    if (disorderList instanceof Array) {
        return disorderList
    } else {
        return []
    }
}
function genesConversion(fullJson:any):Gene[]
{
    let geneList = fullJson['genomicFeatures']
    if (!(geneList instanceof Array)) {
        return []
    }
    return geneList.map((g) =>
    {
        if (!g['gene'] || !g['gene']['id']) {
            return null
        }
        return {
            gene: g['gene']['id'],
            comments: JSON.stringify(getOrEmpty(g['type'])) + "\n" + JSON.stringify(getOrEmpty(g['variant']))
        }
    }).filter((item) => item)
}

// Utils
function getOrEmpty(v:any)
{
    if (v) {
        return v
    } else {
        return ""
    }
}

// Interfaces for the conversions
interface ContactInfo
{
    user_id: string
    name: string
    email: string
    institution: string
}
interface Ids
{
    id: string,
    external_id: string
}
interface Feature
{
    id: string,
    observed: YesNo,
    type: string
}
interface Disorder
{
    id: string
}
interface Gene
{
    gene: string,
    comment: string
}
// Additional classes
enum YesNo {yes, no}