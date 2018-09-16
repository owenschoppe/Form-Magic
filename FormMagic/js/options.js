var bgPage = chrome.extension.getBackgroundPage();

function initUI() {
    //Show template checkbox
    document.querySelector('#template').addEventListener('click', function(event) {
        saveValue('template', event.target.checked);
    });
    var template = localStorage.template || bgPage.template || 'true';
    document.querySelector('#template').checked = (template === 'true');

    //Template content
    // document.querySelector('#templateContent').addEventListener('input', function(event) {
    //     saveValue('templateContent', event.target.value);
    // });
    // if (localStorage.templateContent !== "") {
    //     var templateContent = localStorage.templateContent || "";
    //     document.querySelector('#templateContent').value = templateContent;
    // }
    if (localStorage.templateContent !== "") {
        var templateContent = localStorage.templateContent || "";
        document.querySelector('#templateContent').innerHTML = templateContent;
    }

    //Login info
    document.querySelector('#username').addEventListener('input', function(event) {
        saveValue('username', event.target.value);
    });
    if (localStorage.username !== "") {
        var username = localStorage.username || "";
        document.querySelector('#username').value = username;
    }

    document.querySelector('#password').addEventListener('input', function(event) {
        saveValue('password', event.target.value);
    });
    if (localStorage.password !== "") {
        var password = localStorage.password || "";
        document.querySelector('#password').value = password;
    }

    //Initialize focus
    document.querySelector('#login').focus();
}

function saveValue(key, value) {
    localStorage[key] = value;
}

//Start
window.onload = function() {
    initUI();
};
