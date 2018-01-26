var logged_in = false;
var sm_api_token = '';
var fullname = '';
var email = '';
var api_host = '';
var app_host = '';
var host_only = '';
var sm_selected_client_id = '';
var sm_clients = {};
var current_url = '';
var selected_stories = [];
var metadata_result = {};
var source_result = {};
var stats_result = {};
var summary_from_page = {};
var author_from_page = {};
var user_menu_set = false;
var current_extension_version = chrome.runtime.getManifest().version;
var add_action = 'add';

var versionChanged = function(sm_info) {
  if (sm_info.extension_version != current_extension_version) {
    console.log("Version has changed.");
    return true;
  } else {
    console.log("Version has not changed.");
    return false;
  }
};

$( document ).ready(function() {
  // Set delay_launch to true to pause briefly before the extension starts running, for debugging
  // I suppose you could break into the debugger instead
  var delay_launch = true;
  if (delay_launch) {
    setTimeout(launch_extension, 1000);
  } else {
    launch_extension();
  }
});

var launch_extension = function() {
  chrome.storage.local.get({sm_info: {}}, function(data) {

    if (_.isEmpty(data.sm_info) || versionChanged(data.sm_info)) {
      chrome.tabs.query({'url': [
        'http://*.shareablemetrics.com/*',
        'https://*.shareablemetrics.com/*',
        'http://plumeapp-staging.herokuapp.com/*',
        'https://plumeapp-staging.herokuapp.com/*',
        'http://localhost/*',
        ]}, function (tabs) {
        var tabs_count = tabs.length;
        if (tabs_count==0) {
          show_info_window('<span>No ShareableMetrics tabs open.</span>');
          return;
        }
        var t=tabs[0];
        chrome.tabs.executeScript(t.id, {'file': 'js/get-auth-token.js'}, function(r) {
          if (r.length > 0 && r[0] != null && r[0]['sm-api-token'] != null) {
            var token = r[0]['sm-api-token'];
            fullname = r[0]['fullname'];
            initials = r[0]['initials'];
            email = r[0]['sm-email'];
            set_api_token(token)
            api_host = parseApiHost(t.url)
            app_host = parseAppHost(t.url)
            host_only = parseHostOnly(t.url)
            var sm_info = {sm_api_token: token, sm_api_host: api_host, sm_app_host: app_host, sm_host_only: host_only,
              fullname: fullname, initials: initials, email: email, extension_version: current_extension_version};
            chrome.storage.local.set({sm_info: sm_info}, function() {
              show_main();
            });
            return;
          }
          tabs_count = tabs_count - 1;
          if (tabs_count == 0) {
            if (!logged_in) {
              show_info_window('<span>No access token found in open SM tabs, please log in to ShareableMetrics to use this tool.</span>');
            } else {
              // console.log("logged_in=true");
            }
          }
        });
      });
    } else {
      // Already have a token
      set_api_token(data.sm_info.sm_api_token)
      api_host = data.sm_info.sm_api_host;
      app_host = data.sm_info.sm_app_host;
      host_only = data.sm_info.sm_host_only;
      fullname = data.sm_info.fullname;
      initials = data.sm_info.initials;
      email = data.sm_info.email;
      $('#status').append($('<div>Have access token, proceeding...</div>'));
      show_main();
    }
  });

  // // Just for debugging
  // chrome.storage.onChanged.addListener(function(changes, namespace) {
  //       for (key in changes) {
  //         var storageChange = changes[key];
  //         console.log('Storage key "%s" in namespace "%s" changed. ' +
  //                     'Old value was "%s", new value is "%s".',
  //                     key,
  //                     namespace,
  //                     storageChange.oldValue,
  //                     storageChange.newValue);
  //       }
  //     });



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
    sm_selected_client_id = $t.data('id')
    chrome.storage.local.set({sm_selected_client_id: sm_selected_client_id}, function() {
    });

    var client_index = 'client_' + sm_selected_client_id;
    custom_fields = clients_by_id[client_index].custom_fields;

    $('.custom-field').addClass('hidden'); 

    for (var i = 0; i < custom_fields.length; i++) {
      if (custom_fields[i].active) {
        cf_field_label_class = '.cf_' + custom_fields[i].field_name;
        if (custom_fields[i].lookup_enabled){
        $(cf_field_label_class + '.dropdown').removeClass('hidden'); 
        } else {
        $(cf_field_label_class + '.fillin').removeClass('hidden');         
        }
        $(cf_field_label_class + ' label').text(custom_fields[i].field_label.substring(0, 5));
      }
    }

    $('.client-dropdown .name').text($t.text())
    $('.story-list li.story-item').addClass('hidden');
    $('.story-list li.recent-story-divider').addClass('hidden');
    $('.story-list li.client-' + sm_selected_client_id).removeClass('hidden');

    // TODO
    // EXPAND THESE !!!
    $('#tone_s option.client').addClass('hidden');
    $('#tone_s option.client-' + sm_selected_client_id).removeClass('hidden');
    $('#article_type_s option.client').addClass('hidden');
    $('#article_type_s option.client-' + sm_selected_client_id).removeClass('hidden');
    $('#focus_s option.client').addClass('hidden');
    $('#focus_s option.client-' + sm_selected_client_id).removeClass('hidden');
    $('#initiative_s option.client').addClass('hidden');
    $('#initiative_s option.client-' + sm_selected_client_id).removeClass('hidden');
    $('#custom_1_s option.client').addClass('hidden');
    $('#custom_1_s option.client-' + sm_selected_client_id).removeClass('hidden');


    selected_stories = []
    $('.story-badge').remove()
    $('#stories-link').attr('href', app_host + 'clients/' + sm_selected_client_id + '/stories');
    $('#articles-link').attr('href', app_host + 'clients/' + sm_selected_client_id + '/articles');

    load_url_and_metadata();

  })



  $('#add-confirm .add-article').on('click', function(e) {
    $('#add-confirm').modal('hide')
    $('.add-to-story').text("").addClass("loading")

    if (metadata_result.base_fields_editable==true) {
      // metadata_result.canonical_url = $('.metadata-editable #url').val();
      metadata_result.title = $('.metadata-editable #title').val();
      metadata_result.published_at = $('.metadata-editable #pubdate').val();
    }

    var summary = $('#summary').val();
    var notes = $('#notes').val();
    console.log('author ^^', $('#author').val())
    var author = $('#author').val();

    var report_on_date = moment($('#report_on_date').val()).format('YYYY-MM-DD');
    // var report_on_date = $('#report_on_date').val();



    if ($('#tone_s').val() != null) {tone = $('#tone_s').val()} else {tone = $('#tone_i').val()}
    if ($('#focus_s').val() != null) {focus = $('#focus_s').val()} else {focus = $('#focus_i').val()}
    if ($('#article_type_s').val() != null) {article_type = $('#article_type_s').val()} else {article_type = $('#article_type_i').val()}
    if ($('#initiative_s').val() != null) {initiative = $('#initiative_s').val()} else {initiative = $('#initiative_i').val()}
    if ($('#custom_1_s').val() != null) {custom_1 = $('#custom_1_s').val()} else {custom_1 = $('#custom_1_i').val()}

    $.post(api_host + "add_article",
      {
        story_ids: selected_stories,
        client_id: sm_selected_client_id,
        metadata: metadata_result,
        source: source_result,
        author: author,
        stats: stats_result,
        summary: summary,
        notes: notes,
        tone: tone,
        focus: focus,
        article_type: article_type,
        initiative: initiative,
        custom_1: custom_1,
        report_on_date: report_on_date,
        add_action: add_action
      })
      .done(function(data) {
        $('.add-to-story').removeClass('loading')
        $('.add-to-story').html($('<i class="fa fa-check"></i><span>Done</span>'))
        setTimeout(function() {
          $('.add-to-story').text('Add');
        }, 3000);

        // reset local storage and reload from backend
        chrome.storage.local.set({sm_editable_fields: {fields: {}}}, function(data) {});
        load_url_and_metadata();

      })
    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Add failed: ' + textStatus + '</div>'));
      });
    });

  $('#add-confirm').on('show.bs.modal', function(e) {
    var m = $('#add-confirm')
    var client = _.find(sm_clients, function(c) {return c.id==sm_selected_client_id});
    m.find('.client-name').text(client.name);
    var stories = _.filter(client.stories, function(s) {return _.includes(selected_stories, s.id)});
    if (stories.length==0){
      m.find('.story-table').addClass('hidden')
      m.find('.no-stories-note').removeClass('hidden')
    } else {
      m.find('.story-table').removeClass('hidden')
      m.find('.no-stories-note').addClass('hidden')
      m.find('tbody').html($(_.map(stories, function(s) { return '<tr><td>' + s.name + '</td></tr>'}).join('')))
    }
  });

  $('#story-list-search').on('keyup', function(e) {
    var search = $(e.target).val();
    story_list_search(search);
  });
}

