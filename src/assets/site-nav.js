(function () {
  var menu = document.getElementById('site-menu');
  var toggle = document.querySelector('.hamburger-btn');
  if (!menu || !toggle) return;

  var ariaObserver = new MutationObserver(function () {
    menu.setAttribute('aria-hidden', menu.classList.contains('is-open') ? 'false' : 'true');
  });
  ariaObserver.observe(menu, { attributes: true, attributeFilter: ['class'] });
  menu.setAttribute('aria-hidden', 'true');

  var backdrop = menu.querySelector('.site-menu-backdrop');
  var closeBtn = menu.querySelector('.site-menu-close');
  var panel = menu.querySelector('.site-menu-panel');
  var links = menu.querySelectorAll('.site-menu-nav a');

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      (closeBtn || toggle).focus();
    } else {
      toggle.focus();
    }
  }

  function openMenu() { setOpen(true); }
  function closeMenu() { setOpen(false); }

  toggle.addEventListener('click', function () {
    setOpen(!menu.classList.contains('is-open'));
  });

  if (backdrop) backdrop.addEventListener('click', closeMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  links.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  if (panel) {
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menu.classList.contains('is-open')) return;
      var focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
})();
