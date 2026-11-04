/** Business-content CSS only. Checkout chrome and the real contact form remain owned by their existing renderers. */
export function editorialCss(): string {
  return `
.k-business-nav{min-width:0;display:flex;gap:24px;margin-left:auto;font:400 .9rem/1.4 var(--k-text)}
.k-business-nav a{min-width:0;white-space:normal;overflow-wrap:anywhere;text-decoration:none;border-bottom:1px solid transparent;padding:10px 0}
.k-business-nav a:hover{border-bottom-color:currentColor}
.k-specialties{list-style:none;display:flex;flex-wrap:wrap;gap:8px 20px;padding:0;margin:18px 0 0;font:.85rem/1.5 var(--k-text);color:var(--k-muted)}
.k-specialties li{border-bottom:1px solid var(--k-line);padding-bottom:4px}
.k main h2{letter-spacing:-.035em;line-height:1.08}
.k main h3{letter-spacing:-.015em;line-height:1.25}
.k-lead{line-height:1.65}
.k-on::before{width:min(22px,100%);height:auto;aspect-ratio:1}
.kit-elektro .k-panel .k-mark{max-width:100%;hyphens:none}
.k-panel .k-facts>div:has(a[href^="tel:"]){display:none}
.k-list{counter-reset:service}.k-list li{counter-increment:service;display:grid;grid-template-columns:30px minmax(0,1fr);column-gap:16px;padding:24px 0}
.k-list li::before{content:counter(service,decimal-leading-zero);font:.78rem/1.6 var(--k-text);color:var(--k-muted);grid-row:span 2;padding-top:3px}
.k-list p{grid-column:2;max-width:36em}
.k main .k-offen{padding:0;border:0;border-top:1px solid var(--k-line);max-width:none}
.k-offen>summary{cursor:pointer;font:400 1.05rem/1.5 var(--k-text);padding:20px 0}
.k-offen ul{font:.94rem/1.7 var(--k-text);margin-bottom:20px;max-width:50em}
.k-offen .k-note{padding-bottom:20px}
.kit-maler .k-panorama{padding-top:30px}
.k-editorial-title{display:grid;gap:24px;margin-bottom:30px}
.kit-maler .k-panorama .k-hero-fig{margin:0}
.kit-maler .k-panorama .k-hero-fig img{border-radius:0;aspect-ratio:4/3;max-height:none}
.k-panorama .k-hero-fig figcaption{top:auto;bottom:10px}
.k-panorama .k-facts{padding-top:18px;margin-top:18px!important}
.kit-maler .k-faecher{grid-template-columns:repeat(7,minmax(0,1fr))}
.kit-maler .k-faecher li{min-height:85px;font-size:0;min-width:0;padding:10px 5px}
.kit-maler .k-faecher li b{font:500 clamp(.65rem,1.8vw,.95rem)/1.2 var(--k-text);overflow-wrap:anywhere}
.k-gastro-editorial{padding-top:28px}
.k-gastro-mobile-actions .k-ctas{margin-top:24px}
.k-gastro-copy .k-ctas{display:none}
.kit-beauty .k-head-in{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);text-align:left;min-height:96px}
.kit-beauty .k-head-in .k-mark{grid-column:2;grid-row:1;text-align:center}
.kit-beauty .k-business-nav{grid-column:1;grid-row:1;margin-left:0}
.kit-beauty .k-head-tel{grid-column:3;grid-row:1;justify-self:end}
.k-gastro-invitation{display:grid;margin-top:28px;gap:0}
.k-gastro-copy{background:var(--k-accent);color:var(--k-on);padding:28px 24px}
.k main .k-gastro-copy .k-invitation-title{font:500 clamp(1.6rem,3vw,2.8rem)/1.15 var(--k-display);letter-spacing:-.025em}
.k-gastro-copy .k-lead{font-size:1.05rem;margin-top:15px!important}
.k-gastro-copy .k-specialties{color:var(--k-on)}.k-gastro-copy .k-specialties li{border-color:currentColor}
.k-gastro-copy .k-btn-primary{background:var(--k-on);color:var(--k-accent)!important;border-color:var(--k-on)}
.k-gastro-copy .k-btn-ghost{color:var(--k-on);border-color:var(--k-on)}
.kit-gastro .k-gastro-editorial .k-hero-fig img{height:100%;min-height:280px;max-height:520px;aspect-ratio:4/3}
.kit-gastro .k-gastro-editorial .k-h1{--k-avail:calc(100vw - 48px);--k-h1max:8rem}
.kit-gastro .k-karte{border:0;border-top:2px solid var(--k-ink);padding:0}.kit-gastro .k-karte-in{border:0;padding:25px 0}
.kit-gastro .k-karte-title{text-align:left;font-size:1.1rem;color:var(--k-muted)}
.kit-gastro .k-karte-row{padding:24px 0;border-bottom:1px solid var(--k-line)}
.kit-gastro .k-karte-row h3{font-size:1.7rem;font-weight:500}
.kit-beauty .k-hero-text{padding-top:35px;padding-bottom:30px}
.kit-beauty .k-prices li{padding:24px 0}
.kit-reinigung .k-sec-cols .k-list{border-top:1px solid var(--k-line)}
@media(min-width:900px){
.k-gastro-mobile-actions{display:none}
.k-gastro-copy .k-ctas{display:flex}
.k-wrap{max-width:1280px;padding-left:40px;padding-right:40px}
.k-head-in{padding-top:26px;padding-bottom:26px}
.k-editorial-title{grid-template-columns:minmax(0,1.6fr) minmax(0,.8fr);gap:65px;align-items:end;margin-bottom:40px}
.k-panorama .k-h1{--k-avail:730px;--k-h1max:7.5rem;line-height:.96}
.k-editorial-aside .k-lead{margin-top:0!important;font-size:1.05rem}
.kit-maler .k-hero-in .k-hero-fig{margin-right:calc(-1 * max(40px, (100vw - 1200px) / 2))}
.kit-maler .k-panorama .k-hero-fig img{aspect-ratio:21/9;height:auto;max-height:590px}
.kit-maler .k-panorama .k-facts{grid-template-columns:repeat(3,minmax(0,1fr));font-size:.85rem}
.kit-maler .k-faecher li{min-height:120px;padding:18px}
.k-gastro-invitation{grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);margin-top:32px;align-items:stretch}
.k-gastro-copy{padding:42px 32px;display:flex;flex-direction:column;justify-content:center}
.kit-gastro .k-gastro-editorial .k-h1{--k-avail:1100px;--k-h1max:8.5rem}
.kit-gastro .k-gastro-editorial .k-hero-fig img{aspect-ratio:auto;max-height:520px;min-height:440px}
.kit-gastro .k-gastro-editorial .k-facts{font-size:.9rem;max-width:none}
.kit-gastro .k-karte-row{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr);gap:35px;align-items:baseline}
.kit-gastro .k-karte-row p{margin-top:0!important}
.kit-fliesen .k-tiles li{min-height:200px;padding:30px}
.kit-beauty .k-hero{min-height:0}.kit-beauty .k-hero-fig img{height:700px;max-height:82vh}
.kit-elektro .k-panel{height:auto;max-height:100vh}
}
@media(max-width:899px){.kit-beauty .k-head-in{grid-template-columns:minmax(0,1fr) auto}.kit-beauty .k-head-in .k-mark{grid-column:1;text-align:left;max-width:none}.kit-beauty .k-business-nav{grid-column:2;margin-left:auto}.k-business-nav{gap:15px;font-size:.82rem}.k-head-tel{display:none}}
@media(max-width:480px){.k-business-nav a:first-child{display:none}.k-head-center .k-business-nav{margin:0;max-width:none}.k-mark{max-width:62%;font-size:1.2rem}.k-business-nav{gap:0;max-width:35%}.k-business-nav a{overflow-wrap:anywhere}.k-specialties{font-size:.78rem;gap:6px 14px}.k-gastro-copy{padding:26px 20px}}
`;
}