var show_main = function() {
  logged_in = true;
  $('.check-access').removeClass('show').addClass('hidden');
  $('.main-content').removeClass('hidden').addClass('show');
  $('#status').empty();
  populate_dropdowns();
  $('button.client-dropdown').blur();
  if (!user_menu_set) {
    user_menu_set = true;
    $('.initials').text(initials);
    $('.settings-menu').append($('<li role="separator" class="divider"></li>'))
    $('.settings-menu').append($('<li><div>' + email + '</div></li>'))
    if (!host_only.includes("shareablemetrics.com")) {
      $('.settings-menu').append($('<li><div>' + host_only + '</div></li>'))
    }
  }
  setup_editable_field_listeners();

}

var setup_editable_field_listeners = function() {
  $('.persistent').on('change', function(e) {

    var $target = $(e.target);
    var id = $target.attr('id');
    var val = $target.val();

    // this reads current value of sm_editable_fields, updates an entry in the hash 
    // and writes the whole hash back to local storage
    chrome.storage.local.get({sm_editable_fields: {fields: {}}}, function(data) {
      data.sm_editable_fields.fields[id] = val;
      console.log('editable fields? ', data.sm_editable_fields.fields[id])
      if (data.sm_editable_fields.fields[id] != 'Select...') {
        console.log('store it');
        chrome.storage.local.set(data, function() {});        
      }
    });

  });
}

