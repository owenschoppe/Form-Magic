(function(){
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
              document.addEventListener('click',logActivity);
              document.addEventListener('keydown',logActivity);
              sendResponse({
                  farewell: "goodbye"
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

            //Add an indication to the screen that the recording is playing. And when it stops. Maybe animate the icon. Maybe add an on-screen notification.
          }
        });

  let logActivity = function (event){
    if(record) {
      console.log(event.type,event.target,Object.prototype.toString.call(event.target),Object.prototype.toString.call(event).includes('MouseEvent'),event);
        //ENTER on combobox item is ignored. Must use mouse.
        //Clicking on icon button registers SVG as target. Must traverse up to find button/link parent with id.
        //Need a function to string together consecutive keydown entries on the same input into one value.
          //Since we can't anticipate the various rules of how those presses will be interpretted. I suggest we log the id, ignore the keycode, and at the end or next tab/click, request the "value" for the input.

        let getSelector = function(event){
          let tag = event.target.tagName;
          let id = event.target.id?"#"+event.target.id:"";
          let classes = "";
          for (var className of event.target.classList){
            classes += "."+className;
          }
          return tag+id+classes;
        }

        let buildLogItem = function(event){
          let item = {};
          item.selector = getSelector(event);
          item.proto = Object.prototype.toString.call(event).includes("KeyboardEvent") ? "KeyboardEvent" : "MouseEvent";
          item.keyCode = event.keyCode || "";
          item.type = event.type
          item.key = event.key || "";
          item.delay = item.proto=="KeyboardEvent"? 10 : Date.now() - (baseTime || Date.now()); //Don't wait for keyboard events.
          return item;
        }

        temp_recording.template.push(buildLogItem(event));
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
        console.log('get value',selector);
        ids.set(selector); //save the selector so we don't interact with it again.
        //Add the value to the templates
        try{
          temp_recording.template[i].value = document.querySelector(selector).value;
          console.log(temp_recording.template[i]);
        } catch(e) {
          console.log('no value');
          //do nothing
        }
      }
    }

    //Send data to background for storage
    chrome.runtime.sendMessage({
        greeting: "frame",
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

          let target = document.querySelector(item.selector); //Wait to acquire the target until after the delay!

          if(item.proto.includes("MouseEvent")){
            console.log('mouse event',now.getSeconds(),target,item);
            var mEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            target.dispatchEvent(mEvt);
          } else {
            if (item.value) {
              console.log('set value',now.getSeconds(),target,item);
              target.value = item.value;
            }
            //TODO if the last keyboard command is tab or arrow, we may still want to fire it...
            try {
              console.log('keyboard event',now.getSeconds(),target,item);
              target.focus();
              var kEvt = new KeyboardEvent('keydown', {keyCode:item.keyCode}) ;
              target.dispatchEvent(kEvt);
            } catch(e) {
              console.log("couldn't focus");
            }

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
