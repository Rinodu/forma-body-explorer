import './style.css';
import { demo, validateBody, composition, parseReport } from './data.js';
import { createViewer } from './viewer.js';

const $ = selector => document.querySelector(selector);
const form = $('#body-form');
const format = value => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);
let viewer;
try { viewer = createViewer($('#viewer')); } catch (error) { $('#webgl-error').hidden = false; console.error(error); }
let source = 'demo';
let reportUrl;
let uploadVersion = 0;
let processing = false;
let activeLayers = ['body'];
let retryLayers = ['skeleton', 'muscles'];
const layerNames = { skeleton: 'Tulang', muscles: 'Otot', organs: 'Organ', fat: 'Lemak bawah kulit', visceral: 'Visceral referensi', body: 'Siluet' };
const layerCheckboxes = () => [...document.querySelectorAll('#anatomy-layers input')];

function updateLayerCaption() {
  const estimated = activeLayers.some(layer => ['fat', 'body', 'visceral'].includes(layer));
  $('#model-label').textContent = activeLayers.length ? activeLayers.map(layer => layerNames[layer]).join(' + ').toUpperCase() : 'TIDAK ADA LAPISAN DIPILIH';
  $('.view-caption small').textContent = activeLayers.includes('visceral') ? 'Visceral: acuan mesenterium · bukan segmentasi lemak pribadi' : estimated ? 'Kulit & lemak mengikuti satu permukaan · bentuk pribadi tetap estimasi' : 'Atlas referensi · bukan anatomi pribadi';
  $('.estimate').textContent = estimated ? 'Ilustrasi estimasi' : 'Atlas referensi';
}

async function switchLayer() {
  if (!viewer) { $('#anatomy-status').textContent = 'Atlas membutuhkan WebGL yang aktif.'; $('#anatomy-layers').disabled = true; return; }
  const requested = layerCheckboxes().filter(input => input.checked).map(input => input.value);
  retryLayers = requested;
  $('#anatomy-layers').disabled = true;
  $('#capture').disabled = true;
  $('#anatomy-retry').hidden = true;
  $('#anatomy-status').textContent = 'Memuat model 3D…';
  try {
    await viewer.setLayers(requested, (name, percent) => {
      $('#anatomy-status').textContent = `Memuat ${ { anatomy: 'tulang & otot', surface: 'permukaan tubuh', visceral: 'acuan visceral', digestive: 'pencernaan', respiratory: 'pernapasan' }[name]}…${percent == null ? '' : ` ${percent}%`}`;
    });
    activeLayers = requested;
    $('#anatomy-status').textContent = !requested.length ? 'Semua lapisan disembunyikan. Centang lapisan untuk menampilkannya.' : requested.includes('visceral') ? 'Oranye: ilustrasi area visceral memakai mesh mesenterium usus kecil, bukan segmentasi seluruh lemak visceral pribadi. Lemak bawah kulit opak; matikan lapisan luar untuk melihat bagian dalam.' : requested.includes('fat') ? 'Kuning: lemak bawah kulit opak, mengikuti permukaan tubuh. Ketebalan ilustratif memakai lemak total, bukan jumlah lemak subkutan terukur. Matikan centangnya untuk melihat organ.' : requested.includes('body') ? 'Permukaan tubuh memakai acuan posisi dan skala yang sama dengan tulang & otot. Penyesuaian komposisi tetap estimasi; bukan body scan pribadi.' : 'Organ telah diselaraskan ke rangka memakai landmark anatomi. Semua lapisan adalah atlas referensi, bukan posisi organ pribadi.';
  } catch (error) {
    layerCheckboxes().forEach(input => { input.checked = activeLayers.includes(input.value); });
    await viewer.setLayers(activeLayers);
    $('#anatomy-status').textContent = 'Atlas belum berhasil dimuat. Periksa koneksi, lalu coba lagi. Tampilan sebelumnya dipertahankan.';
    $('#anatomy-retry').hidden = false;
    console.error(error);
  } finally {
    $('#anatomy-layers').disabled = false;
    $('#capture').disabled = !activeLayers.length;
    updateLayerCaption();
  }
}
$('#anatomy-layers').addEventListener('change', switchLayer);
$('#anatomy-retry').addEventListener('click', () => { layerCheckboxes().forEach(input => { input.checked = retryLayers.includes(input.value); }); switchLayer(); });

