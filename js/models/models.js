mainDictId =(function (){
	var mId;
	return function(newId){
		if(newId)return mId = parseInt(localStorage.mainDictId = newId,10);

		if(mId)return mId;
		return (mId = parseInt( localStorage.mainDictId?
				           localStorage.mainDictId:
			               (localStorage.mainDictId = '1'),10));

	};
})();

defaultOLDict =(function(){
	var dId;
	return function(newId){
		if(newId)return olm.dicts[dId = parseInt(localStorage.defaultOLDcitId = newId,10)];
		if(dId)return olm.dicts[dId];
		return olm.dicts[dId = parseInt(localStorage.defaultOLDcitId?
				localStorage.defaultOLDcitId:
			    (localStorage.defaultOLDcitId = '201'),10
			)];
	};
})();

AR.openDB("mydb", "1.0", "");


FileImporter = function(urlOrFileLists){
	if(typeof urlOrFileLists === 'string')
		this.baseUrl = urlOrFileLists;
	else
		this.fileList = urlOrFileLists;
};

FileImporter.prototype.load = function(fName, type){
	if(this.baseUrl)return readUrlSync(this.baseUrl + fName, type);
	return readFileSync(
		[].filter.call(this.fileList,function(f){return f.fileName == fName})[0],
		type
	);
};
FileImporter.prototype.has = function(fName){
	if(this.baseUrl)return this.load(fName)?true:false;//TODO: does this work?
	return [].some.call(this.fileList,function(file){
		return file.fileName == fName;
	});
};

DBManager = function(){

	//init models
	this.loadTableConfigs(new FileImporter("data/"));//prefined data importer
};

DBManager.prototype.loadTableConfigs = function(importer, cb, pkgName){
	this.dicts = {};
	if(!localStorage.dbTables)this.getPredefined();
	var dbTables = this.dbTables = JSON.parse(localStorage.dbTables)
		, tNames = Object.keys(dbTables)
		;
	var checkQueue = [];
	var me = this;
	tNames.forEach(function(modName){
		var config = dbTables[modName];
		var model = AR.configModel(modName, config);
		if(config.type == 'dictHw')
			me.dicts[modName] = me.dicts[config.id] =  model;

		//save views to the localStorage

		if(config.view && importer.fileList && importer.has(config.view+'.html')) //update the view every time a filelist is loaded
			localStorage["view_"+config.view] = importer.load(config.view+'.html');
		checkQueue.push(function(){
			model.tx()
				.check(function(exists,table,checkCb){
					initTableIfNotExists(importer,exists,table,function(){
						var check = checkQueue.shift();
						if(check)
							check();
						else if(cb)
							cb();
						if(checkCb)checkCb();
					});
				})
				.commit();
		});

	});
	checkQueue.length && checkQueue.shift()();
};


/**
 * load table configs shipped with the extension
 */
DBManager.prototype.getPredefined = function(){
	localStorage.dbTables = JSON.stringify(readUrlSync('data/models.json', 'json'));
	return this;
};

/**
 *
 * @param {FileList}files
 */
DBManager.prototype.importFromPackage = function(files, cb){
	//Just set the configs, and let the loadTableConfigs do the importing thing
	if(!files.length)return cb("the folder is empty");

	var scheme;
	for(var i = 0, f; f = files[i]; i++)//It's a shame that FileList ain't real array
	{
		if(!scheme && f.name.match(/models.json$/))
		{
			scheme = readFileSync(f, 'json');
			break;
		}
	}
	if(!scheme)return cb("Invalid package!");//invalid package


	var me = this;
	Object.keys(scheme).forEach(function(modName){
		if(me.dbTables.hasOwnProperty(modName))return;
		me.dbTables[modName] = scheme[modName];
	});
	localStorage.dbTables = JSON.stringify(this.dbTables);
	this.loadTableConfigs(new FileImporter(files), cb);
};

DBManager.prototype.removeDict = function(dictId,cb){
	var me = this;
	var model = this.dicts[dictId];
	delete this.dicts[dictId];
	delete this.dicts[model.modelName];
	var rels = model.relations || {};
	var delQueue = [];
	function delModel(name){
		delQueue.push(function(){
			AR.removeModel(name,function(){
				notyWin(name + "已刪除！");
				delete me.dbTables[name];
				var delCommand = delQueue.shift();
				if(delCommand)delCommand();
			});
		});
	}
	Object.keys(rels).forEach(function(relName){
		delModel(rels[relName].refModel);
	});
	delModel(model.modelName);
	delQueue.push(function(){
		if(dictId == mainDictId())mainDictId(1);
		localStorage.dbTables = JSON.stringify(me.dbTables);
		me.loadTableConfigs(new FileImporter("data/"),cb);
	});
	delQueue.shift()();
};
/**
 *
 * @param {FileImporter} importer
 * @param {Boolean} exists
 * @param {ArTable} table
 */
