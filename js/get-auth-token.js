var token=null, fullname=null, sm_email=null;
if (document.head.querySelector("[name=sm-api-token]")!=null) {
  token = document.head.querySelector("[name=sm-api-token]").content
}
if (document.head.querySelector("[name=sm-fullname]")!=null) {
  fullname = document.head.querySelector("[name=sm-fullname]").content
}
if (document.head.querySelector("[name=sm-initials]")!=null) {
  initials = document.head.querySelector("[name=sm-initials]").content
}
if (document.head.querySelector("[name=sm-email]")!=null) {
  sm_email = document.head.querySelector("[name=sm-email]").content
}
var a = {'sm-api-token': token, 'fullname': fullname, 'initials': initials, 'sm-email': sm_email};
a
