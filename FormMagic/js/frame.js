(function(){
  console.log("form magic frame script");

  // chrome.extension.sendMessage({greeting: "frame_script", loaded: window.location.href});
  let temp_recording = {};
  let record = false;
  let ids = new Map();

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
          }
        });

  let logActivity = function (event){
    if(record) {
      console.log(event.type,event.target,Object.prototype.toString.call(event.target),Object.prototype.toString.call(event).includes('MouseEvent'),event);
        //ENTER on combobox item is ignored. Must use mouse.
        //Clicking on icon button registers SVG as target. Must traverse up to find button/link parent with id.
        //Need a function to string together consecutive keydown entries on the same input into one value.
          //Since we can't anticipate the various rules of how those presses will be interpretted. I suggest we log the id, ignore the keycode, and at the end or next tab/click, request the "value" for the input.

      /*saves the sequence*/
      /*
      logs[
        {
          url:
          template:[
            {
              type: {keydown,mouse,arrow}
              id:
              ~value:
            },
            ...
          ]
        },
        ...
      ]
      */
      //on start
        //If keydown
          //Save id to temporary list
          //If id is not already in list, save id to log
        if(event.type == 'keydown'){
          if(!ids.has(event.target.id)){
            console.log('store',event.target);
            ids.set(event.target.id || 'noId'+ids.length, event);
          }
          temp_recording.template.push(event);
        }
        //If mouse
          //Traverse to parent button/link
          //Save to log
        else if(event.type == 'click'){
          //Rather than recursively looking for these limited elements, we could also just turn the
          // let storeId = function(element){
          //   if( element.tagName == 'BUTTON','A','INPUT'){
          //     ids.set(element.id || 'none'+ids.length, event.target);
          //   } else if (element.parent){
          //     storeId(element.parent);
          //   } else {
          //     //just store the original id...
          //     ids.set(event.target.id || 'none'+ids.length, event.target);
          //   }
          // }
          // storeId(event.target);
          temp_recording.template.push(event);
        }
        //If arrow
          //save to log

      }
      //on stop
        //for keydown id in log, get value
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
    for(var event of data.template){
      console('play event',event);
      if(Object.prototype.toString.call(event).includes("MouseEvent")){
        var evt = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
        event.target.dispatchEvent(evt);
      } else {
        // var fireOnThis = document.getElementById('productTagInput')
        //construct the class list....
        // var fireOnThis = document.querySelector(event.target.tagName+(event.target.id?"#"+event.target.id));
        var evt = new KeyboardEvent("keypress", {keyCode:event.keyCode}) ;
        event.target.dispatchEvent(evt);
      }
    }
  };

  let fill = function (){
    //Product Tag
    document.getElementById('productTagInput').value = "Lightning Flow";
    var fireOnThis = document.getElementById('productTagInput');
    fireOnThis.focus();
    var evObj = new KeyboardEvent("keypress", {keyCode:40}) ;
    fireOnThis.dispatchEvent(evObj);
    setTimeout( next, 1000);
    //document.getElementById('productTagInputHidden').value = "a1aB0000000TPy1IAG";
  };

  let next = function(){
    //Select Product Tag
    document.getElementById('selection-a1aB0000000TPy1IAG').click();

    //Epic
    document.getElementById('epicInput').value = "PS UX - Flow Builder";
    //var fireOnThis = document.getElementById('epicInput');
    //var evObj = new KeyboardEvent("keypress", {keyCode:40}) ;
    //fireOnThis.dispatchEvent(evObj);
    //setTimeout(document.getElementById('selection-a3QB000000056sIMAQ').click(),1000);
    //document.getElementById('epicInputHidden').value = "a3QB000000056sIMAQ";

    //Sprint
    document.getElementById('sprintInput').value = "2018.08c - PS UX";
    //document.getElementById('sprintInputHidden').value = "a0lB0000001L1doIAC";

    //Scheduled Build
    document.getElementById('scheduledBuildInputUserStory').value = "218";
    //document.getElementById('scheduledBuildInputUserStoryHidden').value = "a06B0000001F7ATIA0";

    //Assigned to
    //document.getElementById('assignedToInput').value = "Owen Schoppe";
    //document.getElementById('assignedToInputHidden').value = "005B0000000hwdeIAA";

    //Subject
    document.getElementById('subjectInput').value = "[Flow][Builder]";
    document.getElementById('subjectInput').focus();
  };

  /*
  For each group we need:
  url
  inputs

  For each input we need:
  id
  value
  focus
  type (?)
  aria-haspopup="true"
    =simulate arrowdown
    =click menu item
      id
  */})();