function fill(data, clear = false) {
  for (const key of Object.keys(demo)) {
    if (key in data) form.elements[key].value = data[key] ?? '';
    else if (clear) form.elements[key].value = key === 'shape' ? 'neutral' : '';
  }
}
document.querySelectorAll('[data-input-mode]').forEach(button => button.addEventListener('click', () => {
  const manual = button.dataset.inputMode === 'manual';
  $('#upload-input').hidden = manual;
  $('#manual-help').hidden = !manual;
  $('#input-form-title').textContent = manual ? 'INPUT MANUAL' : 'TINJAU & KOREKSI ANGKA';
  document.querySelectorAll('[data-input-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  if (manual) form.elements.weight.focus();
}));
function apply() {
  $('#form-error').textContent = '';
  try {
    const body = validateBody(Object.fromEntries(new FormData(form)));
    const stats = composition(body);
    viewer?.update(body);
    $('#weight-value').textContent = format(body.weight);
    $('#fat-value').textContent = `${format(body.fat)} %`;
    $('#fat-mass').textContent = `${format(stats.fatMass)} kg`;
    $('#lean-mass').textContent = `${format(stats.leanMass)} kg`;
    $('#bmi-value').textContent = format(stats.bmi);
    $('#muscle-value').textContent = body.muscle == null ? 'Belum diisi' : `${format(body.muscle)} kg`;
    $('#fat-bar').style.flex = `0 0 ${body.fat}%`;
    $('#height-label').textContent = `${format(body.height)} cm`;
    $('#source-tag').textContent = source === 'demo' ? 'DEMO' : 'INPUT';
    updateLayerCaption();
    const count = ['chest', 'waist', 'hip'].filter(key => body[key] != null).length;
    $('#precision-title').textContent = count ? 'Siluet disesuaikan' : 'Proporsi perkiraan';
    $('#precision-copy').textContent = count ? `${count} ukuran lingkar digunakan untuk menyesuaikan siluet. Bentuk dan distribusi jaringan tetap estimasi, belum tervalidasi terhadap body scan.` : 'Berat, tinggi, dan lemak total belum menentukan bentuk tubuh atau letak lemak seseorang.';
    $('#precision-label').textContent = count ? `${count}/3 ukuran lingkar diisi · bukan skor akurasi` : 'Belum dikalibrasi ukuran lingkar';
    document.querySelectorAll('.precision-track i').forEach((el, i) => el.classList.toggle('filled', i < count));
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'front'));
  } catch (error) { $('#form-error').textContent = error.message; }
}
form.addEventListener('submit', event => { event.preventDefault(); apply(); });
form.addEventListener('input', () => { source = 'input'; $('#source-tag').textContent = 'BELUM DITERAPKAN'; });
function removeReport() {
  uploadVersion++;
  if (reportUrl) URL.revokeObjectURL(reportUrl);
  reportUrl = null;
  $('#report-preview').removeAttribute('src');
  $('#upload-preview').hidden = true;
  $('#ocr-details').hidden = true;
  $('#ocr-text').textContent = '';
  $('#file').value = '';
  $('#ocr-status').textContent = 'Gambar dihapus. Angka di form tetap ada sampai diubah atau halaman dimuat ulang.';
}
$('#remove-report').addEventListener('click', removeReport);
$('#demo').addEventListener('click', () => { removeReport(); source = 'demo'; fill(demo); apply(); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  viewer?.setView(button.dataset.view);
  viewer?.rotate(false);
  $('#rotate').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === button));
}));
for (const id of ['rotate', 'wireframe']) $(`#${id}`).addEventListener('click', event => {
  const button = event.currentTarget;
  const enabled = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(enabled));
  viewer?.[id](enabled);
});
$('#capture').addEventListener('click', () => {
  if (!viewer) return;
  const image = viewer.capture();
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#14292d'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    context.font = `${Math.max(14, canvas.width / 45)}px sans-serif`; context.fillStyle = '#cddbd4';
    context.font = `${Math.max(9, canvas.width / 65)}px sans-serif`;
    context.fillText(`FORMA · ${activeLayers.map(layer => layerNames[layer]).join(' + ')} · ESTIMASI / REFERENSI`, 20, canvas.height - 36);
    if (activeLayers.length) {
      context.font = `${Math.max(10, canvas.width / 60)}px sans-serif`;
      context.fillText('BodyParts3D / Z-Anatomy · Kinetra / Vanatome', 20, canvas.height - 16);
      context.font = `${Math.max(8, canvas.width / 75)}px sans-serif`;
      context.fillText('CC BY-SA 2.1 JP & 4.0 · sources: github.com/Rinodu/forma-body-explorer', 20, canvas.height - 3);
    }
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a'); a.download = 'forma-ilustrasi.png'; a.href = URL.createObjectURL(blob);
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }, 'image/png');
});

