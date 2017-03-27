var logged_in = false;
var sm_api_token = '';
var fullname = '';
var email = '';
var api_host = '';
var app_host = '';
var host_only = '';
var selected_client_id = '';
var current_url = '';
var selected_story_ids = [];
var metadata_result = {};
var source_result = {};
var stats_result = {};
var user_menu_set = false;

$( document ).ready(function() {
  $('#status').append($('<div>Checking access...</div>'));

  chrome.storage.local.get({sm_info: {}}, function(data) {
    console.log("inside the fn for the get, ", data);
    if (_.isEmpty(data.sm_info)) {
      console.log("sm_info is empty");
      chrome.tabs.query({'url': [
        // 'http://*.shareablemetrics.com/*',
        // 'https://*.shareablemetrics.com/*',
        'http://plumeapp-staging.herokuapp.com/*',
        'https://plumeapp-staging.herokuapp.com/*',
        'http://localhost/*',
        ]}, function (tabs) {
          console.log("in the tabs query, tabs is", tabs);
        var tabs_count = tabs.length;
        if (tabs_count==0) {
          show_info_window();
          return;
        }
        tabs.map(function(t) {
          chrome.tabs.executeScript(t.id, {'file': 'js/get-auth-token.js'}, function(r) {
            if (r.length > 0 && r[0] != null && r[0]['sm-api-token'] != null) {
              var token = r[0]['sm-api-token'];
              fullname = r[0]['fullname'];
              email = r[0]['sm-email'];
              set_api_token(token)
              api_host = parseApiHost(t.url)
              app_host = parseAppHost(t.url)
              host_only = parseHostOnly(t.url)
              var sm_info = {sm_api_token: token, sm_api_host: api_host, sm_app_host: app_host, sm_host_only: host_only,
                fullname: fullname, email: email};
              chrome.storage.local.set({sm_info: sm_info}, function() {
                console.log("Have set sm_info", sm_info);
                show_main();
              });
              return;
            }
            tabs_count = tabs_count - 1;
            console.log("tabs_count", tabs_count);
            if (tabs_count == 0) {
              console.log("it's 0");
              if (!logged_in) {
                console.log("logged_in=false");
                $('#status').append($('<div>No access token found, please log in to ShareableMetrics to use this tool.</div>'));
              } else {
                console.log("logged_in=true");
              }
            }
          });
        });
      });
    } else {
      console.log("sm_info is not empty:", data.sm_info);
      // Already have a token
      set_api_token(data.sm_info.sm_api_token)
      api_host = data.sm_info.sm_api_host;
      app_host = data.sm_info.sm_app_host;
      host_only = data.sm_info.sm_host_only;
      fullname = data.sm_info.fullname;
      email = data.sm_info.email;
      $('#status').append($('<div>Have access token, proceeding...</div>'));
      show_main();
    }
  });

  // Just for debugging
  chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes) {
          var storageChange = changes[key];
          console.log('Storage key "%s" in namespace "%s" changed. ' +
                      'Old value was "%s", new value is "%s".',
                      key,
                      namespace,
                      storageChange.oldValue,
                      storageChange.newValue);
        }
      });

  $('#logout').on('click', function() {
    chrome.storage.local.remove(["sm_info"], function() {
      set_api_token("")
      $('.main-content').removeClass('show').addClass('hidden');
      $('.check-access').removeClass('hidden').addClass('show');
      $('#status').append($('<div>Logged out of extension.</div>'));
    });
  });

  $('.client-list').on('click', function(e) {
    $t = $(e.target)
    selected_client_id = $t.data('id')
    chrome.storage.local.set({sm_selected_client_id: selected_client_id}, function() {
    });
    $('.client-dropdown .name').text($t.text())
    $('.story-list li').addClass('hidden');
    $('.story-list li.client-' + selected_client_id).removeClass('hidden');
    selected_stories = []
    update_add_to_story_button()
    $('.story-badge').remove()
  })

  $('.story-list').on('click', function(e) {
    $t = $(e.target)
    var elt = $('<span class="label label-default story-badge story-badge-' + $t.data('id') + '">' + $t.text() + '<span class="story-remove" aria-hidden="true">&times;</span></span>')
    elt.data('story-id', $t.data('id'))
    $('.stories').append(elt)
    elt.find('.story-remove').on('click', function() {
      remove_story(elt)
    })
    selected_stories.push($t.data('id'))
    update_add_to_story_button()
    $t.addClass('hidden')
    return false;
  })

  $('.add-to-story').on('click', function(e) {
    $('.add-to-story').text("")
    $('.add-to-story').addClass("loading")
    if (metadata_result.editable==true) {
      metadata_result.canonical_url = $('.metadata-editable #url').val();
      metadata_result.title = $('.metadata-editable #title').val();
      metadata_result.published_at = $('.metadata-editable #pubdate').val();
      var summary = $('#summary').val();
      var notes = $('#notes').val();
      var tone = $('#tone').val();
      var author = $('#author').val();
    }
    $.post(api_host + "add_article",
      {
        story_ids: selected_stories,
        client_id: selected_client_id,
        metadata: metadata_result,
        source: source_result,
        stats: stats_result,
        summary: summary,
        notes: notes,
        tone: tone,
        author: author,
      })
      .done(function(data) {
        $('.add-to-story').addClass('disabled')
        $('.add-to-story').removeClass('loading')
        $('.add-to-story').html($('<i class="fa fa-check"></i><span>Done</span>'))
      })
    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Add failed: ' + textStatus + '</div>'));
      });
    });

});

