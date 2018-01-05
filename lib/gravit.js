const gunzip = require('gunzip-file')
const glob = require("glob");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const traverse = require('traverse');
const core = require("./core");

const extension = ".gvdesign";


function extractFile(src,dest,cb) {
	var target = dest+"/"+path.basename(src).replace(extension,".json");
	var source = path.basename(src).replace(extension,"");
	fs.ensureDir(dest , function (err) {
		gunzip(src, target, function() {
		  	jsonfile.readFile(target, function(err, obj) {
		  		cb(source,obj)
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

function makeColor(string) {
	return string.replace("C#[","rgb(").replace("]",")");
}

function makeText(object) {
	var layer = {}
	layer = object["content"][0];
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "TextLayer";
	return layer;
}

function makeImage(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	layer["width"] = object["iw"];
	layer["height"] = object["ih"];
	layer["x"] = object["trf"][4];
	layer["y"] = object["trf"][5];
	layer["image"] = object["url"];
	return layer;
}

function makeLayer(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	return layer;
}

function buildLayer(object) {
	var type = object["@"];
	if(type == "text") {
		return makeText(object);
	}
	else if(type == "image"){
		return makeImage(object);
	}
	else {
		return makeLayer(object);
	}
}

function buildChildren(children) {
	for (var i = children.length - 1; i >= 0; i--) {
		children[i] = buildLayer(children[i]);
	}
	return children;
}

function formatPage(p) {
	var page = {}
	page["name"] = core.sanitizeName(p["name"]);
	page["type"] = "Layer";
	page["width"] = p["w"];
	page["height"] = p["h"];
	page["x"] = 0;
	page["y"] = 0;
	page["backgroundColor"] = makeColor(p["bck"]);
	page["children"] = buildChildren(p["$"]);
	return page;
}

function buildPage(object) {
	var page = formatPage(object)
	return page;
}

function getImage(images,url) {
	var needle = (url+"").replace("dictionary://","")
	for (var i = images.length - 1; i >= 0; i--) {
		if(images[i]["uuid"]== needle) {
			return images[i]["value"];
		}
	}
	return;
}

function cleanUp(object,images) {
	traverse(object).forEach(function (x) {
		if(this.key == "image")
		{
			this.update(getImage(images,x));
		}
	})
	return object;
}

function processGravit(name,object) {
	var images = object["dictionary"]["entries"];
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
		pages.push(buildPage(rawpages[i]));
	}
	var file = {
		name: core.sanitizeName(name),
		pages: pages
	}
	file = cleanUp(file,images);
	return file;
}

function importFile(src,cb) {
	var temp = "./.majitmp"
	extractFile(src,temp, function (source,obj) {
		var file = processGravit(source,obj);
		rimraf(temp, function() {
			cb(file);
		})
	});
}

module.exports =  {
    importFile: importFile
};