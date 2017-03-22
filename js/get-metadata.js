var getValue = function(s) {
  var d = document.querySelector(s.query);
  if (d) {
    if (s.function=="content") {
      return d.content
    } else {
      return d.text
    }
  } else {
    return undefined
  }
}

var m = {"description": [{query: "meta[property='og:description']", function: "content"}],
  "author": [{query: "meta[property='article:author']", function: "content"},
  {query: "meta[property='og:article:author']", function: "content"},
  {query: "a[rel='author']", function: "text"}
  ]
}
var result = {};

for (var name in m) {
  if (m.hasOwnProperty(name)) {
    result[name] = []
    for (var i in m[name]) {
      var r = getValue(m[name][i]);
      result[name].push([r, m[name][i].query])
    }
  }
}
result
// result is a hash of {"author": [], "description": []}
// where each array result's element is the value and the query for the value, e.g.
// {
//   "description": [
//     [
//       "AT&T Inc (T.N), the No. 2 U.S. wireless carrier...",
//       "meta[property='og:description']"
//     ]
//   ],
//   "author": [
//     [
//       null,
//       "meta[property='article:author']"
//     ],
//     [
//       "Anjali Athavaley and Anna Driver",
//       "meta[property='og:article:author']"
//     ],
//     [
//       null,
//       "a[rel='author']"
//     ]
//   ]
// }
