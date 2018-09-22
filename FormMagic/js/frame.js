(function(){
  //prevents this script from executing multiple times.
  if (window.hasRun) return;
  window.hasRun = true;
  console.log("form magic frame script");

  // chrome.extension.sendMessage({greeting: "frame_script", loaded: window.location.href});
  let temp_recording = {};
  let record = false;
  let ids = new Map();
  let baseTime = "";

  // //Listen for messages from injected scripts
  chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
          console.log(request.greeting);
          //Receive data from backgroud script
          if (request.greeting == "start_recording") {
              console.log("from_background", request);
              document.addEventListener('click',logActivity,true);
              document.addEventListener('keydown',logActivity,true);
              sendResponse({
                  farewell: "starting"
              });
              // injectScripts(sender.tab);

              //This is our hard coded script
              // fill();

              if(!record){
                temp_recording.url = window.location.host;
                temp_recording.template = [];
                record = true;


                //Insert stop button into page
                renderButton();
              }
          } else if (request.greeting == "play_recording") {
            console.log('play',request);
            playRecording(request.data);
            sendResponse({farewell:"playing"});
            //Add an indication to the screen that the recording is playing. And when it stops. Maybe animate the icon. Maybe add an on-screen notification.
          } else if (request.greeting == "ping") {
            console.log('ping',request);
            sendResponse({farewell:"pong"});
          }
        });

  let logActivity = async function (event){
    if(record) {
      console.log(event.type,event.target,Object.prototype.toString.call(event.target),Object.prototype.toString.call(event).includes('MouseEvent'),event);
        //ENTER on combobox item is ignored. Must use mouse.
        //Clicking on icon button registers SVG as target. Must traverse up to find button/link parent with id.
        //Need a function to string together consecutive keydown entries on the same input into one value.
          //Since we can't anticipate the various rules of how those presses will be interpretted. I suggest we log the id, ignore the keycode, and at the end or next tab/click, request the "value" for the input.

        let getSelector = async function(event){
          let tag = event.target.tagName;

          //use the slashes to escape the colon. One for js one for css. We may need to double escape when pushing to storage.
          // let id = event.target.id?"#"+event.target.id.replace(':','\\3A ').replace(';','\\;'):"";
          //get the escaped version of the selector id
          let idF = await function(id){
            return new Promise((resolve,reject) => {
              chrome.runtime.sendMessage({
                  greeting: "frame",
                  command: "cssEscape",
                  data: id
              }, function(response) {
                  // console.log(response);
                  resolve(response.cssValue);
              });
            });
          };

          //Since selectors are unreliable how else can we locate these elements?
          //We could traverse up the tree and locate the index of the parent among it's siblings and store this traversal. That coupled with the selector should work.
          //If we combined the indexed location with the event path, then perhaps we could do some searching in the neighborhood.
          /*
          var indexedLocation = {};
          var findChildIndex = function(child){
            var i = 0;
            while( (child = child.previousSibling) != null ) {
              i++;
              //at the end i will contain the index.
            }
            //store i
            indexedLocation.unshift(i);
            //get next index
            if(child.parentNode != document){
              findChildIndex(child.parentNode);
            }
          }
          //ALT, slightly slower...
          for(var i = 0; i<input.parentNode.childElementCount; i++){
            console.log(i,input.parentNode.children[i]);
            if(input.parentNode.children[i] == input){
            	console.log(found);
              //save out this index for this parent.
              //go to next parent
            	break;
            }
          }
          */

          let classesF = function(classList){
            return new Promise((resolve,reject) => {
              let classes = "";
              for (var className of classList){
                classes += "."+className;
              }
              resolve(classes);
            });
          };

          var escapedId = await idF(event.target.id);
          var classes = await classesF(event.target.classList);
          // let classes = "";
          // for (var className of event.target.classList){
          //   classes += "."+className;
          // }
          let selector = tag+escapedId+classes;
          console.log('selector',selector);

          return selector;
        }

        let buildLogItem = async function(event){
          let item = {};
          item.selector = await getSelector(event);
          item.proto = Object.prototype.toString.call(event).includes("KeyboardEvent") ? "KeyboardEvent" : "MouseEvent";
          item.keyCode = event.keyCode || "";
          item.type = event.type
          item.key = event.key || "";
          item.delay = item.proto=="KeyboardEvent"? 10 : Date.now() - (baseTime || Date.now()); //Don't wait for keyboard events.
          console.log('log line',item);
          return item;
        }

        let logItem = await buildLogItem(event);

        temp_recording.template.push(logItem);
        baseTime = Date.now(); //reset the base to be relative to the last event.
    }
  };

  function renderButton() {
    var button = document.createElement('button');
    button.id = "formMagicStopButton";
    button.style.position = 'fixed';
    button.style.width = "auto";
    button.style.height = "2rem";
    button.style.top = "2rem";
    button.style.right = "2rem";
    button.style.zIndex = "100000";
    button.style.boxSizing = "border-box";
    button.style.background = "#0070D2";
    button.style.color = "white";
    button.style.borderRadius = ".25rem";
    button.style.border = "none";
    button.textContent = "Stop Recording";
    button.style.padding = "0 1rem";

    document.body.insertBefore(button, document.body.lastChild.nextSibling);

    button.addEventListener("click", stopRecording, true);
  }

  let stopRecording = function(event){
    console.log("stop recording");
    record = false;
    event.target.parentNode.removeChild(event.target);

    //Collect values for ids
    for(var i=temp_recording.template.length-1; i>-1; i--){
      let selector = temp_recording.template[i].selector;
      if(!ids.has(selector)){
        console.log('get value for',selector);
        ids.set(selector); //save the selector so we don't interact with it again.
        //Add the value to the templates
        try{
          temp_recording.template[i].value = document.querySelector(selector).value;
          // temp_recording.template[i].selector = selector.replace(":","\\:");
          console.log(temp_recording.template[i]);
        } catch(e) {
          console.log('no value',e);
          //do nothing
        }
      }
    }

    //Send data to background for storage
    chrome.runtime.sendMessage({
        greeting: "frame",
        command: "store",
        data: temp_recording
    }, function(response) {
        console.log(response);
        //forward the data
    });
  }

  let playRecording = function(data){
    console.log('play recording',data);

    //Only run the function if you can find the first element.
    if(document.querySelector(data.template[0].selector)){
      (function fireEvent(i){
        //Run each command with a 100ms delay between.

        let item = data.template[i];

        setTimeout(function(){
          let now = new Date(Date.now());

          try{
            let target = document.querySelector(item.selector); //Wait to acquire the target until after the delay!

            if(item.proto.includes("MouseEvent")){
              try{
                console.log('mouse event',now.getSeconds(),target,item);
                var mEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                target.dispatchEvent(mEvt);
              } catch(e) {
                console.log(e);
              }
            } else {
              if (item.value) {
                try{
                  console.log('set value',now.getSeconds(),target,item);
                  target.value = item.value;
                } catch(e){
                  console.log(e);
                }
              }
              //TODO if the last keyboard command is tab or arrow, we may still want to fire it...
              try {
                console.log('keyboard event',now.getSeconds(),target,item);
                target.focus();
                var kEvt = new KeyboardEvent('keydown', {keyCode:item.keyCode}) ;
                target.dispatchEvent(kEvt);
              } catch(e) {
                console.log("couldn't focus", e);
              }

            }
        } catch(e){
          console.log(e);
        }

          if(++i < data.template.length) fireEvent(i);
        },item.delay);
        //We may want to attempt this recursively to account for network latency on ajax calls.
      })(0);
    } else {
      console.log("This is not the right frame.");
    }
  };

})();