async function readReport(file) {
  if (!file || processing) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    $('#ocr-status').textContent = 'Pilih gambar JPG, PNG, atau WebP dengan ukuran maksimal 15 MB.'; return;
  }
  removeReport();
  const version = uploadVersion;
  reportUrl = URL.createObjectURL(file);
  $('#report-preview').src = reportUrl;
  $('#upload-preview').hidden = false;
  processing = true;
  $('#file').disabled = true;
  $('#ocr-status').textContent = 'Menyiapkan mesin pembaca lokal…';
  let worker;
  try {
    const image = await createImageBitmap(file);
    if (image.width * image.height > 40_000_000) { image.close(); throw new Error('Resolusi gambar terlalu besar. Perkecil menjadi maksimal 40 megapiksel.'); }
    // Upscale small screenshots; invert dark reports so OCR sees dark text on white.
    const scale = Math.min(7, 1800 / image.width, Math.sqrt(16_000_000 / (image.width * image.height)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let total = 0;
    for (let i = 0; i < pixels.data.length; i += 4) total += (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    const invert = total / (pixels.data.length / 4) < 128;
    for (let i = 0; i < pixels.data.length; i += 4) {
      let gray = .299 * pixels.data[i] + .587 * pixels.data[i + 1] + .114 * pixels.data[i + 2];
      if (invert) gray = 255 - gray;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
    }
    // Local contrast keeps faint labels visible on dark, uneven report backgrounds.
    const w = canvas.width, h = canvas.height, stride = w + 1;
    const sums = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) { row += pixels.data[(y * w + x) * 4]; sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row; }
    }
    const r = Math.max(12, Math.round(scale * 8));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      const mean = (sums[y1 * stride + x1] - sums[y0 * stride + x1] - sums[y1 * stride + x0] + sums[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
      const index = (y * w + x) * 4;
      const value = pixels.data[index] < mean - 5 ? 0 : 255;
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value;
    }
    ctx.putImageData(pixels, 0, 0);
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng', 1, { logger: message => {
      if (version !== uploadVersion) return;
      $('#ocr-status').textContent = message.status === 'recognizing text' ? `Membaca gambar… ${Math.round(message.progress * 100)}%` : 'Memuat mesin OCR… pembacaan pertama perlu internet.';
    } });
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
    const { data } = await worker.recognize(canvas);
    if (version !== uploadVersion) return;
    const values = parseReport(data.text);
    source = 'upload';
    fill(values, true);
    $('#source-tag').textContent = 'PERIKSA OCR';
    $('#ocr-details').hidden = false;
    $('#ocr-text').textContent = data.text;
    const count = ['weight', 'height', 'fat', 'muscle'].filter(k => values[k] != null).length;
    $('#ocr-status').textContent = `${count}/4 angka ditemukan. Periksa dan lengkapi form, lalu tekan Terapkan.${values.heightDerived ? ' Tinggi dihitung dari berat ÷ BMI, bukan hasil pengukuran; periksa ulang.' : ''} Model masih menampilkan data sebelumnya.`;
  } catch (error) {
    if (version === uploadVersion) $('#ocr-status').textContent = `Gambar belum berhasil dibaca. ${error.message} Kamu tetap bisa mengisi angka secara manual.`;
  } finally {
    if (worker) await worker.terminate();
    processing = false; $('#file').disabled = false;
  }
}
$('#file').addEventListener('change', event => readReport(event.target.files[0]));
for (const name of ['dragenter', 'dragover']) $('#dropzone').addEventListener(name, event => { event.preventDefault(); $('#dropzone').classList.add('dragging'); });
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('dragging'));
$('#dropzone').addEventListener('drop', event => { event.preventDefault(); $('#dropzone').classList.remove('dragging'); readReport(event.dataTransfer.files[0]); });
fill(demo); apply();
switchLayer();
