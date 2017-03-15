var logged_in = false;
var sm_api_token = '';
var selected_client_id = '';

$( document ).ready(function() {
  $('#status').append($('<div>Checking access...</div>'));

  chrome.storage.local.get({sm_api_token: ''}, function(data) {
    if (data.sm_api_token=='') {
      chrome.tabs.query({'url': ['http://*.shareablemetrics.com/*',
        'https://*.shareablemetrics.com/*',
        'http://localhost/*',
        ]}, function (tabs) {
        var tabs_count = tabs.length;
        tabs.map(function(t) {
          chrome.tabs.executeScript(t.id, {'file': 'js/get-auth-token.js'}, function(r) {
            if (r.length > 0 && r[0] != null) {
              set_api_token(r[0])
              chrome.storage.local.set({sm_api_token: r[0]}, function() {
                show_main();
              });
            }
            tabs_count = tabs_count - 1;
            if (tabs_count == 0) {
              if (!logged_in) {
                $('#status').append($('<div>No access token found, please log in to ShareableMetrics to use this tool.</div>'));
              }
            }
          });
        });
      });
    } else {
      // Already have a token
      set_api_token(data.sm_api_token)
      $('#status').append($('<div>Have access token, proceeding...</div>'));
      show_main();
    }
  });

  // $.get(HOST + "check_login")
  //   .done(function(data) {
  //     $('#status').append($('<div>Access okay</div>'));
  //     })
  //   .fail(function(jqHxr, textStatus) {
  //     $('#status').append($('<div>Access failed: ' + textStatus + '</div>'));
  //     });

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
      // http://localhost:3000/clients/392/stories/1946/article_batches
      // http://app.shareablemetrics.com/clients/386/stories/1904
      $.post("http://app.shareablemetrics.com/clients/386/stories/1904/article_batches.json",
        {article_batch: {name: 'From extension', story_id: '1904', urls_array: urls}}, function(data, textStatus) {
          console.log(data);
          console.log(textStatus);
        });
      chrome.storage.local.set({urls: []}, function() {
        $('#urls').empty();
      });
    });
  });

  $('#logout').on('click', function() {
    chrome.storage.local.remove("sm_api_token", function() {
      $('.main-content').removeClass('show').addClass('hidden');
      $('.check-access').removeClass('hidden').addClass('show');
      $('#status').append($('<div>Logged out of extension.</div>'));
    });
  });

  $('.client-list').on('click', function(e) {
    console.log("client-list click ", e);
    $t = $(e.target)
    selected_client_id = $t.data('id')
    $('.client-dropdown .name').text($t.text())
    $('.story-list li').addClass('hidden');
    $('.story-list li.client-' + selected_client_id).removeClass('hidden');
    $('.story-dropdown .name').text($('.story-list li.client-' + selected_client_id + ' a:first').text())
  })

});

var show_main = function() {
  logged_in = true;
  $('.check-access').removeClass('show').addClass('hidden');
  $('.main-content').removeClass('hidden').addClass('show');
  $('#status').empty();
  populate_dropdowns();
}

var set_api_token = function(token) {
  sm_api_token = token;
  $.ajaxSetup({
    headers: { "x-sm-api-token": token }
  });
}

var populate_dropdowns = function() {
  console.log("hi ho populate_dropdowns");
  $.get(HOST + "clients_and_stories")
    .done(function(data) {
      var r = data.clients.map(function(client) {
        return $('<li><a href="#" class="client-list-item" data-id="' + client.id + '">' + client.name + '</a></li>')
      })
      $('.client-list').html(r);
      var r = data.clients.map(function(client) {
        return client.stories.map(function(story) {
          return $('<li class="client-' + client.id + '"><a href="#" class="story-list-item" data-id="' + story.id + '">' + story.name + '</a></li>')
        })
      })
      $('.story-list').html(_.flatten(r));
      // TODO This needs to be the last selected one
      $('.client-list a:first').click()
    })
    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Load failed: ' + textStatus + '</div>'));
      });
}
