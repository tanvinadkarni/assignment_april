var fs = require('fs');


// Note that these files are not valids jsons as they contain strings terminated by ' instead of ".
var inputFiles = ['edge-chromium.json','chrome.json', 'safari.json'];

var promises = inputFiles.map(function(_path){

	// Create a promise that reads the files and resolves the promise
    return new Promise(function(_path, resolve, reject){
        fs.readFile(_path, 'utf8', function(err, data){
            if(err){
               console.log(err);
               reject(err); // faile the future
            }else{
               resolve(data);
            }
        });
    }.bind(this, _path));


});

// Let all files be read
Promise.all(promises).then(function(results){

	var rawFileData = [];
    results.forEach(function(content){
    	
    	// Make these jsons valid jsons. 
    	try{
			rawFileData.push(JSON.parse(content));
    	}catch(ex){
    		console.warn("One of the input file is not a valid json file. Please check the input files.");
    		console.log("Trying to continue by replacing \' with \"")
    		rawFileData.push(JSON.parse(content.replace(/\'/g, '"')));
    		console.log("Succeeded");
    	}
    	
    });

   generateOutput(rawFileData);

}).catch(function(e){
	console.log(e);
	console.error("There was a problem reading at least one of the files.");
});

// This function takes array of json objects where 
// each object is one test data file. 
function generateOutput(rawFileData){
	if(rawFileData.length==0) { return; }
	
	let outputMap = new Map() // Hashmap that will help us `group by feature`. 
	
	for(let item of rawFileData){
        // Even though input file provided contains only one item in fixture
        // this code can handle any number of fixtures. 
		for(let fixture of item.fixtures){ //item of each object

			// For the first time we see a feature we initialize its values. 
			if(!outputMap.has(fixture.meta.feature)){
				outputMap.set(fixture.meta.feature,{     // it will have key:Feature 1 , value:{passed,total,failed,skipped}
									"passed": 0,
								    "total": 0,
								    "failed": 0,
								    "skipped": 0,
								    "name": fixture.meta.feature,
								    "tests":[],

								});
			}

			// Noticed that example aggregated file also has user agents for each test.
			fixture.tests.forEach(function(test){
				// We assume just one user agent per file.
				if(item['userAgents'].length>0){
					test.userAgent = item['userAgents'][0];
				}
			});

			const output = outputMap.get(fixture.meta.feature); 
			output.tests = output.tests.concat(fixture.tests); 
			outputMap.set(fixture.meta.feature,output);
		}
	}


	for(let [key, feature] of outputMap.entries()){
		for(let test of feature.tests){
			feature.total = feature.total + 1;
			if(test.skipped){
				feature.skipped = feature.skipped + 1; 
				continue;  // if it is skipped it cant be fail or passed
			}
			if(test.errs.length>0){
				feature.failed = feature.failed + 1; 
				continue;
			}

			feature.passed = feature.passed + 1; 

		}
	}

	for(let [key,feature] of outputMap.entries()){
		saveToFile(feature.name+"_"+Date.now()+".json",JSON.stringify(feature,null,2));
	}
}


function saveToFile(fileName, fileContent){
	fs.writeFile(fileName, fileContent, "utf8", function(){
		console.log("Writing output file "+fileName+"");
	})
}