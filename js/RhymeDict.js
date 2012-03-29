//////Screw the CSP, It takes the fun out of programming in javascript



//router
ex.onRequest.addListener(function(req,sender,res){
	if(sender.tab)//content.js
	{
		if(req.config)
		{
			res(new ConfigController(req)[req.config](req.set));
		}
		else if(req.lookup)
		{
			res(new LookupController(req)[req["in"]||'all'](req.lookup))
		}
	}
});
//omnibox
chrome.omnibox.onInputEntered.addListener(function(str){
	new LookupController().all(str);
});
//Activity Control
(function (){
    var active = false;
    toggleActivity =function (){

        active = !active;
	    tabs.query({},function(ts){
		    ts.forEach(function(t){tabs.sendRequest(t.id,{toggleActivity:true,"active":active})});
	    });
        if(active)
        {
            browserAction.setIcon({path:'image/icon-18.png'});
            browserAction.setPopup({popup:'popup.html'});
        }
        else
        {
            browserAction.setIcon({path:'image/icon-18-gray.png'});
            browserAction.setPopup({popup:''});
        }
    };


    browserAction.onClicked.addListener(function(tab){
        toggleActivity();

    });
    toggleActivity();
})();

