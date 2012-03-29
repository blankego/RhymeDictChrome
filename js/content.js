var doc = document
    ex = chrome.extension ;

function loadScript(jsName,dir){
    dir = dir|| "js/ui/";
    var jsUrl = ex.getURL(dir+jsName+'.js');
    if(doc.querySelector('script[src="'+jsUrl+'"]'))return;
    var script = doc.createElement('script');
    script.setAttribute('src',jsUrl);
    doc.body.appendChild(script);
}

(function(){

	var req = ex.sendRequest;
	function initWatch()
	{
		var active = true;
		req({config:"pickWordShortcut"},function(res){
			//get shortcut key
			var modifiers = res.modifiers,
				key = res.key;

			//get screen position
			var pos = null
				,startX,startY,endX,endY
				;
			ex.onRequest.addListener(function(data){
				if(data.key)
				{
					modifiers = data.modifiers;
					key = data.key;
				}
				else if(data.toggleActivity)
				{
					active = data.active;
				}
				//console.log(data);
			});

			self.onmousedown = function(e){
				startX = e.screenX;
				startY = e.screenY;
			};
			self.onmouseup = function(e){
				endX = e.screenX;
				endY = e.screenY;
				var sel = getSelection();
				if(sel.type === 'Range') //assume it's a snippet selection
				{
					var tmp;
					if(endX < startX){tmp=startX;startX=endX;endX=tmp}
					if(endY < startY){tmp=startY;startY=endY;endY=tmp}
					if(endX - startX < 3)
					{
						var range = sel.getRangeAt(0);
						var rect = range.getBoundingClientRect();
						startX = Math.round(endX - rect.width);
						startY = Math.round(endY - rect.height);
					}
					pos = [startX,startY,endX,endY];
					console.log(pos);
				}
			};

			self.onkeydown =function(e){

				if(active && modifiers.every(function(m){return e[m]}) &&
				   e.which === key && doc.getSelection().type==="Range")
				{
					var selection = getSelection().toString();
					if(selection)
					{
						e.preventDefault();
						e.stopPropagation();
						//console.log(selection,pos);
						req({lookup:selection,"in":"all",position:pos}); //TODO:postition
					}
				}
			};

		});

	}

	initWatch();
})();