var show_main = function() {
  logged_in = true;
  $('.check-access').removeClass('show').addClass('hidden');
  $('.main-content').removeClass('hidden').addClass('show');
  $('#status').empty();
  // TODO This doesn't seem to remove focus from that first button
  $('button.client-dropdown').blur();
  populate_dropdowns();
  if (!user_menu_set) {
    user_menu_set = true;
    $('.fullname').text(fullname);
    $('.settings-menu').append($('<li role="separator" class="divider"></li>'))
    $('.settings-menu').append($('<li><div>' + email + '</div></li>'))
    if (!host_only.includes("shareablemetrics.com")) {
      $('.settings-menu').append($('<li><div>' + host_only + '</div></li>'))
    }
  }
}

var set_api_token = function(token) {
  sm_api_token = token;
  $.ajaxSetup({
    headers: { "x-sm-api-token": token }
  });
}

var populate_dropdowns = function() {
  $.get(api_host + "clients_and_stories")
    .done(function(data) {
      console.log("clients_and_stories returned", data);
      var r = data.clients.map(function(client) {
        return $('<li><a href="#" class="client-list-item client-' + client.id + '" data-id="' + client.id + '">' + client.name + '</a></li>')
      })
      $('.client-list').html(r);
      var r = data.clients.map(function(client) {
        return client.stories.map(function(story) {
          return $('<li class="client-' + client.id + '"><a href="#" class="story-list-item story-list-item-'+story.id+'" data-id="' + story.id + '">' + story.name + '</a></li>')
        })
      })
      $('.story-list').html(_.flatten(r));
      chrome.storage.local.get({sm_selected_client_id: ''}, function(localdata) {
        if (localdata.sm_selected_client_id=='') {
          sm_selected_client_id = data.default_client_id;
        } else {
          sm_selected_client_id = localdata.sm_selected_client_id;
        }
        if (_.find(data.clients, function(c) {return c.id==sm_selected_client_id})==undefined) {
          sm_selected_client_id = data.default_client_id;
        }
        $('.client-list a.client-' + sm_selected_client_id).click();
        load_url_and_metadata();
      });
    })
    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Load failed: ' + textStatus + '</div>'));
      });
}

