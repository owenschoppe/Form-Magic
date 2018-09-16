(function() {

    if (window.location.href.includes('https://gus.my.salesforce.com/apex/adm_bugedit')||window.location.href.includes('https://gus.my.salesforce.com/apex/adm_userstoryeditsds')) {
        console.log("bug logger gus script");

        //listen for loaded message from injected script
        document.addEventListener('from_cke', function(e) {
            var data = e.detail;
            console.log("gus received " + data.greeting);
            if (data.greeting == "cke_loaded") {
                //ask for the data from the background page
                chrome.runtime.sendMessage({
                    greeting: "gus_script"
                }, function(response) {
                    console.log(response);
                    //forward the data
                    if (response.farewell == 'data') { //ignore if farewell == reset;
                        sendMsg(response);
                    }
                });
            } else if (data.greeting == "cke_complete") {
                //tell the background page that the cke script is complete
                chrome.runtime.sendMessage({
                    greeting: "gus_complete"
                }, function(response) {
                    console.log(response);
                });
            }
        });

        //inject script into page scope
        var s = document.createElement('script');
        s.src = chrome.extension.getURL('js/cke_script.js');
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head || document.documentElement).appendChild(s);

        //send data to injected script
        var sendMsg = function(data) {
            var evt = new CustomEvent("from_gus", {
                detail: data
            });
            console.log("gus sendMsg", evt);
            document.dispatchEvent(evt);
            // data = null;
        };
    }
})();
