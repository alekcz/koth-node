'use strict'
const randomstring = require("randomstring");
const AdmZip = require('adm-zip');
const glob = require("glob");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const reserved = ["break","do","instanceof","typeof","case","else","new","var","catch","finally","return","void","continue","for","switch","while","debuggerfunction","this","with","default","if","throw","delete","in","try","abstract","export","interface","static","boolean","extends","long","super","byte","final","native","synchronized","char","float","package","throws","class","goto","private","transient","const","implements","protected","volatile","double","import","public","enum","int","short","null","true","false"];

function createLayer (args) {
	return {
		"name":args.name || "layer",
		"type":  args.type || "Layer",
		"x": args.x || 100,
	    "y": args.y || 100,
	    "width": args.width || 250,
	    "height": args.height || 250,
	    "color": args.color || "#359DD9"
	}
}

function sanitizeName(pagename) {
	if(reserved.indexOf(pagename.toLowerCase()) != -1) {
		pagename = pagename+"Layer";
	}
	return pagename.replace(/\s/g,'').replace(/^[^a-zA-Z_]+|[^a-zA-Z_0-9]+/g,'').replace(/^\d+\.\s*/, '');
}

function ignoreKey(noflylist,key){
	return noflylist.indexOf(key) >= 0
}

function renderChildren(object) {
	var string = ""
	if(object) {
		if(object.hasOwnProperty("children")) {
			var children = object.children;
			for (var i = children.length - 1; i >= 0; i--) {
				children[i]["parent"] = object.name
				string = string + renderSingle(children[i]);
			}
		}
	}
	return string;
}

function renderSingle(object) {
	var string = "\n";
	string = string +"\t" + object.name +":"+ object.name + " = new " + (object.type || "Layer") + "\n"
	for(var key in object) {
	  // We check if this key exists in the obj
	  if (object.hasOwnProperty(key) && ( key != "name" || key != "type" )) {
	    // someKey is only the KEY (string)! Use it to get the obj:
	    if(!ignoreKey(["name","type","children"], key)) {
	   		string = string + "\t\t"+key + ": " + object[key+""] + "\n";
	    }
	  }
	}
	return string + "" + renderChildren(object);
}

function packagePage(pagename,data) {
	var wrapper = "\nwindow."+pagename+" = { \n" + data + "}\n";
	return 	wrapper;
}

function render(pagename,object) {
	var finalstring = "";
	finalstring = renderSingle(object);
	return packagePage(pagename,finalstring);
}


function buildPage (object) {
	//console.log(object)
	var page = {}
	for(var key in object) {
		if (object.hasOwnProperty(key)) {
			if(key == "_class") {
				if(object[key] == "artboard") {
					object["frame"]["x"] = 0;
					object["frame"]["y"] = 0;
				}
			}
			if(ignoreKey(["name","frame","layers","image"],key)) {
				if(key=="name") {
					page["name"] = sanitizeName(object[key])
				}
				else if(key == "frame") {
					var frame = object["frame"];
					for(var item in frame) {
						if (frame.hasOwnProperty(item)) {
							if(item.indexOf("_") != 0 && ignoreKey(["height","width","x","y"],item)) {
								page[item] = frame[item];
							}
						}
					}
				}
				else if(key == "image") {
					if(object["_class"]=="bitmap")
					{
						page["image"] = '"views/'+object["image"]["_ref"]+'.png"';
					}
				}
				else if(key == "layers") {
					var children = object[key];
					page["children"] = [];
					for (var i = children.length - 1; i >= 0; i--) {
						page.children.push(buildPage(children[i]));
					}
				}
			}
		}
	}
	return page;
}

function processSketchFile(dest) {
	var files = glob.sync(dest+"/pages/*.json");
	for (var i = files.length - 1; i >= 0; i--) {
		var obj = jsonfile.readFileSync(files[i]);
	 	var sketchfile  = buildPage(obj["layers"][0]);
	 	var finished = render(sanitizeName(obj["name"]),sketchfile);
	}
	return {filename: sanitizeName(obj["name"]), data: finished};
}

function getSketchFile(src,dest) {
	var zip = new AdmZip(src);
	zip.extractAllTo(dest, true);
	rimraf(dest+"/*.json",function(err) {
		if(err) console.log(err)
	})
	rimraf(dest+"/pages",function(err) {
		if(err) console.log(err)
	})
	rimraf(dest+"/previews",function(err) {
		if(err) console.log(err)
	})

	return processSketchFile(dest);
}


module.exports =  {
    render: render,
    getSketchFile: getSketchFile
};