///*** CLASS PopWin
{
	PopWin = (function(){
		function PopWin(props){
			this.win = this.winId = null;
			this.createProps = props||{};
			this.queue = [];
		}

		mixin(PopWin.prototype,{
			open:function(props,cb){
				var me = this;
				if(this.win)
				{
					wins.update(this.winId,mixin(props,{state:'normal',focused:true}),
						function(){cb(me.win)});
				}
				else
				{

					if(this.notReady)
					{
						this.queue.push(function(){cb(me.win);});
					}
					else
					{
						this.notReady = true;
						wins.create(mixin(props, {type:'popup'},this.createProps),function(w){
							me.winId = w.id;
							wins.onRemoved.addListener(function(wId){
								if(wId === me.winId)me.win = me.winId = null;
								delete me.notReady;
							});

							me.win = ex.getViews({windowId:w.id})[0];
							if(!me.win )
							{
								me.queue.push(function(){cb(me.win)});
								var iId = setInterval(function(){
									me.win = ex.getViews({windowId:w.id})[0];
									if(!me.win)return;
									clearInterval(iId);
									delete me.notReady;

								},50);
							}
							else
							{
								cb(me.win);
								delete me.notReady;
							}

						});
					}
				}
			}
		});
		return PopWin;

	})();
}

///*** CLASS NotyWin
{
	NotyWin = (function(){
		function NotyWin (props){NotyWin.__super__.constructor.call(this, props)}
		NotyWin.prototype.open = function(cb){NotyWin.__super__.open.call(this, {}, cb);};
		__extends(NotyWin, PopWin);
		return NotyWin;
	})();
}

function notyWin (msg){
	notyWin._.open(function(w){
		if(w.message)w.message(msg);
		else
		{
			notyWin._.queue.push(function(){w.message(msg)});
		}
	});
}
notyWin._ = new NotyWin({width:300,height:200,url:'notyWin.html'});


///*** CLASS ViewWin
{
	ViewWin = (function(){
		function ViewWin (props){ViewWin.__super__.constructor.call(this, props)}
		ViewWin.prototype = {
			render: function(layout, view, data, props){
				var me = this;
				this.open(props, function(w){
					if(w.render)
						w.render(layout, view, data);
					else
						me.queue.push(function(){w.render(layout,view,data)});
				});
			}
		};
		__extends(ViewWin, PopWin);
		return ViewWin;
	})();
}

viewWin = new ViewWin({url:'viewWin.html'});
