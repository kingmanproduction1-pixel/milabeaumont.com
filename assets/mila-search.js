// Mila Beaumont on-site search. Static, runs entirely in the visitor's browser.
// Needs window.MILA_SEARCH_INDEX from /assets/search-index.js loaded first.
(function () {
  var css = [
    '.mb-search{max-width:640px;margin:22px auto 6px;padding:0 16px;position:relative;font-family:Inter,system-ui,sans-serif}',
    '.mb-search .mb-box{display:flex;align-items:center;gap:10px;background:#101410;border:1px solid #c9a227;border-radius:999px;padding:12px 18px;box-shadow:0 6px 24px rgba(0,0,0,.35)}',
    '.mb-search .mb-ic{color:#c9a227;font-size:18px;line-height:1}',
    '.mb-search input{flex:1;background:transparent;border:0;outline:0;color:#f4efe2;font-size:16px;font-family:inherit}',
    '.mb-search input::placeholder{color:#9a937e}',
    '.mb-results{position:absolute;left:16px;right:16px;top:calc(100% + 8px);background:#141814;border:1px solid #c9a227;border-radius:16px;overflow:hidden;z-index:60;box-shadow:0 18px 50px rgba(0,0,0,.55)}',
    '.mb-results a.mb-hit{display:flex;gap:12px;align-items:center;padding:10px 14px;text-decoration:none;color:#f4efe2;border-bottom:1px solid rgba(201,162,39,.18)}',
    '.mb-results a.mb-hit:last-child{border-bottom:0}',
    '.mb-results a.mb-hit:hover,.mb-results a.mb-hit.mb-on{background:#1d241c}',
    '.mb-results img,.mb-results .mb-tile{width:52px;height:52px;object-fit:cover;border-radius:10px;flex:0 0 52px}',
    '.mb-results .mb-tile{display:flex;align-items:center;justify-content:center;background:#0d3b2e;color:#c9a227;font-family:"Cormorant Garamond",serif;font-size:24px;border:1px solid rgba(201,162,39,.4)}',
    '.mb-results .mb-nm{font-weight:600;font-size:15px}',
    '.mb-results .mb-pr{color:#c9a227;font-weight:700;font-size:14px;white-space:nowrap}',
    '.mb-results .mb-ds{color:#b7b09c;font-size:12.5px;line-height:1.35}',
    '.mb-none{padding:14px 16px;color:#e8e2cf;font-size:14.5px;line-height:1.5}',
    '.mb-none a{color:#c9a227;font-weight:600}'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var mount = document.createElement('div');
  mount.className = 'mb-search';
  mount.innerHTML = '<div class="mb-box"><span class="mb-ic">&#128269;</span>' +
    '<input type="search" id="mb-q" placeholder="Looking for something? Try &quot;bag&quot;, &quot;fishing&quot;, &quot;perfume&quot;&hellip;" autocomplete="off" aria-label="Search the store"></div>' +
    '<div class="mb-results" id="mb-res" hidden></div>';

  var anchor = document.querySelector('p.sub') || document.querySelector('header.site') || document.body.firstChild;
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(mount, anchor.nextSibling);
  else document.body.insertBefore(mount, document.body.firstChild);

  var input = mount.querySelector('#mb-q');
  var box = mount.querySelector('#mb-res');
  var IDX = window.MILA_SEARCH_INDEX || [];

  function norm(s) {
    return (s || '').toLowerCase().replace(/['\u2019]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function words(s) { return norm(s).split(' ').filter(Boolean); }

  function score(item, qWords, qRaw) {
    var name = norm(item.name), kw = norm(item.kw || ''), desc = norm(item.desc || '');
    var hay = name + ' ' + kw + ' ' + desc;
    var hayWords = words(hay);
    var total = 0, matched = 0;
    for (var i = 0; i < qWords.length; i++) {
      var w = qWords[i], best = 0;
      if (name.indexOf(w) === 0) best = 6;
      else if (name.indexOf(w) !== -1) best = 5;
      else if (kw.indexOf(w) !== -1) best = 4;
      else {
        for (var j = 0; j < hayWords.length; j++) {
          if (hayWords[j].indexOf(w) === 0) { best = 3; break; }
        }
        if (!best && desc.indexOf(w) !== -1) best = 2;
      }
      if (best) { matched++; total += best; }
    }
    if (!matched) return -1;
    if (matched === qWords.length && qWords.length > 1) total += 2;
    if (qRaw.length > 2 && name.indexOf(qRaw) !== -1) total += 3;
    return total;
  }

  function render(list, q) {
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    if (!list.length) {
      box.innerHTML = '<div class="mb-none">I don\'t show that one yet, love. Browse <a href="/shop/">the full collection</a>, and if it\'s a book or an app you\'re after, check the menu up top.</div>';
      box.hidden = false;
      return;
    }
    box.innerHTML = list.slice(0, 7).map(function (it) {
      var pic = it.img ? '<img src="' + it.img + '" alt="">' : '<span class="mb-tile">M</span>';
      return '<a class="mb-hit" href="' + it.url + '" target="_blank" rel="noopener">' + pic +
        '<span style="flex:1"><span class="mb-nm">' + it.name + '</span><br><span class="mb-ds">' + it.desc + '</span></span>' +
        '<span class="mb-pr">' + it.price + '</span></a>';
    }).join('');
    box.hidden = false;
  }

  input.addEventListener('input', function () {
    var q = norm(input.value);
    if (q.length < 2) { render([], ''); return; }
    var qw = words(q);
    var hits = IDX.map(function (it) { return { it: it, s: score(it, qw, q) }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (r) { return r.it; });
    render(hits, q);
  });
  document.addEventListener('click', function (e) {
    if (!mount.contains(e.target)) { box.hidden = true; }
  });
  input.addEventListener('focus', function () {
    if (input.value.trim().length >= 2) input.dispatchEvent(new Event('input'));
  });
})();
