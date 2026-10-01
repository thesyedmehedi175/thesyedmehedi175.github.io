/* =============================================================
   Syed Md Mehedi Hasan — portfolio controller
   - Renders all profile content from content.js (single source)
   - Generates meshing SVG gear systems (correct tooth ratios)
   - Navigation, scroll reveal, lightbox, blueprint parallax
   ============================================================= */
(function () {
  'use strict';

  const D = window.PORTFOLIO;
  const motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------
     1. DOM helpers
  --------------------------------------------------------- */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    props = props || {};
    for (const key in props) {
      const val = props[key];
      if (val === null || val === undefined || val === false) continue;
      if (key === 'class') node.className = val;
      else if (key === 'text') node.textContent = val;
      else if (key.slice(0, 2) === 'on' && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else node.setAttribute(key, val === true ? '' : val);
    }
    const kids = children === undefined ? [] : [].concat(children);
    kids.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function svgEl(markup) {
    const tpl = document.createElement('template');
    tpl.innerHTML = markup.trim();
    return tpl.content.firstChild;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function fill(node, children) {
    clear(node);
    [].concat(children).forEach(function (c) { if (c) node.append(c); });
    return node;
  }

  /* ---------------------------------------------------------
     2. Gear geometry + meshing solver

     Meshing rules used here (external spur gears):
       · pitch radius  Rp = module * teeth / 2
       · centre distance between meshed gears = Rp1 + Rp2
       · direction alternates along the train
       · duration of one revolution = teeth * toothPeriod,
         which keeps the tooth engagement rate equal on
         every gear in the train (omega * teeth = const)
       · initial phase places a tooth of the parent on the
         contact line and a gap of the child opposite it
  --------------------------------------------------------- */
  const gearUID = { n: 0 };

  function polar(r, a) {
    return [r * Math.cos(a), r * Math.sin(a)];
  }
  function f2(n) { return Math.round(n * 100) / 100; }
  function norm360(a) { a = a % 360; return a < 0 ? a + 360 : a; }

  /* Outline of one gear: teeth + centre bore (evenodd => ring) */
  function gearRingPath(teeth, mod) {
    const rp = mod * teeth / 2;
    const rt = rp + mod;             // addendum
    const rr = rp - 1.25 * mod;      // dedendum
    const bore = Math.max(rp * 0.18, mod * 1.6);
    const p = (Math.PI * 2) / teeth;
    const tipHalf = 0.14 * p;
    const rootHalf = 0.36 * p;
    let d = '';

    for (let i = 0; i < teeth; i++) {
      const c = i * p;
      const a0 = c - rootHalf;
      const a1 = c - tipHalf;
      const a2 = c + tipHalf;
      const a3 = c + rootHalf;
      const next = (i + 1) * p - rootHalf;
      const A0 = polar(rr, a0);
      const B = polar(rt, a1);
      const C = polar(rt, a2);
      const Dp = polar(rr, a3);
      const N = polar(rr, next);

      if (i === 0) d += 'M ' + f2(A0[0]) + ' ' + f2(A0[1]);
      d += ' L ' + f2(B[0]) + ' ' + f2(B[1]);
      d += ' A ' + f2(rt) + ' ' + f2(rt) + ' 0 0 1 ' + f2(C[0]) + ' ' + f2(C[1]);
      d += ' L ' + f2(Dp[0]) + ' ' + f2(Dp[1]);
      d += ' A ' + f2(rr) + ' ' + f2(rr) + ' 0 0 1 ' + f2(N[0]) + ' ' + f2(N[1]);
    }
    d += ' Z';

    // centre bore subpath (cut out with fill-rule="evenodd")
    d += ' M ' + f2(-bore) + ' 0';
    d += ' A ' + f2(bore) + ' ' + f2(bore) + ' 0 1 0 ' + f2(bore) + ' 0';
    d += ' A ' + f2(bore) + ' ' + f2(bore) + ' 0 1 0 ' + f2(-bore) + ' 0 Z';
    return d;
  }

  /* Resolve a desired contact angle onto the parent's tooth grid */
  function snapAngle(parent, desired) {
    const pitch = 360 / parent.teeth;
    const k = Math.round((desired - parent.phaseDeg) / pitch);
    return parent.phaseDeg + k * pitch;
  }

  /*
    spec = {
      gears: [ {teeth, x, y} | {teeth, from: <index>, angle} | {teeth, x, y, free:true} ],
      mod, period (seconds per tooth), steel (bool), pad
    }
  */
  function gearScene(spec) {
    const mod = spec.mod;
    const laid = [];
    let maxTip = 0;

    spec.gears.forEach(function (g, i) {
      let x, y, phase = 0, dir = 1;

      if (i === 0 || g.free || g.x !== undefined && g.from === undefined) {
        x = g.x; y = g.y;
      } else {
        const parent = laid[g.from];
        const ang = snapAngle(parent, g.angle || 0);
        const dist = mod * (parent.teeth + g.teeth) / 2;
        const rad = (ang * Math.PI) / 180;
        x = parent.x + dist * Math.cos(rad);
        y = parent.y + dist * Math.sin(rad);

        const childPitch = 360 / g.teeth;
        phase = norm360(ang + 180 + childPitch / 2);
        dir = -parent.dir;
      }

      const item = {
        teeth: g.teeth,
        x: x, y: y,
        phaseDeg: phase,
        dir: dir,
        tip: mod * g.teeth / 2 + mod,
        dur: (g.teeth * spec.period).toFixed(2) + 's'
      };
      maxTip = Math.max(maxTip, item.tip);
      laid.push(item);
    });

    // bounding box -> viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    laid.forEach(function (g) {
      minX = Math.min(minX, g.x - g.tip);
      maxX = Math.max(maxX, g.x + g.tip);
      minY = Math.min(minY, g.y - g.tip);
      maxY = Math.max(maxY, g.y + g.tip);
    });
    const pad = spec.pad === undefined ? 8 : spec.pad;
    const vb = [minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2]
      .map(f2).join(' ');

    const uid = 'gearSteel' + (++gearUID.n);
    const stroke = spec.stroke || '#5d6a74';
    let defs = '';
    if (spec.steel !== false) {
      defs =
        '<defs><linearGradient id="' + uid + '" gradientUnits="userSpaceOnUse" ' +
        'x1="0" y1="' + f2(-maxTip) + '" x2="0" y2="' + f2(maxTip) + '">' +
        '<stop offset="0" stop-color="#4a5660"/>' +
        '<stop offset="0.55" stop-color="#333e46"/>' +
        '<stop offset="1" stop-color="#242d34"/>' +
        '</linearGradient></defs>';
    }
    const fillVal = spec.steel === false ? 'currentColor' : 'url(#' + uid + ')';

    const body = laid.map(function (g) {
      const ring = gearRingPath(g.teeth, mod);
      const rp = mod * g.teeth / 2;
      const spokes = [];

      if (g.teeth >= 12) {
        const bars = g.teeth >= 26 ? 3 : 2;
        const sw = Math.max(mod * 0.9, rp * 0.16);
        const rHole = rp - 1.25 * mod - mod * 1.4;
        for (let b = 0; b < bars; b++) {
          spokes.push(
            '<rect class="gear-spoke" x="' + f2(-sw / 2) + '" y="' + f2(-rHole - 2) +
            '" width="' + f2(sw) + '" height="' + f2((rHole + 2) * 2) +
            '" rx="' + f2(Math.min(sw / 3, 4)) + '" transform="rotate(' + (b * 180 / bars) + ')"/>'
          );
        }
      }
      const hubR = Math.max(rp * 0.34, mod * 2.2);

      return (
        '<g transform="translate(' + f2(g.x) + ' ' + f2(g.y) + ')">' +
        '<g class="gear--spin" style="--dur:' + g.dur + ';--phase:' + f2(g.phaseDeg) +
        'deg;--spin-dir:' + (g.dir === -1 ? 'reverse' : 'normal') + '">' +
        '<path class="gear-ring" d="' + ring + '" fill="' + fillVal +
        '" fill-rule="evenodd" stroke="' + stroke + '" stroke-width="1.1" stroke-linejoin="round"/>' +
        (spokes.length
          ? '<g fill="' + fillVal + '" stroke="' + stroke + '" stroke-width="1.1">' +
            spokes.join('') + '</g>'
          : '') +
        '<circle class="gear-hub" r="' + f2(hubR) + '" fill="' + fillVal +
        '" stroke="' + stroke + '" stroke-width="1.1"/>' +
        '</g></g>'
      );
    }).join('');

    return (
      '<svg class="gear-scene" viewBox="' + vb + '" aria-hidden="true" focusable="false">' +
      defs + body + '</svg>'
    );
  }

  /* Small single-colour gear (eyebrows, rules, logo) */
  function miniGear(teeth, mod, dur) {
    const svg = gearScene({
      gears: [{ teeth: teeth, x: 0, y: 0 }],
      mod: mod,
      period: dur / teeth,
      steel: false,
      stroke: 'none',
      pad: 2
    });
    return svg.replace('class="gear-scene"', 'class="gear-scene gear-mini"');
  }

  /* ---------------------------------------------------------
     3. Content rendering
  --------------------------------------------------------- */
  const ARROW =
    '<svg class="social-list__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function linkOrText(value) {
    if (value.indexOf('@') > -1 && value.indexOf(' ') === -1) {
      return el('a', { href: 'mailto:' + value, text: value });
    }
    return document.createTextNode(value);
  }

  function renderHero() {
    const p = D.profile;
    const name = document.querySelector('.hero__name');
    const role = document.querySelector('.hero__role');
    const aff = document.querySelector('.hero__affiliation');
    const tag = document.getElementById('hero-tagline');
    const footName = document.getElementById('footer-name');
    const footTag = document.querySelector('.footer__tag');

    if (name) name.textContent = p.name;
    if (role) role.textContent = p.role;
    if (aff) aff.textContent = p.affiliation;
    if (tag) tag.textContent = p.tagline;
    if (footName) footName.textContent = p.name;
    if (footTag) footTag.textContent = p.role;
  }

  function profilePlate(p) {
    if (p.photo) {
      const img = el('img', {
        src: p.photo,
        alt: 'Portrait of ' + p.name,
        width: '400',
        height: '500',
        /* If the hosted (imgbb) link ever fails, fall back to the local copy. */
        onerror: function () {
          if (p.photoBackup && !img.dataset.fb) {
            img.dataset.fb = '1';
            img.src = p.photoBackup;
          }
        }
      });
      return img;
    }
    // "Syed Md Mehedi Hasan" -> "SMH" (collapse repeated initials)
    const initials = p.name.split(/\s+/)
      .map(function (w) { return (w[0] || '').toUpperCase(); })
      .filter(function (c, i, arr) { return c && (i === 0 || c !== arr[i - 1]); })
      .slice(0, 4).join('');
    const svg =
      '<svg viewBox="0 0 400 500" role="img" aria-label="Engineering nameplate monogram for ' +
      esc(p.name) + '">' +
      '<rect x="1" y="1" width="398" height="498" rx="8" fill="#12181d" stroke="#2b353d" stroke-width="2"/>' +
      '<rect x="14" y="14" width="372" height="472" rx="4" fill="none" stroke="#232c33" ' +
      'stroke-width="1" stroke-dasharray="7 7"/>' +
      /* faint blueprint rules */
      '<g stroke="rgba(125,158,180,0.09)" stroke-width="1">' +
      '<line x1="14" y1="250" x2="386" y2="250"/><line x1="200" y1="14" x2="200" y2="486"/>' +
      '</g>' +
      /* decorative gear behind monogram */
      '<g transform="translate(200 216)" opacity="0.5">' +
      '<path d="' + gearRingPath(26, 15) + '" fill="#1b232a" fill-rule="evenodd" ' +
      'stroke="#3a464f" stroke-width="1.4"/></g>' +
      /* crosshair ticks */
      '<g stroke="#e8963c" stroke-width="2" opacity="0.85">' +
      '<line x1="42" y1="42" x2="70" y2="42"/><line x1="42" y1="42" x2="42" y2="70"/>' +
      '<line x1="358" y1="42" x2="330" y2="42"/><line x1="358" y1="42" x2="358" y2="70"/>' +
      '<line x1="42" y1="458" x2="70" y2="458"/><line x1="42" y1="458" x2="42" y2="430"/>' +
      '<line x1="358" y1="458" x2="330" y2="458"/><line x1="358" y1="458" x2="358" y2="430"/>' +
      '</g>' +
      /* rivets */
      '<g fill="#0d1114" stroke="#39434b" stroke-width="1.5">' +
      '<circle cx="34" cy="250" r="7"/><circle cx="366" cy="250" r="7"/></g>' +
      '<text x="200" y="238" text-anchor="middle" font-family="Barlow Semi Condensed, sans-serif" ' +
      'font-size="96" font-weight="700" fill="#e8edf1" letter-spacing="6">' + esc(initials) + '</text>' +
      '<text x="200" y="330" text-anchor="middle" font-family="IBM Plex Mono, monospace" ' +
      'font-size="16" fill="#aeb9c1" letter-spacing="3">' + esc(p.name.toUpperCase()) + '</text>' +
      '<line x1="120" y1="352" x2="280" y2="352" stroke="#e8963c" stroke-width="2"/>' +
      '<text x="200" y="382" text-anchor="middle" font-family="IBM Plex Mono, monospace" ' +
      'font-size="13" fill="#e8963c" letter-spacing="4">MECHANICAL ENGINEER</text>' +
      '<text x="200" y="440" text-anchor="middle" font-family="IBM Plex Mono, monospace" ' +
      'font-size="11" fill="#7e8a93" letter-spacing="2">SONARGAON UNIVERSITY · DHAKA</text>' +
      '</svg>';
    return svgEl(svg);
  }

  function renderAbout() {
    const p = D.profile;
    const body = document.getElementById('about-body');
    if (body) {
      fill(body,
        [el('p', { class: 'about__lead', text: p.shortBio })].concat(
          p.about.map(function (text) { return el('p', { text: text }); })
        ));
    }

    const plate = document.getElementById('profile-plate');
    if (plate) fill(plate, profilePlate(p));

    const facts = document.getElementById('about-facts');
    if (facts) {
      const rows = [
        ['Based in', document.createTextNode(p.presentAddress)],
        ['Permanent', document.createTextNode(p.permanentAddress)],
        ['Email', el('a', { href: 'mailto:' + p.email, text: p.email })],
        ['Phone', el('a', { href: 'tel:' + p.phoneRaw, text: p.phoneDisplay })]
      ];
      fill(facts, rows.map(function (r) {
        return el('div', {}, [el('dt', { text: r[0] }), el('dd', {}, [r[1]])]);
      }));
    }

    const focus = document.getElementById('focus-chips');
    if (focus) fill(focus, D.focusAreas.map(function (t) { return el('li', { text: t }); }));

    const mem = document.getElementById('membership-chips');
    if (mem) fill(mem, (D.profile.memberships || []).map(function (t) {
      return el('li', { text: t });
    }));
  }

  function renderEducation() {
    const list = document.getElementById('education-timeline');
    if (!list) return;
    fill(list, D.education.map(function (item, i) {
      return el('li', {
        class: 'timeline__item reveal',
        style: '--rd:' + (i * 0.08).toFixed(2) + 's'
      }, [
        el('h3', { class: 'timeline__degree', text: item.degree }),
        el('p', { class: 'timeline__meta' }, [
          el('span', { text: item.institution }),
          el('span', { text: item.department }),
          el('span', { text: item.location })
        ]),
        el('p', { class: 'timeline__detail', text: item.detail })
      ]);
    }));
  }

  function renderSkills() {
    const grid = document.getElementById('skills-grid');
    if (!grid) return;
    fill(grid, D.skills.map(function (group, i) {
      return el('article', {
        class: 'skill-card reveal',
        style: '--rd:' + (i * 0.09).toFixed(2) + 's'
      }, [
        el('p', { class: 'skill-card__index', text: 'TOOLSET 0' + (i + 1) }),
        el('h3', { class: 'skill-card__title', text: group.group }),
        el('ul', {}, group.items.map(function (t) { return el('li', { text: t }); }))
      ]);
    }));
  }

  function renderExperience() {
    const node = document.getElementById('experience-entry');
    if (!node) return;
    const x = D.experience;
    fill(node, [
      el('div', { class: 'experience__top' }, [
        el('div', {}, [
          el('h3', { class: 'experience__role', text: x.role }),
          el('p', { class: 'experience__org', text: x.org })
        ]),
        el('div', { class: 'experience__meta' }, [
          el('span', { text: x.location }),
          el('span', { text: x.duration })
        ])
      ]),
      el('div', { class: 'experience__stats' }, x.stats.map(function (s) {
        return el('div', { class: 'stat' }, [
          el('strong', { class: 'stat__value', text: s.value }),
          el('span', { class: 'stat__label', text: s.label })
        ]);
      })),
      el('div', { class: 'experience__body prose' },
        x.paragraphs.map(function (t) { return el('p', { text: t }); }))
    ]);
  }

  function metricValue(value) {
    if (/^[$\d]/.test(value)) {
      const sp = value.indexOf(' ');
      if (sp > 0) {
        return [el('em', { text: value.slice(0, sp) }), document.createTextNode(value.slice(sp))];
      }
      return [el('em', { text: value })];
    }
    return [document.createTextNode(value)];
  }

  function renderResearch() {
    const node = document.getElementById('research-article');
    if (!node) return;
    const r = D.research;

    const meta = el('dl', { class: 'research__meta reveal' },
      r.metadata.map(function (m) {
        return el('div', {}, [
          el('dt', { text: m.label }),
          el('dd', {}, [linkOrText(m.value)])
        ]);
      }));

    fill(node, [
      el('header', { class: 'research__head reveal' }, [
        el('p', { class: 'research__label', text: r.label }),
        el('h3', { class: 'research__title', text: r.title }),
        el('p', { class: 'research__subtitle', text: r.subtitle }),
        el('ul', { class: 'tag-row' },
          r.tags.map(function (t) { return el('li', { text: t }); }))
      ]),

      el('div', { class: 'research__grid' }, [
        meta,
        el('div', { class: 'research__abstract reveal', style: '--rd:.08s' }, [
          el('h4', { class: 'block-label', text: 'Abstract' }),
          el('div', { class: 'prose' }, [el('p', { text: r.abstract })])
        ])
      ]),

      el('div', { class: 'key-results reveal' }, [
        el('h4', { class: 'block-label', text: r.keyResultsLabel }),
        el('ul', { class: 'metrics' }, r.keyResults.map(function (m, i) {
          return el('li', { class: 'metric', style: '--rd:' + (i * 0.05).toFixed(2) + 's' }, [
            el('span', { class: 'metric__label', text: m.label }),
            el('strong', { class: 'metric__value' }, metricValue(m.value))
          ]);
        }))
      ]),

      el('div', { class: 'research__conclusion reveal' }, [
        el('h4', { class: 'block-label', text: r.conclusionLabel }),
        el('div', { class: 'prose' },
          r.conclusion.map(function (t) { return el('p', { text: t }); }))
      ])
    ]);
  }

  function projectBlock(section) {
    const kids = [el('h4', { text: section.label })];
    if (section.paras) {
      kids.push(el('div', { class: 'prose' },
        section.paras.map(function (t) { return el('p', { text: t }); })));
    }
    if (section.list) {
      kids.push(el('ul', { class: 'checklist' },
        section.list.map(function (t) { return el('li', { text: t }); })));
    }
    if (section.table) {
      kids.push(el('div', { class: 'data-table-wrap' }, [
        el('table', { class: 'data-table' }, [
          el('thead', {}, [el('tr', {}, section.table.head.map(function (h) {
            return el('th', { scope: 'col', text: h });
          }))]),
          el('tbody', {}, section.table.rows.map(function (row) {
            return el('tr', {}, row.map(function (cell, i) {
              return i === 0 ? el('th', { scope: 'row', text: cell }) : el('td', { text: cell });
            }));
          }))
        ])
      ]));
    }
    return el('section', { class: 'project__block' }, kids);
  }

  function figureNode(fig) {
    const btn = el('button', {
      class: 'figure__zoom',
      type: 'button',
      'aria-label': 'Open figure ' + fig.n + ' enlarged: ' + fig.caption,
      'data-src': fig.src,
      'data-alt': fig.alt,
      'data-caption': fig.caption
    }, [
      el('img', {
        src: fig.src,
        alt: fig.alt,
        loading: 'lazy',
        decoding: 'async',
        width: fig.width || '800',
        height: fig.height || '600'
      })
    ]);
    return el('figure', { class: 'figure reveal' }, [
      btn,
      el('figcaption', { text: fig.caption })
    ]);
  }

  function noteColumn(block) {
    return el('div', { class: 'note-col' }, [
      el('h4', { text: block.label }),
      el('ul', {}, block.list.map(function (t) { return el('li', { text: t }); }))
    ]);
  }

  function renderProjects() {
    const wrap = document.getElementById('projects-list');
    if (!wrap) return;

    fill(wrap, D.projects.map(function (proj) {
      return el('article', { class: 'project reveal', id: 'project-' + proj.index,
        'aria-labelledby': 'project-title-' + proj.index }, [
        el('header', { class: 'project__head' }, [
          el('span', { class: 'project__index', 'aria-hidden': 'true', text: proj.index }),
          el('p', { class: 'project__type', text: proj.type }),
          el('h3', { class: 'project__title', id: 'project-title-' + proj.index, text: proj.title }),
          el('p', { class: 'project__subtitle', text: proj.subtitle }),
          el('ul', { class: 'tag-row' },
            proj.tags.map(function (t) { return el('li', { text: t }); }))
        ]),

        el('div', { class: 'project__layout' }, [
          el('div', { class: 'project__body' },
            proj.sections.map(projectBlock)),

          el('aside', { class: 'project__aside', 'aria-label': 'Project snapshot' }, [
            el('h4', { class: 'project__aside-title', text: 'Project snapshot' }),
            el('dl', { class: 'snapshot' }, proj.snapshot.map(function (row) {
              return el('div', {}, [
                el('dt', { text: row.label }),
                el('dd', { text: row.value })
              ]);
            }))
          ])
        ]),

        el('div', { class: 'figures' }, proj.figures.map(figureNode)),

        el('div', { class: 'project__notes' }, [
          noteColumn(proj.challenges),
          noteColumn(proj.lessons),
          noteColumn(proj.future)
        ])
      ]);
    }));
  }

  function socialLink(item) {
    return el('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, [
      el('span', { class: 'social-list__label', text: item.label }),
      el('span', { class: 'social-list__handle', text: item.handle }),
      svgEl(ARROW)
    ]);
  }

  function renderContact() {
    const p = D.profile;

    const invite = document.getElementById('looking-for');
    if (invite) fill(invite, el('p', { text: p.lookingFor }));

    const details = document.getElementById('contact-details');
    if (details) {
      fill(details, [
        el('div', { class: 'contact-card contact-card--wide reveal' }, [
          el('p', { class: 'contact-card__label', text: 'Email' }),
          el('p', { class: 'contact-card__value' },
            [el('a', { href: 'mailto:' + p.email, text: p.email })])
        ]),
        el('div', { class: 'contact-card reveal', style: '--rd:.06s' }, [
          el('p', { class: 'contact-card__label', text: 'Phone' }),
          el('p', { class: 'contact-card__value' },
            [el('a', { href: 'tel:' + p.phoneRaw, text: p.phoneDisplay })]),
          el('p', { class: 'contact-card__note' }, [
            el('a', { href: 'https://wa.me/' + p.phoneRaw.replace(/\D/g, ''),
              target: '_blank', rel: 'noopener noreferrer', text: 'Available on WhatsApp' })
          ])
        ]),
        el('div', { class: 'contact-card reveal', style: '--rd:.12s' }, [
          el('p', { class: 'contact-card__label', text: 'Present address' }),
          el('p', { class: 'contact-card__value', text: p.presentAddress })
        ]),
        el('div', { class: 'contact-card contact-card--wide reveal', style: '--rd:.18s' }, [
          el('p', { class: 'contact-card__label', text: 'Permanent address' }),
          el('p', { class: 'contact-card__value', text: p.permanentAddress })
        ])
      ]);
    }

    const socials = document.getElementById('contact-socials');
    if (socials) {
      fill(socials, D.socials.map(function (s, i) {
        return el('li', { class: 'reveal', style: '--rd:' + (i * 0.06).toFixed(2) + 's' },
          [socialLink(s)]);
      }));
    }

    const fSocials = document.getElementById('footer-socials');
    if (fSocials) {
      fill(fSocials, D.socials.map(function (s) {
        return el('li', {}, [
          el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer',
            text: s.label, 'aria-label': s.label + ' (' + s.handle + ')' })
        ]);
      }));
    }

    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------
     4. Gear decorations
  --------------------------------------------------------- */
  function mountGears() {
    const hero = document.getElementById('hero-gear');
    if (hero) {
      hero.innerHTML = gearScene({
        mod: 8,
        period: 0.42,
        gears: [
          { teeth: 40, x: 300, y: 370 },
          { teeth: 24, from: 0, angle: 0 },
          { teeth: 16, from: 0, angle: 117 },
          { teeth: 30, from: 0, angle: 234 },
          { teeth: 12, from: 1, angle: 0 },
          { teeth: 14, x: 640, y: 110, free: true }
        ]
      });
    }

    const ambient = document.getElementById('ambient-gears');
    if (ambient) {
      ambient.innerHTML =
        '<div class="ambient-slot ambient-slot--a">' + gearScene({
          mod: 8, period: 1.7,
          gears: [
            { teeth: 44, x: 210, y: 210 },
            { teeth: 18, from: 0, angle: 60 },
            { teeth: 26, from: 0, angle: 190 }
          ]
        }) + '</div>' +
        '<div class="ambient-slot ambient-slot--b">' + gearScene({
          mod: 7, period: 1.7,
          gears: [{ teeth: 30, x: 150, y: 150 }]
        }) + '</div>';
    }

    const foot = document.getElementById('footer-gears');
    if (foot) {
      foot.innerHTML = gearScene({
        mod: 6, period: 0.85,
        gears: [
          { teeth: 36, x: 170, y: 160 },
          { teeth: 20, from: 0, angle: 0 },
          { teeth: 28, from: 1, angle: 0 }
        ]
      });
    }

    const brand = document.getElementById('brand-mark');
    if (brand) brand.innerHTML = miniGear(10, 5, 22);

    document.querySelectorAll('.section__gear').forEach(function (n) {
      n.innerHTML = miniGear(9, 6, 30);
    });
    document.querySelectorAll('.section-rule__gear').forEach(function (n) {
      n.innerHTML = miniGear(8, 7, 34);
    });
  }

  /* ---------------------------------------------------------
     5. Interactions
  --------------------------------------------------------- */
  function initHeader() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('primary-nav');
    if (!header) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle('is-scrolled', window.scrollY > 10);
        // subtle blueprint parallax
        if (!motionMQ.matches) {
          const shift = -((window.scrollY * 0.09) % 40);
          document.documentElement.style.setProperty('--grid-shift', shift.toFixed(1) + 'px');
        }
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && nav) {
      const setOpen = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
      };
      toggle.addEventListener('click', function () {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          toggle.focus();
        }
      });
    }

    // active section highlighting
    if ('IntersectionObserver' in window) {
      const links = Array.prototype.slice.call(
        document.querySelectorAll('.primary-nav a[href^="#"]'));
      const byId = {};
      links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

      const spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) { a.removeAttribute('aria-current'); });
          const active = byId[entry.target.id];
          if (active) active.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      Object.keys(byId).forEach(function (id) {
        const sec = document.getElementById(id);
        if (sec) spy.observe(sec);
      });
    }
  }

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || motionMQ.matches) {
      items.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (n) { io.observe(n); });
  }

  function initLightbox() {
    const dialog = document.getElementById('figure-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    const close = document.getElementById('lightbox-close');

    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('.figure__zoom');
      if (btn) {
        img.src = btn.getAttribute('data-src');
        img.alt = btn.getAttribute('data-alt') || '';
        caption.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
      }
    });

    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();   // backdrop click
    });
  }

  /* ---------------------------------------------------------
     6. Boot
  --------------------------------------------------------- */
  function fallback(message) {
    const main = document.getElementById('main');
    if (!main) return;
    clear(main);
    main.append(el('div', { class: 'container' }, [
      el('div', { class: 'noscript-note' }, [
        el('p', { text: message }),
        el('p', {}, [el('a', { href: 'mailto:syedmehedihasan175@gmail.com',
          text: 'syedmehedihasan175@gmail.com' })])
      ])
    ]));
  }

  function init() {
    if (!D) {
      fallback('Profile data could not be loaded. Please check that content.js is present.');
      return;
    }
    // Each block is isolated so a single failure never blanks the page.
    const blocks = [
      ['hero', renderHero],
      ['about', renderAbout],
      ['education', renderEducation],
      ['skills', renderSkills],
      ['experience', renderExperience],
      ['research', renderResearch],
      ['projects', renderProjects],
      ['contact', renderContact],
      ['gears', mountGears],
      ['header', initHeader],
      ['reveal', initReveal],
      ['lightbox', initLightbox]
    ];
    blocks.forEach(function (entry) {
      try {
        entry[1]();
      } catch (err) {
        if (window.console && console.error) {
          console.error('[portfolio] ' + entry[0] + ' failed:', err);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
