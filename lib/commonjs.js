var require = (function() {
 
    // memoized export objects
    var modPool = {};
 
    // don't want outsider redefining "require" and don't want
    // to use arguments.callee so name the function here.
    return  function(name) {
        if (modPool.hasOwnProperty(name))
		{
            return modPool[name];
        }
        var exports = {};
        // memoize before executing module for cyclic dependencies
        modPool[name] = exports;
        var xhr = new XMLHttpRequest();
		var fname = name+'.js';
		xhr.open('GET',fname,false);
		xhr.onreadystatechange = function(){
			if(xhr.readyState === 4)
			{
				var js = "(function(require,exports){" + xhr.responseText + ";return exports;})(require,exports);";
				//console.log(js);				
				eval(js);
				//console.log(exports);
			}			
		};
		xhr.onerror = function(){
			throw xhr.statusText + " "+ name +" failed to load";
		};
		xhr.send();
		
        return exports;
    };

})();
 
var run = function(name) {
    require(name); // doesn't return exports
};

