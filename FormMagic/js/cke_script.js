(function() {
    if (parent === top) {
        console.log("bug logger cke script",document.location);

        //listen for data from content script
        document.addEventListener('from_gus', function(e) {
            var data = e.detail;
            console.log("cke received " + data); //+data);
            if ((data.image || data.prefs.template === 'true')&& !window.CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].element.$.defaultValue) { //Only insert the data if there is an image or users always want the template, and the text area isn't already filled.
                insertData(data);
            } else {
                console.log('No image data and no template.'); //Exit
            }
        });

        var checkForCKE = function(tries) { //Once CK editor is loaded, ask for the data.
            console.log('checkForCKE', tries);
            tries--;
            try {
                if (CKEDITOR) { // CKE is present.
                    if (CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].status == 'ready' ) { //CKE instance is already loaded and ready.
                        console.log('CKE ready', CKEDITOR.status, CKEDITOR);
                        ckeLoaded();
                    } else { //Wait until it is ready.
                        console.log('CKE loading', CKEDITOR.status, CKEDITOR);
                        CKEDITOR.on('instanceReady', ckeLoaded);
                    }
                }
            } catch (e) { //CKE isn't loaded yet. Check again in a second.
                if (tries > 0) {
                    console.log('Still no CKE', e);
                    window.setTimeout(function() {
                        checkForCKE(tries);
                    }, 1000);
                }
            }
        };

        //Wrapper for sending cke_loaded message
        var ckeLoaded = function() {
            ckeSendMsg({
                greeting: "cke_loaded"
            });
        };

        //Send message to content script
        var ckeSendMsg = function(data) {
            var evt = new CustomEvent("from_cke", {
                detail: data
            });
            // console.log("cke sendMsg", evt);
            document.dispatchEvent(evt);
        };

        //Crop the image and insert into CKE
        var cropImage = function(dataURL, crop) {
            // var canvas = document.getElementById('myCanvas');
            var canvas = document.createElement('canvas');
            var imageObj = new Image();

            imageObj.onload = function() {

                var image = document.createElement('img');
                var max = {
                    fileSize: skipImage ? 15000-skipImage : 15000, //32000 character max for everything. Images use twice their length.
                    quality: 0.5,
                    scale: 0.4
                };
                var quality = crop.quality || 0.92;
                var scale = 1;
                var type = 'image/png';

                var insert = function() {
                    try {
                        // console.log("Try to insert crop");
                        window.CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].insertHtml(image.outerHTML);
                    } catch (e) {
                        // console.log("Couldn't insert crop", e);
                    }

                    //Clean up our variables
                    imageObj = null;
                    image = null;

                    //Tell the background page to cleanup so we don't fill this information next time.
                    ckeSendMsg({
                        greeting: "cke_complete"
                    });

                    focusSubject();

                    return;
                };

                var render = function() { // Draw cropped image

                    canvas.width = (crop.w2 || crop.w) * scale;
                    canvas.height = (crop.h2 || crop.h) * scale;
                    var context = canvas.getContext('2d');
                    var dpi = window.devicePixelRatio;
                    var sourceX = crop.x * dpi;
                    var sourceY = crop.y * dpi;
                    var sourceWidth = crop.w * dpi;
                    var sourceHeight = crop.h * dpi;
                    var destWidth = (crop.w2 || crop.w) * scale;
                    var destHeight = (crop.h2 || crop.h) * scale;
                    var destX = 0;
                    var destY = 0;

                    context.drawImage(imageObj, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);

                    image.src = canvas.toDataURL(type, quality);

                    //First try reducing the quality
                    if (quality > max.quality && image.src.length > max.fileSize) {
                        // console.log('image too large: quality', image.src.length);
                        quality = quality - 0.1;
                        type = 'image/jpeg';
                        render();
                    }
                    //Then try scaling down the image and then try quality again
                    else if (quality <= max.quality && scale > max.scale && image.src.length > max.fileSize) {
                        // console.log('image too large: scale', image.src.length);
                        quality = 0.92; //reset the quality
                        scale = scale - 0.25;
                        render();
                    }
                    //Success! Insert the image
                    else if (image.src.length <= max.fileSize) {
                        // console.log('image fits!', 'type:', type, 'quality:', quality, 'scale:', scale, 'size:', image.src.length);
                        skipImage = image.src.length; //If the first image can fit, then reduce the max size for the second image.
                        insert();
                    }
                    //If the image is still too large, just abort
                    else {
                        // console.log('image too large: abort', image.src.length);
                        return;
                    }
                };

                render();

            };
            imageObj.src = dataURL;
        };

        //Encode strings for as URL
        var encode = function(str){
          return encodeURIComponent(str).replace(/'/g,"%27").replace(/"/g,"%22");
        };

        // Use the browser's built-in functionality to quickly and safely escape the string
        var escapeHtml = function(str) {
            var div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        };

        //Focus on the subject field in the VF template.
        var focusSubject = function(){
          try {
              document.getElementById('userStoryEdit:j_id0:workSds:storyWorkForm:subjectInput:inputComponent:inputFieldWithContainer').focus(); //LIGHTNING
              document.getElementById('bugWorkPage:bugWorkForm:input').focus(); //classic
          } catch (e) {
              console.log('Could not focus the subject field.', e);
          }
        };

        //Insert template content into CKE
        var insertData = function(data) {
            console.log("insertTemplate", data);
            var templateContent = "";

            //If there is a url, then fill in the template.
            if(data.hasOwnProperty('url')){
              var url = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
              url.href = data.url;
              var creds = "";

              //If a username and password are defined then rebuild the url with those included.
              //TODO: match the creds with testing org url before building custom url params.
              if(data.prefs.hasOwnProperty('username') && data.prefs.hasOwnProperty('password')){
                if(data.prefs.username !== '' && data.prefs.password !== ''){
                  if(url.origin.includes('force.com')){
                    var fullpath = url.pathname + url.href.split(url.pathname)[1]; //Catch all of the pathname after '#'.
                    var params = [];
                    params.push("un=" + escapeHtml(data.prefs.username));
                    params.push("pw=" + escapeHtml(data.prefs.password));
                    params.push("startURL=" + encode(fullpath));
                    url.pathname = '';
                    url.href = url.origin + '/?' + params.join('&'); //Build the new parameter string.
                  }
                  creds = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
                  creds.textContent = ("Username: " + escapeHtml(data.prefs.username) + " Password: " + escapeHtml(data.prefs.password));
                }
              }

              //Recompose the template.
              url.textContent = url.href;
              var parts = data.prefs.templateContent.split('{url}');
              templateContent = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
              templateContent.insertAdjacentHTML('beforeend',parts[0]);
              templateContent.insertAdjacentHTML('beforeend',url.outerHTML);
              if(creds){templateContent.insertAdjacentHTML('beforeend',creds.outerHTML);}
              templateContent.insertAdjacentHTML('beforeend',parts[1]);
            }
            else {
              // templateContent = data.prefs.templateContent;
              templateContent = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
              templateContent.innerHTML = data.prefs.templateContent;
            }

            var result = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
            result.appendChild(templateContent);

            //Insert the content into the editor
            try {
                console.log("try to insert template");
                window.CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]].insertHtml(result.innerHTML); //Set data in the first CKE instance. (.setData)
            } catch (e) {
                console.log("could not insert", e);
            }

            if (data.image) {
                var resize = {
                    x: 0,
                    y: 0,
                    w2: 360,
                    h2: ((360 / data.crop.oW) * data.crop.oH),
                    w: data.crop.oW,
                    h: data.crop.oH,
                    quality: 0.8
                }; //Resize to 640px wide
                cropImage(data.image, data.crop); //The detail image
                cropImage(data.image, resize); //The overview image
            } else {
              focusSubject();
            }

        };

        var skipImage = false;

        //Start
        checkForCKE(10);

    }
})();