// maybe we should only load editable fields if they are newer than
// shouldn't this be based on client_id?
var load_saved_editable_fields = function() {
  chrome.storage.local.get({sm_editable_fields: {fields: {}}}, function(data) {
    console.log('sm_editable_fields >> ', data.sm_editable_fields)
    console.log('stored editable fields -- ', data.sm_editable_fields.fields)
    _.keys(data.sm_editable_fields.fields).map(function(id, i) {
      $("[id=" + id +"]").val(data.sm_editable_fields.fields[id]);
      console.log('load_saved_editable_fields --- ', id)
    });
  });
}

var check_saved_editable_fields = function(url) {
  chrome.storage.local.get({sm_editable_fields: {url: '', fields: {}}}, function(data) {
    if (data.sm_editable_fields.url != url) {
      data.sm_editable_fields.url = url;
      data.sm_editable_fields.fields = {};
      chrome.storage.local.set(data, function() {
      });
    } else {
      console.log("urls match, not clearing");
    }
  });
}

var set_api_token = function(token) {
  sm_api_token = token;
  $.ajaxSetup({
    headers: { "x-sm-api-token": token }
  });
}

var set_story_list_handler = function() {
  $('.story-list a').on('click', function(e) {
    $t = $(e.target)
    var story_id = $t.data('id');
    if (_.includes(selected_stories, story_id)) {
      return;
    }
    var elt = $('<span class="label label-default story-badge story-badge-' + $t.data('id') +
      '"><span class="story-badge-text">' + $t.text() + '</span><span class="story-remove" aria-hidden="true">&times;</span></span>')
    elt.data('story-id', $t.data('id'))
    $('.stories').append(elt)
    elt.find('.story-remove').on('click', function() {
      remove_story(elt)
    });
    story_list_search('');

    selected_stories.push($t.data('id'))

    var menu_items = $('.story-list').find("[data-id='" + $t.data('id') + "']");
    menu_items.addClass('hidden')
  });
}

var populate_dropdowns = function() {
  $.get(api_host + "clients_and_stories")
    .done(function(data) {
      sm_clients = data.clients;
      clients_by_id = data.clients_by_id;
      var recent_clients = data.recent_clients.map(function(client) {
        return $('<li><a href="#" class="client-list-item client-' + client.id + '" data-id="' + client.id + '">' + client.name + '</a></li>')
      })
      if (recent_clients.length != 0) {
        $('.client-list').html(recent_clients);
        $('.client-list').append($('<li role="separator" class="divider"></li>'));
      }
      var r = data.clients.map(function(client) {
        return $('<li><a href="#" class="client-list-item client-' + client.id + '" data-id="' + client.id + '">' + client.name + '</a></li>')
      })
      $('.client-list').append(r);
      var recent_stories = data.clients.map(function(client) {
        var list_items = client.recent_stories.map(function(story) {
          return $('<li class="story-item client-' + client.id + '"><a href="#" class="story-list-item story-list-item-'+story.id+'" data-id="' + story.id + '">' + story.name + '</a></li>')
        })
        if (list_items.length != 0) {
          list_items.push($('<li role="separator" class="divider recent-story-divider client-' + client.id + '" data-id="' + client.id + '"></li>'));
        }
        return list_items;
      })
      $('.story-list').append(_.flatten(recent_stories));
      var r = data.clients.map(function(client) {
        return client.stories.map(function(story) {
          return $('<li class="story-item client-' + client.id + '"><a href="#" class="story-list-item story-list-item-'+story.id+'" data-id="' + story.id + '">' + story.name + '</a></li>')
        })
      })
      $('.story-list').append(_.flatten(r));
      set_story_list_handler();



      // Populating Dropdown Items for all clients for this user
      // They are shown/hidden elsewhere

      var r1 = data.clients.map(function(client) {
        return client.article_tone_values.map(function(article_tone_value) {
          return $('<option class="client client-' + client.id + '">' + article_tone_value[0] + '</option>')
        })
      })
      $('#tone_s').append($('<option>Select...</option>'));
      $('#tone_s').append(_.flatten(r1));

      var r = data.clients.map(function(client) {
        return client.article_type_values.map(function(article_type_value) {
          return $('<option class="client client-' + client.id + '">' + article_type_value[0] + '</option>')
        })
      })
      $('#article_type_s').append($('<option>Select...</option>'));
      $('#article_type_s').append(_.flatten(r));


      var r = data.clients.map(function(client) {
        return client.custom_1_values.map(function(custom_1_value) {
          return $('<option class="client client-' + client.id + '">' + custom_1_value[0] + '</option>')
        })
      })
      $('#custom_1_s').append($('<option>Select...</option>'));
      $('#custom_1_s').append(_.flatten(r));


      // Set the selected client, either the default client or what it been changed to from local storage

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
      });

    })

    .fail(function(jqHxr, textStatus) {
      $('.main-content .status').append($('<div>Load clients_and_stories failed: ' + textStatus + '</div>'));
    });
}

