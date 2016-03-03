// node server for image proxy
/*

*/
// eg url: http://localhost:9193/?action=imgproxy&imgname=http://hyperallergic.com/wp-content/uploads/2015/07/jesusmarymet02.jpg&width=500


(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();


var async = require("async");

var urlparser = require("url");

var fs = require("fs");
var pathparser = require("path");
var http = require("http");

var mysecrets = {port: (process.env.IMAGE_PROXY_PORT || 5000)};

var port = mysecrets.port;
if(process && process.env && process.env.NODE_ENV == "production"){
  port = mysecrets.prod_port;
}

startServer();

var started = false;
function startServer(){

  if(!started){
    started = true;
  }else{
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! already started!");
    return;
  }
    
  var http = require('http');
  http.createServer(function (req, res) {
    parseRequest(req, res);

  }).listen(port);
  console.log('Server running at port ' + port);
}



function parseRequest(req, res){
    var rand = Math.random() * 100;
    if(req.headers["access-control-request-headers"]){
  	res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"]);        
    }
    res.setHeader("Access-Control-Allow-Origin", "*");        

    console.log("got request " + req.url);
    var newurl = req.url.replace(/\/image_proxy\//, "");
    console.log(newurl);
  

    var width = height = false;
    var matches = newurl.match(/&width=([^&]+)/);
    if(matches){ width = matches[1];}
    matches = newurl.match(/&height=([^&]+)/);
    if(matches){ height = matches[1];}
    
    newurl = newurl.replace(/&width=([^&]+)/,"").replace(/&height=([^&]+)/, "");
    
    var parsed = urlparser.parse(newurl, true)
    var query = urlparser.parse(newurl, true).query;

    if (newurl){
	imgproxy(newurl, width, height, query, res);
    }else{
	console.log("return error");
	res.writeHead(200, {'Content-Type': 'text/html', 
                            'Access-Control-Allow-Origin' : '*'});
	res.end("<html><body><pre>not sure what to do</pre></body></html>");
    }
}


function imgproxy(imgname, width, height, query, res){
    var extname = pathparser.extname(imgname);

    if(typeof width === 'undefined' || !width ){
	width = 500;
    }
    if(typeof height === 'undefined' || !height ){
	height = 500;
    }

    var contentType = 'image/png';
    switch (extname.toLowerCase()) {
    case '.png':
	contentType = 'image/png';
	break;
    case '.jpg':
	contentType = 'image/jpeg';
	break;
    }
    
    var imgname2 = imgname.replace(/^http:\/\//,'');
    var split = imgname2.split(/\//);
    var host = split.shift();
    var path = "/"+split.join("/");
    
    console.log(host + " ::: " + path);
    
    var options = {
	host: host,
	path: path
    };
    
    var graphicsmagic = require('gm');
    
    var gm;
    if(process.env.GRAPHICS != "GRAPHICSMAGICK"){
	gm = graphicsmagic.subClass({ imageMagick: true });
    }else{
	gm = graphicsmagic;
    }
    console.log("resizing to width "  + width);
    var callback = function(response) {
	console.log("in callback");
	if (response.statusCode === 200) {
            console.log("add good");
            res.writeHead(200, {
		'Content-Type': response.headers['content-type'], 
                'Access-Control-Allow-Origin' : '*'});
            gm(response)
		.resize(parseInt(width))
		.autoOrient()
		.stream(function(err, stdout, stderr){
		    if(err){
			console.log("error in resizing");
			console.log(err);
			res.end();
		    }else{
			console.log("resize ok");
			stdout.pipe(res);
		    }
		});
	}else{
            console.log("bad responde " + response.statusCode);
            res.writeHead(response.statusCode, {"Content-Type": "text/html"});
            res.write("<html><body>404 not found</bod></html>");
            res.end();          
	}
    };
    
    try{
	http.request(options, callback).on("error",function(msg){
	    console.log("got some error!!");
	    console.log(msg);
	    res.writeHead(404, {"Content-Type": "text/html"});
	    res.write("<html><body>404 not found</bod></html>");
	    res.end();                
	}).end();
	console.log("done parsing request");
    }catch(exception){
	console.log("got exception");
	console.log(exception);
	res.writeHead(404, {"Content-Type": "text/html"});
	res.write("<html><body>404 not found</bod></html>");
	res.end();          
    }
}


