// dc-lite: a tiny renderer for the FairTradeScore screens exported from the design canvas.
// Each screen is an <x-dc> template plus a small Component class. This supports the parts
// those screens use: {{value}} holes, <sc-if>, <sc-for>, onClick handlers and setState.
// Props can be set from the URL, e.g. screen.html?stage=early&showStage=false
window.addEventListener('error', function (e) { try { parent.postMessage({ ft: 'dbg', m: String(e.message) + ' @' + e.lineno }, '*'); } catch (x) {} });
(function () {
  var host = document.querySelector('x-dc');
  var scriptEl = document.querySelector('script[data-dc-script]');
  if (!host) return;

  // move <helmet> (fonts, base styles) into <head>
  var helmet = host.querySelector('helmet');
  if (helmet) {
    Array.prototype.slice.call(helmet.children).forEach(function (node) { document.head.appendChild(node); });
    helmet.remove();
  }
  var template = host.innerHTML;

  // props: defaults from data-props, overridden by the query string
  var props = {};
  try {
    var decl = JSON.parse((scriptEl && scriptEl.getAttribute('data-props')) || '{}');
    Object.keys(decl).forEach(function (k) {
      if (k.charAt(0) !== '$' && decl[k] && 'default' in decl[k]) props[k] = decl[k]['default'];
    });
  } catch (e) { /* no props */ }
  new URLSearchParams(location.search).forEach(function (v, k) {
    props[k] = v === 'true' ? true : v === 'false' ? false : v;
  });

  var component = null;
  function DCLogic(p) { this.props = p; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    this.state = Object.assign({}, this.state || {}, patch);
    render();
  };
  if (scriptEl) {
    try {
      var Cls = new Function('DCLogic', scriptEl.textContent + '\nreturn Component;')(DCLogic);
      component = new Cls(props);
      if (!component.props) component.props = props;
      if (!component.state) component.state = {};
    } catch (e) { console.warn('dc-lite: component failed', e); }
  }

  // look up a dotted path like "x.text" in the scopes, newest first
  function resolve(expr, scopes) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var parts = expr.split('.');
    for (var i = scopes.length - 1; i >= 0; i--) {
      var cur = scopes[i];
      if (cur && Object.prototype.hasOwnProperty.call(cur, parts[0])) {
        for (var j = 0; j < parts.length && cur != null; j++) cur = cur[parts[j]];
        return cur;
      }
    }
    return undefined;
  }
  var HOLE = /\{\{([^}]+)\}\}/g;
  function fill(str, scopes) {
    return str.replace(HOLE, function (_, e) { var v = resolve(e, scopes); return v == null ? '' : String(v); });
  }
  function single(str, scopes) {
    var m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(str || '');
    return m ? resolve(m[1], scopes) : str;
  }

  function walk(node, scopes) {
    var children = Array.prototype.slice.call(node.childNodes);
    children.forEach(function (child) {
      if (child.nodeType === 3) {
        if (child.nodeValue.indexOf('{{') > -1) child.nodeValue = fill(child.nodeValue, scopes);
        return;
      }
      if (child.nodeType !== 1) return;
      var tag = child.tagName.toLowerCase();

      if (tag === 'sc-if') {
        if (single(child.getAttribute('value'), scopes)) {
          walk(child, scopes);
          while (child.firstChild) node.insertBefore(child.firstChild, child);
        }
        child.remove();
        return;
      }
      if (tag === 'sc-for') {
        var list = single(child.getAttribute('list'), scopes) || [];
        var as = child.getAttribute('as') || 'item';
        list.forEach(function (item, idx) {
          var copy = child.cloneNode(true);
          var scope = {}; scope[as] = item; scope.index = idx;
          walk(copy, scopes.concat([scope]));
          while (copy.firstChild) node.insertBefore(copy.firstChild, child);
        });
        child.remove();
        return;
      }

      Array.prototype.slice.call(child.attributes).forEach(function (attr) {
        var name = attr.name;
        if (name.indexOf('hint-') === 0) { child.removeAttribute(name); return; }
        if (name === 'onclick') {
          var fn = single(attr.value, scopes);
          child.removeAttribute(name);
          // handled by one delegated listener (see below), so re-renders can swap handlers
          if (typeof fn === 'function') child.__dcClick = fn;
          return;
        }
        if (attr.value.indexOf('{{') > -1) child.setAttribute(name, fill(attr.value, scopes));
      });
      if (tag === 'a') wireLink(child);
      walk(child, scopes);
    });
  }

  // Links between screens. Inside the case study's live prototype ([data-proto]) the page
  // handles navigation (with transitions); elsewhere on the page screens stay static;
  // opened on their own, links simply navigate.
  // The prototype talks to this screen with postMessage only, so it also works when the
  // site is opened straight from disk (file://), where pages can't reach into each other.
  var inFrame = window !== window.top;
  var inProto = inFrame && new URLSearchParams(location.search).get('proto') === '1';
  var live = false;
  function post(msg) { if (inProto) window.parent.postMessage(msg, '*'); }
  var protoNav = inProto ? function (href, opts) { post({ ft: 'nav', href: href, back: !!(opts && opts.back) }); } : null;

  var HOT = 'a[href], button, [role="radio"], [role="button"], [role="switch"], [role="tab"]';
  function norm(t) { return (t || '').replace(/\s+/g, ' ').trim(); }
  function visibleEls(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (e) {
      var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
  }
  function hotRects() {
    return visibleEls(HOT).map(function (e) {
      var r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height];
    });
  }
  // the control whose text matches (exact first, then the shortest one containing it)
  function findByText(text) {
    var els = visibleEls('a, button, [role="radio"], [role="button"]');
    var exact = els.filter(function (e) { return norm(e.textContent) === text; })[0];
    if (exact) return exact;
    return els.filter(function (e) { return norm(e.textContent).indexOf(text) > -1; })
      .sort(function (a, b) { return a.textContent.length - b.textContent.length; })[0] || null;
  }

  if (inProto) {
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || !e.data.ft) return;
      var d = e.data, el;
      if (d.ft === 'find') {
        el = findByText(d.text);
        var r = el && el.getBoundingClientRect();
        post({ ft: 'found', id: d.id, rect: r ? [r.left, r.top, r.width, r.height] : null });
      } else if (d.ft === 'click') {
        el = findByText(d.text);
        if (el) el.click();
      } else if (d.ft === 'hots') {
        post({ ft: 'hots', rects: hotRects() });
      } else if (d.ft === 'mode') {
        live = !!d.live;
        document.documentElement.classList.toggle('dc-live', live);
      }
    });
    // tapping an empty spot asks the page to show what's clickable
    document.addEventListener('click', function (e) {
      if (live && !e.target.closest(HOT + ', input, textarea, select, label')) post({ ft: 'hots', rects: hotRects() });
    });
    // a soft touch-point cursor while the visitor is driving
    var st = document.createElement('style');
    st.textContent = "@media (pointer: fine) { html.dc-live, html.dc-live * { cursor: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='11' fill='rgba(255,255,255,0.35)' stroke='white' stroke-width='2'/%3E%3C/svg%3E\") 14 14, auto !important; } }";
    document.head.appendChild(st);
  }

  function inert(a) {
    a.removeAttribute('href');
    a.setAttribute('role', 'presentation');
  }
  function wireLink(a) {
    var href = a.getAttribute('href') || '';
    if (!href) return;
    // screens that weren't converted, and placeholder or in-page links
    if (/\.dc\.html/.test(href) || href.charAt(0) === '#') return inert(a);
    if (!/^[a-z0-9-]+\.html(\?|$)/i.test(href)) return; // external link: leave it
    if (inFrame && !protoNav) return inert(a);
  }

  // one listener for every tap: onClick handlers first, then links between screens
  document.addEventListener('click', function (e) {
    for (var n = e.target; n && n !== document; n = n.parentNode) {
      if (n.__dcClick) { e.preventDefault(); n.__dcClick(e); return; }
    }
    if (!protoNav) return;
    var a = e.target.closest && e.target.closest('a[href]');
    var href = a && a.getAttribute('href');
    if (!href || !/^[a-z0-9-]+\.html(\?|$)/i.test(href)) return;
    e.preventDefault();
    var label = (a.getAttribute('aria-label') || '') + ' ' + a.textContent;
    protoNav(href, { back: /^\s*back\b/i.test(label) });
  });

  // Update the live screen in place, so elements that stay keep their state and the
  // transitions designed into them (like the progress dial's 0.8s sweep) can play.
  function syncAttrs(o, n) {
    var i, at;
    for (i = o.attributes.length - 1; i >= 0; i--) {
      at = o.attributes[i].name;
      if (!n.hasAttribute(at)) o.removeAttribute(at);
    }
    for (i = 0; i < n.attributes.length; i++) {
      at = n.attributes[i];
      if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
    }
  }
  function morph(oldP, newP) {
    var oldKids = Array.prototype.slice.call(oldP.childNodes);
    var newKids = Array.prototype.slice.call(newP.childNodes);
    newKids.forEach(function (n, i) {
      var o = oldKids[i];
      if (!o) { oldP.appendChild(n); return; }
      if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { oldP.replaceChild(n, o); return; }
      if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
      syncAttrs(o, n);
      o.__dcClick = n.__dcClick;
      morph(o, n);
    });
    for (var j = newKids.length; j < oldKids.length; j++) oldP.removeChild(oldKids[j]);
  }

  var rendered = false;
  function render() {
    var vals = {};
    try { vals = component && component.renderVals ? component.renderVals() || {} : {}; } catch (e) { console.warn('dc-lite: renderVals failed', e); }
    var tpl = document.createElement('template');
    tpl.innerHTML = template;
    walk(tpl.content, [vals]);
    if (!rendered) { host.replaceChildren(tpl.content); rendered = true; }
    else morph(host, tpl.content);
  }
  render();
  // lifecycle hook used by animated screens (e.g. the "setting up your profile" timer)
  if (component && typeof component.componentDidMount === 'function') {
    try { component.componentDidMount(); } catch (e) { console.warn('dc-lite: componentDidMount failed', e); }
  }
  // tell the prototype the screen is ready once its web font has loaded
  if (inProto) {
    var told = false;
    var ready = function () {
      if (told) return;
      told = true;
      post({ ft: 'ready', title: document.title, sheet: !!document.querySelector('[role="dialog"]') });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
    setTimeout(ready, 1200);
  }
  window.addEventListener('pagehide', function () {
    if (component && typeof component.componentWillUnmount === 'function') component.componentWillUnmount();
  });
})();