var load_url_and_metadata = function() {
  // reset_fields();


  chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
    var url = tabs[0].url;
    check_saved_editable_fields(url);
    $.post(api_host + "get_article_metadata",
        {url: url,
          client_id: sm_selected_client_id})
      .done(function(data) {
        metadata_result = data.result

        // AEE added
        chrome.storage.local.set(data, function() {});

        if (data.result.base_fields_editable==true) {
          $('.metadata').addClass('hidden')
          $('.metadata-editable').removeClass('hidden')
          $('.metadata-editable #url').val(data.result.canonical_url)
          $('.metadata-editable #title').val(data.result.title)
          setup_editable_published_at(data);
        } else {
          $('.metadata').removeClass('hidden')
          $('.metadata-editable').addClass('hidden')
          if (data.result.in_client) {
            $('.metadata .url-icon').removeClass('hidden');
          }
          $('.metadata .url').text(data.result.canonical_url)
          $('.metadata .title').text(data.result.title)
          $('.metadata .pubdate').text(data.result.published_at_formatted)
        }


        if (data.result.author_name == undefined) {
          $('.user #author').val(author_from_page)
        } else {
          $('.user #author').val(data.result.author_name)
        }

        $('.user #report_on_date').val(moment().format('MM/DD/YYYY'))
        setup_editable_report_on_date(data);

        if (data.result.summary == undefined) {
          $('.user #summary').val(summary_from_page)
        } else {
          $('.user #summary').val(data.result.summary)
        }

        $('.user #notes').val(data.result.notes)

        $('.user #tone_s').val(data.result.tone)
        $('.user #tone_i').val(data.result.tone)

        $('.user #article_type_s').val(data.result.article_type)
        $('.user #article_type_i').val(data.result.article_type)

        $('.user #initiative_s').val(data.result.initiative)
        $('.user #initiative_i').val(data.result.initiative)

        $('.user #focus_s').val(data.result.focus)
        $('.user #focus_i').val(data.result.focus)

        $('.user #custom_1_s').val(data.result.custom_1)
        $('.user #custom_1_i').val(data.result.custom_1)

        $('.metadata .loading, .metadata-editable .loading').removeClass('loading')
        $('.metadata .url, .metadata-editable .url').text(data.result.canonical_url)

        current_url = data.result.canonical_url
        if (data.result.in_client==true) {
          $('.add-to-story').text('Update');
          add_action = 'update';
        } else {
          $('.add-to-story').text('Add');
          add_action = 'add';
        }

        $('.stories').html('');
        selected_stories = [];
        if (data.result.story_ids.length > 0) {
          data.result.story_ids.map(function(story_id) {
            $('.story-list-item-' + story_id).click();
          });
        }

        load_saved_editable_fields();
        load_source(data.result.canonical_url);
        request_uuid = generateUUID();
        load_stats();
      })
    .fail(function(jqHxr, textStatus) {
      var errorText;
      if (jqHxr.responseJSON) {
        errorText = jqHxr.responseJSON.result.error;
      } else {
        errorText = textStatus;
      }
      $('.main-content .status').append($('<div class="alert alert-danger compact-alert" role="alert">Error: ' + errorText + '</div>'));
      $('.metadata .loading, .metadata-editable .loading, .stats-panel .loading').removeClass('loading');
      $('.stats-panel td.stats-value-column').html('&nbsp;');
      $('.add-to-story').addClass('disabled').prop('disabled', true);
      });

    chrome.tabs.executeScript(tabs[0].id, {'file': 'js/get-metadata.js'}, function(r) {
      var metadata = r[0];

      // This parses any HTML entities, etc.

      summary_from_page = metadata.description[0][0];

      if (metadata.description[0][0] != null) {
        var doc = new DOMParser().parseFromString(metadata.description[0][0], "text/html");
        $('#summary').val(doc.documentElement.textContent)
      }
      var authors = metadata.author.map(function(m) {
        return m[0]
      })
      console.log('authors - 9 - ', authors);
      console.log('authors - first - ',  _.first(_.filter(authors, valid_author)) );
      author_from_page = _.first(_.filter(authors, valid_author));
      // $('#author').val(_.first(_.filter(authors, valid_author)));
    });

  });

}

