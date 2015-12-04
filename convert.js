///<reference path='node.d.ts'/>
// Imports
var fs = require('fs');
var http = require('http');
// Constants
var fileName = 'from.json';
var encoding = 'UTF-8';
var postUrl = 'localhost';
var postPort = 8080;
var postPath = '/rest/patients';
var postAuth = 'Admin:admin';
// Initialization
console.log('Starting to reformat the JSON from file `' + fileName + '`');
var fileFrom = fs.readFileSync(fileName, encoding);
var jsonFrom = JSON.parse(fileFrom.toString());
// Main loop; looping over all patients, applying the same set of operations
// then sending off to phenotips
for (var i in jsonFrom) {
    var patientJson = jsonFrom[i];
    // not the nicest thing to do
    var converted = idConversion(patientJson);
    converted['contact'] = contactConversion(patientJson);
    converted['features'] = featuresConversion(patientJson);
    converted['disorders'] = disordersConversion(patientJson);
    converted['genes'] = genesConversion(patientJson);
    var convertedJson = JSON.stringify(converted);
    console.log('Sending patient to PhenoTips');
    // making rest calls
    var request = http.request({
        host: postUrl, port: postPort, path: postPath, method: 'POST', auth: postAuth,
        headers: {
            'Content-Type': 'application/json'
        }
    }, function (res) {
        console.log("Status " + res.statusCode);
        res.on('data', function (chunk) {
            console.log('Body: ' + chunk);
        });
    });
    request.write(convertedJson);
    request.end();
    request.on('error', function (e) {
        console.log("There has been an error " + e);
    });
}
// Conversion functions
function contactConversion(fullJson) {
    var json = fullJson['contact'];
    var converted = {
        user_id: "",
        name: getOrEmpty(json['name']),
        email: "",
        institution: getOrEmpty(json['institution'])
    };
    return converted;
}
function idConversion(fullJson) {
    return {
        id: getOrEmpty(fullJson['id']),
        external_id: getOrEmpty(fullJson['label'])
    };
}
function featuresConversion(fullJson) {
    var featureList = fullJson['features'];
    // "type":"phenotype",
    if (featureList instanceof Array) {
        return featureList.map(function (f) {
            f['type'] = 'phenotype';
            return f;
        });
    }
    else {
        return [];
    }
}
function disordersConversion(fullJson) {
    var disorderList = fullJson['disorders'];
    if (disorderList instanceof Array) {
        return disorderList;
    }
    else {
        return [];
    }
}
function genesConversion(fullJson) {
    var geneList = fullJson['genomicFeatures'];
    if (!(geneList instanceof Array)) {
        return [];
    }
    return geneList.map(function (g) {
        if (!g['gene'] || !g['gene']['id']) {
            return null;
        }
        return {
            gene: g['gene']['id'],
            comments: JSON.stringify(getOrEmpty(g['type'])) + "\n" + JSON.stringify(getOrEmpty(g['variant']))
        };
    }).filter(function (item) { return item; });
}
// Utils
function getOrEmpty(v) {
    if (v) {
        return v;
    }
    else {
        return "";
    }
}
// Additional classes
var YesNo;
(function (YesNo) {
    YesNo[YesNo["yes"] = 0] = "yes";
    YesNo[YesNo["no"] = 1] = "no";
})(YesNo || (YesNo = {}));
