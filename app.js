(() => {
  'use strict';
  const STORAGE_KEY = 'floracycle-research-lab-v1';
  const stages = ['Proposed', 'Researching', 'Planning', 'Testing', 'Analyzing', 'Implemented', 'Paused'];
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `fc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const starterData = {
    research: [
      {id:'paper-rice-cellulose-2022',title:'Rice-straw microfibrillated cellulose in starch/PVA/PEG films',type:'Peer-reviewed paper',year:'2022',url:'https://doi.org/10.1016/j.matchemphys.2022.126652',status:'To read',tags:'rice straw, cellulose, starch film',summary:'Studies rice-straw-derived microfibrillated cellulose as a reinforcement in starch/PVA/PEG films. Read the full methods and note that the polymer blend may not match a low-cost student formulation.',notes:'Questions: Which ingredients are essential? What equipment and treatment steps are required? Are the cost and degradation claims relevant to a carry bag?'},
      {id:'paper-rice-straw-2023',title:'Antioxidant starch composite films containing rice straw extract and cellulose fibres',type:'Peer-reviewed paper',year:'2023',url:'https://doi.org/10.1016/j.foodchem.2022.134073',status:'To read',tags:'rice straw, cellulose fibres, thermoplastic starch',summary:'Research on thermoplastic starch films containing rice-straw extract and cellulose fibres; reports changes in mechanical and barrier properties.',notes:'Compare fibre preparation and property measurements. Packaging-film results are not automatically equivalent to reusable carry-bag performance.'},
      {id:'paper-rice-husk-2025',title:'Biodegradable Film of Starch-Based Carboxymethyl Cellulose from Rice Husk and Straw',type:'Open-access paper',year:'2025',url:'https://www.mdpi.com/2227-9717/13/5/1387',status:'To read',tags:'rice husk, rice straw, CMC, starch',summary:'Investigates cellulose conversion from rice husk and straw and starch-based CMC films. Useful when comparing process complexity and reported film properties.',notes:'Record the extraction chemicals, waste handling, equipment requirements, and limitations before adapting any method. Use only supervisor-approved procedures.'},
      {id:'paper-banana-peel-2023',title:'Starch-based bioactive thermoplastic packaging films derived from banana peels',type:'Open-access paper',year:'2023',url:'https://doi.org/10.1016/j.carpta.2023.100328',status:'To read',tags:'banana peel, starch, cellulose, packaging film',summary:'Explores banana-peel-derived starch and cellulose in thermoplastic films. A useful alternative agricultural-waste comparison, not proof that another formulation will perform the same way.',notes:'Compare raw-material availability, preparation complexity, tensile results, water response, and the degradation tests used.'}
    ],
    ideas: [
      {id:'idea-low-cost-rice-straw',title:'Low-cost rice-straw starch carry bag',problem:'Carry bags need enough strength and flexibility for handling while keeping material and processing costs reasonable.',hypothesis:'A controlled amount of agricultural-waste cellulose may improve selected handling properties compared with a starch-only control; this must be tested.',material:'Rice straw cellulose + starch-based matrix',priority:'High',stage:'Planning',notes:'Compare one starch-only control and several fibre levels. Agree on a safe, repeatable formulation with the supervisor first.',nextStep:'Define the control, variables, and measurement plan.'},
      {id:'idea-compare-waste',title:'Compare rice straw with banana-peel waste',problem:'Different waste streams vary in availability, composition, and preparation requirements.',hypothesis:'A locally available waste stream may offer a more practical cost-to-performance balance, even if it does not produce the strongest film.',material:'Rice straw vs banana peel',priority:'Medium',stage:'Researching',notes:'Use literature first to compare processing demands and local availability. Do not compare papers as if they used identical methods.',nextStep:'Build a comparison table using published methods and costs.'},
      {id:'idea-water-uptake',title:'Measure water sensitivity early',problem:'Starch-rich films can absorb water and lose useful handling properties.',hypothesis:'Water absorption and visible changes may help identify which prototype deserves further study, but do not by themselves prove or disprove biodegradability.',material:'Prototype films and starch-only control',priority:'Medium',stage:'Proposed',notes:'Agree on a consistent measurement method, exposure time, drying method, and repeat count before collecting results.',nextStep:'Write a simple measurement protocol for supervisor review.'}
    ],
    experiments: []
  };
  let data = loadData();
  let activeType = null;
  let activeId = null;
  let toastTimeout = null;
  const DB_NAME = 'floracycle-file-store';
  const DB_STORE = 'attachments';
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
  const ALLOWED_FILE = /\.(pdf|xls|xlsx|csv|png|jpe?g|gif|webp|bmp)$/i;
  let dbPromise = null;

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(starterData);
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.research) && Array.isArray(parsed.ideas) && Array.isArray(parsed.experiments)) return parsed;
    } catch (error) { console.warn('Unable to read saved FLORACYCLE data.', error); }
    return structuredClone(starterData);
  }
  function saveData(show = false) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); byId('saveState').textContent = 'Saved in this browser'; }
    catch (error) { byId('saveState').textContent = 'Browser storage unavailable — export a backup'; console.warn(error); }
    renderAll();
    if (show) toast('Changes saved in this browser.');
  }
  function byId(id) { return document.getElementById(id); }
  function openAttachmentDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support local file storage.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE, {keyPath:'id'}); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open file storage.'));
    });
    return dbPromise;
  }
  async function putAttachment(meta, fileOrBlob) {
    const db = await openAttachmentDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put({...meta, blob:fileOrBlob});
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error || new Error('Could not save attachment.'));
    });
  }
  async function getAttachment(id) {
    const db = await openAttachmentDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error);
    });
  }
  async function removeAttachment(id) {
    try {
      const db = await openAttachmentDb();
      await new Promise((resolve, reject) => { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).delete(id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    } catch (error) { console.warn('Could not remove attachment', id, error); }
  }
  function formatBytes(bytes=0) { return bytes < 1024*1024 ? `${Math.max(1,Math.round(bytes/1024))} KB` : `${(bytes/(1024*1024)).toFixed(1)} MB`; }
  function attachmentHtml(entry) {
    const files = Array.isArray(entry.attachments) ? entry.attachments : [];
    if (!files.length) return '';
    return `<div class="attachments-list"><span class="attachments-heading">ATTACHMENTS · ${files.length}</span>${files.map(f => `<div class="attachment-item"><span class="attachment-icon">${/^image\//i.test(f.type || '') ? '▧' : /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name) ? 'PDF' : 'XLS'}</span><span class="attachment-name" title="${esc(f.name)}">${esc(f.name)}<small>${formatBytes(Number(f.size)||0)}</small></span><button class="attachment-download" data-action="download-attachment" data-attachment-id="${esc(f.id)}" data-attachment-name="${esc(f.name)}" type="button">Download ↧</button></div>`).join('')}</div>`;
  }
  function fileToDataUrl(blob) {
    return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  }
  function dataUrlToBlob(dataUrl) {
    const [head, body] = String(dataUrl).split(',');
    const mime = (head.match(/data:([^;]+)/) || [,'application/octet-stream'])[1];
    const binary = atob(body || ''); const bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], {type:mime});
  }
  function esc(value = '') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function safeUrl(value = '') { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
  function text(value, fallback = 'Not recorded') { return value && String(value).trim() ? esc(value) : fallback; }
  function typeTitle(type) { return ({research:'research reference', idea:'idea', experiment:'experiment'}[type] || 'entry'); }
  function toast(message) { const el = byId('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 2600); }
  function navigate(view) {
    if (!byId(`view-${view}`)) return;
    document.querySelectorAll('.page-view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === view && el.classList.contains('nav-link')));
    byId('menuToggle').setAttribute('aria-expanded', 'false');
    byId('menuToggle').setAttribute('aria-label', 'Open navigation');
    document.querySelector('.main-nav').classList.remove('open');
    if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function statusClass(value = '') { return `status-${String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`; }
  function formatDate(value) { if (!value) return '—'; const d = new Date(`${value}T12:00:00`); return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
  function tagsHtml(value) { return String(value || '').split(',').map(t => t.trim()).filter(Boolean).slice(0,8).map(t => `<span class="tag">${esc(t)}</span>`).join(''); }

  function renderAll() {
    byId('statResearch').textContent = data.research.length;
    byId('statIdeas').textContent = data.ideas.length;
    byId('statExperiments').textContent = data.experiments.length;
    byId('statImplemented').textContent = data.ideas.filter(i => i.stage === 'Implemented').length;
    renderResearch(); renderIdeas(); renderExperiments();
  }
  function renderResearch() {
    const q = (byId('researchSearch')?.value || '').toLowerCase().trim();
    const filter = byId('researchStatusFilter')?.value || 'all';
    const rows = data.research.filter(r => {
      const haystack = [r.title,r.type,r.year,r.tags,r.summary,r.notes,r.url].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (filter === 'all' || r.status === filter);
    });
    byId('researchCount').textContent = `${rows.length} ${rows.length === 1 ? 'reference' : 'references'}`;
    byId('researchGrid').innerHTML = rows.map(r => {
      const url = safeUrl(r.url);
      return `<article class="research-card"><div class="card-meta"><span class="pill ${statusClass(r.status)}">${esc(r.status || 'To read')}</span><div class="card-actions"><button class="icon-button" data-action="edit" data-type="research" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.title)}" title="Edit">✎</button><button class="icon-button" data-action="delete" data-type="research" data-id="${esc(r.id)}" aria-label="Delete ${esc(r.title)}" title="Delete">×</button></div></div><h3>${text(r.title,'Untitled reference')}</h3><div class="publine">${text(r.type,'Reference')} ${r.year ? `· ${esc(r.year)}` : ''}</div><p>${text(r.summary,'No summary recorded.')}</p>${r.tags ? `<div class="tag-row">${tagsHtml(r.tags)}</div>` : ''}${r.notes ? `<p><strong>My notes:</strong> ${esc(r.notes)}</p>` : ''}${url ? `<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener">Open source ↗</a>` : '<span class="source-link">No source URL saved</span>'}${attachmentHtml(r)}<div class="card-bottom"><span>Updated ${formatDate(r.updatedAt || r.createdAt)}</span><button data-action="edit" data-type="research" data-id="${esc(r.id)}">Edit entry →</button></div></article>`;
    }).join('');
    byId('researchEmpty').classList.toggle('hidden', rows.length !== 0);
    byId('researchGrid').classList.toggle('hidden', rows.length === 0);
  }
  function renderIdeas() {
    const q = (byId('ideaSearch')?.value || '').toLowerCase().trim();
    const filter = byId('ideaStageFilter')?.value || 'all';
    const rows = data.ideas.filter(i => [i.title,i.problem,i.hypothesis,i.material,i.priority,i.stage,i.notes,i.nextStep].join(' ').toLowerCase().includes(q) && (filter === 'all' || i.stage === filter));
    byId('ideasGrid').innerHTML = rows.map(i => {
      const stageOpts = stages.map(s => `<option${s === i.stage ? ' selected' : ''}>${esc(s)}</option>`).join('');
      const next = stages.indexOf(i.stage);
      const nextStage = next >= 0 && next < stages.length - 2 ? stages[next + 1] : (i.stage === 'Paused' ? 'Researching' : 'Implemented');
      return `<article class="idea-card"><div class="card-meta"><span class="pill ${statusClass(i.stage)}">${esc(i.stage || 'Proposed')}</span><div class="card-actions"><button class="icon-button" data-action="edit" data-type="idea" data-id="${esc(i.id)}" aria-label="Edit ${esc(i.title)}">✎</button><button class="icon-button" data-action="delete" data-type="idea" data-id="${esc(i.id)}" aria-label="Delete ${esc(i.title)}">×</button></div></div><h3>${text(i.title,'Untitled idea')}</h3><p>${text(i.problem,'Problem statement not recorded.')}</p><span class="field-caption">Hypothesis to test</span><p class="hypothesis">${text(i.hypothesis,'Add a testable hypothesis.')}</p><div class="tag-row"><span class="tag">Material: ${text(i.material,'Not selected')}</span><span class="tag">Priority: ${text(i.priority,'Medium')}</span></div>${i.notes ? `<span class="field-caption">Research notes</span><p>${esc(i.notes)}</p>` : ''}${i.nextStep ? `<p><strong>Next step:</strong> ${esc(i.nextStep)}</p>` : ''}${attachmentHtml(i)}<div class="idea-actions"><select class="stage-select" data-action="stage" data-type="idea" data-id="${esc(i.id)}" aria-label="Change stage for ${esc(i.title)}">${stageOpts}</select><button class="idea-next" data-action="next-stage" data-type="idea" data-id="${esc(i.id)}">Move to ${esc(nextStage)} →</button></div></article>`;
    }).join('');
    byId('ideasEmpty').classList.toggle('hidden', rows.length !== 0);
    byId('ideasGrid').classList.toggle('hidden', rows.length === 0);
  }
  function renderExperiments() {
    const rows = data.experiments.slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
    byId('experimentsBody').innerHTML = rows.map(e => `<tr><td>${text(e.title,'Untitled experiment')}<br><span style="font-weight:400;color:#97a297">${text(e.testType,'General test')}</span></td><td>${text(e.relatedIdea,'Not linked')}</td><td>${formatDate(e.date)}</td><td><span class="status-chip">${text(e.status,'Planned')}</span></td><td>${text(e.result || e.method || e.notes,'No observations recorded')}${attachmentHtml(e)}</td><td class="table-actions"><button class="icon-button" data-action="edit" data-type="experiment" data-id="${esc(e.id)}" aria-label="Edit experiment">✎</button><button class="icon-button" data-action="delete" data-type="experiment" data-id="${esc(e.id)}" aria-label="Delete experiment">×</button></td></tr>`).join('');
    byId('experimentsEmpty').classList.toggle('hidden', rows.length !== 0);
    byId('experimentsBody').closest('table').classList.toggle('hidden', rows.length === 0);
  }

  const schemas = {
    research: [
      {key:'title',label:'Paper or source title',required:true,full:true,placeholder:'Enter the published title'},
      {key:'type',label:'Source type',type:'select',options:['Peer-reviewed paper','Open-access paper','Review article','Official guidance','Website / product','Other'],value:'Peer-reviewed paper'},
      {key:'year',label:'Publication year',placeholder:'e.g. 2025'},
      {key:'url',label:'DOI or source URL',type:'url',full:true,placeholder:'https://…'},
      {key:'status',label:'Reading status',type:'select',options:['To read','Reading','Reviewed','Needs verification'],value:'To read'},
      {key:'tags',label:'Tags (comma-separated)',full:true,placeholder:'rice straw, starch, cellulose'},
      {key:'summary',label:'What the source says',type:'textarea',full:true,placeholder:'Summarize the paper without overstating its findings.'},
      {key:'notes',label:'My notes / questions',type:'textarea',full:true,placeholder:'What could apply to FLORACYCLE? What needs checking?'}
    ],
    idea: [
      {key:'title',label:'Idea title',required:true,full:true,placeholder:'A clear name for your idea'},
      {key:'problem',label:'Problem to solve',type:'textarea',full:true,placeholder:'What limitation or need did you notice?'},
      {key:'hypothesis',label:'Testable hypothesis',type:'textarea',full:true,placeholder:'What do you expect to change, and how will you measure it?'},
      {key:'material',label:'Materials / waste stream',placeholder:'e.g. rice straw cellulose + starch'},
      {key:'priority',label:'Priority',type:'select',options:['High','Medium','Low'],value:'Medium'},
      {key:'stage',label:'Current stage',type:'select',options:stages,value:'Proposed'},
      {key:'nextStep',label:'Next action',type:'textarea',full:true,placeholder:'What is the next practical step?'},
      {key:'notes',label:'Notes / constraints',type:'textarea',full:true,placeholder:'Cost, availability, limits, unanswered questions'}
    ],
    experiment: [
      {key:'title',label:'Experiment / test name',required:true,full:true,placeholder:'e.g. Water uptake comparison — Trial 1'},
      {key:'relatedIdea',label:'Related idea',type:'select-dynamic',options:[],value:''},
      {key:'date',label:'Date',type:'date',value:today()},
      {key:'testType',label:'Test category',type:'select',options:['Flexibility / handling','Load / tensile comparison','Water absorption','Mass loss / degradation observation','Cost estimate','Visual inspection','Other'],value:'Visual inspection'},
      {key:'status',label:'Experiment status',type:'select',options:['Planned','In progress','Completed','Needs repeat','Cancelled'],value:'Planned'},
      {key:'method',label:'Method / setup',type:'textarea',full:true,placeholder:'Record control, variables, sample count, units, and conditions.'},
      {key:'result',label:'Results / observations',type:'textarea',full:true,placeholder:'Write actual observations; use “not measured” rather than guessing.'},
      {key:'notes',label:'Limitations / safety / next steps',type:'textarea',full:true,placeholder:'Supervisor guidance, uncertainties, and the next change to test.'}
    ]
  };
  function openForm(type, id = null) {
    if (!schemas[type]) return;
    activeType = type; activeId = id;
    // Store arrays use research, ideas and experiments.
    const arr = type === 'research' ? data.research : type === 'idea' ? data.ideas : data.experiments;
    const entry = id ? arr.find(x => x.id === id) : null;
    byId('modalTitle').textContent = `${entry ? 'Edit' : 'Add'} ${typeTitle(type)}`;
    byId('modalEyebrow').textContent = type === 'research' ? 'EVIDENCE LIBRARY' : type === 'idea' ? 'IDEA WORKSHOP' : 'EXPERIMENT LOG';
    byId('modalHint').textContent = type === 'research' ? 'Save the source link and write your own notes separately from the paper’s claims.' : type === 'idea' ? 'Keep the hypothesis testable and capture the next step. The stage records progress; it does not perform the experiment automatically.' : 'Record real observations and conditions. Do not enter estimated results as if they were measured.';
    byId('formFields').innerHTML = schemas[type].map(field => {
      const value = entry && entry[field.key] != null ? entry[field.key] : (field.value || '');
      const val = esc(value);
      const common = `id="field-${field.key}" name="${field.key}" ${field.required ? 'required' : ''} ${field.placeholder ? `placeholder="${esc(field.placeholder)}"` : ''}`;
      let control = '';
      if (field.type === 'textarea') control = `<textarea ${common} rows="3">${val}</textarea>`;
      else if (field.type === 'select' || field.type === 'select-dynamic') {
        let options = field.type === 'select-dynamic' ? [`<option value="">Not linked</option>`, ...data.ideas.map(i => `<option value="${esc(i.title)}" ${i.title === value ? 'selected' : ''}>${esc(i.title)}</option>`)].join('') : field.options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('');
        control = `<select ${common}>${options}</select>`;
      } else control = `<input ${common} type="${field.type || 'text'}" value="${val}" ${field.key === 'year' ? 'inputmode="numeric" maxlength="4"' : ''}>`;
      return `<div class="form-field ${field.full ? 'full' : ''}"><label for="field-${field.key}">${esc(field.label)}${field.required ? ' *' : ''}</label>${control}</div>`;
    }).join('') + `<div class="form-field full"><label for="field-attachments">Attach files <span class="optional">(PDF, Excel, CSV, or images; max 10 MB each)</span></label><input id="field-attachments" name="attachments" type="file" multiple accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.bmp,application/pdf,image/*"><p class="attachment-help">Files are saved in this browser on this device. They are not uploaded to GitHub or shared online.</p>${entry && Array.isArray(entry.attachments) && entry.attachments.length ? `<div class="existing-attachments"><strong>Already attached</strong>${entry.attachments.map(f => `<label class="remove-attachment"><input type="checkbox" name="removeAttachment" value="${esc(f.id)}"> Remove ${esc(f.name)} (${formatBytes(Number(f.size)||0)})</label>`).join('')}</div>` : ''}</div>`;
    byId('modalBackdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => byId('formFields').querySelector('input,textarea,select')?.focus(), 50);
  }
  function closeForm() { byId('modalBackdrop').classList.add('hidden'); document.body.style.overflow = ''; activeType = null; activeId = null; byId('entryForm').reset(); }
  async function submitForm(event) {
    event.preventDefault();
    if (!activeType) return;
    const form = byId('entryForm');
    if (!form.reportValidity()) return;
    const entry = {};
    schemas[activeType].forEach(field => { const el = form.elements[field.key]; if (el) entry[field.key] = String(el.value || '').trim(); });
    if (entry.url && !safeUrl(entry.url)) { toast('Please use a valid http or https source URL.'); byId('field-url')?.focus(); return; }
    if (activeType === 'research' && entry.year && !/^\d{4}$/.test(entry.year)) { toast('Enter a four-digit publication year.'); byId('field-year')?.focus(); return; }
    const fileInput = byId('field-attachments');
    const selectedFiles = Array.from(fileInput?.files || []);
    for (const file of selectedFiles) {
      if (!ALLOWED_FILE.test(file.name)) { toast(`Unsupported file type: ${file.name}`); return; }
      if (file.size > MAX_FILE_SIZE) { toast(`${file.name} is over the 10 MB per-file limit.`); return; }
    }
    const arr = activeType === 'research' ? data.research : activeType === 'idea' ? data.ideas : data.experiments;
    const existingIndex = activeId ? arr.findIndex(item => item.id === activeId) : -1;
    const existingEntry = existingIndex >= 0 ? arr[existingIndex] : null;
    const removeIds = Array.from(form.querySelectorAll('input[name="removeAttachment"]:checked')).map(el => el.value);
    const keptAttachments = (existingEntry?.attachments || []).filter(file => !removeIds.includes(file.id));
    const newAttachments = selectedFiles.map(file => ({id:uid(),name:file.name,type:file.type || 'application/octet-stream',size:file.size,addedAt:new Date().toISOString()}));
    try {
      for (let i=0;i<selectedFiles.length;i++) await putAttachment(newAttachments[i], selectedFiles[i]);
      for (const id of removeIds) await removeAttachment(id);
    } catch (error) { console.error(error); toast('Could not save attachments. Try a smaller file or another browser.'); return; }
    entry.attachments = [...keptAttachments, ...newAttachments];
    if (activeId) {
      if (existingIndex >= 0) arr[existingIndex] = {...arr[existingIndex], ...entry, updatedAt:today()};
    } else arr.unshift({...entry,id:uid(),createdAt:today(),updatedAt:today()});
    const savedType = activeType; closeForm(); saveData(); toast(`${typeTitle(savedType)} saved.`);
  }
  async function downloadStoredAttachment(id, name) {
    try {
      const stored = await getAttachment(id);
      if (!stored?.blob) { toast('This attachment is missing from this browser. Restore a backup that includes it.'); return; }
      const url = URL.createObjectURL(stored.blob); const a = document.createElement('a'); a.href = url; a.download = name || stored.name || 'attachment'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) { console.error(error); toast('Could not open this attachment.'); }
  }
  function deleteEntry(type, id) {
    const arr = type === 'research' ? data.research : type === 'idea' ? data.ideas : data.experiments;
    const row = arr.find(x => x.id === id);
    if (!row || !confirm(`Delete “${row.title || 'this entry'}”? This cannot be undone unless you have a backup.`)) return;
    (row.attachments || []).forEach(file => removeAttachment(file.id));
    if (type === 'research') data.research = data.research.filter(x => x.id !== id);
    if (type === 'idea') data.ideas = data.ideas.filter(x => x.id !== id);
    if (type === 'experiment') data.experiments = data.experiments.filter(x => x.id !== id);
    saveData(); toast('Entry deleted.');
  }
  function moveStage(id, value) { const idea = data.ideas.find(i => i.id === id); if (!idea || !stages.includes(value)) return; idea.stage = value; idea.updatedAt = today(); saveData(); toast(`Idea stage updated to ${value}.`); }

  function download(filename, content, type) {
    const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportBackup() {
    try {
      const backup = {...JSON.parse(JSON.stringify(data)),backupVersion:2,exportedAt:new Date().toISOString()};
      for (const key of ['research','ideas','experiments']) for (const entry of backup[key]) {
        entry.attachments = [];
        for (const meta of (data[key].find(x=>x.id===entry.id)?.attachments || [])) { const stored = await getAttachment(meta.id); if (stored?.blob) entry.attachments.push({...meta,dataUrl:await fileToDataUrl(stored.blob)}); }
      }
      download(`floracycle-backup-${today()}.json`, JSON.stringify(backup,null,2), 'application/json;charset=utf-8'); toast('Backup with attachments downloaded. Keep it somewhere safe.');
    } catch (error) { console.error(error); toast('Could not include attachments in backup. Check browser storage and try again.'); }
  }
  function parseCsv(value) { return `"${String(value ?? '').replace(/"/g,'""')}"`; }
  function exportCsv() {
    const headers = ['title','type','year','url','status','tags','summary','notes'];
    const csv = [headers.map(parseCsv).join(','), ...data.research.map(r => headers.map(k => parseCsv(r[k])).join(','))].join('\r\n');
    download(`floracycle-research-${today()}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
    toast('Research CSV downloaded.');
  }
  async function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || !Array.isArray(obj.research) || !Array.isArray(obj.ideas) || !Array.isArray(obj.experiments)) throw new Error('Invalid FLORACYCLE backup');
        if (!confirm(`Replace this browser's workspace with ${obj.research.length} research entries, ${obj.ideas.length} ideas, and ${obj.experiments.length} experiments from this backup?`)) return;
        for (const key of ['research','ideas','experiments']) for (const entry of obj[key]) {
          entry.attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
          for (const file of entry.attachments) if (file.dataUrl) { const blob = dataUrlToBlob(file.dataUrl); await putAttachment({id:file.id,name:file.name,type:file.type,size:file.size,addedAt:file.addedAt},blob); delete file.dataUrl; }
        }
        data = {research:obj.research,ideas:obj.ideas,experiments:obj.experiments}; saveData(); toast('Backup and attachments restored successfully.');
      } catch (error) { console.error(error); toast('That file is not a valid FLORACYCLE JSON backup.'); }
      finally { byId('importFile').value = ''; }
    };
    reader.onerror = () => toast('Could not read the selected file.');
    reader.readAsText(file);
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { event.preventDefault(); navigate(nav.dataset.nav); return; }
    const add = event.target.closest('[data-add]');
    if (add) { openForm(add.dataset.add); return; }
    const action = event.target.closest('[data-action]');
    if (action) {
      const {type,id} = action.dataset;
      if (action.dataset.action === 'edit') openForm(type,id);
      else if (action.dataset.action === 'delete') deleteEntry(type,id);
      else if (action.dataset.action === 'download-attachment') downloadStoredAttachment(action.dataset.attachmentId, action.dataset.attachmentName);
      else if (action.dataset.action === 'next-stage') {
        const current = data.ideas.find(i => i.id === id)?.stage;
        const at = stages.indexOf(current);
        const next = current === 'Paused' ? 'Researching' : at < 0 ? 'Proposed' : (at >= stages.indexOf('Analyzing') ? 'Implemented' : stages[at+1]);
        moveStage(id,next);
      }
    }
  });
  document.addEventListener('change', event => { const el = event.target; if (el.matches('[data-action="stage"]')) moveStage(el.dataset.id,el.value); });
  byId('entryForm').addEventListener('submit', submitForm);
  byId('closeModal').addEventListener('click', closeForm); byId('cancelModal').addEventListener('click', closeForm);
  byId('modalBackdrop').addEventListener('click', e => { if (e.target === byId('modalBackdrop')) closeForm(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !byId('modalBackdrop').classList.contains('hidden')) closeForm(); });
  byId('researchSearch').addEventListener('input', renderResearch); byId('researchStatusFilter').addEventListener('change', renderResearch);
  byId('ideaSearch').addEventListener('input', renderIdeas); byId('ideaStageFilter').addEventListener('change', renderIdeas);
  byId('exportBtn').addEventListener('click', exportBackup);
  byId('importShortcut').addEventListener('click', () => byId('importFile').click());
  byId('importFile').addEventListener('change', e => importBackup(e.target.files?.[0]));
  byId('exportCsvBtn').addEventListener('click', exportCsv);
  byId('menuToggle').addEventListener('click', () => { const nav = document.querySelector('.main-nav'); const open = nav.classList.toggle('open'); byId('menuToggle').setAttribute('aria-expanded',String(open)); byId('menuToggle').setAttribute('aria-label',open?'Close navigation':'Open navigation'); });
  window.addEventListener('hashchange', () => { const view = location.hash.replace('#',''); if (byId(`view-${view}`)) navigate(view); });

  // Accessible 3D showcase carousel
  const carouselSlides = [...document.querySelectorAll('.showcase-slide')];
  const carouselDots = [...document.querySelectorAll('[data-go-slide]')];
  let activeShowcaseSlide = 0;
  function renderShowcaseSlide(next) {
    if (!carouselSlides.length) return;
    activeShowcaseSlide = (next + carouselSlides.length) % carouselSlides.length;
    carouselSlides.forEach((slide, index) => {
      slide.classList.remove('is-active','is-prev','is-next','is-hidden');
      const diff = (index - activeShowcaseSlide + carouselSlides.length) % carouselSlides.length;
      slide.classList.add(diff === 0 ? 'is-active' : diff === 1 ? 'is-next' : diff === carouselSlides.length - 1 ? 'is-prev' : 'is-hidden');
      slide.setAttribute('aria-hidden', diff === 0 ? 'false' : 'true');
    });
    carouselDots.forEach((dot, index) => { dot.classList.toggle('active', index === activeShowcaseSlide); dot.setAttribute('aria-pressed', index === activeShowcaseSlide ? 'true' : 'false'); });
  }
  byId('slidePrev')?.addEventListener('click', () => renderShowcaseSlide(activeShowcaseSlide - 1));
  byId('slideNext')?.addEventListener('click', () => renderShowcaseSlide(activeShowcaseSlide + 1));
  carouselDots.forEach(dot => dot.addEventListener('click', () => renderShowcaseSlide(Number(dot.dataset.goSlide))));
  byId('carouselStage')?.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') renderShowcaseSlide(activeShowcaseSlide - 1); if (event.key === 'ArrowRight') renderShowcaseSlide(activeShowcaseSlide + 1); });
  renderShowcaseSlide(0);

  // Allow the header to open the mobile navigation even when the screen resizes.
  const startView = location.hash.replace('#','');
  renderAll();
  if (byId(`view-${startView}`)) navigate(startView);
})();
