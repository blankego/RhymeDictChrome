bg = chrome.extension.getBackgroundPage();
get = document.getElementById;
function initPopup(){
    [].forEach.call(document.querySelectorAll('div.menu>div.item'),function(it){
        it.addEventListener('click',onMenuItemClicked);
    });

}
function onMenuItemClicked()
{
	//if(confirm("您確定要刪除全部辭書和設置嗎？"))
        new bg.MenuController()[this.id]();
}
document.addEventListener("DOMContentLoaded",initPopup);