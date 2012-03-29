///*** CLASS Controller ***/
{
	Controller = function(req){
		this.req = req;
	};
}

///*** CLASS MenuController ***/
{
	MenuController = function(req){
		MenuController.__super__.constructor.call(this, req);
	};

	MenuController.prototype = {

		help: function(){
			tabs.create({url: 'help.html'});
		},

		close: function(){
			toggleActivity();
		},

		test: function(){
			tabs.create({url: "tests/test.html"});
		},

		options: function(){
			tabs.create({url: 'options.html'});
		},

		test2: function(){
			console.log('test2 clicked');
			var total = 2500, progress = 0, noty = new ProgressNoty(total);
			var iId = setInterval(function(){
				noty.send(progress += 20);
				if(progress >= total)clearInterval(iId);
			}, 50);
		},

		clear: function(){
			for(var mk in Models)
			{
				Models[mk].tx().drop().commit(
					(function(mk){return function(){console.log(mk + "dropped!")}})(mk)
				);
			}
			localStorage.clear();
			console.log("localStorage cleared!");
		}

	};


	__extends(MenuController, Controller);
}


/*** CLass ConfigController ***/
{
	ConfigController = function(req){
		ConfigController.__super__.constructor.call(this, req);
	};

	ConfigController.prototype = {

		pickWordShortcut: function(newVal){
			if(newVal)
			{
				localStorage.pickWordShortcut = JSON.stringify(newVal);
			}

			return localStorage.pickWordShortcut ?
			       JSON.parse(localStorage.pickWordShortcut):
			       this.pickWordShortcut({modifiers: ['altKey'], key: 82}); //alt + R

		}
	};

	__extends(ConfigController, Controller);
}

/*** CLASS LookupController ***/
{
	LookupController = function(req){
		LookupController.__super__.constructor.call(this, req);
		this.position = req && req.position;
	};
	LookupController.prototype = {
		render: function(view, data, partial){
			//compute the viewWin position
			var wW = 420, wH = 305
				,props = {width:wW,height:wH};
			data = data ||{noMatch:true};

			if( this.position)
			{
				var p = this.position;
				if(p)
				{
					var l = p[0], t = p[1], r = p[2], b = p[3],
						sW = screen.width, sH = screen.height,
						wL, wT;

					if(sW - r - 5 > wW)
					{
						wL = r + 5;
						wT = sH - t > wH? t: sH - wH - 3
					}
					else
					{
						wL = sW - wW - 5;
						wT = sH - b - 10 > wH? b + 10: t - wH - 10;
					}
					mixin(props,{left: wL, top: wT});
					console.log(p, props);
				}
			}
			data.type = 'dict';
			viewWin.render("MultiDict",view, data,  props);
		},
		all: function(hw,dictId){
			dictId = dictId || mainDictId();
			var me = this;
			Models.DictIdx.findAllByHw(hw,function(rs){
				rs = rs || [];
				var lcIds = rs.map(function(rec){return rec.dict_id})
					,lcdicts = lcIds.map(function(id){return dbm.dicts[id].info})
					,oldicts = (navigator.onLine ? olm.list.slice(): [])
					//try online dict repo
					,activeDict = olm.dicts[dictId]
					,data = {hw:hw,activeDict:activeDict,dicts:lcdicts.concat(oldicts)}
					;

				//online dict is chosen
				if(activeDict && navigator.onLine )
				{
					return me.render("OnlineDict",data);
				}

				//online fallback
				if(!rs.length && navigator.onLine)
				{
					return me.render("OnlineDict",mixin(data,{activeDict:defaultOLDict()}));
				}

				//has local match
				if(rs.length)
				{
					//chosen dict is an online one but the browser is offline
					if(dictId >200)
					{
						//fallback to the local default
						activeDict = dbm.dicts[lcIds[0]];
					}
					//Still no activeDict, that means the chosen is a local one
					if(!activeDict)
					{
						var idIdx  =  lcIds.indexOf(dictId);
						activeDict = idIdx >= 0?
						               dbm.dicts[lcIds[idIdx]]: //chose one
					                   dbm.dicts[lcIds[0]];     //or default one
					}
					return activeDict.findAllByHw(hw, function(rs){
						me.render(
							activeDict.view || activeDict.modelName,
							mixin(data,{activeDict:activeDict,entries:rs})
						);
					});
				}

				//All fail
				me.render("noMatch");
			});
		},
		Qx: function(hw){
			var me = this;
			Models.Qx.findByPk(hw,function(rs){
				if(!rs)me.render('noMatch')
				else
				{
					me.render('Qx', {entries: [rs]});
				}

			});
		}
	};

	__extends(LookupController, Controller);
}

