// js/share.js — 24 Nov 2026 v1
// Phase 33. Runs on share.html only: turns a share's ?title=&text=&url=
// into #/recipe-import?u=…&t=…&title=… and replaces the page with the app.
// A classic script, not a module, so it runs before anything else loads
// and has nothing to import. Reading the link out of the text is the
// import screen's job (data/recipeImport.js), not this page's.
(function () {
  var params = new URLSearchParams(window.location.search);
  var url = params.get('url') || '';
  var text = params.get('text') || '';
  var title = params.get('title') || '';
  var out = new URLSearchParams();
  if (url) out.set('u', url.slice(0, 2000));
  if (text) out.set('t', text.slice(0, 4000));
  if (title) out.set('title', title.slice(0, 200));
  var query = out.toString();
  window.location.replace('./#/recipe-import' + (query ? '?' + query : ''));
}());
