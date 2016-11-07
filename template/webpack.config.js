var webpack           = require('webpack');
var OpenBrowserPlugin = require('open-browser-webpack-plugin');
var CleanWebpackPlugin = require('clean-webpack-plugin');

var log 			  = console.log;
var spawn  			  = require('child_process').spawn;
var isDebug			  = true;
var isBuildOne		  = false;
var buildOneEntry     = null ;

var arguments = process.argv.splice(2).join(' ');
if(arguments.indexOf('-build') != -1){
	isDebug = false;
}


var path           = require("path");
var glob           = require("glob");

var configs		   = glob.sync("./src/pages/**/*.json");

var entrys		   = glob.sync("./src/pages/**/*.entry.js");

var webpackEntrys  = {};
var webpackPlugins = [];

// 动态创建 html 文件，不用 html 插件，提高编译速度
function CreateHtml() {}
CreateHtml.prototype.apply = function(compiler) {
  	compiler.plugin("emit", function(compilation, callback) { 
		var tasks = [];
		configs.forEach(config=>{
			var scripts;
			var jsFile;
			var savePath =  config.replace('./src/pages/','').replace('.json','.html');
			if(isDebug){
				jsFile   = config.replace('./src/pages/','/').replace('.json','.js');
				scripts  = `
						<script src="/static/libs/dist/libs.js" type="text/javascript"></script>
						<script src="/common.js"></script>
						<script src="${jsFile}""></script>
					</body>
					</html>`;
			}else{
				jsFile   = config.replace('./src/pages/','/fe/dist/').replace('.entry.js','.js');
				scripts  = `
						<script src="/static/libs/dist/libs.min.js" type="text/javascript"></script>
						<script src='/fe/dist/common.js'></script>
						<script src='${jsFile}'></script>
					</body>
					</html>`;
			}
			var rf    = require("fs");  
			var template = JSON.parse(rf.readFileSync(config).toString()).template;
			var data  = rf.readFileSync("./templates/" + template + "/layout.html","utf-8");  
			var fileContents = data.replace(/<!--buildjs-->(.|\n)*/gi,scripts);

			compilation.assets[savePath] = {
		      source: function() {
		        return fileContents;
		      },
		      size: function() {
		        return fileContents.length;
		      }
		    };
		})
		callback();
	});
};


// init webpackEntrys ,  
// init webpackPlugins ,  
(function(){

	// 特殊页面模板转换
	var conver = {
		'./src/pages/login.entry.js':'./src/pages/layout/empty.html'
	};

	var entryName = '';
	var obj 	  = null;
	entrys.forEach(entry=>{
		entryName = entry.replace('./src/pages/','').replace('.entry.js','');
		webpackEntrys[entryName] = entry;
	});
})();

webpackPlugins.push(new webpack.optimize.CommonsChunkPlugin('common.js'));

webpackPlugins.push(new CreateHtml());

if(!isDebug){
	webpackPlugins.push(
		new CleanWebpackPlugin(['dist'], {
			verbose: true, 
			dry: false
		})
	);
	webpackPlugins.push(new webpack.optimize.UglifyJsPlugin({
		output: {
			comments: false,  // remove all comments
		},
		compress: {
			warnings: false
		}
	}));
}else{
	webpackPlugins.push(new OpenBrowserPlugin({url: 'http://localhost:8080'}));
	webpackPlugins.push(new webpack.HotModuleReplacementPlugin());
}


var webpack_config = {
	entry:webpackEntrys,

	output: {
		filename: '[name].js',
		path: path.join(__dirname, "dist"),
	},

	externals: {
	    'vue': 'Vue'
	},
	
	module: {
		loaders:[
			{test: /\.js[x]?$/, exclude: /node_modules/, loader: 'babel-loader?presets[]=es2015'},
			{test: /\.vue$/, loader: 'vue'},
			// {test: /\.css$/, loader: 'style!css'}
		]
	},
  	plugins:webpackPlugins,

	devServer: {
	    historyApiFallback: true,
	    hot: true,
	    inline: true,
	    progress: true,
	}
};

console.log(webpack_config);

module.exports = webpack_config;