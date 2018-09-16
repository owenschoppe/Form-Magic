console.log("bug logger content script");

var t = 0;
var b = 0;
var l = 0;
var r = 0;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.image) {
            // renderImage(request.image);
        }
        sendResponse({
            farewell: "goodbye"
        });
    }
);

function cleanUp() {
    // document.getElementById("bugClipperMatte").style.display = "none";
    document.getElementById("bugClipperMatte").remove();
    document.getElementById("bugClipperCrosshair").remove();
    document.removeEventListener("mousemove", moveCrossHairs, true);
    document.removeEventListener("mousedown", drawRect, true);
    document.removeEventListener("mouseup", takeScreenshot, true);
}

function drawRect(event) {
    event.stopPropagation();
    event.preventDefault();
    var x1 = event.clientX;
    var y1 = event.clientY;
    document.addEventListener('mousemove', draw, true);
    document.addEventListener('mouseup', stop, true);

    function draw(event) {
        event.stopPropagation();
        event.preventDefault();
        var x2 = event.clientX;
        var y2 = event.clientY;

        l = x1 < x2 ? x1 : x2;
        r = window.innerWidth - (x1 < x2 ? x2 : x1);
        t = y1 < y2 ? y1 : y2;
        b = window.innerHeight - (y1 < y2 ? y2 : y1);
        console.log(window.innerWidth, x1, x2, l, r, "---", window.innerHeight, y1, y2, t, b);

        var borderWidth = "".concat(t, "px ", r, "px ", b, "px ", l, "px ");
        var matte = document.getElementById('bugClipperMatte');
        matte.style.borderWidth = borderWidth;

    }

    function stop(event) {
        document.removeEventListener("mousemove", draw, true);
        document.removeEventListener('mouseup', stop, true);
    }
}

function handleKeys(event) {
    //check if the escape key is pressed. if so cancel.
    console.log('handleKeys', event);
    if (event.keyCode == 27) { // escape key maps to keycode `27`
        event.stopPropagation();
        event.preventDefault();
        chrome.runtime.sendMessage({
            greeting: "content_script",
            command: "cancel"
        }, function(response) {
            console.log(response.farewell);
        });
        document.getElementById("bugClipperCrosshair").style.display = "none";
        cleanUp();
        document.removeEventListener('keyup', handleKeys, true);

    }
}

function moveCrossHairs(event) {
    var crosshairs = document.getElementById("bugClipperCrosshair");
    crosshairs.style.left = event.clientX + "px";
    crosshairs.style.top = event.clientY + "px";
}

function renderImage(dataURL) {
    console.log(dataURL);
    var imageResult = document.createElement('img');
    imageResult.width = 640;
    imageResult.src = dataURL;
    imageResult.hidden = false;

    var overlay = document.createElement('div');
    overlay.classList.add('slds-popover', 'slds-p-around--small');
    overlay.style.position = 'fixed';
    overlay.style.top = "1rem";
    overlay.style.right = "1rem";
    overlay.style.zIndex = "100001";
    overlay.appendChild(imageResult);

    var container = document.createElement('div');
    container.classList.add('slds');
    container.id = "bugClipperContainer";

    container.appendChild(overlay);

    document.body.insertBefore(container, document.body.firstChild);
}

function renderMatte() {
    var matte = document.createElement('div');
    matte.id = "bugClipperMatte";
    matte.style.position = 'fixed';
    matte.style.width = "100%";
    matte.style.height = "100%";
    matte.style.top = "0";
    matte.style.left = "0";
    matte.style.zIndex = "100000";
    matte.style.boxSizing = "border-box";
    matte.style.background = "transparent";
    matte.style.borderStyle = "solid";
    matte.style.borderColor = "rgba(126,140,153,0.8)";
    matte.style.borderWidth = "".concat(window.innerHeight / 2 + "px ", window.innerWidth / 2 + "px ", window.innerHeight / 2 + "px ", window.innerWidth / 2 + "px");

    var crosshairs = document.createElement('div');
    crosshairs.id = "bugClipperCrosshair";
    crosshairs.style.top = window.innerWidth / 2 + "px";
    crosshairs.style.left = window.innerHeight / 2 + "px";

    document.body.insertBefore(crosshairs, document.body.lastChild.nextSibling);
    document.body.insertBefore(matte, document.body.lastChild.nextSibling);

    document.addEventListener("mousemove", moveCrossHairs, true);
    document.addEventListener("mousedown", drawRect, true);
    document.addEventListener("mouseup", takeScreenshot, true);
    document.addEventListener('keyup', handleKeys, true);
}

function takeScreenshot(event) {
    event.stopPropagation();
    event.preventDefault();
    document.getElementById("bugClipperCrosshair").style.display = "none";
    setTimeout(
        function() {
            var w = window.innerWidth - l - r;
            var h = window.innerHeight - t - b;
            var crop = {
                x: l,
                y: t,
                w: w,
                h: h,
                oW: window.innerWidth,
                oH: window.innerHeight
            };
            chrome.runtime.sendMessage({
                greeting: "content_script",
                command: "take_screenshot",
                crop: crop
            }, function(response) {
                console.log(response.farewell);
                cleanUp();
            });
        }, 100);
}

//Start
renderMatte();
