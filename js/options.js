

window.addEventListener("DOMContentLoaded", function(){
	bg = chrome.extension.getBackgroundPage();
	dbm = bg.dbm;
	olm = bg.olm;
	$ = function(sel){return document.querySelector(sel)};
	$$ = function(sel){return  document.querySelectorAll(sel)};

	modalDlg = (function(){
		var modal, div, content,close;
		function Modal (){
			if(!div)
			{
				var me = this;
				div = $E({
					div:{
						style:"display:none",
						_:[
							{div:{
								style:"position:fixed;left: 0;top:0;width:100%;height:100%;opacity: 0.3;z-index: 3000;background: #000;"
							}},
							{div:{
								style:"padding: 15px;position: fixed;width:33%;left: 33%;top:33%;opacity:1.0;border-radius:15px;box-shadow: 0px 0px 10px black;background: #ffffff;z-index: 5000;",
								_:[
									{div:""},
									{
										button:{
											_:"close",
											onclick:me.close.bind(me)
										}
									}
								]
							}}
						]
					}
				});
				content = div.childNodes[1].childNodes[0];
				close = content.nextSibling;
				document.body.appendChild(div);
			}
		}

		Modal.prototype = {
			open : function(msg,noClose){
				close.style.display = noClose? "none":"block";
				div.style.display = "block";
				if(msg && content)
					content.innerHTML = msg;
			},
			close: function(){
				div.style.display = "none";

			}

		};

		return modal?modal:(modal = new Modal);
	})();

	var dictList = document.querySelector("#dictList");

	function listDicts (){

		var lst = Object.keys(dbm.dicts)
			.filter(function(k){return isNaN(k)})
			.map(function(k){
			var d = dbm.dicts[k];
			return '<tr><td>' + d.label + '</td><td>' + d.totalRecs + '</td>'+

				'<td><input type="radio" name="activeDictRadio" value="'+ d.id+'" '+
			       (d.id == localStorage.mainDictId?'checked="checked"':'')+'/></td>'+

			    '<td>'+(d.view?('<input type="button" value="刪除" class="delBtn" id="del'+d.id+'"/>'):'')+
			               '</td></tr>';
		});
		var olLst = olm.list
			.map(function(d){
			return '<tr><td>'+d.label+'</td><td></td>'+
			       '<td><input type="radio" name="activeDictRadio" value="'+d.id+'"'+
			       (d.id == localStorage.mainDictId?'checked="checked"':'')+'/></td>'+
			       '<td>'+
			       (d.id != 201?('<input type="button" value="刪除" class="delBtn" id="del'+d.id+'"/>'):'')+
			       '</td></tr>';
		});


		dictList.innerHTML = '<table><tr><th>辭書名</th><th>辭條數</th><th>首選</th><th></th></tr>'+
			lst.join('') +olLst.join('') + '</table>';
		var radios = dictList.querySelectorAll('input[name=activeDictRadio]');
		for(var i=0,r;r=radios[i];i++)
		{
			r.onchange = function(){
				for(var j=0,rad;rad=radios[j] ;j++)if(rad.checked)break;
				bg.mainDictId(rad.value);
			};
		}
		var delBtns = dictList.getElementsByClassName('delBtn');
		for(var i=0,b;b=delBtns[i];i++)
			b.onclick = function(e){
				var id = this.id.replace('del','');
				var manager = Number(id)>200?bg.olm:bg.dbm;
				if(!confirm('確定要刪除'+ manager.dicts[id].label+'嗎'))return;
				manager.removeDict(id,listDicts);
			};
	}

	listDicts();



	//shortcut
	function showShortcut(){
		var span = $('#shortcut'), sc = new bg.ConfigController().pickWordShortcut();
		span.innerHTML = sc.modifiers
			.map(function(m){return m.replace('Key','')})
			.concat([String.fromCharCode(sc.key)])
			.join(' + ');
	}
	showShortcut();

	$('#changeShortcut').onclick = function(e){

		function listenShortCut(e){
			var sc = {
				modifiers:["altKey","ctrlKey","shiftKey","metaKey"]
					.filter(function(k){return e[k]}),
				key:e.which
			};
			new bg.ConfigController().pickWordShortcut(sc);
			showShortcut();
			chrome.tabs.query({},function(ts){
				ts.forEach(function(t){
					chrome.tabs.sendRequest(t.id,sc);
				});
			});
			modalDlg.close();
			self.removeEventListener("keyup",listenShortCut,true);
		}
		modalDlg.open("請輸入按鍵組合...",true);

		self.addEventListener("keyup",listenShortCut,true);
	};

	function importFolder(toWhat){
		return function(e){
			var files = e.target.files;
			if(!files.length)return;
			toWhat['importFromPackage'](files, function(err){
				if(err)alert(err);
				$('#fChoosers').reset();
				listDicts();
			});
		};
	}

	//choose package folder
	$("#dictPkg").onchange = importFolder(dbm);
	$('#olConfig').onchange = importFolder(olm);

});
