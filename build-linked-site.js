// Builds an offline, fully interlinked copy of every AMP page into this folder.
// Source pages are never changed (they keep the live ampconnectme.com URLs for WordPress).
// Re-run after any page edit:  node build-linked-site.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = __dirname;
const P = '3_AMP_Final Partner pages', S = '4_AMP_Final Solution and pages';
const brands = ['arcserve','avast','commscope','datacom','delta','immutec','legrand','optronics','ray','rittal','silverfox','tp-link','veracity'];
const sols = ['computing-hyperconverged-solutions','cyber-security','data-protection-and-business-continuity','datacenter-solutions','enterprise-cabling-solutions','network-solutions','safety-identification-monitoring'];

// output file -> source file
const pages = {
  'index.html': '1_AMP_Homepage/AMP_homepage.html',
  'about-us.html': '2_AMP_About us/AMP_About-Us.html',
  'brands.html': `${P}/1AMP_brands/AMP_brands_Final.html`,
  'leviton.html': `${P}/AMP_Leviton/AMP_Leviton_Final.html`,
  'solutions.html': `${S}/AMP_solutions/AMP_solutions_Final.html`,
  'contact-us.html': '5_AMP_Contact Us page/AMP_Contact us.html',
  'careers.html': '6_AMP_Career page/AMP_careers.html',
  'insights.html': '7_AMP_Insights page/AMP_Insights.html',
  'privacy-policy.html': '8_AMP_privacy policy page/AMP_Privacy-Policy.html',
};
brands.forEach(b => pages[`${b}.html`] = `${P}/AMP_${b}/AMP_${b}_Final.html`);
sols.forEach(s => pages[`${s}.html`] = `${S}/AMP_${s}/AMP_${s}_Final.html`);

// live URL slug -> local file
const slugs = { '': 'index.html' };
Object.keys(pages).forEach(f => { if (f !== 'index.html') slugs[f.slice(0, -5)] = f; });
Object.assign(slugs, {
  'avast-new-page': 'avast.html', 'commscope-new-page': 'commscope.html',
  'rittal-new-page': 'rittal.html', 'silver-fox-new-page': 'silverfox.html',
  'partners': 'brands.html',
  'products': 'brands.html', // ponytail: no Products page exists locally; brands hub is the closest
});
const alt = Object.keys(slugs).filter(Boolean).sort((a, b) => b.length - a.length).join('|');

const header = fs.readFileSync(path.join(ROOT, '0_AMP_Final Header and Footer/AMP_Header.html'), 'utf8');
const footer = fs.readFileSync(path.join(ROOT, '0_AMP_Final Header and Footer/AMP_Footer.html'), 'utf8');

function link(html, srcDir, out) {
  return html
    // https://ampconnectme.com/<slug>/  (wp-content and other paths are left alone)
    .replace(new RegExp(`https?://(?:www\\.)?ampconnectme\\.com/(${alt})/?(?=[#?"'\\s<)]|$)`, 'g'), (_, s) => slugs[s])
    .replace(/https?:\/\/(?:www\.)?ampconnectme\.com\/?(?=[#"'\s<)]|$)/g, 'index.html')
    // root-relative links copied from the header: href="/about-us/" and href="/"
    .replace(new RegExp(`(href=["'])/(${alt})/?(?=[#"'])`, 'g'), (_, a, s) => a + slugs[s])
    .replace(/(href=["'])\/(?=[#"'])/g, '$1index.html')
    // page-relative images (About us uses Assets/...) -> copied into assets/<page>/ so this folder stands alone
    .replace(/((?:src|srcset)=["'])Assets\/([^"']+)/g, (_, a, file) => {
      const dir = path.join(OUT, 'assets', out.slice(0, -5));
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(srcDir, 'Assets', file), path.join(dir, file));
      return `${a}assets/${out.slice(0, -5)}/${file}`;
    });
}

let n = 0;
for (const [out, src] of Object.entries(pages)) {
  const srcPath = path.join(ROOT, src);
  let html = fs.readFileSync(srcPath, 'utf8');
  if (out !== 'index.html') { // the homepage already carries its own header + footer copy
    const head = html.indexOf('</head>');
    const body = head >= 0 ? html.slice(head).match(/<body[^>]*>/) : null;
    if (body) {
      const i = head + body.index + body[0].length, j = html.lastIndexOf('</body>');
      html = html.slice(0, i) + '\n' + header + '\n' + html.slice(i, j) + '\n' + footer + '\n' + html.slice(j);
    } else { // fragment page (Contact, Careers, Insights, Privacy): wrap it in a document
      const title = 'AMPCONNECT · ' + out.slice(0, -5).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n` +
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap">\n` +
        `<style>body{margin:0;font-family:Poppins,sans-serif}</style>\n</head>\n<body>\n${header}\n${html}\n${footer}\n</body>\n</html>\n`;
    }
  }
  fs.writeFileSync(path.join(OUT, out), link(html, path.dirname(srcPath), out));
  n++;
}
console.log(`Built ${n} linked pages in ${OUT}`);
