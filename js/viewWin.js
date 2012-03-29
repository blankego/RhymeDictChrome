var bg = chrome.extension.getBackgroundPage()
	,viewCache = {}
	,layoutCache = {}
	;

getView = function (vName){

	if(!viewCache[vName])
	{
		viewCache[vName] =
			localStorage["view_"+vName] || bg.readUrlSync("views/"+vName+'.html');

	}
	return viewCache[vName];
};

getLayout = function(layoutN){
	layoutN = layoutN+'.html';
	if(!layoutCache[layoutN])
	{
		layoutCache[layoutN] =
		Mustache.compile(localStorage['view_'+layoutN]|| bg.readUrlSync("views/"+layoutN));
	}
	return layoutCache[layoutN];
};
mark2dom = (function(){
	var pat = /`(.+?)`|\[([^\]]+)\]|\{(.+?)\}/g;
	var dict = {
		'`':"properName",
		'{':"ann",
		'[':"cet"
	};
	return function mark2dom (str){
		function replace(str,part){
			var cls = dict[str[0]];
			return '<span class="'+cls+'">'+str.substr(1,str.length-2)+'</span>';
		}
		return str.replace(pat,replace);
	}
})();

function hookupMultiDict(data){
	var dLabels = document.getElementsByClassName("dict-label");

	[].forEach.call(dLabels,function(lab){
		lab.onclick = function(e){
			new bg.LookupController().all(
				document.getElementById('hw').textContent.trim(),
				Number(lab.id.replace('dict_',''))
			);
		}
	});
	document.getElementById('dict_'+data.activeDict.id).classList.add("active");

	//style stuff:
	var defs = document.querySelectorAll('.dict-definition');
	for(var i=0,def;def=defs[i];i++)
	{
		def.innerHTML = mark2dom(def.textContent);
	}

	//online dict
	var ad = data.activeDict;
	if(ad.online)
	{
		var con = document.getElementById('ol-container');
		ad.getEntry(data.hw,function(dom){con.appendChild(dom)});
	}
}

document.addEventListener("DOMContentLoaded",function(){
   render = function(layoutName, view,data){

	    if(view == "noMatch")
	        document.body.innerHTML = "No Match!";
	    else
	    {
		    document.title = data.activeDict.label;
			msg = data;
		    layout = getLayout(layoutName);
		    partial = {partial:getView(view)};
			document.body.innerHTML = layout(data,partial);
		    self['hookup'+layoutName](data);

	    }
   };
	var queue = bg.viewWin.queue, cmd;
	while(cmd = queue.shift())cmd();
});