var setup_editable_published_at = function(data) {
  if (data.result.published_at) {
    $('.metadata-editable #pubdate').daterangepicker(
      { "singleDatePicker": true,
        "showDropdowns": true,
        "alwaysShowCalendars": true,
        "startDate": moment(data.result.published_at)
      }
    )
  } else {
    $('.metadata-editable #pubdate').daterangepicker(
      { "singleDatePicker": true,
        "showDropdowns": true,
        "alwaysShowCalendars": true,
        "autoUpdateInput": false
      }
    )
    $('.metadata-editable #pubdate').on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('MM/DD/YYYY'));
    });

    $('.metadata-editable #pubdate').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
    });
  }
}

var setup_editable_report_on_date = function(data) {
  if (data.result.report_on_date) {
    console.log('report on date ', data.result.report_on_date)
    $('.user #report_on_date').daterangepicker(
      { "singleDatePicker": true,
        "showDropdowns": true,
        "alwaysShowCalendars": true,
        "drops": "down",
        "startDate": moment(data.result.report_on_date)
      }
    )
  } else {
    console.log('moment date', moment().format('MM/DD/YYYY') )
    $('.user #report_on_date').daterangepicker(
      { "singleDatePicker": true,
        "showDropdowns": true,
        "alwaysShowCalendars": true,
        "drops": "down",
        "autoUpdateInput": false
      }
    )

    $('.user #report_on_date').on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('MM/DD/YYYY'));
    });

    $('.user #report_on_date').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
    });

  }
}

var valid_author = function(a) {
  return !(_.isNil(a) || validate({website: a}, {website: {url: true}})==undefined);
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
        client_id: sm_selected_client_id,
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
        $('.stats .total').text(data.total_formatted)
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
  $('.story-list-item-'+ story_id).removeClass('hidden')
}

var reset_fields = function() {
  $('.metadata-editable #url').val('')
  $('.metadata-editable .url').val('')
  $('.metadata-editable #title').val('')
  $('.metadata .url-icon').addClass('hidden');
  $('.metadata .url').text('')
  $('.metadata .title').text('')
  $('.metadata .pubdate').text('')

  $('.user .summary').text('')
  $('.user .notes').text('')
  $('.user .author').text('')
  
  $('.user #tone1').text('')
  $('.user #tone-i').text('')
  $('.user #article_type_s').text('')
  $('.user #article_type_i').text('')
  $('.user #focus_s').text('')
  $('.user #focus_i').text('')
  $('.user #initiative_s').text('')
  $('.user #initiative_i').text('')
  $('.user #custom_1_s').text('')
  $('.user #custom_1_i').text('')

  $('.stats .facebook').text('')
  $('.stats .twitter').text('')
  $('.stats .google').text('')
  $('.stats .linkedin').text('')
  $('.stats .pinterest').text('')
  $('.stats .total').text('')
}

var story_list_search = function(search) {
  var regexp = new RegExp(search, 'i');
  var $data_rows = $('.story-list .story-item');
  var matched = $.grep($data_rows, function(li) {
    $li = $(li)
    return $li.text().match(regexp) && $li.hasClass('client-' + sm_selected_client_id)
  });
  $data_rows.addClass('hidden');
  $(matched).removeClass('hidden');
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

var show_info_window = function(msg) {
  $('.info-window').removeClass('hidden');
  $('#status').append($(msg));
  $('.check-access').addClass('hidden');
}

var parseApiHost = function(url) {
  var parser = document.createElement('a');
  parser.href = url;
  return parser.protocol + '//' + parser.host + '/api/v2/extension/';
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
