(function() {
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
        document.addEventListener('click', logActivity, true);
        document.addEventListener('keydown', logActivity, true);
        sendResponse({
          farewell: "starting"
        });
        if (!record) {
          temp_recording.url = window.location.host;
          temp_recording.template = [];
          temp_recording.context = {};
          record = true;
          //Insert stop button into page
          renderButton();
        }
      } else if (request.greeting == "play_recording") {
        console.log('play', request);
        playRecording(request.data);
        sendResponse({
          farewell: "playing"
        });
        //Add an indication to the screen that the recording is playing. And when it stops. Maybe animate the icon. Maybe add an on-screen notification.
      } else if (request.greeting == "ping") {
        console.log('ping', request);
        sendResponse({
          farewell: "pong"
        });
      }
    });

  let siblingText = async function(element, stopCondition) {
    let generations = [];
    let depth = 0;
    //the body node catches all the css/js... stop one before that
    //max depth observed so far is ~26
    while (element.parentNode != document.body && generations.length < 4) {
      //per generation
      let siblings = element.parentNode.children;
      let generation = {};
      generation.depth = depth;
      generation.directIndex = null;
      generation.text = [];
      for (var i = 0; i < siblings.length; i++) {
        generation.text.push(siblings[i].textContent); //we may want to trim this and use a startsWith instead. prevent filling memory accidentally.
        if (siblings[i] == element) generation.directIndex = i;
      }
      generations.push(generation); //save this generation
      element = element.parentNode; //move up one generation
      ++depth;
    }
    return generations;
  }


  let logActivity = async function(event) {
    if (record) {
      console.log(event.type, event.target, Object.prototype.toString.call(event.target), Object.prototype.toString.call(event).includes('MouseEvent'), event);
      //ENTER on combobox item is ignored. Must use mouse.
      //Since we can't anticipate the various rules of how those presses will be interpretted. I suggest we log the id, ignore the keycode, and at the end or next tab/click, request the "value" for the input.

      //get the escaped version of the selector id
      let getId = await
      function(id) {
        return new Promise((resolve, reject) => {
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

      let getClasses = function(classList) {
        return new Promise((resolve, reject) => {
          let classes = "";
          for (var className of classList) {
            classes += "." + className;
          }
          resolve(classes);
        });
      };

      let buildLogItem = async function(event) {
        let item = {};
        let tag = event.target.tagName;
        var escapedId = await getId(event.target.id);
        var classes = await getClasses(event.target.classList);

        item.guid = JSON.stringify(event.target.outerHTML);
        temp_recording.context[item.guid] = await siblingText(event.target); //could just keep overwriting this thing... doesn't solve the duplicate selectors... "div.foo";

        item.selectors = [];
        item.selectors[0] = tag + escapedId + classes;
        item.selectors[1] = tag + classes;
        item.selectors[2] = tag;
        item.proto = Object.prototype.toString.call(event).includes("KeyboardEvent") ? "KeyboardEvent" : "MouseEvent";
        item.keyCode = event.keyCode || "";
        item.type = event.type;
        item.key = event.key || "";
        item.delay = item.proto == "KeyboardEvent" ? 10 : Date.now() - (baseTime || Date.now()); //Don't wait for keyboard events.
        console.log('log line', item);
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

  let stopRecording = async function(event) {
    console.log("stop recording");
    record = false;
    //hide button
    event.target.parentNode.removeChild(event.target);

    //Collect values for ids
    for (var i = temp_recording.template.length - 1; i > -1; i--) {
      let selector = temp_recording.template[i].selectors[0];
      if (!ids.has(selector)) {
        console.log('get value for', selector);
        ids.set(selector); //save the selector so we don't interact with it again.
        //Add the value to the templates
        try {
          //we should probably do this in a separate array as well and use the guid...or if we trust our context search...or for this time only add an identifier to the dom element the first time through.
          temp_recording.template[i].value = document.querySelector(selector).value;
          console.log(temp_recording.template[i]);
        } catch (e) {
          console.log('no value', e);
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
    });
  }

  let rankMaches = function(elements, item, context, strictMode) {
    var tempElements = [];
    let maxScore = 0;
    for (var element of elements) {
      //check the text values of siblings
      let tempScore = 0;

      let siblings = element.parentNode.children;
      for (var i = 0; i < siblings.length && i < context.text.length; i++) {
        //textContent is recursive, so as we move up we need to be less specific. It doesn't include the input values though... good.
        if (siblings[i].textContent == context.text[i]) {
          //one sibling matches
          console.log('match!', siblings[i].textContent, "==", context.text[i], siblings[i].textContent == context.text[i]);
          // only tally if we're not running in strict mode and the text is not blank.
          if (strictMode && siblings[i].textContent || !strictMode){
            //tally it up
            ++tempScore;
            if (i == context.directIndex) {
              //double count this element if the element itself matches.
              //selects for the button clicked among siblings since all have identical context.
              ++tempScore;
            }
          } else {

          }
        } else {
          //no match
        }
      }
      //if this is the best match, update the tempElement array
      if (tempScore >= maxScore && tempScore > 0) {
        console.log('new best score!', tempScore, element)
        maxScore = tempScore;
        tempElements.unshift(element);
      }
    }
    return tempElements;
  }

  let getElement = function(item, context, firstRun) {
    var tempElements = [];
    var results = function(iterations) {
      console.log('iterations', iterations, document.querySelectorAll(item.selectors[iterations]));
      let strictMode = firstRun && iterations>0 ? true : false;
      try {
        tempElements = rankMaches(document.querySelectorAll(item.selectors[iterations]), item, context[0], strictMode);
        if (tempElements.length == 1) {
          //success! we have one match
          console.log('found one', tempElements);
          // return tempElements[0];
        } else if (tempElements.length > 0) {
          //narrow it down some more
          //it's sorted best to worst already
          console.log('still needs narrowing', tempElements);
          //TODO check if there is a tie in the score, if so, check the next level of context.
          // return tempElements[0];
        } else {
          //broaden the search one more time.
          //this is as broad a search as it goes...
          console.log('found nothing', tempElements);
          if(firstRun && iterations==2){
            //don't check the last selector...if this is the first run. FUTURE we could allow the third level but we need better filtering.
            //basically if we're going to search inputs we can't trust blank == blank context... at that point we need at least one string match...
            //so if in strictMode we don't find anything the first time though, that means we gave it a good shot, now we need to bail out of here.
            throw "This doesn't seem like the right tab."
          }
          if (iterations < item.selectors.length) {
            results(++iterations);
          }
        }
      } catch (e) {
        //hmm, something went seriously wrong.
        console.log('abort', e);
        throw e;
      }
    }
    console.log('getElement', item);
    //   //fill the array
    results(0);
    console.log('elements', tempElements);
    return tempElements[0];
  }

  let playRecording = function(data) {
    console.log('play recording', data);

    (function fireEvent(i) {
      //Run each command with a 100ms delay between.
      let firstRun = i==0 ? true : false;
      let item = data.template[i];
      let context = data.context[item.guid];

      setTimeout(function() {
        let now = new Date(Date.now());

        try {
          let target = getElement(item, context, firstRun);

          if (item.proto.includes("MouseEvent")) {
            try {
              console.log('mouse event', now.getSeconds(), target, item);
              var mEvt = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              target.dispatchEvent(mEvt);
            } catch (e) {
              console.log(e);
            }
          } else {
            if (item.value) {
              try {
                console.log('set value', now.getSeconds(), target, item);
                target.value = item.value;
              } catch (e) {
                console.log(e);
              }
            }
            //TODO if the last keyboard command is tab or arrow, we may still want to fire it...
            try {
              console.log('keyboard event', now.getSeconds(), target, item);
              target.focus();
              var kEvt = new KeyboardEvent('keydown', {
                keyCode: item.keyCode
              });
              target.dispatchEvent(kEvt);
            } catch (e) {
              console.log("couldn't focus", e);
            }

          }
        } catch (e) {
          console.log(e);
          return;
        }
        //call the next row of the template
        if (++i < data.template.length) fireEvent(i);
      }, (item.delay > 1000 ? 1000 : item.delay));
      //We may want to attempt this recursively to account for network latency on ajax calls.
    })(0);
  };

})();
