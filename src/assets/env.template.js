(function(window) {
  window.__env = window.__env || {};
  // Variables que serán reemplazadas por envsubst en Docker
  window.__env.apiUrl = '${BACKEND_URL}';
})(this);
