var doc = document
	,tabs = chrome.tabs
	,ex = chrome.extension
	,wins = chrome.windows
	,browserAction = chrome.browserAction
	;

__extends = function(deriv,base){
	deriv.prototype.__proto__ = base.prototype;
	deriv.__super__ = base.prototype;
	return deriv;
};

function mixin(){
	var fst = arguments[0] || {};

	for(var i=1,oi;oi=arguments[i];i++)
	{
		if(oi)Object.keys(oi).forEach(function(k){fst[k]=oi[k]});
	}
	return fst;
}

function loadModule(jsName){
    var module ;
    if(module = self[jsName])return module;
    else
    {
        var jsUrl = ex.getURL("js/"+jsName+'.js');
        if(doc.querySelector('script[src="'+jsUrl+'"]'))return module;
        var script = doc.createElement('script');
        script.setAttribute('src',jsUrl);
        doc.body.appendChild(script);
        return self[jsName];
    }
}
readUrl = (function(){
	var mimeMap = {text:"text/plain",document:"text/xml",json:"text/json"};
	return function (url,contentType,cb,sync){
		contentType = contentType||'text';
		var xhr = new XMLHttpRequest();
		xhr.open('GET',url,!sync);
		xhr.responseType =  contentType=='json'?'text':contentType;
		xhr.overrideMimeType(mimeMap[contentType]);
		var res;
		try
		{
			if(sync)
			{
				xhr.send();
				if(xhr.status!=200)throw xhr.statusText;
				res = contentType == 'json'? JSON.parse(xhr.response): xhr.response;
				return cb? cb(res): res;
			}
			else
			{
				xhr.onreadystatechange = function(){
					if(xhr.readyState != 4)return;
					if(xhr.status!=200)throw xhr.statusText;
					res = contentType == 'json'? JSON.parse(xhr.response): xhr.response;
					return cb(res);
				};
				xhr.send();
			}
		}
		catch(e)
		{
			console.log(e);
		}
	}
})();


function readUrlSync(url, contentType){
    return readUrl(url,contentType,null,true);
}

/**
 * @param {File}file
 * @returns String  :file content
 */
function readFileSync(file,type){
	try
	{
		var url = webkitURL.createObjectURL(file);
		return readUrlSync(url,type);
	}
	finally
	{
		webkitURL.revokeObjectURL(url);
	}
}


//------------------ Notitfications-------------
noty = {};
(function(){
    var cbs={};
    registerNoty = function (win)
    {
        noty[win.name] = win;
        if(cbs[win.name])
        {
            cbs[win.name](win);
            delete cbs[win.name];
        }

    };
    openNoty = function (name,cb){
        if(noty[name])
        {
            if(cb)cb(noty[name]);
            return;
        }
        var n = window.webkitNotifications.createHTMLNotification(name+".html");
        n.onclose = function(){delete noty[name]};
        if(cb)cbs[name]=cb;
        n.show();
    };
})();

//-----------------------------------------------