function initTableIfNotExists (importer, exists, table, cb){
	if(!exists)
	{
		var tx = table.tx();//null,true);
		if(!tx.importCsv)
		{
			//Merely create, do no importing
			tx.create().commit(function(){if(cb)cb()});
			return;
		}

		console.log(importer, table.csv);
		var tName = table.label || table.name;
		notyWin("正在導入"+tName);
		tx.create()
			.importCsv(importer.load(table.csv))//TODO: how to import the csv
			.commit(function(){
				table.ready = true;
				notyWin(tName +'的導入己完成');
				if(cb)cb();
			});
	}
	else
	{
		if(cb)cb();
	}
}
;

dbm = new DBManager();


OLDict = (function(){
	/**
	 *
	 * @param {Object} info {queryPattern:blah,id:blah}
	 *                  queryPattern is something like dictonline.com/?q=@@HW@@&cond=blah
	 *                  id  ids of the online dictionaries should be greater than 200 so that they
	 *                      can be distinguished from the local ones
	 *
	 */
	function OLDict(info){
		mixin(this,info);
	}
	OLDict.prototype = {
		createUrl: function(hw){
			return this.queryPattern.replace('@@hw@@',hw);
		},
		transform: function(xsl,xml){
			window.xsl = xsl;//debug
			var trans = new XSLTProcessor();
			trans.importStylesheet(xsl);
			return trans.transformToFragment(xml,document);
		},
		getXsl: function(xslName){
			return new DOMParser().parseFromString(
				localStorage['xsl_'+xslName] || readUrlSync('views/'+xslName+'.xsl'),
				'text/xml'
			);
		},
		getEntry: function(hw,cb){
			var me = this;
			readUrl(this.createUrl(hw),this.contentType,function(data){
				if(me.contentType=='document')
				{
					dom = data;//debug
					cb(me.transform(me.getXsl(me.xsl),data));
				}
				else //json //:TODO
				{

				}
			});
		}

	};
	return OLDict;

})();

//TODO: google dict unoffical api
GDict = (function(){
	function GDict(info){
		GDict.__super__.constructor.call(this,info);
	}

	GDict.prototype ={
		setLanguage: function(lang){}
	};
	__extends(GDict,OLDict);
})();

///*** CLASS OnlineDictManager ***/
{
	OLDictManager = function(){
//		this.list = [];
//		this.dicts = {};
		this.loadConfigs();
	};
	OLDictManager.prototype = {
		getPredefined: function(){
			if(!localStorage.olDicts)
			{
				this.configs = readUrlSync('data/ol_dicts.json','json');
				localStorage.olDicts = JSON.stringify(this.configs);
			}
			else
				this.configs = JSON.parse(localStorage.olDicts);
			return this;
		},
		loadConfigs: function(){
			this.list = [];
			this.dicts = {};
			var me = this;
			Object.keys(this.getPredefined().configs).forEach(function(olName){
				var olInfo = me.configs[olName];
				var ol = new OLDict(olInfo);
				ol.name = olName;
				me.dicts[ol.id] = me.dicts[olName] = ol;
				me.list.push(ol);
			});

		},
		removeDict: function(id,cb){
			var ol = this.dicts[id];
			delete this.configs[ol.name];
			if(ol.xsl)delete localStorage['xsl_'+ol.xsl];
			localStorage.olDicts = JSON.stringify(this.configs);
			this.loadConfigs();
			if(cb)cb();
		},
		addDict: function(name,info,cb,fList){
			this.configs[name] = info;
			if(fList)
			{
				if(info.xsl)
				{
					var xslFile = []
						.filter
						.call(fList,function(f){return f.fileName ==info.xsl+'.xsl'})[0];
					if(xslFile)localStorage['xsl_'+info.xsl]= readFileSync(xslFile);
				}
				if(info.view)//mustache template
				{
					//TODO:
				}
			}
			localStorage.olDicts = JSON.stringify(this.configs);
			this.loadConfigs();
			if(cb)cb();
		},
		importFromPackage: function(files,cb){
			var config =JSON.parse(readFileSync(
				[].filter.call(files,function(f){return f.fileName == 'config.json'})[0]
			));
			if(!config)return cb("Invalid package");
			for(var n in config)break;
			this.addDict(n,config[n],cb,files);

		}

	};
}
olm = new OLDictManager();