var load_url_and_metadata = function() {
  chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
    var url = tabs[0].url;
    $.post(api_host + "get_article_metadata",
        {url: url,
          client_id: sm_selected_client_id})
      .done(function(data) {
        metadata_result = data.result
        if (data.result.editable==true) {
          $('body').removeClass('short').addClass('tall')
          $('.user').removeClass('hidden')
          $('.metadata').addClass('hidden')
          $('.metadata-editable').removeClass('hidden')
          $('.metadata-editable #url').val(data.result.canonical_url)
          $('.metadata-editable #title').val(data.result.title)
          $('.metadata-editable #pubdate').daterangepicker(
            { "singleDatePicker": true,
              "showDropdowns": true,
              "alwaysShowCalendars": true,
              "startDate": moment(data.result.published_at)
            }
          );
        } else {
          $('.metadata .url').text(data.result.canonical_url)
          $('.metadata .title').text(data.result.title)
          $('.metadata .pubdate').text(data.result.published_at_formatted)
        }
        $('.metadata .loading, .metadata-editable .loading').removeClass('loading')
        current_url = data.result.canonical_url
        load_source(data.result.canonical_url);
        request_uuid = generateUUID();
        load_stats();
      })
    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Load failed: ' + textStatus + '</div>'));
      });

    chrome.tabs.executeScript(tabs[0].id, {'file': 'js/get-metadata.js'}, function(r) {
      var metadata = r[0];
      $('#summary').val(metadata.description[0][0])
      var authors = metadata.author.map(function(m) {
        return m[0]
      })
      $('#author').val(_.first(_.reject(authors, _.isNil)));
    });
  });

}

var load_source = function(url) {
  $.post(api_host + "get_article_source",
      {url: url})
    .done(function(data) {
      $('.metadata .source, .metadata-editable .source').text(data.source)
      source_result = data
    })
  .fail(function(jqHxr, textStatus) {
    $('.main-content .status').append($('<div>Load source failed: ' + textStatus + '</div>'));
    });
}

var load_stats = function() {
  $.post(api_host + "get_article_stats",
      {
        url: current_url,
        client_id: selected_client_id,
        request_id: request_uuid
      })
    .done(function(data, textStatus, xhr) {
      if (xhr.status==202) {
        setTimeout(load_stats, 500);
      } else {
        stats_result = data
        $('.stats .loading').removeClass('loading')
        $('.stats .facebook').text(data.facebook_total_formatted)
        $('.stats .twitter').text(data.twitter_formatted)
        $('.stats .google').text(data.google_share_formatted)
        $('.stats .linkedin').text(data.linkedin_formatted)
        $('.stats .pinterest').text(data.pinterest_formatted)
      }
    })
  .fail(function(jqHxr, textStatus) {
    $('.main-content .status').append($('<div>Load stats failed: ' + textStatus + '</div>'));
    });
}

var remove_story = function(elt) {
  $elt = $(elt)
  story_id = $elt.data('story-id')
  $elt.remove()
  selected_stories = selected_stories.filter(function(array_id) {
    return array_id != story_id;
  })
  update_add_to_story_button()
  $('.story-list-item-'+ story_id).removeClass('hidden')
}

var update_add_to_story_button = function() {
  if (selected_stories.length==0) {
    $('.add-to-story').addClass('disabled')
    $('.add-to-story').text("Add to stories")
  } else if (selected_stories.length==1) {
    $('.add-to-story').removeClass('disabled')
    $('.add-to-story').text("Add to story")
  } else {
    $('.add-to-story').text("Add to stories")
    $('.add-to-story').removeClass('disabled')
  }
}

var generateUUID = function() {
  var d, uuid;
  d = (new Date).getTime();
  uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r;
    r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : r & 0x3 | 0x8).toString(16);
  });
  return uuid;
};

var show_info_window = function() {
  $('.info-window').removeClass('hidden');
  $('.check-access').addClass('hidden');
}

var parseApiHost = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.protocol + '//' + parser.host + '/api/v1/';
}

var parseAppHost = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.protocol + '//' + parser.host + '/';
}

var parseHostOnly = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.host;
}
