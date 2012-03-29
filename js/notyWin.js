bg = chrome.extension.getBackgroundPage();
document.addEventListener('DOMContentLoaded',function(){
	message = function (msg){
		document.title = 'Notification!';
		document.getElementById('msg').innerHTML = msg;

	};
	var queue = bg.notyWin._.queue,cmd;
	while(cmd=queue.shift())cmd();


});
