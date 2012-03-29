/**
 * the markups are like this:
 * {
 *      p:{
 *          onclick: function(){...},
 *          id: "p_id",
 *          title: "I'm the p's title",
 *          s: "background: green; border: 1px solid blue" // assigned to p's style.cssText
 *          _:[ //content aka children elements
 *              "text before the span",
 *              { span : "I'm the span's text content"},
 *              {
 *                  a: {
 *                          href:"unreachable.com",
 *                          _: "click me!"
 *                     }
 *              },
 *              ...
 *          ]
 *        }
 * }
 *
 * @param elem
 * @param attrCon
 */
$E = (function(){
	var d = document;
	return function (dom){
		var node,guts,i;
		if(typeof dom === 'string')         //text node
			return d.createTextNode(dom);
		else if(dom instanceof Array)       // node array
		{
			node = d.createDocumentFragment();
			for(i in dom)node.appendChild($E(dom[i]));
		}
		else
		{
			for(i in dom)break;
			node = d.createElement(i);
			guts = dom[i];
			if(guts instanceof Array || typeof guts === 'string')   //only children
				node.appendChild($E(guts));
			else
				for(var k in guts)                                  //attributes &/or children
				{
					if(!guts.hasOwnProperty(k))continue;
					var v = guts[k];
					if(k === '_' )
						node.appendChild($E(v));				    //children
					else if(k === 'style')
						node.style.cssText = v;
					else
						node[k] = v;                                //other attributes
				}
		}
		return node;
	};
})();


