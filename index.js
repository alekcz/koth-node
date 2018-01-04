'use strict'
const jsonfile = require('jsonfile');
const core = require('./core/layer');
const fs = require('fs-extra');
const path = require('path');

function readFile(path,cb) {
	
	if(path)
	{
		jsonfile.readFile(path, function(err, obj) {
		  cb(null, obj)
		})
	}

}


function createFramerViewfile (src,dest) {
	readFile(src,function (err, data) {
		if(err) return false;
		//var file = core.createLayer(data);
		var pagename = path.basename(src);
		pagename = pagename.substring(0,(pagename.indexOf('.') || -1));
		pagename = pagename.replace(/\s/g,'').replace(/^[^a-zA-Z_]+|[^a-zA-Z_0-9]+/g,'').replace(/^\d+\.\s*/, '');
		var contents = core.render(pagename,data);
		fs.outputFile(dest, contents, (err) => {  
		    // throws an error, you could also catch it here
		    if (err)
		    {
		    	console.log(err)
		    	return false;
		    }
		    console.log(contents);
		    return true;
		});
	});
}

module.exports =  {
    createFramerViewfile: createFramerViewfile
};