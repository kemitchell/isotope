require('colors');
var files = require('./files');

modules = 
[
	{
		"name" : "ECHO",
		"location" : "./echo"
	}
];

var pages = {"get":{}, "post":{}};

server = {
    add: function(path, callback, calltype){
        if (typeof path === 'string'){
            path = path.split("/");
        }
        var current_branch = calltype;
        for(var i = 0; i < path.length; i++){
            if (! (current_branch[path[i]])){
                current_branch[path[i]] = {};
            }
            current_branch = current_branch[path[i]];
        }
        current_branch._page = callback;
    },

    log: function(path, description, color){
        if (typeof path === 'string'){
            path = path.split("/");
        }


        if (color){
            console.log(("  ==>"+path)[color]);
            if(description){
                console.log(("         "+description)[color]);
            }
        } else {
            console.log(path);
        }
    },

    get: function(path, callback, description, color){
        this.add(path, callback, pages.get);
        this.log(path, description, "green");
    }, 

    post: function(path, callback, description){
        this.add(path, callback, pages.post);
        this.log(path, description, "red");
    },

    get_data: function(request, callback){
        var body = '';
        request.on('data', function(data){
            body += data;
            if (body.length > 1e6){
                request.connection.destroy();
                return {error: "the user attempted to post a file larger than 1GB"};
            }
        });
        request.on('end', function() {
            callback(qs.parse(body));
        });
    }  
}

exports.init = function(user_config) {
    if (user_config){
        modules = user_config.getModules();
    }
	modules.forEach(function(data){
		console.log("the "+data.name+" module has been loaded");
		require(data.location).init(server);
		console.log(" ");
	});
    console.log("loading the static file reference");
    server.get("static/_all", function(req, res, c, url){
        console.log(url["green"]);
        files.get_file(url.slice(0, -1), res);
    });
}


exports.view = function(url, type, params){
    var func;
    var vars = [];
    if (type == 'get' || type == 'GET' || type == '_get'){
        func = pages.get;
    } else if (type == 'post' || type == 'POST' || type == '_post') {
        func = pages.post;
    }

    
    while(url.length != 0){
        var name = url.shift();
        var tree2 = func[name];
        if (typeof tree2 === 'undefined'){
            if (func["_var"]){
                tree2 = func["_var"];
                vars.push(name);
            } else if (func["_csv"]){
                tree2 = func["_csv"];
                vars.push(name.split(","));
            } else if (func["_all"]){
                vars.push(name+"/"+url.join("/"));
                tree2 = func["_all"];
                url = [];
            }
        } 
        func = tree2;
        if (typeof func === 'undefined'){
            return;
        }
    }
    if (func._page){
        func._page.apply(null, params.concat(vars));
        return true;
    }
}


match = function(a, b) {
	return a==b || a=="_var" || b == "_var";
}
