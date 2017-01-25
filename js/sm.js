$( document ).ready(function() {
  chrome.storage.local.get({urls: []}, function(data) {
    data.urls.map(function(url) {
      $('#urls').append($('<div>' + url + '</div>'));
    });
  });

  $('.client-list-item').on('click', function(e) {
    console.log("Clicked ", e);
  });

  $('#add-url').on('click', function(e) {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        var url = tabs[0].url;
        chrome.storage.local.get({urls: []}, function(data) {
          var urls = data.urls;
          urls.push(url);
          chrome.storage.local.set({urls: urls}, function() {
            $('#urls').append($('<div>' + url + '</div>'));
          });
        });
    });
  });

  $('#import').on('click', function(e) {
    chrome.storage.local.get({urls: []}, function(data) {
      var urls = data.urls;
      console.log("We'll upload ", urls)
      chrome.storage.local.set({urls: []}, function() {
        $('#urls').empty();
      });
    });
  });


});
