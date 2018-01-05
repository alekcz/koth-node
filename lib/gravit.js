const gunzip = require('gunzip-file')
const glob = require("glob");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const traverse = require('traverse');
const core = require("./core");

const extension = "gvdesign";


function extractFile(src,dest,cb) {
	var target = dest+"/"+path.basename(src).replace(extension,"json");
	fs.ensureDir(dest , function (err) {
		gunzip(src, target, function() {
		  	jsonfile.readFile(target, function(err, obj) {
		  		cb(obj)
		  	})
		})
	})
}

function processSerialized(val) {
	var type = typeof val;
	if(type == "string") {
		if(val.indexOf('\"')!= -1) {
	    	try	{
	    		var temp = JSON.parse(val);
	    		val = temp;
	    	} catch(err) {
	    		
	    	}
	    }
    }
    else if (type == "array") {
    	for (var i = val.length - 1; i >= 0; i--) {
    		val[i] = processSerialized(val[i]) 
    	}
    }
    return val;
}

function extractPages(object) {
	var	temp = object["$"];
	var pages = [];
	for (var i = temp.length - 1; i >= 0; i--) {
		if(temp[i]["@"] == "page") {
			pages.push(temp[i]);
		}
	}
	return pages;
}

function buildPages(argument) {
	
}


function processGravit(object) {
	traverse(object).forEach(function (x) {
		if(!core.ignoreKey(["_bkpPath"],this.key))
		{
			this.update(processSerialized(x));
		}
		else {
			this.remove()
		}
	})
	var pages = [];
	var rawpages = extractPages(object);
	for (var i = rawpages.length - 1; i >= 0; i--) {
		pages[i]
	}
	/*jsonfile.writeFile("tmp/gravit.json", object, {spaces: 2}, function (err) {
	  console.error(err)
	})*/
}

function importFile(src,dest) {
	extractFile(src,dest,processGravit);
}

module.exports =  {
    importFile: importFile
};