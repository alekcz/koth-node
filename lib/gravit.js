const gunzip = require('gunzip-file')
const glob = require("glob");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const traverse = require('traverse');
const os = require('os');
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
	layer["width"] = object["w"];
	layer["height"] = object["h"];
	layer["x"] = object["trf"][4] - object["trf"][0];
	layer["y"] = object["trf"][5] - object["trf"][3];
	layer["color"] = layer["fontColor"];
	if(object["$"]) {
		layer["children"] = buildChildren(layer["children"]);
	}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	return layer;
}

function makeImage(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	layer["width"] = object["iw"]*object["trf"][0];
	layer["height"] = object["ih"]*object["trf"][3];
	layer["x"] = object["trf"][4] - object["trf"][0];
	layer["y"] = object["trf"][5] - object["trf"][3];
	layer["image"] = object["url"];
	if(object["$"]) {
		layer["children"] = buildChildren(layer["children"]);
	}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	return layer;
}

function makeGroup(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	var x = [];
	var y = [];
	var w = [];
	var h = [];
	if(object["$"]) {
		layer["children"] = buildChildren(object["$"]);
	}
	var children = layer["children"];
	if(children)
	{
		for(var i = children.length - 1; i >= 0; i--) {
			var child = children[i];
			x.push(Math.round(child["x"]));
			y.push(Math.round(child["y"]));
			w.push(Math.round(child["width"]));
			h.push(Math.round(child["height"]));

		}
	}
	layer["width"] = w.reduce(function(a, b) {return Math.max(a, b);});
	layer["height"] = h.reduce(function(a, b) {return Math.max(a, b);});
	layer["x"] = x.reduce(function(a, b) {return Math.min(a, b);});
	layer["y"] = y.reduce(function(a, b) {return Math.min(a, b);});
	layer["backgroundColor"] = ''
	for(var i = children.length - 1; i >= 0; i--) {
			var child = children[i];
			child["x"] = child["x"]-layer["x"];
			child["y"] = child["y"]-layer["y"];
		}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	return layer;
}

function makeRectangle(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	layer["width"] = object["trf"][0]*2; //for some reason all rectangle dimensions are halfed
	layer["height"] = object["trf"][3]*2;//maybe the default size is 2x2 and then it's transformed
	layer["x"] = object["trf"][4] - object["trf"][0];
	layer["y"] = object["trf"][5] - object["trf"][3];
	layer["backgroundColor"] = makeColor(object["_layers"]["$"][0]["_pt"]);
	layer["borderRadius"] = object["sl"];
	if(object["$"]) {
		layer["children"] = buildChildren(layer["children"]);
	}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	return layer;
}

function makeLayer(object) {
	var layer = {}
	layer["name"] = core.sanitizeName(object["name"]);
	layer["type"] = "Layer";
	layer["width"] = object["iw"]*object["trf"][0];
	layer["height"] = object["ih"]*object["trf"][3];
	layer["x"] = object["trf"][4];
	layer["y"] = object["trf"][5];
	if(object["$"]) {
		layer["children"] = buildChildren(layer["children"]);
	}
	if(object["_stop"]) {
		layer["opacity"] = object["_stop"];
	}
	return layer;
}

function buildLayer(object) {
	var type = object["@"];
	var layer = null;
	if(type == "text") {
		layer = makeText(object);
	}
	else if(type == "image"){
		layer = makeImage(object);
	}
	else if(type == "group"){
		layer = makeGroup(object);
	}
	else if(type == "rectangle"){
		layer = makeRectangle(object);
	}
	else {
		layer = makeLayer(object);
	}
	return layer;
}

function buildChildren(children) {
	if(children)
	{
		var len = children.length
		for (var i = 0; i < children.length; i++) {
			children[i] = buildLayer(children[i]);
			children[i]["index"] = i;
		}
	}
	return children;
}

function formatPage(p) {
	var page = {}
	page["pagename"] = core.sanitizeName(p["name"]);
	page["name"] = "root";
	page["type"] = "Layer";
	page["width"] = p["w"];
	page["height"] = p["h"];
	page["x"] = 0;
	page["y"] = 0;
	//page["backgroundColor"] = makeColor(p["bck"]);
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
	jsonfile.writeFile("tmp/gravit.json", object, {spaces: 2}, function(err) {
	  if(err) console.error(err)
	})
	var pages = [];
	var rawpages = extractPages(object);
	for (var i = 0; i < rawpages.length; i++) {
		pages.push(buildPage(rawpages[i]));
	}
	var file = {
		name: core.sanitizeName(name),
		pages: pages
	}
	//console.log(JSON.stringify(file,null,2))
	file = cleanUp(file,images);
	return file;
}

function importFile(src,cb) {
	var temp = os.homedir()+"/.majitmp"
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
