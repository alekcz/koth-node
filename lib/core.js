'use strict'
const randomstring = require("randomstring");
const AdmZip = require('adm-zip');
const glob = require("glob");
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const reserved = ["break","do","instanceof","typeof","case","else","new","var","catch","finally","return","void","continue","for","switch","while","debuggerfunction","this","with","default","if","throw","delete","in","try","abstract","export","interface","static","boolean","extends","long","super","byte","final","native","synchronized","char","float","package","throws","class","goto","private","transient","const","implements","protected","volatile","double","import","public","enum","int","short","null","true","false"];

function sanitizeName(pagename) {
	if(pagename == null) {
		pagename = "layer_"+randomstring.generate({length:5, readable: true, charset: "alphabetic",capitalization: "lowercase"});
	}
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
	if(object)
	{
		string = string +"\t" + sanitizeName(object.name)+ ": " + sanitizeName(object.name) + " = new " + (object.type || "Layer") + "\n"
		for(var key in object) {
		  // We check if this key exists in the obj
		  if (object.hasOwnProperty(key) && ( key != "name" || key != "type" )) {
		    // someKey is only the KEY (string)! Use it to get the obj:
		    if(!ignoreKey(["name","type","children"], key)) {
		    	var value = object[key];
		    	if(typeof value == "string" && key != "parent") {
		    		value = '"'+value+'"';
		    	}
		   		string = string + "\t\t"+key + ": " + value + "\n";
		    }
		  }
		}
	}
	return string + "" + renderChildren(object);
}

function packagePage(pagename,data) {
	var wrapper = "\nwindow."+pagename+" = { \n" + data + "}\n";
	return wrapper;
}

function render(pagename,object) {
	var finalstring = "";
	finalstring = renderSingle(object);
	return packagePage(pagename,finalstring);
}

module.exports =  {
    render: render,
    ignoreKey: ignoreKey,
    sanitizeName: sanitizeName
};